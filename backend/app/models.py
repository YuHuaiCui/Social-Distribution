from django.db import models
from django.contrib.auth.models import AbstractUser
from django.urls import reverse
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.conf import settings
import uuid


class Node(models.Model):
    """Represents a remote node that this node can communicate with"""

    name = models.CharField(max_length=255)
    host = models.URLField(unique=True, help_text="Base URL of the remote node")
    username = models.CharField(
        max_length=255, help_text="Username for HTTP Basic Auth"
    )
    password = models.CharField(
        max_length=255, help_text="Password for HTTP Basic Auth"
    )
    is_active = models.BooleanField(
        default=True, help_text="Whether to accept connections from this node"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["is_active"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.host})"


class AuthorManager(models.Manager):
    def local_authors(self):
        """Get all local authors"""
        return self.filter(node__isnull=True)

    def remote_authors(self):
        """Get all remote authors"""
        return self.filter(node__isnull=False)

    def approved_authors(self):
        """Get all approved authors"""
        return self.filter(is_approved=True)


class Author(AbstractUser):
    """
    Extends Django's User model to represent both local and remote authors.
    Uses full URL as unique identifier for federation.
    """

    # Override username to store full URL for remote authors
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField(unique=True, help_text="Full URL identifier (FQID)")

    # Profile information
    display_name = models.CharField(max_length=255, blank=True)
    github_username = models.CharField(max_length=255, blank=True)
    profile_image = models.URLField(blank=True)
    bio = models.TextField(blank=True)

    # Node relationship - null for local authors
    node = models.ForeignKey(
        Node,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Remote node this author belongs to (null for local authors)",
    )

    # Admin approval
    is_approved = models.BooleanField(
        default=False, help_text="Whether admin has approved this author"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = AuthorManager()

    class Meta:
        indexes = [
            models.Index(fields=["node"]),
            models.Index(fields=["is_approved"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
            models.Index(fields=["display_name"]),
            models.Index(fields=["github_username"]),
            models.Index(
                fields=["node", "is_approved"]
            ),  # Compound index for remote approved authors
        ]

    def get_friends(self):
        """Get all friends of this author"""
        return Author.objects.filter(
            models.Q(friendships_as_author1__author2=self)
            | models.Q(friendships_as_author2__author1=self)
        )

    def get_followers(self):
        """Get all approved followers"""
        return Author.objects.filter(
            following_set__followed=self, following_set__status=Follow.ACCEPTED
        )

    def get_following(self):
        """Get all authors this author is following (approved)"""
        return Author.objects.filter(
            followers_set__follower=self, followers_set__status=Follow.ACCEPTED
        )

    def is_friend_with(self, other_author):
        """Check if this author is friends with another - optimized with exists()"""
        return Friendship.objects.filter(
            models.Q(author1=self, author2=other_author)
            | models.Q(author1=other_author, author2=self)
        ).exists()

    def is_following(self, other_author):
        """Check if this author is following another - optimized with exists()"""
        return Follow.objects.filter(
            follower=self, followed=other_author, status=Follow.ACCEPTED
        ).exists()

    def has_follow_request_from(self, other_author):
        """Check if there's a pending follow request from another author"""
        return Follow.objects.filter(
            follower=other_author, followed=self, status=Follow.PENDING
        ).exists()

    def has_sent_follow_request_to(self, other_author):
        """Check if this author has sent a follow request to another"""
        return Follow.objects.filter(
            follower=self, followed=other_author, status=Follow.PENDING
        ).exists()

    def save(self, *args, **kwargs):
        # Auto-generate URL for local authors
        if not self.url and not self.node:
            # This will be set after save when we have the ID
            pass
        super().save(*args, **kwargs)

        # Set URL after save for local authors
        if not self.url and not self.node:
            self.url = f"{settings.SITE_URL}/api/authors/{self.id}"
            super().save(update_fields=["url"])

    @property
    def is_local(self):
        return self.node is None

    @property
    def is_remote(self):
        return self.node is not None

    def __str__(self):
        return self.display_name or self.username


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


class EntryManager(models.Manager):
    def public_entries(self):
        """Get all public entries"""
        return self.filter(visibility=Entry.PUBLIC)

    def visible_to_author(self, viewing_author):
        """Get entries visible to a specific author - optimized"""
        from django.db.models import Q, Exists, OuterRef

        # Use exists() subqueries for better performance
        friendship_exists = Friendship.objects.filter(
            Q(author1=viewing_author, author2=OuterRef("author"))
            | Q(author1=OuterRef("author"), author2=viewing_author)
        )

        following_exists = Follow.objects.filter(
            follower=viewing_author, followed=OuterRef("author"), status=Follow.ACCEPTED
        )

        return self.filter(
            Q(visibility=Entry.PUBLIC)  # Public entries
            | Q(visibility=Entry.UNLISTED, author=viewing_author)  # Own unlisted
            | Q(visibility=Entry.UNLISTED)
            & Exists(following_exists)  # Unlisted from followed
            | Q(
                visibility=Entry.FRIENDS_ONLY, author=viewing_author
            )  # Own friends-only
            | Q(visibility=Entry.FRIENDS_ONLY)
            & Exists(friendship_exists)  # Friends-only from friends
        ).exclude(visibility=Entry.DELETED)


class Entry(models.Model):
    """Represents posts/entries in the social network"""

    PUBLIC = "public"
    UNLISTED = "unlisted"
    FRIENDS_ONLY = "friends"
    DELETED = "deleted"

    VISIBILITY_CHOICES = [
        (PUBLIC, "Public"),
        (UNLISTED, "Unlisted"),
        (FRIENDS_ONLY, "Friends Only"),
        (DELETED, "Deleted"),
    ]

    TEXT_PLAIN = "text/plain"
    TEXT_MARKDOWN = "text/markdown"
    IMAGE_PNG = "image/png"
    IMAGE_JPEG = "image/jpeg"

    CONTENT_TYPE_CHOICES = [
        (TEXT_PLAIN, "Plain Text"),
        (TEXT_MARKDOWN, "Markdown"),
        (IMAGE_PNG, "PNG Image"),
        (IMAGE_JPEG, "JPEG Image"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField(unique=True, help_text="Full URL identifier (FQID)")

    # Author relationship using URL
    author = models.ForeignKey(
        Author, on_delete=models.CASCADE, related_name="entries", to_field="url"
    )

    title = models.CharField(max_length=255)
    content = models.TextField()
    content_type = models.CharField(
        max_length=50, choices=CONTENT_TYPE_CHOICES, default=TEXT_PLAIN
    )

    visibility = models.CharField(
        max_length=20, choices=VISIBILITY_CHOICES, default=PUBLIC
    )

    # GitHub integration
    source = models.URLField(blank=True, help_text="Source URL (e.g., GitHub)")
    origin = models.URLField(blank=True, help_text="Origin URL")

    # Tracking for federation
    inboxes_sent_to = models.ManyToManyField(
        Author, through="InboxDelivery", related_name="received_entries"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = EntryManager()

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "entries"
        indexes = [
            models.Index(fields=["author", "visibility"]),
            models.Index(fields=["visibility", "created_at"]),
            models.Index(fields=["author", "created_at"]),
            models.Index(fields=["content_type"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["updated_at"]),
            models.Index(fields=["-created_at"]),  # For default ordering
            models.Index(fields=["visibility"]),
            models.Index(
                fields=["author", "visibility", "created_at"]
            ),  # Compound for filtered streams
        ]

    def save(self, *args, **kwargs):
        # Auto-generate URL
        if not self.url:
            if self.author.is_local:
                self.url = f"{settings.SITE_URL}/api/authors/{self.author.id}/entries/{self.id}"
            else:
                # For remote entries, URL should be provided
                pass
        super().save(*args, **kwargs)

    @property
    def is_deleted(self):
        return self.visibility == self.DELETED

    def __str__(self):
        return f"{self.title} by {self.author}"


class InboxDelivery(models.Model):
    """Tracks which entries have been sent to which author inboxes"""

    entry = models.ForeignKey(Entry, on_delete=models.CASCADE)
    recipient = models.ForeignKey(Author, on_delete=models.CASCADE, to_field="url")
    delivered_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True)

    class Meta:
        unique_together = ["entry", "recipient"]
        indexes = [
            models.Index(fields=["entry"]),
            models.Index(fields=["recipient"]),
            models.Index(fields=["delivered_at"]),
            models.Index(fields=["success"]),
            models.Index(fields=["recipient", "delivered_at"]),
        ]


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
        if not self.url:
            if self.author.is_local:
                if self.entry:
                    self.url = f"{settings.SITE_URL}/api/authors/{self.author.id}/entries/{self.entry.id}/likes/{self.id}"
                elif self.comment:
                    self.url = f"{settings.SITE_URL}/api/authors/{self.author.id}/comments/{self.comment.id}/likes/{self.id}"
        super().save(*args, **kwargs)

    def __str__(self):
        target = self.entry or self.comment
        return f"Like by {self.author} on {target}"


class Inbox(models.Model):
    """
    Represents items in an author's inbox.
    This is the main federation mechanism.
    """

    ENTRY = "entry"
    COMMENT = "comment"
    LIKE = "like"
    FOLLOW = "follow"

    ITEM_TYPE_CHOICES = [
        (ENTRY, "Entry"),
        (COMMENT, "Comment"),
        (LIKE, "Like"),
        (FOLLOW, "Follow Request"),
    ]

    # Recipient of the inbox item
    recipient = models.ForeignKey(
        Author, on_delete=models.CASCADE, related_name="inbox_items", to_field="url"
    )

    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)

    # Generic relationships to different types of objects
    entry = models.ForeignKey(
        Entry, on_delete=models.CASCADE, null=True, blank=True, to_field="url"
    )
    comment = models.ForeignKey(
        Comment, on_delete=models.CASCADE, null=True, blank=True, to_field="url"
    )
    like = models.ForeignKey(
        Like, on_delete=models.CASCADE, null=True, blank=True, to_field="url"
    )
    follow = models.ForeignKey(Follow, on_delete=models.CASCADE, null=True, blank=True)

    # Raw JSON data for flexibility with remote objects
    raw_data = models.JSONField(help_text="Raw JSON data of the object")

    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "item_type"]),
            models.Index(fields=["recipient", "created_at"]),
            models.Index(fields=["item_type"]),
            models.Index(fields=["is_read"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["-created_at"]),  # For default ordering
            models.Index(
                fields=["recipient", "is_read", "created_at"]
            ),  # Compound for unread items
        ]

    def __str__(self):
        return f"{self.item_type} for {self.recipient} at {self.created_at}"


# Helper model for managing friendship status
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
            models.Index(fields=["author1", "author2"]),  # For lookups
        ]

    def __str__(self):
        return f"{self.author1} <-> {self.author2}"

    @classmethod
    def update_friendships(cls, author1, author2):
        """Update friendship status based on follow relationships - optimized with exists()"""
        # Check if both authors follow each other with accepted status
        follow1_exists = Follow.objects.filter(
            follower=author1, followed=author2, status=Follow.ACCEPTED
        ).exists()

        follow2_exists = Follow.objects.filter(
            follower=author2, followed=author1, status=Follow.ACCEPTED
        ).exists()

        friendship_exists = cls.objects.filter(
            models.Q(author1=author1, author2=author2)
            | models.Q(author1=author2, author2=author1)
        ).exists()

        if follow1_exists and follow2_exists and not friendship_exists:
            # Create friendship (ensure consistent ordering)
            if str(author1.url) < str(author2.url):
                cls.objects.create(author1=author1, author2=author2)
            else:
                cls.objects.create(author1=author2, author2=author1)
        elif not (follow1_exists and follow2_exists) and friendship_exists:
            # Remove friendship
            cls.objects.filter(
                models.Q(author1=author1, author2=author2)
                | models.Q(author1=author2, author2=author1)
            ).delete()


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
    """Check if an author has liked a specific entry - optimized with exists()"""
    return Like.objects.filter(author=author, entry=entry).exists()


def has_liked_comment(author, comment):
    """Check if an author has liked a specific comment - optimized with exists()"""
    return Like.objects.filter(author=author, comment=comment).exists()
