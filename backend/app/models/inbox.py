from django.db import models
import uuid

from .author import Author


class Inbox(models.Model):
    """
    Stores activities sent to author inboxes for federation support.
    
    The inbox receives different types of activities from remote nodes:
    - entries: New posts from followed authors
    - follows: Follow requests that need approval
    - likes: Notifications of likes on author's content
    - comments: Comments on author's entries
    
    Objects are stored directly in their JSON format instead of foreign key references.
    """
    
    # Activity types
    ENTRY = "entry"
    FOLLOW = "follow" 
    LIKE = "like"
    COMMENT = "comment"
    
    ACTIVITY_TYPE_CHOICES = [
        (ENTRY, "Entry"),
        (FOLLOW, "Follow Request"),
        (LIKE, "Like"),
        (COMMENT, "Comment"),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # The author who owns this inbox (recipient)
    recipient = models.ForeignKey(
        Author, 
        on_delete=models.CASCADE, 
        related_name="inbox_items",
        to_field="url"
    )
    
    # Type of activity
    activity_type = models.CharField(
        max_length=20, 
        choices=ACTIVITY_TYPE_CHOICES
    )
    
    # Store the object directly in JSON format instead of foreign key reference
    object_data = models.JSONField(
        help_text="The actual object (Entry, Follow, Like, Comment) in JSON format",
        default=dict
    )
    
    # Metadata
    is_read = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(auto_now_add=True)
    
    # Store the raw JSON data for federation compliance (keeping for backward compatibility)
    raw_data = models.JSONField(
        help_text="Original JSON data received from remote node",
        null=True,
        blank=True
    )
    
    class Meta:
        ordering = ['-delivered_at']
        indexes = [
            models.Index(fields=['recipient', 'activity_type']),
            models.Index(fields=['recipient', 'is_read']), 
            models.Index(fields=['delivered_at']),
        ]
    
    def __str__(self):
        return f"{self.activity_type} for {self.recipient.username} at {self.delivered_at}"