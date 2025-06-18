from rest_framework import serializers
from app.models import Entry
from app.models import Author
from app.serializers.author import AuthorSerializer 

class EntrySerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)  
    comments_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()

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
            "comments_count",
            "likes_count",
        ]
        read_only_fields = ["id", "url", "author", "source", "origin", "created_at", "updated_at", "comments_count", "likes_count"]

    def create(self, validated_data):
        # The author will be set by the view's perform_create method
        return super().create(validated_data)

    def get_comments_count(self, obj):
        """Get the number of comments for this entry"""
        return obj.comments.count()
    
    def get_likes_count(self, obj):
        """Get the number of likes for this entry"""
        return obj.likes.count()

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