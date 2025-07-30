from django.db import models
from django.conf import settings
import uuid

from .author import Author


class EntryManager(models.Manager):
    def public_entries(self):
        """Get all public entries (visible to everyone)"""
        return self.filter(visibility=Entry.PUBLIC)

    def visible_to_author(self, viewing_author):
        """
        Get entries visible to a specific author based on complex visibility rules.

        Visibility logic:
        - PUBLIC: Visible to everyone (including anonymous users)
        - UNLISTED: Visible to the author, their followers, and friends (including anonymous users with the link)
        - FRIENDS_ONLY: Visible only to the author and their friends
        - DELETED: Not visible to anyone (soft-deleted entries)

        Anonymous users can only see PUBLIC and UNLISTED entries.

        Args:
            viewing_author: The author requesting to view entries (None for anonymous)

        Returns:
            QuerySet: Filtered entries based on visibility permissions
        """
        from django.db.models import Q, Exists, OuterRef
        from .friendship import Friendship
        from .follow import Follow

        # Anonymous users: only show PUBLIC and UNLISTED entries
        if viewing_author is None:
            return self.filter(Q(visibility=Entry.PUBLIC)).exclude(
                visibility=Entry.DELETED
            )

        # Use EXISTS subqueries for better performance on large datasets
        # Check if viewing_author is friends with the post author
        friendship_exists = Friendship.objects.filter(
            Q(author1=viewing_author, author2=OuterRef("author"))
            | Q(author1=OuterRef("author"), author2=viewing_author)
        )

        # Check if viewing_author is a follower of the post author
        follower_exists = Follow.objects.filter(
            follower=viewing_author, followed=OuterRef("author"), status=Follow.ACCEPTED
        )

        queryset = self.filter(
            Q(visibility=Entry.PUBLIC)  # Public entries visible to all
            | Q(visibility=Entry.UNLISTED, author=viewing_author)  # Own unlisted posts
            | Q(visibility=Entry.UNLISTED)
            & (
                Exists(follower_exists) | Exists(friendship_exists)
            )  # Unlisted posts visible to followers and friends
            | Q(
                visibility=Entry.FRIENDS_ONLY, author=viewing_author
            )  # Own friends-only posts
            | Q(visibility=Entry.FRIENDS_ONLY)
            & Exists(friendship_exists)  # Friends-only posts from friends
        ).exclude(visibility=Entry.DELETED)

        # Debug logging
        from .author import Author

        public_posts = queryset.filter(visibility=Entry.PUBLIC)
        remote_public_count = public_posts.filter(author__node__isnull=False).count()
        local_public_count = public_posts.filter(author__node__isnull=True).count()

        if remote_public_count > 0 or local_public_count > 0:
            print(
                f"DEBUG visible_to_author: Found {local_public_count} local PUBLIC posts and {remote_public_count} remote PUBLIC posts"
            )

            # Log sample remote posts
            remote_posts = public_posts.filter(author__node__isnull=False)[:2]
            for post in remote_posts:
                print(
                    f"DEBUG visible_to_author: Remote post - Title: {post.title}, Author: {post.author.username}, Node: {post.author.node.name if post.author.node else 'Unknown'}"
                )

        return queryset


