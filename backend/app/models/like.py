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

        For likes created on this node (by local authors), automatically generates the API URL.
        Only remote likes (likes that originated from other nodes) must already include a valid URL.
        """
        if not self.url:
            # Always generate URL for likes created on this node
            # This includes local authors liking any content (local or remote)
            temp_id = self.id or uuid.uuid4()
            self.url = f"{settings.SITE_URL}/api/authors/{self.author.id}/liked/{temp_id}"

        super().save(*args, **kwargs)


    def __str__(self):
        """
        String representation of the like.
        
        Returns:
            str: A human-readable string showing who liked what (entry or comment)
        """
        target = self.entry or self.comment
        return f"Like by {self.author} on {target}"
