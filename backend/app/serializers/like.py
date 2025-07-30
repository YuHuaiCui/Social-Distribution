from rest_framework import serializers
from django.conf import settings
from app.models import Like, Entry, Comment
from app.serializers.author import AuthorSerializer


class LikesCollectionSerializer(serializers.Serializer):
    """
    Serializer for the likes collection response format according to spec.
    """
    type = serializers.CharField(default="likes")
    web = serializers.CharField()
    id = serializers.CharField()
    page_number = serializers.IntegerField()
    size = serializers.IntegerField()
    count = serializers.IntegerField()
    src = serializers.ListField()


class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ["id", "url", "author", "entry", "comment", "created_at"]
        read_only_fields = ["id", "url", "author", "created_at"]

    def validate(self, attrs):
        if not attrs.get("entry") and not attrs.get("comment"):
            raise serializers.ValidationError("A like must target an entry or comment.")
        if attrs.get("entry") and attrs.get("comment"):
            raise serializers.ValidationError(
                "A like can only target one: entry or comment."
            )
        return attrs

    def to_representation(self, instance):
        """
        Customize the representation to match CMPUT 404 spec format.
        Returns like objects in the required format:
        {
            "type": "like",
            "author": { author object },
            "published": "2015-03-09T13:07:04+00:00",
            "id": "http://nodeaaaa/api/authors/111/liked/166",
            "object": "http://nodebbbb/api/authors/222/entries/249"
        }
        """
        # Determine the object URL
        object_url = None
        if instance.entry:
            object_url = instance.entry.url
        elif instance.comment:
            object_url = instance.comment.url

        # CMPUT 404 compliant format
        result = {
            "type": "like",
            "author": AuthorSerializer(instance.author, context=self.context).data,
            "published": instance.created_at.isoformat() if instance.created_at else None,
            "id": instance.url,
            "object": object_url,
        }

        return result
