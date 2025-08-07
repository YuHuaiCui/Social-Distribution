from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from django.conf import settings
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
import uuid
import re

from .node import Node


class AuthorManager(UserManager):
    def get_queryset(self):
        """
        Override to include all users (both active and inactive).
        This ensures remote authors (is_active=False) are included in queries.
        """
        # Use the base Manager's get_queryset instead of UserManager's
        # to avoid Django's default is_active=True filtering
        from django.db import models
        return models.Manager.get_queryset(self)

    def local_authors(self):
        """Get all local authors (authors from this instance)"""
        return self.filter(node__isnull=True)

    def remote_authors(self):
        """Get all remote authors (authors from federated instances)"""
        return self.filter(node__isnull=False)

    def approved_authors(self):
        """Get all approved authors (approved by admin)"""
        return self.filter(is_approved=True)

    def active_authors(self):
        """Get only active authors (can log in)"""
        return self.filter(is_active=True)

    def create_user(self, username, email=None, password=None, **kwargs):
        """Create a user with required password validation"""
        if not password:
            raise ValueError("Password is required for all users")
        return super().create_user(username, email, password, **kwargs)

    def create_superuser(self, username, email=None, password=None, **kwargs):
        """Create a superuser with required password validation"""
        if not password:
            raise ValueError("Password is required for all users")
        return super().create_superuser(username, email, password, **kwargs)


class Author(AbstractUser):
    """
    Extends Django's User model to represent both local and remote authors.

    This model serves as both the User model and Author model, supporting
    federated social networking where authors can be from different nodes/instances.
    Each author has a unique URL identifier that serves as their canonical ID
    across the federated network.
    """

    # Use UUID as primary key for better federation support
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField(unique=True, help_text="Full URL identifier (FQID)")
    
    # Override email field from AbstractUser to make it not required
    email = models.EmailField(blank=True, null=True)

    # ActivityPub/Federation compliance fields
    type = models.CharField(
        max_length=20,
        default="author",
        help_text="Object type for federation (always 'author')",
    )
    host = models.URLField(blank=True, help_text="API host URL for this author's node")
    web = models.URLField(
        blank=True, help_text="Frontend URL where this author's profile can be viewed"
    )

    # Profile information
    displayName = models.CharField(max_length=255, blank=True, default="")
    github_username = models.CharField(max_length=255, blank=True, default="", null=False)
    profileImage = models.TextField(
        blank=True, default="", null=False, help_text="Profile image as data URL or regular URL"
    )

    # Federation: null for local authors, set for remote authors
    node = models.ForeignKey(
        Node,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Remote node this author belongs to (null for local authors)",
    )

    # Admin approval system for new user registrations
    is_approved = models.BooleanField(
        default=False, help_text="Whether admin has approved this author"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = AuthorManager()

    class Meta:
        indexes = [
            models.Index(fields=["node"]),
            models.Index(fields=["is_approved"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
            models.Index(fields=["displayName"]),
            models.Index(fields=["github_username"]),
            # Compound index for efficient queries of remote approved authors
            models.Index(fields=["node", "is_approved"]),
        ]

    def clean(self):
        """Validate the model data before saving"""
        super().clean()

        # Ensure password is not empty for new users
        if not self.pk and not self.password:
            raise ValidationError({"password": "Password is required for all authors."})

        # Validate password strength if password is being set (but not already hashed)
        if self.password and not self.password.startswith("pbkdf2_"):
            # Only validate raw passwords, not already hashed ones
            try:
                validate_password(self.password, self)
            except ValidationError as e:
                raise ValidationError({"password": list(e.messages)})

        # Validate that username contains no spaces
        if self.username and ' ' in self.username:
            raise ValidationError({"username": "Username cannot contain spaces."})

        # Validate that displayName contains no spaces
        if self.displayName and ' ' in self.displayName:
            raise ValidationError({"displayName": "Display name cannot contain spaces."})

    def get_friends(self):
        """
        Get all friends of this author.

        Friends are authors who have mutual follow relationships (both follow each other).
        This uses the Friendship model which is automatically maintained by signals.
        """
        # Import here to avoid circular import
        from .friendship import Friendship

        return Author.objects.filter(
            models.Q(friendships_as_author1__author2=self)
            | models.Q(friendships_as_author2__author1=self)
        )

    def get_followers(self):
        """Get all authors who are following this author with accepted status"""
        # Import here to avoid circular import
        from .follow import Follow

        return Author.objects.filter(
            following_set__followed=self, following_set__status=Follow.ACCEPTED
        )

    def get_following(self):
        """Get all authors this author is following with accepted status"""
        # Import here to avoid circular import
        from .follow import Follow

        return Author.objects.filter(
            followers_set__follower=self, followers_set__status=Follow.ACCEPTED
        )

    def is_friend_with(self, other_author):
        """
        Check if this author is friends with another author.

        Friendship requires mutual following with accepted status.
        """
        # Import here to avoid circular import
        from .friendship import Friendship

        return Friendship.objects.filter(
            models.Q(author1=self, author2=other_author)
            | models.Q(author1=other_author, author2=self)
        ).exists()

    def is_following(self, other_author):
        """Check if this author is following another author with accepted status"""
        # Import here to avoid circular import
        from .follow import Follow

        return Follow.objects.filter(
            follower=self, followed=other_author, status=Follow.ACCEPTED
        ).exists()

    def has_follow_request_from(self, other_author):
        """Check if there's a pending follow request from another author to this author"""
        # Import here to avoid circular import
        from .follow import Follow

        return Follow.objects.filter(
            follower=other_author, followed=self, status=Follow.REQUESTING
        ).exists()

    def has_sent_follow_request_to(self, other_author):
        """Check if this author has sent a pending follow request to another author"""
        # Import here to avoid circular import
        from .follow import Follow

        return Follow.objects.filter(
            follower=self, followed=other_author, status=Follow.REQUESTING
        ).exists()

    def save(self, *args, **kwargs):
        """
        Custom save method to auto-generate URLs and validate requirements.

        For local authors (node=None), automatically generates:
        - url: API endpoint URL for this author
        - host: API base URL for this instance
        - web: Frontend profile URL

        Remote authors should have these fields provided during creation.
        """
        # Ensure password exists before saving
        if not self.pk and not self.password:
            raise ValueError("Password is required for all authors")

        # Save first to get the ID for URL generation
        super().save(*args, **kwargs)

        # Auto-generate URLs for local authors only
        if not self.node:  # Local author
            update_fields = []

            # Generate canonical API URL if not set
            if not self.url:
                self.url = f"{settings.SITE_URL}/api/authors/{self.id}"
                update_fields.append("url")

            # Generate API host URL if not set
            if not self.host:
                self.host = f"{settings.SITE_URL}/api/"
                update_fields.append("host")

            # Generate frontend profile URL if not set
            if not self.web:
                frontend_url = getattr(settings, 'FRONTEND_URL', settings.SITE_URL)
                self.web = f"{frontend_url}/authors/{self.id}"
                update_fields.append("web")

            # Only save again if we actually updated fields to avoid infinite recursion
            if update_fields:
                super().save(update_fields=update_fields)

    @property
    def is_local(self):
        """True if this author belongs to this instance (not federated)"""
        return self.node is None

    @property
    def is_remote(self):
        """True if this author belongs to a remote federated instance"""
        return self.node is not None

    def __str__(self):
        return self.displayName or self.username
