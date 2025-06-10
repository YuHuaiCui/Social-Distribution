from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .author import Author
from .entry import Entry, InboxDelivery
from .inbox import Inbox
from .like import Like
from .comment import Comment
from .follow import Follow
from .friendship import Friendship


# Signal handlers for automatic friendship management
@receiver(post_save, sender=Follow)
def update_friendship_on_follow_save(sender, instance, **kwargs):
    """Update friendship when follow status changes"""
    if instance.status == Follow.ACCEPTED:
        Friendship.update_friendships(instance.follower, instance.followed)


@receiver(post_delete, sender=Follow)
def update_friendship_on_follow_delete(sender, instance, **kwargs):
    """Update friendship when follow is deleted"""
    Friendship.update_friendships(instance.follower, instance.followed)


# Utility functions for common operations
def get_author_stream(author, page=1, size=20):
    """
    Get the stream of entries for an author.
    Includes entries they can see based on follows and friendships.
    """
    visible_entries = Entry.objects.visible_to_author(author)

    # Paginate
    start = (page - 1) * size
    end = start + size

    return visible_entries[start:end]


def deliver_to_inboxes(entry, recipients):
    """
    Deliver an entry to multiple author inboxes.
    This would typically be called asynchronously.
    """
    inbox_items = []
    delivery_items = []

    for recipient in recipients:
        # Prepare inbox item
        inbox_items.append(
            Inbox(
                recipient=recipient,
                item_type=Inbox.ENTRY,
                entry=entry,
                raw_data={
                    "type": "entry",
                    "id": entry.url,
                    "title": entry.title,
                    "content": entry.content,
                    "contentType": entry.content_type,
                    "author": entry.author.url,
                    "published": entry.created_at.isoformat(),
                    "visibility": entry.visibility,
                },
            )
        )

        # Prepare delivery tracking
        delivery_items.append(
            InboxDelivery(entry=entry, recipient=recipient, success=True)
        )

    # Bulk create for better performance
    Inbox.objects.bulk_create(inbox_items, ignore_conflicts=True)
    InboxDelivery.objects.bulk_create(delivery_items, ignore_conflicts=True)


def get_mutual_friends(author1, author2):
    """Get mutual friends between two authors - optimized with exists()"""
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

    return Author.objects.filter(
        Exists(friends_with_author1) & Exists(friends_with_author2)
    ).exclude(pk__in=[author1.pk, author2.pk])


def has_liked_entry(author, entry):
    """Check if an author has liked a specific entry"""
    return Like.objects.filter(author=author, entry=entry).exists()


def has_liked_comment(author, comment):
    """Check if an author has liked a specific comment"""
    return Like.objects.filter(author=author, comment=comment).exists()
