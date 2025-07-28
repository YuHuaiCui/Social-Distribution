from rest_framework import serializers
from app.models.inbox import Inbox
from app.models.author import Author
from app.serializers.author import AuthorSerializer
from app.serializers.entry import EntrySerializer
from app.serializers.follow import FollowSerializer
from app.serializers.like import LikeSerializer


class InboxItemSerializer(serializers.ModelSerializer):
    """
    Serializer for inbox items with nested related objects
    """

    sender = serializers.SerializerMethodField()
    content_data = serializers.SerializerMethodField()
    recipient = serializers.CharField(source="recipient.url", read_only=True)
    content_type = serializers.CharField(source="item_type", read_only=True)
    read = serializers.BooleanField(source="is_read", read_only=True)

    class Meta:
        model = Inbox
        fields = [
            "id",
            "recipient",
            "item_type",
            "content_type",
            "sender",
            "content_data",
            "raw_data",
            "created_at",
            "is_read",
            "read",
        ]
        read_only_fields = ["id", "created_at"]

    def get_sender(self, obj):
        """
        Get the sender information based on the item type
        """
        if obj.item_type == Inbox.FOLLOW and obj.follow:
            return AuthorSerializer(obj.follow.follower).data
        elif obj.item_type == Inbox.LIKE and obj.like:
            return AuthorSerializer(obj.like.author).data
        elif obj.item_type == Inbox.COMMENT and obj.comment:
            return AuthorSerializer(obj.comment.author).data
        elif obj.item_type == Inbox.ENTRY and obj.entry:
            return AuthorSerializer(obj.entry.author).data

        # Fallback to raw_data if available
        if obj.raw_data:
            if "author" in obj.raw_data:
                return obj.raw_data["author"]
            elif "actor" in obj.raw_data:
                return obj.raw_data["actor"]

        return None

    def get_content_data(self, obj):
        """
        Get the content data based on the item type
        """
        if obj.item_type == Inbox.FOLLOW and obj.follow:
            return {"type": "follow", "data": FollowSerializer(obj.follow).data}
        elif obj.item_type == Inbox.LIKE and obj.like:
            return {"type": "like", "data": LikeSerializer(obj.like).data}
        elif obj.item_type == Inbox.COMMENT and obj.comment:
            return {
                "type": "comment",
                "data": {
                    "id": obj.comment.id,
                    "comment": obj.comment.comment,
                    "author": AuthorSerializer(obj.comment.author).data,
                    "created_at": obj.comment.created_at,
                },
            }
        elif obj.item_type == Inbox.ENTRY and obj.entry:
            return {"type": "entry", "data": EntrySerializer(obj.entry).data}

        # Fallback to raw_data
        return obj.raw_data


class InboxCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating inbox items
    """

    recipient_url = serializers.CharField(write_only=True)

    class Meta:
        model = Inbox
        fields = [
            "recipient_url",
            "item_type",
            "entry",
            "comment",
            "like",
            "follow",
            "raw_data",
        ]

    def create(self, validated_data):
        recipient_url = validated_data.pop("recipient_url")
        raw_data = validated_data.get("raw_data", {})

        try:
            recipient = Author.objects.get(url=recipient_url)
        except Author.DoesNotExist:
            raise serializers.ValidationError({"recipient_url": "Recipient not found"})

        validated_data["recipient"] = recipient

        # Handle federated Like
        if raw_data and isinstance(raw_data, dict):
            item_type = raw_data.get("type", "").lower()
            print("Inbox create: raw_data =", raw_data)
            print("Inbox create: type =", item_type)

            if item_type == "like":

                print("Processing Like...")
                print("Object URL:", object_url)
                print("Actor data:", actor_data)
                
                from app.models.entry import Entry
                from app.models.like import Like
                from app.utils.federation import _get_or_create_remote_author

                object_url = raw_data.get("object")
                actor_data = raw_data.get("author") or raw_data.get("actor")

                if not object_url or not actor_data:
                    raise serializers.ValidationError("Like activity missing 'object' or 'author' fields")

                # Resolve or create remote author
                author = _get_or_create_remote_author(actor_data)

                # Resolve target entry by URL or fqid
                entry = Entry.objects.filter(url=object_url).first()
                if not entry:
                    # Try by fqid if applicable
                    entry = Entry.objects.filter(fqid=object_url).first()

                if not entry:
                    raise serializers.ValidationError(f"Target entry not found: {object_url}")

                # Create or fetch Like
                like, _ = Like.objects.get_or_create(author=author, entry=entry)

                # Attach to inbox
                validated_data["like"] = like
                validated_data["item_type"] = "like"

        return super().create(validated_data)    


class InboxStatsSerializer(serializers.Serializer):
    """
    Serializer for inbox statistics
    """

    unread_count = serializers.IntegerField()
    pending_follows = serializers.IntegerField()
    total_items = serializers.IntegerField()
    by_type = serializers.DictField(required=False)
