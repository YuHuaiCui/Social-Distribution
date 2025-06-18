from rest_framework import serializers
from app.models.comment import Comment
from app.serializers.author import AuthorSerializer  # adjust import if needed

class CommentSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)  # Nested author info

    class Meta:
        model = Comment
        fields = [
            'id',
            'url',
            'author',
            'entry',
            'content',
            'content_type',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'url', 'author', 'entry', 'created_at', 'updated_at']
