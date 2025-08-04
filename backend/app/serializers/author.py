from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.conf import settings

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
    node_id = serializers.SerializerMethodField()
    is_remote = serializers.SerializerMethodField()

    class Meta:
        model = Author
        fields = [
            "type",
            "id",
            "url",
            "host",
            "web",
            "username",
            "first_name",
            "last_name",
            "displayName",
            "github_username",
            "profileImage",
            "node",
            "node_id",
            "is_remote",
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
        read_only_fields = [
            "type",
            "id",
            "url",
            "host",
            "web",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
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

    def get_node_id(self, obj):
        """Get the node ID for remote authors"""
        return str(obj.node.id) if obj.node else None

    def get_is_remote(self, obj):
        """Check if this is a remote author"""
        return obj.node is not None

    def to_representation(self, instance):
        """
        Customize the representation to match CMPUT 404 spec format.
        Returns author objects in the required format:
        {
            "type": "author",
            "id": "http://nodeaaaa/api/authors/111",
            "host": "http://nodeaaaa/api/",
            "displayName": "Greg Johnson",
            "github": "http://github.com/gjohnson",
            "profileImage": "https://i.imgur.com/k7XVwpB.jpeg",
            "web": "http://nodeaaaa/authors/greg"
        }
        """
        # For remote authors, use their original host and web URLs
        # For local authors, use the local site URL
        if instance.node is not None:  # Remote author
            # Use the stored host and web URLs from the remote node
            host_url = instance.host if instance.host else f"{instance.node.host}/api/"
            # Ensure host_url has trailing slash
            if host_url and not host_url.endswith('/'):
                host_url += '/'
            web_url = (
                instance.web
                if instance.web
                else f"{instance.node.host.rstrip('/')}/authors/{instance.id}"
            )
        else:  # Local author
            host_url = f"{settings.SITE_URL}/api/"
            frontend_url = getattr(settings, 'FRONTEND_URL', settings.SITE_URL)
            web_url = f"{frontend_url}/authors/{instance.id}"

        # CMPUT 404 compliant format - only required fields
        result = {
            "type": "author",
            "id": instance.url.rstrip('/') if instance.url else None,  # Full URL as ID per spec, remove trailing slash
            "host": host_url,
            "displayName": instance.displayName,
            "github": (
                f"https://github.com/{instance.github_username}"
                if instance.github_username
                else ""
            ),
            "profileImage": instance.profileImage or "",
            "web": web_url,
        }

        return result


class AuthorListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing authors"""

    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    node_id = serializers.SerializerMethodField()
    is_remote = serializers.SerializerMethodField()

    class Meta:
        model = Author
        fields = [
            "type",
            "id",
            "url",
            "host",
            "web",
            "username",
            "displayName",
            "github_username",
            "profileImage",
            "is_approved",
            "is_active",
            "created_at",
            "followers_count",
            "following_count",
            "is_following",
            "node",
            "node_id",
            "is_remote",
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

    def get_node_id(self, obj):
        """Get the node ID for remote authors"""
        return str(obj.node.id) if obj.node else None

    def get_is_remote(self, obj):
        """Check if this is a remote author"""
        return obj.node is not None

    def to_representation(self, instance):
        """
        Customize the representation to match CMPUT 404 spec format.
        """
        # For remote authors, use their original host and web URLs
        # For local authors, use the local site URL
        if instance.node is not None:  # Remote author
            # Use the stored host and web URLs from the remote node
            host_url = instance.host if instance.host else f"{instance.node.host}/api/"
            # Ensure host_url has trailing slash
            if host_url and not host_url.endswith('/'):
                host_url += '/'
            web_url = (
                instance.web
                if instance.web
                else f"{instance.node.host.rstrip('/')}/authors/{instance.id}"
            )
        else:  # Local author
            host_url = f"{settings.SITE_URL}/api/"
            frontend_url = getattr(settings, 'FRONTEND_URL', settings.SITE_URL)
            web_url = f"{frontend_url}/authors/{instance.id}"

        # CMPUT 404 compliant format - only required fields
        result = {
            "type": "author",
            "id": instance.url.rstrip('/') if instance.url else None,  # Full URL as ID per spec, remove trailing slash
            "host": host_url,
            "displayName": instance.displayName,
            "github": (
                f"https://github.com/{instance.github_username}"
                if instance.github_username
                else ""
            ),
            "profileImage": instance.profileImage or "",
            "web": web_url,
        }

        return result
