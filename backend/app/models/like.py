from django.db import models
from django.conf import settings
import uuid

from .author import Author
from .entry import Entry
from .comment import Comment


class Like(models.Model):
    """Likes on entries or comments"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField(unique=True, help_text="Full URL identifier (FQID)")

    # Author who liked
    author = models.ForeignKey(
        Author, on_delete=models.CASCADE, related_name="likes", to_field="url"
    )

    # What was liked (entry or comment)
    entry = models.ForeignKey(
        Entry,
        on_delete=models.CASCADE,
        related_name="likes",
        null=True,
        blank=True,
        to_field="url",
    )
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name="likes",
        null=True,
        blank=True,
        to_field="url",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Ensure one like per author per object
        constraints = [
            models.CheckConstraint(
                check=models.Q(entry__isnull=False) | models.Q(comment__isnull=False),
                name="like_has_target",
            ),
            models.CheckConstraint(
                check=~(
                    models.Q(entry__isnull=False) & models.Q(comment__isnull=False)
                ),
                name="like_single_target",
            ),
        ]
        unique_together = [
            ["author", "entry"],
            ["author", "comment"],
        ]
        indexes = [
            models.Index(fields=["entry", "created_at"]),
            models.Index(fields=["comment", "created_at"]),
            models.Index(fields=["author", "created_at"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["entry"]),
            models.Index(fields=["comment"]),
            models.Index(fields=["author"]),
        ]

    def save(self, *args, **kwargs):
        """
        Save the like and auto-generate URL if not provided.
        
        For likes by local authors, automatically generates the API URL.
        The URL structure follows the pattern: /api/authors/{author_id}/liked/{like_id}
        
        Args:
            *args: Variable length argument list
            **kwargs: Arbitrary keyword arguments
        """
        # First save to get the ID
        super().save(*args, **kwargs)
        
        # Then update the URL if not provided
        if not self.url and self.author.is_local:
            # URL pattern for likes: /api/authors/{author_id}/liked/{like_id}
            self.url = f"{settings.SITE_URL}/api/authors/{self.author.id}/liked/{self.id}"
            # Save again to update the URL
            super().save(update_fields=['url'])

    def __str__(self):
        """
        String representation of the like.
        
        Returns:
            str: A human-readable string showing who liked what (entry or comment)
        """
        target = self.entry or self.comment
        return f"Like by {self.author} on {target}"
