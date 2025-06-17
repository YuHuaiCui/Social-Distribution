from rest_framework import serializers
from app.models import Like, Entry, Comment

class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ["id", "url", "author", "entry", "comment", "created_at"]
        read_only_fields = ["id", "url", "author", "created_at"]

    def validate(self, data):
        if not data.get("entry") and not data.get("comment"):
            raise serializers.ValidationError("A like must target an entry or comment.")
        if data.get("entry") and data.get("comment"):
            raise serializers.ValidationError("A like can only target one: entry or comment.")
        return data