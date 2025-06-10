from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
import uuid

from .node import Node


class AuthorManager(models.Manager):
    def local_authors(self):
        """Get all local authors"""
        return self.filter(node__isnull=True)

    def remote_authors(self):
        """Get all remote authors"""
        return self.filter(node__isnull=False)

    def approved_authors(self):
        """Get all approved authors"""
        return self.filter(is_approved=True)


class Author(AbstractUser):
    """
    Extends Django's User model to represent both local and remote authors.
    Uses full URL as unique identifier
    """

    # Override username to store full URL for remote authors
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField(unique=True, help_text="Full URL identifier (FQID)")

    # Profile information
    display_name = models.CharField(max_length=255, blank=True)
    github_username = models.CharField(max_length=255, blank=True)
    profile_image = models.URLField(blank=True)
    bio = models.TextField(blank=True)

    # Node relationship - null for local authors
    node = models.ForeignKey(
        Node,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Remote node this author belongs to (null for local authors)",
    )

    # Admin approval
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
            models.Index(fields=["display_name"]),
            models.Index(fields=["github_username"]),
            models.Index(
                fields=["node", "is_approved"]
            ),  # Compound index for remote approved authors
        ]

    def get_friends(self):
        """Get all friends of this author"""
        # Import here to avoid circular import
        from .friendship import Friendship

        return Author.objects.filter(
            models.Q(friendships_as_author1__author2=self)
            | models.Q(friendships_as_author2__author1=self)
        )

    def get_followers(self):
        """Get all approved followers"""
        # Import here to avoid circular import
        from .follow import Follow

        return Author.objects.filter(
            following_set__followed=self, following_set__status=Follow.ACCEPTED
        )

    def get_following(self):
        """Get all authors this author is following (approved)"""
        # Import here to avoid circular import
        from .follow import Follow

        return Author.objects.filter(
            followers_set__follower=self, followers_set__status=Follow.ACCEPTED
        )

    def is_friend_with(self, other_author):
        """Check if this author is friends with another"""
        # Import here to avoid circular import
        from .friendship import Friendship

        return Friendship.objects.filter(
            models.Q(author1=self, author2=other_author)
            | models.Q(author1=other_author, author2=self)
        ).exists()

    def is_following(self, other_author):
        """Check if this author is following another"""
        # Import here to avoid circular import
        from .follow import Follow

        return Follow.objects.filter(
            follower=self, followed=other_author, status=Follow.ACCEPTED
        ).exists()

    def has_follow_request_from(self, other_author):
        """Check if there's a pending follow request from another author"""
        # Import here to avoid circular import
        from .follow import Follow

        return Follow.objects.filter(
            follower=other_author, followed=self, status=Follow.PENDING
        ).exists()

    def has_sent_follow_request_to(self, other_author):
        """Check if this author has sent a follow request to another"""
        # Import here to avoid circular import
        from .follow import Follow

        return Follow.objects.filter(
            follower=self, followed=other_author, status=Follow.PENDING
        ).exists()

    def save(self, *args, **kwargs):
        # Auto-generate URL for local authors
        if not self.url and not self.node:
            # This will be set after save when we have the ID
            pass
        super().save(*args, **kwargs)

        # Set URL after save for local authors
        if not self.url and not self.node:
            self.url = f"{settings.SITE_URL}/api/authors/{self.id}"
            super().save(update_fields=["url"])

    @property
    def is_local(self):
        return self.node is None

    @property
    def is_remote(self):
        return self.node is not None

    def __str__(self):
        return self.display_name or self.username
