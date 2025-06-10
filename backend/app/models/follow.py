from django.db import models

from .author import Author


class Follow(models.Model):
    """Represents follow relationships between authors"""

    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (ACCEPTED, "Accepted"),
        (REJECTED, "Rejected"),
    ]

    # Use URL-based foreign keys for federation
    follower = models.ForeignKey(
        Author, on_delete=models.CASCADE, related_name="following_set", to_field="url"
    )
    followed = models.ForeignKey(
        Author, on_delete=models.CASCADE, related_name="followers_set", to_field="url"
    )

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["follower", "followed"]
        indexes = [
            models.Index(fields=["follower", "status"]),
            models.Index(fields=["followed", "status"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
            models.Index(
                fields=["follower", "followed", "status"]
            ),  # Compound for lookups
        ]

    def __str__(self):
        return f"{self.follower} -> {self.followed} ({self.status})"
