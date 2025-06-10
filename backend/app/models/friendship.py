from django.db import models

from .author import Author
from .follow import Follow


class Friendship(models.Model):
    """
    Computed friendship relationships.
    A friendship exists when both authors follow each other with accepted status.
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
        return f"Friendship: {self.author1} <-> {self.author2}"

    @classmethod
    def update_friendships(cls, author1, author2):
        """
        Update friendship status between two authors.
        Creates a friendship if both authors follow each other with accepted status.
        Deletes the friendship if they don't.
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
            # Ensure consistent ordering for unique constraint
            if str(author1.url) < str(author2.url):
                a1, a2 = author1, author2
            else:
                a1, a2 = author2, author1

            cls.objects.get_or_create(author1=a1, author2=a2)
        else:
            # Delete any existing friendship
            cls.objects.filter(
                models.Q(author1=author1, author2=author2)
                | models.Q(author1=author2, author2=author1)
            ).delete()
