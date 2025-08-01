from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.utils import user_email
from django.conf import settings
from django.contrib.auth import get_user_model

Author = get_user_model()


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """Custom adapter to handle GitHub OAuth with our Author model"""
    
    def update_user_from_github(self, user, github_data):
        """
        Helper method to update user information from GitHub data
        """
        
        # Always update these fields with the latest GitHub data
        if github_data.get('name'):
            user.displayName = github_data.get('name')
            # Also update first_name and last_name
            name_parts = github_data.get('name').split(' ', 1)
            user.first_name = name_parts[0]
            if len(name_parts) > 1:
                user.last_name = name_parts[1]
        elif github_data.get('login') and not user.displayName:
            user.displayName = github_data.get('login')
            
        # Always update GitHub username
        if github_data.get('login'):
            user.github_username = github_data.get('login')
            
        # Update email if user doesn't have one
        if github_data.get('email') and not user.email:
            user.email = github_data.get('email')
            
        # Always update profile image
        if github_data.get('avatar_url'):
            user.profileImage = github_data.get('avatar_url')
            
            
        # Auto-approve GitHub users
        user.is_approved = True
            
        return user
    
    def pre_social_login(self, request, sociallogin):
        """
        This is called when a user is about to login via social account.
        We use this to link existing users or create new ones.
        """
        # Check if user already exists with this email
        if sociallogin.account.provider == 'github':
            try:
                email = user_email(sociallogin.user)
                github_data = sociallogin.account.extra_data
                
                if email:
                    # Try to find existing user by email
                    existing_user = Author.objects.get(email=email)
                    
                    # Update the user with GitHub information
                    self.update_user_from_github(existing_user, github_data)
                    existing_user.save()
                    
                    if not sociallogin.is_existing:
                        # Link the social account to existing user
                        sociallogin.connect(request, existing_user)
            except Author.DoesNotExist:
                pass
                
    def populate_user(self, request, sociallogin, data):
        """
        Populate user fields from social account data
        """
        user = super().populate_user(request, sociallogin, data)
        
        if sociallogin.account.provider == 'github':
            # Get GitHub data
            github_data = sociallogin.account.extra_data
            
            # Use our helper method to update user from GitHub data
            user = self.update_user_from_github(user, github_data)
            
        return user

    def save_user(self, request, sociallogin, form=None):
        """
        Save the user and set the URL properly
        """
        user = super().save_user(request, sociallogin, form)
        
        # Ensure URL is set for local authors
        if not user.url and not user.node:
            user.url = f"{settings.SITE_URL}/api/authors/{user.id}"
            user.save(update_fields=['url'])
        
        return user
