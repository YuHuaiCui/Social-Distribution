from rest_framework import serializers
from app.models import Entry
from app.models import Author
from app.serializers.author import AuthorSerializer 

class EntrySerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)  
    comments_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

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
            "image",
        ]
        read_only_fields = ["id", "url", "author", "source", "origin", "created_at", "updated_at", "comments_count", "likes_count"]

    def create(self, validated_data):
        # The author will be set by the view's perform_create method
        # Handle image upload if present in request
        request = self.context.get('request')
        if request and request.FILES.get('image'):
            image_file = request.FILES['image']
            # Read the image file and store as binary data
            validated_data['image_data'] = image_file.read()
        return super().create(validated_data)

    def get_comments_count(self, obj):
        """Get the number of comments for this entry"""
        return obj.comments.count()
    
    def get_likes_count(self, obj):
        """Get the number of likes for this entry"""
        return obj.likes.count()
    
    def get_image(self, obj):
        """Get the image data as base64 for image posts"""
        if obj.content_type in ['image/png', 'image/jpeg'] and obj.image_data:
            import base64
            # Convert binary data to base64 data URL
            image_base64 = base64.b64encode(obj.image_data).decode('utf-8')
            return f"data:{obj.content_type};base64,{image_base64}"
        return None

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