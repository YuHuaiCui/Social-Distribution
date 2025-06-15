from rest_framework import serializers
from app.models import Entry

class EntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Entry
        fields = [
            "id",
            "url",
            "author",
            "title",
            "content",
            "content_type",
            "visibility",
            "source",
            "origin",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "url", "author", "source", "origin", "created_at", "updated_at"] # For post related API as well

    def create(self, validated_data):
        # This allows the view to pass in the author via serializer.save(author=author)
        author = self.context.get("author")
        if author:
            validated_data["author"] = author
        return super().create(validated_data)    
