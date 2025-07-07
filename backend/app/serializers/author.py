from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from app.models import Author, Node


class AuthorSerializer(serializers.ModelSerializer):
    """Serializer for Author model with admin creation capabilities"""

    password = serializers.CharField(
        write_only=True,
        required=False,  # Not required for partial updates
        help_text="Password is required for all users. SSO/LDAP authentication is not supported.",
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=False,  # Not required for partial updates
        help_text="Must match the password field exactly.",
    )
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Author
        fields = [
            "type",
            "id",
            "url",
            "host",
            "web",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "github_username",
            "profile_image",
            "bio",
            "location",
            "website",
            "node",
            "is_approved",
            "is_active",
            "is_staff",
            "is_superuser",
            "created_at",
            "updated_at",
            "password",
            "password_confirm",
            "is_following",
        ]
        read_only_fields = ["type", "id", "url", "host", "web", "created_at", "updated_at"]
        extra_kwargs = {
            "email": {"required": True},
            "username": {"required": True},
        }

    def validate(self, attrs):
        """Validate password confirmation and other fields"""
        password = attrs.get("password")
        password_confirm = attrs.pop("password_confirm", None)

        # Only validate passwords if they are provided
        if password is not None or password_confirm is not None:
            if password != password_confirm:
                raise serializers.ValidationError(
                    {"password_confirm": "Password fields must match."}
                )

            # Validate password strength
            if password:
                try:
                    validate_password(password)
                except ValidationError as e:
                    raise serializers.ValidationError({"password": list(e.messages)})

        return attrs

    def create(self, validated_data):
        """Create a new author user"""
        password = validated_data.pop("password")

        # Ensure password exists
        if not password:
            raise serializers.ValidationError(
                {"password": "Password is required for all users."}
            )

        # Create the author
        author = Author.objects.create_user(password=password, **validated_data)

        return author

    def update(self, instance, validated_data):
        """Update an existing author"""
        password = validated_data.pop("password", None)

        # Update regular fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update password if provided
        if password:
            instance.set_password(password)

        instance.save()
        return instance

    def get_is_following(self, obj):
        """Check if current user is following this author"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        from app.models.follow import Follow

        return Follow.objects.filter(
            follower=request.user, followed=obj, status=Follow.ACCEPTED
        ).exists()
    
    def to_representation(self, instance):
        """
        Customize the representation to match project spec format.
        """
        data = super().to_representation(instance)
        
        # Override id to be the full URL as per spec
        data['id'] = instance.url
        
        # Convert github_username to full URL format
        if instance.github_username:
            data['github'] = f"https://github.com/{instance.github_username}"
        else:
            data['github'] = None
            
        # Remove the github_username field as it's replaced by github
        data.pop('github_username', None)
        
        return data


class AuthorListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing authors"""

    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Author
        fields = [
            "type",
            "id",
            "url",
            "host",
            "web",
            "username",
            "email",
            "display_name",
            "github_username",
            "profile_image",
            "location",
            "website",
            "is_approved",
            "is_active",
            "created_at",
            "followers_count",
            "following_count",
            "is_following",
        ]
        read_only_fields = ["type", "id", "url", "host", "web", "created_at"]

    def get_followers_count(self, obj):
        """Get count of users following this author"""
        from app.models.follow import Follow

        return Follow.objects.filter(followed=obj, status=Follow.ACCEPTED).count()

    def get_following_count(self, obj):
        """Get count of users this author is following"""
        from app.models.follow import Follow

        return Follow.objects.filter(follower=obj, status=Follow.ACCEPTED).count()

    def get_is_following(self, obj):
        """Check if current user is following this author"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        from app.models.follow import Follow

        return Follow.objects.filter(
            follower=request.user, followed=obj, status=Follow.ACCEPTED
        ).exists()
    
    def to_representation(self, instance):
        """
        Customize the representation to match project spec format.
        """
        data = super().to_representation(instance)
        
        # Override id to be the full URL as per spec
        data['id'] = instance.url
        
        # Convert github_username to full URL format
        if instance.github_username:
            data['github'] = f"https://github.com/{instance.github_username}"
        else:
            data['github'] = None
            
        # Remove the github_username field as it's replaced by github
        data.pop('github_username', None)
        
        return data


class NodeSerializer(serializers.ModelSerializer):
    """Serializer for Node model (used in nested serialization)"""

    class Meta:
        model = Node
        fields = ["id", "name", "host", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]
