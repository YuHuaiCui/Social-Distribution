from django.db import models
from django.conf import settings
import uuid

from .author import Author
from .entry import Entry


class SavedEntry(models.Model):
    """Tracks which entries have been saved/bookmarked by users"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Author who saved the entry
    author = models.ForeignKey(
        Author, on_delete=models.CASCADE, related_name="saved_entries"
    )

    # Entry that was saved
    entry = models.ForeignKey(
        Entry,
        on_delete=models.CASCADE,
        related_name="saved_by",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Ensure one save per author per entry
        unique_together = [["author", "entry"]]
        indexes = [
            models.Index(fields=["entry", "created_at"]),
            models.Index(fields=["author", "created_at"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["entry"]),
            models.Index(fields=["author"]),
        ]

    def __str__(self):
        """
        String representation of the saved entry.
        
        Returns:
            str: A human-readable string showing who saved which entry
        """
        return f"SavedEntry by {self.author} for {self.entry}"
