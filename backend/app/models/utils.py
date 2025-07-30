from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .author import Author
from .entry import Entry, InboxDelivery
from .like import Like
from .comment import Comment
from .follow import Follow
from .friendship import Friendship


# Signal handlers for automatic friendship management
@receiver(post_save, sender=Follow)
def update_friendship_on_follow_save(sender, instance, **kwargs):
    """
    Automatically update friendship status when follow relationships change.

    Called whenever a Follow object is saved. If the follow status becomes ACCEPTED,
    checks if there's a mutual follow relationship and creates/updates the friendship.
    """
    if instance.status == Follow.ACCEPTED:
        Friendship.update_friendships(instance.follower, instance.followed)


@receiver(post_delete, sender=Follow)
def update_friendship_on_follow_delete(sender, instance, **kwargs):
    """
    Automatically update friendship status when follow relationships are deleted.

    Called whenever a Follow object is deleted. Removes friendship if the mutual
    follow relationship no longer exists.
    """
    Friendship.update_friendships(instance.follower, instance.followed)


# Utility functions for common operations
def get_author_stream(author, page=1, size=20):
    """
    Get the stream of entries for an author with pagination.

    Returns entries that the author can see based on visibility rules,
    follows, and friendships.

    Args:
        author: The author requesting the stream
        page: Page number (1-based)
        size: Number of entries per page

    Returns:
        QuerySet: Paginated entries visible to the author
    """
    visible_entries = Entry.objects.visible_to_author(author)

    # Calculate pagination offsets
    start = (page - 1) * size
    end = start + size

    return visible_entries[start:end]


def deliver_to_inboxes(entry, recipients):
    """
    Deliver an entry to multiple author inboxes for federation.

    Creates delivery tracking records for federation.
    This function is designed to be called asynchronously in production to
    avoid blocking the main request when delivering to many recipients.

    Args:
        entry: The Entry object to deliver
        recipients: List/QuerySet of Author objects to deliver to
    """
    delivery_items = []

    for recipient in recipients:
        # Prepare delivery tracking record
        delivery_items.append(
            InboxDelivery(entry=entry, recipient=recipient, success=True)
        )

    # Use bulk operations for better performance with many recipients
    InboxDelivery.objects.bulk_create(delivery_items, ignore_conflicts=True)


def get_mutual_friends(author1, author2):
    """
    Get authors who are friends with both specified authors.

    Uses efficient EXISTS subqueries to find common friends without
    loading all friendship data into memory.

    Args:
        author1: First author
        author2: Second author

    Returns:
        QuerySet: Authors who are friends with both author1 and author2
    """
    from django.db.models import Exists, OuterRef

    # Authors that are friends with author1
    friends_with_author1 = Friendship.objects.filter(
        models.Q(author1=author1, author2=OuterRef("pk"))
        | models.Q(author1=OuterRef("pk"), author2=author1)
    )

    # Authors that are friends with author2
    friends_with_author2 = Friendship.objects.filter(
        models.Q(author1=author2, author2=OuterRef("pk"))
        | models.Q(author1=OuterRef("pk"), author2=author2)
    )

    # Return authors who are friends with both (excluding the input authors themselves)
    return Author.objects.filter(
        Exists(friends_with_author1) & Exists(friends_with_author2)
    ).exclude(pk__in=[author1.pk, author2.pk])


def has_liked_entry(author, entry):
    """
    Check if an author has liked a specific entry.

    Args:
        author: Author to check
        entry: Entry to check for likes

    Returns:
        bool: True if the author has liked the entry, False otherwise
    """
    return Like.objects.filter(author=author, entry=entry).exists()


def has_liked_comment(author, comment):
    """
    Check if an author has liked a specific comment.

    Args:
        author: Author to check
        comment: Comment to check for likes

    Returns:
        bool: True if the author has liked the comment, False otherwise
    """
    return Like.objects.filter(author=author, comment=comment).exists()
