from django.db import models
from django.conf import settings
import uuid

from .author import Author
from .entry import Entry


class Comment(models.Model):
    """Comments on entries"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField(unique=True, help_text="Full URL identifier (FQID)")

    # Relationships using URLs
    author = models.ForeignKey(
        Author, on_delete=models.CASCADE, related_name="comments", to_field="url"
    )
    entry = models.ForeignKey(
        Entry, on_delete=models.CASCADE, related_name="comments", to_field="url"
    )

    content = models.TextField()
    content_type = models.CharField(
        max_length=50, choices=Entry.CONTENT_TYPE_CHOICES, default=Entry.TEXT_PLAIN
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["entry", "created_at"]),
            models.Index(fields=["author", "created_at"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
            models.Index(fields=["entry"]),
            models.Index(fields=["author"]),
        ]

    def save(self, *args, **kwargs):
        if not self.url:
            if self.author.is_local:
                self.url = f"{settings.SITE_URL}/api/authors/{self.author.id}/entries/{self.entry.id}/comments/{self.id}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Comment by {self.author} on {self.entry.title}"
