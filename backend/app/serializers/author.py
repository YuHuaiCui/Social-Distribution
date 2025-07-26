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

    def get_node_id(self, obj):
        """Get the node ID for remote authors"""
        return str(obj.node.id) if obj.node else None

    def get_is_remote(self, obj):
        """Check if this is a remote author"""
        return obj.node is not None

    def to_representation(self, instance):
        """
        Customize the representation to match CMPUT 404 spec format while maintaining compatibility.
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
        data = super().to_representation(instance)

        # CMPUT 404 compliant format with compatibility fields
        result = {
            # CMPUT 404 required fields
            "type": "author",
            "id": instance.url,  # Full URL as ID per spec
            "host": f"{settings.SITE_URL}/api/",
            "displayName": instance.display_name,
            "github": (
                f"https://github.com/{instance.github_username}"
                if instance.github_username
                else ""
            ),
            "profileImage": instance.profile_image or None,
            "web": f"{settings.SITE_URL}/authors/{instance.id}",
            # Additional fields for frontend compatibility
            "url": instance.url,
            "username": instance.username,
            "email": instance.email,
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "display_name": instance.display_name,  # Snake case version
            "github_username": instance.github_username,
            "profile_image": instance.profile_image,
            "bio": instance.bio,
            "location": instance.location,
            "website": instance.website,
            "node": data.get("node"),
            "node_id": data.get("node_id"),
            "is_remote": data.get("is_remote"),
            "is_approved": instance.is_approved,
            "is_active": instance.is_active,
            "is_staff": instance.is_staff,
            "is_superuser": instance.is_superuser,
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
            "is_following": data.get("is_following"),
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
        Customize the representation to match CMPUT 404 spec format while maintaining compatibility.
        """
        data = super().to_representation(instance)

        # CMPUT 404 compliant format with compatibility fields
        result = {
            # CMPUT 404 required fields
            "type": "author",
            "id": instance.url,  # Full URL as ID per spec
            "host": f"{settings.SITE_URL}/api/",
            "displayName": instance.display_name,
            "github": (
                f"https://github.com/{instance.github_username}"
                if instance.github_username
                else ""
            ),
            "profileImage": instance.profile_image or None,
            "web": f"{settings.SITE_URL}/authors/{instance.id}",
            # Additional fields for frontend compatibility
            "url": instance.url,
            "username": instance.username,
            "email": instance.email,
            "display_name": instance.display_name,  # Snake case version
            "github_username": instance.github_username,
            "profile_image": instance.profile_image,
            "location": instance.location,
            "website": instance.website,
            "is_approved": instance.is_approved,
            "is_active": instance.is_active,
            "created_at": data.get("created_at"),
            "followers_count": data.get("followers_count"),
            "following_count": data.get("following_count"),
            "is_following": data.get("is_following"),
            "node_id": data.get("node_id"),
            "is_remote": data.get("is_remote"),
        }

        return result
