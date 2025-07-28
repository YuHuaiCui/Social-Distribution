from django.db import models

from .author import Author
from .entry import Entry
from .comment import Comment
from .like import Like
from .follow import Follow


class Inbox(models.Model):
    """
    Represents items in an author's inbox.
    """

    ENTRY = "entry"
    COMMENT = "comment"
    LIKE = "like"
    FOLLOW = "follow"
    REPORT = "report"

    ITEM_TYPE_CHOICES = [
        (ENTRY, "Entry"),
        (COMMENT, "Comment"),
        (LIKE, "Like"),
        (FOLLOW, "Follow Request"),
        (REPORT, "Report"),
    ]

    # Recipient of the inbox item
    recipient = models.ForeignKey(
        Author, on_delete=models.CASCADE, related_name="inbox_items", to_field="url"
    )

    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)

    # Generic relationships to different types of objects
    entry = models.ForeignKey(
        Entry, on_delete=models.CASCADE, null=True, blank=True, to_field="url"
    )
    comment = models.ForeignKey(
        Comment, on_delete=models.CASCADE, null=True, blank=True, to_field="url"
    )
    like = models.ForeignKey(
        Like, on_delete=models.CASCADE, null=True, blank=True, to_field="url"
    )
    follow = models.ForeignKey(Follow, on_delete=models.CASCADE, null=True, blank=True)

    # Raw JSON data for flexibility with remote objects
    raw_data = models.JSONField(help_text="Raw JSON data of the object")

    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "item_type"]),
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "created_at"]),
            models.Index(fields=["item_type"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["is_read"]),
            models.Index(fields=["-created_at"]),  # For default ordering
            models.Index(fields=["recipient"]),
        ]

    def __str__(self):
        """
        String representation of the inbox item.
        
        Returns:
            str: A human-readable string showing the inbox recipient and item type
        """
        return f"Inbox item for {self.recipient}: {self.item_type}"
    
    @property
    def processed_status(self):
        return self.is_read



