from django.db import models

from .author import Author
from .follow import Follow


class Friendship(models.Model):
    """
    Represents computed friendship relationships between authors.

    A friendship exists when both authors follow each other with accepted status.
    This model is automatically maintained by signals when Follow relationships
    are created, updated, or deleted.

    The friendship relationship is bidirectional but stored as a single record
    with consistent ordering (author1.url < author2.url) to avoid duplicates.
    """

    author1 = models.ForeignKey(
        Author,
        on_delete=models.CASCADE,
        related_name="friendships_as_author1",
        to_field="url",
    )
    author2 = models.ForeignKey(
        Author,
        on_delete=models.CASCADE,
        related_name="friendships_as_author2",
        to_field="url",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["author1", "author2"]
        constraints = [
            # Prevent self-friendships (an author cannot be friends with themselves)
            models.CheckConstraint(
                check=~models.Q(author1=models.F("author2")), name="no_self_friendship"
            )
        ]
        indexes = [
            models.Index(fields=["author1"]),
            models.Index(fields=["author2"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["author1", "author2"]),
        ]

    def __str__(self):
        """
        String representation of the friendship.

        Returns:
            str: A human-readable string showing the bidirectional friendship between two authors
        """
        return f"Friendship: {self.author1} <-> {self.author2}"

    @classmethod
    def update_friendships(cls, author1, author2):
        """
        Update friendship status between two authors based on their follow relationships.

        This method is called by signals whenever Follow objects are created, updated,
        or deleted. It checks if both authors follow each other with ACCEPTED status
        and creates/deletes the friendship accordingly.

        Algorithm:
        1. Check if author1 follows author2 with ACCEPTED status
        2. Check if author2 follows author1 with ACCEPTED status
        3. If both conditions are true, create friendship (if it doesn't exist)
        4. If either condition is false, delete friendship (if it exists)

        The friendship record uses consistent ordering (author1.url < author2.url)
        to ensure uniqueness and avoid duplicate records.

        Args:
            author1: First author in the relationship
            author2: Second author in the relationship
        """
        # Check if both authors follow each other with accepted status
        follows_1_to_2 = Follow.objects.filter(
            follower=author1, followed=author2, status=Follow.ACCEPTED
        ).exists()
        follows_2_to_1 = Follow.objects.filter(
            follower=author2, followed=author1, status=Follow.ACCEPTED
        ).exists()

        # Both follow each other - create friendship if it doesn't exist
        if follows_1_to_2 and follows_2_to_1:
            # Ensure consistent ordering for unique constraint (lexicographic by URL)
            if str(author1.url) < str(author2.url):
                a1, a2 = author1, author2
            else:
                a1, a2 = author2, author1

            # Create friendship if it doesn't already exist
            cls.objects.get_or_create(author1=a1, author2=a2)
        else:
            # Delete any existing friendship since mutual follow no longer exists
            cls.objects.filter(
                models.Q(author1=author1, author2=author2)
                | models.Q(author1=author2, author2=author1)
            ).delete()
