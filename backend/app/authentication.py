"""
Custom authentication backends for handling node authentication
"""

from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from app.models import Author, Node
from app.views.auth import parse_basic_auth
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class NodeAuthenticationBackend(BaseBackend):
    """
    Authentication backend that checks node credentials and creates/updates
    Author objects with superuser and staff privileges.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authenticate using node credentials as fallback.
        
        This backend only activates when regular Django authentication fails
        and basic auth credentials are present.
        """
        if not username or not password:
            return None
        
        try:
            # Check if there's an active node with these credentials
            node = Node.objects.get(username=username, password=password, is_active=True)
            logger.info(f"Node authentication successful for {node.name}")
            
            # Check if an Author already exists with this username
            try:
                author = Author.objects.get(username=username)
                # Update existing author to be superuser and staff
                author.is_superuser = True
                author.is_staff = True
                author.is_approved = True
                author.is_active = True
                author.save()
                logger.info(f"Updated existing author {username} with superuser privileges")
            except Author.DoesNotExist:
                # Create new Author with superuser and staff privileges
                author = Author.objects.create_user(
                    username=username,
                    password=password,
                    displayName=node.name,
                    is_superuser=True,
                    is_staff=True,
                    is_approved=True,
                    is_active=True,
                )
                logger.info(f"Created new author {username} with superuser privileges")
            
            return author
            
        except Node.DoesNotExist:
            # No matching node found
            return None
        except Exception as e:
            logger.error(f"Error in node authentication: {str(e)}")
            return None

    def get_user(self, user_id):
        """
        Get user by ID for session authentication.
        """
        try:
            return Author.objects.get(pk=user_id)
        except Author.DoesNotExist:
            return None


class BasicAuthenticationMiddleware:
    """
    Middleware that handles HTTP Basic Authentication for API requests.
    
    This middleware runs before the permission classes and attempts to authenticate
    users using basic auth credentials if no user is currently authenticated.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only process API requests that aren't already authenticated
        if (request.path.startswith('/api/') and 
            not request.user.is_authenticated and 
            'HTTP_AUTHORIZATION' in request.META):
            
            # Parse basic auth credentials
            username, password = parse_basic_auth(request)
            
            if username and password:
                # Try to authenticate using Django's authentication system
                from django.contrib.auth import authenticate
                user = authenticate(request, username=username, password=password)
                
                if user:
                    # Set the authenticated user on the request
                    request.user = user
                    logger.info(f"Basic auth successful for user {username}")
                else:
                    logger.debug(f"Basic auth failed for user {username}")
        
        response = self.get_response(request)
        return response