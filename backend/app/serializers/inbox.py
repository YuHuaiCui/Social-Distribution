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

        try:
            recipient = Author.objects.get(url=recipient_url)
        except Author.DoesNotExist:
            raise serializers.ValidationError({"recipient_url": "Recipient not found"})

        validated_data["recipient"] = recipient
        return super().create(validated_data)


class InboxStatsSerializer(serializers.Serializer):
    """
    Serializer for inbox statistics
    """

    unread_count = serializers.IntegerField()
    pending_follows = serializers.IntegerField()
    total_items = serializers.IntegerField()
