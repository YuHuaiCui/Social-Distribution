from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
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
    
    # Generic foreign key to the actual object (Entry, Follow, Like, Comment)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Metadata
    is_read = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(auto_now_add=True)
    
    # Store the raw JSON data for federation compliance
    raw_data = models.JSONField(
        help_text="Original JSON data received from remote node"
    )
    
    class Meta:
        ordering = ['-delivered_at']
        indexes = [
            models.Index(fields=['recipient', 'activity_type']),
            models.Index(fields=['recipient', 'is_read']), 
            models.Index(fields=['delivered_at']),
            models.Index(fields=['content_type', 'object_id']),
        ]
        # Prevent duplicate entries for the same activity
        unique_together = ['recipient', 'content_type', 'object_id']
    
    def __str__(self):
        return f"{self.activity_type} for {self.recipient.username} at {self.delivered_at}"