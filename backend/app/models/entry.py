from django.db import models
from django.conf import settings
import uuid

from .author import Author


class EntryManager(models.Manager):
    def public_entries(self):
        """Get all public entries"""
        return self.filter(visibility=Entry.PUBLIC)

    def visible_to_author(self, viewing_author):
        """Get entries visible to a specific author - optimized"""
        from django.db.models import Q, Exists, OuterRef
        from .friendship import Friendship
        from .follow import Follow

        # Use exists() subqueries for better performance
        friendship_exists = Friendship.objects.filter(
            Q(author1=viewing_author, author2=OuterRef("author"))
            | Q(author1=OuterRef("author"), author2=viewing_author)
        )

        # Check if viewing_author is a follower of the post author
        follower_exists = Follow.objects.filter(
            follower=viewing_author, followed=OuterRef("author"), status=Follow.ACCEPTED
        )

        return self.filter(
            Q(visibility=Entry.PUBLIC)  # Public entries
            | Q(visibility=Entry.UNLISTED, author=viewing_author)  # Own unlisted
            | Q(visibility=Entry.UNLISTED)
            & (
                Exists(follower_exists) | Exists(friendship_exists)
            )  # Unlisted visible to followers and friends
            | Q(
                visibility=Entry.FRIENDS_ONLY, author=viewing_author
            )  # Own friends-only
            | Q(visibility=Entry.FRIENDS_ONLY)
            & Exists(friendship_exists)  # Friends-only from friends only
        ).exclude(visibility=Entry.DELETED)


class Entry(models.Model):
    """Represents posts/entries in the social network"""

    PUBLIC = "PUBLIC"
    UNLISTED = "UNLISTED"
    FRIENDS_ONLY = "FRIENDS"
    DELETED = "DELETED"

    VISIBILITY_CHOICES = [
        (PUBLIC, "Public"),
        (UNLISTED, "Unlisted"),
        (FRIENDS_ONLY, "Friends Only"),
        (DELETED, "Deleted"),
    ]

    TEXT_PLAIN = "text/plain"
    TEXT_MARKDOWN = "text/markdown"
    IMAGE_PNG = "image/png"
    IMAGE_JPEG = "image/jpeg"

    CONTENT_TYPE_CHOICES = [
        (TEXT_PLAIN, "Plain Text"),
        (TEXT_MARKDOWN, "Markdown"),
        (IMAGE_PNG, "PNG Image"),
        (IMAGE_JPEG, "JPEG Image"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField(unique=True, help_text="Full URL identifier (FQID)")

    # Author relationship using URL
    author = models.ForeignKey(
        Author, on_delete=models.CASCADE, related_name="entries", to_field="url"
    )

    title = models.CharField(max_length=255)
    description = models.TextField(
        blank=True, 
        help_text="Brief description of the entry for preview purposes"
    )
    content = models.TextField()
    content_type = models.CharField(
        max_length=50, choices=CONTENT_TYPE_CHOICES, default=TEXT_PLAIN
    )

    visibility = models.CharField(
        max_length=20, choices=VISIBILITY_CHOICES, default=PUBLIC
    )

    # GitHub integration
    source = models.URLField(blank=True, help_text="Source URL (e.g., GitHub)")
    origin = models.URLField(blank=True, help_text="Origin URL")

    # Additional fields for project spec compliance
    type = models.CharField(
        max_length=20, 
        default="entry", 
        help_text="Object type for federation (always 'entry')"
    )
    web = models.URLField(
        blank=True, 
        help_text="Frontend URL where this entry can be viewed"
    )
    published = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="ISO 8601 timestamp of when the entry was published"
    )
    
    # Image data for image posts
    image_data = models.BinaryField(null=True, blank=True, help_text="Image data stored as blob")
    
    # Tracking for federation
    inboxes_sent_to = models.ManyToManyField(
        Author, through="InboxDelivery", related_name="received_entries"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = EntryManager()

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "entries"
        indexes = [
            models.Index(fields=["author", "visibility"]),
            models.Index(fields=["visibility", "created_at"]),
            models.Index(fields=["author", "created_at"]),
            models.Index(fields=["content_type"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
            models.Index(fields=["-created_at"]),  # For default ordering
            models.Index(fields=["visibility"]),
            models.Index(
                fields=["author", "visibility", "created_at"]
            ),  # Compound for filtered streams
        ]

    def save(self, *args, **kwargs):
        """
        Save the entry and auto-generate URL if not provided.
        
        For local authors, automatically generates the API URL based on the
        site URL and entry/author IDs. Remote entries should have their URL
        provided during creation.
        
        Args:
            *args: Variable length argument list
            **kwargs: Arbitrary keyword arguments
        """
        # Auto-generate URL for local entries
        if not self.url:
            if self.author.is_local:
                self.url = f"{settings.SITE_URL}/api/authors/{self.author.id}/entries/{self.id}"
            else:
                # For remote entries, URL should be provided
                pass
        
        # Auto-generate web URL for local entries
        if not self.web and self.author.is_local:
            self.web = f"{settings.SITE_URL}/authors/{self.author.id}/entries/{self.id}"
        
        # Set published timestamp to created_at if not provided
        if not self.published and not self.pk:
            # This is a new entry, will use created_at after save
            pass
        
        super().save(*args, **kwargs)
        
        # Update published to match created_at if still not set
        if not self.published and self.created_at:
            self.published = self.created_at
            # Save again only if we just set published
            super().save(update_fields=['published'])

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
