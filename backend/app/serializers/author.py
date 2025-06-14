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

    class Meta:
        model = Author
        fields = [
            "id",
            "url",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "github_username",
            "profile_image",
            "bio",
            "node",
            "is_approved",
            "is_active",
            "is_staff",
            "is_superuser",
            "created_at",
            "updated_at",
            "password",
            "password_confirm",
        ]
        read_only_fields = ["id", "url", "created_at", "updated_at"]
        extra_kwargs = {
            "email": {"required": True},            "username": {"required": True},
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


class AuthorListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing authors"""

    class Meta:
        model = Author
        fields = [
            "id",
            "url",
            "username",
            "email",
            "display_name",
            "github_username",
            "profile_image",
            "is_approved",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "url", "created_at"]


class NodeSerializer(serializers.ModelSerializer):
    """Serializer for Node model (used in nested serialization)"""

    class Meta:
        model = Node
        fields = ["id", "name", "host", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]
