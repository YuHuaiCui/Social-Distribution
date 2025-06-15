from rest_framework import serializers
from app.models import Entry
from app.models import Author
from app.serializers.author import AuthorSerializer  # 🟢 Import the AuthorSerializer

class EntrySerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)  # 🟢 Replace default behavior

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
