from rest_framework import serializers
from app.models import Entry
from app.models import Author
from app.serializers.author import AuthorSerializer 

class EntrySerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)  

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
        read_only_fields = ["id", "url", "author", "source", "origin", "created_at", "updated_at"]

    def create(self, validated_data):
        # The author will be set by the view's perform_create method
        return super().create(validated_data)

    def to_representation(self, instance):
        """
        Customize the representation to include author details.
        """
        data = super().to_representation(instance)
        
        # Include author information
        if instance.author:
            data['author'] = {
                'id': str(instance.author.id),
                'url': instance.author.url,
                'username': instance.author.username,
                'display_name': instance.author.display_name,
            }
        
        return data