class Entry(models.Model):
    """
    Represents posts/entries in the social network.

    Supports multiple content types including text (plain/markdown) and images.
    Implements a visibility system with public, unlisted, friends-only, and deleted states.
    Uses soft deletion to preserve data integrity while hiding deleted content.
    """

    # Visibility levels for posts
    PUBLIC = "PUBLIC"
    UNLISTED = "UNLISTED"
    FRIENDS_ONLY = "FRIENDS"
    FRIENDS = FRIENDS_ONLY  #
    DELETED = "DELETED"

    VISIBILITY_CHOICES = [
        (PUBLIC, "Public"),
        (UNLISTED, "Unlisted"),
        (FRIENDS_ONLY, "Friends Only"),
        (DELETED, "Deleted"),
    ]

    # Supported content types
    TEXT_PLAIN = "text/plain"
    TEXT_MARKDOWN = "text/markdown"
    IMAGE_PNG = "image/png"
    IMAGE_JPEG = "image/jpeg"
    IMAGE_PNG_BASE64 = "image/png;base64"
    IMAGE_JPEG_BASE64 = "image/jpeg;base64"
    APPLICATION_BASE64 = "application/base64"

    CONTENT_TYPE_CHOICES = [
        (TEXT_PLAIN, "Plain Text"),
        (TEXT_MARKDOWN, "Markdown"),
        (IMAGE_PNG, "PNG Image"),
        (IMAGE_JPEG, "JPEG Image"),
        (IMAGE_PNG_BASE64, "PNG Image (Base64)"),
        (IMAGE_JPEG_BASE64, "JPEG Image (Base64)"),
        (APPLICATION_BASE64, "Base64 Data"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField(unique=True, help_text="Full URL identifier (FQID)")
    fqid = models.URLField(unique=True, null=True, blank=True)

    # Foreign key to Author using URL field for federation compatibility
    author = models.ForeignKey(
        Author, on_delete=models.CASCADE, related_name="entries", to_field="url"
    )

    title = models.CharField(max_length=255)
    description = models.TextField(
        blank=True, help_text="Brief description of the entry for preview purposes"
    )
    content = models.TextField()
    content_type = models.CharField(
        max_length=50, choices=CONTENT_TYPE_CHOICES, default=TEXT_PLAIN
    )

    # Categories for organizing entries
    categories = models.JSONField(
        default=list, blank=True, help_text="List of categories this entry belongs to"
    )

    visibility = models.CharField(
        max_length=20, choices=VISIBILITY_CHOICES, default=PUBLIC
    )

    # GitHub integration fields for linking to external sources
    source = models.URLField(blank=True, help_text="Source URL (e.g., GitHub)")
    origin = models.URLField(blank=True, help_text="Origin URL")

    # ActivityPub/Federation compliance fields
    type = models.CharField(
        max_length=20,
        default="entry",
        help_text="Object type for federation (always 'entry')",
    )
    web = models.URLField(
        blank=True, help_text="Frontend URL where this entry can be viewed"
    )
    published = models.DateTimeField(
        null=True,
        blank=True,
        help_text="ISO 8601 timestamp of when the entry was published",
    )

    # Image storage: binary data stored directly in database
    image_data = models.BinaryField(
        null=True, blank=True, help_text="Image data stored as blob"
    )

    # Federation tracking: which inboxes this entry has been delivered to
    inboxes_sent_to = models.ManyToManyField(
        Author, through="InboxDelivery", related_name="received_entries"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = EntryManager()

    class Meta:
        ordering = [
            "-published",
            "-created_at",
        ]  # Primary sort by published, fallback to created_at
        verbose_name_plural = "entries"
        indexes = [
            models.Index(fields=["author", "visibility"]),
            models.Index(fields=["visibility", "published"]),
            models.Index(fields=["author", "published"]),
            models.Index(fields=["content_type"]),
            models.Index(fields=["published"]),
            models.Index(fields=["-published"]),  # For default ordering
            models.Index(fields=["visibility"]),
            # Keep created_at indexes for backward compatibility and fallback
            models.Index(fields=["created_at"]),
            models.Index(fields=["-created_at"]),
            # Compound index for efficient filtered streams (author + visibility + time)
            models.Index(fields=["author", "visibility", "published"]),
            models.Index(fields=["author", "visibility", "created_at"]),  # Fallback
        ]

    def save(self, *args, **kwargs):
        """
        Custom save method to auto-generate URLs and set timestamps.

        For local entries (from local authors), automatically generates:
        - url: API endpoint URL for this entry
        - web: Frontend URL where the entry can be viewed
        - published: Timestamp when the entry was first created

        Remote entries should have these fields provided during creation.
        """
        # Determine if this is a new entry
        is_new_entry = not self.pk

        # Auto-generate URL for local entries
        if not self.url and self.author.is_local:
            self.url = (
                f"{settings.SITE_URL}/api/authors/{self.author.id}/entries/{self.id}"
            )

        # Auto-generate web URL for local entries
        if not self.web and self.author.is_local:
            frontend_url = getattr(settings, "FRONTEND_URL", settings.SITE_URL)
            self.web = f"{frontend_url}/authors/{self.author.id}/entries/{self.id}"

        # Save the entry first to get created_at timestamp
        super().save(*args, **kwargs)

        # Set published timestamp to match created_at for new entries
        if is_new_entry and not self.published and self.created_at:
            self.published = self.created_at
            # Update only the published field to avoid triggering save signals again
            super().save(update_fields=["published"])

    @property
    def is_deleted(self):
        """
        Check if the entry has been soft-deleted.

        Returns:
            bool: True if the entry's visibility is set to DELETED, False otherwise
        """
        return self.visibility == self.DELETED

    def __str__(self):
        """
        String representation of the entry.

        Returns:
            str: A human-readable string showing the entry title and author
        """
        return f"{self.title} by {self.author}"


class InboxDelivery(models.Model):
    """
    Tracks delivery of entries to author inboxes for federation.

    This model maintains a record of which entries have been delivered to
    which authors' inboxes, supporting the distributed nature of the social
    network. It helps prevent duplicate deliveries and provides an audit
    trail for federation activities.

    Attributes:
        entry: The entry that was delivered
        recipient: The author who received the entry in their inbox
        delivered_at: Timestamp of when the delivery occurred
        success: Whether the delivery was successful
    """

    entry = models.ForeignKey(Entry, on_delete=models.CASCADE)
    recipient = models.ForeignKey(Author, on_delete=models.CASCADE, to_field="url")
    delivered_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True)

    class Meta:
        unique_together = ["entry", "recipient"]
        indexes = [
            models.Index(fields=["entry"]),
            models.Index(fields=["recipient"]),
            models.Index(fields=["delivered_at"]),
            models.Index(fields=["success"]),
            models.Index(fields=["recipient", "delivered_at"]),
        ]
