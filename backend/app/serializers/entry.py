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
            "type",
            "id",
            "url",
            "web",
            "author",
            "title",
            "description",
            "content",
            "content_type",
            "visibility",
            "source",
            "origin",
            "published",
            "created_at",
            "updated_at",
            "comments_count",
            "likes_count",
            "image",
        ]
        read_only_fields = ["type", "id", "url", "web", "author", "source", "origin", "published", "created_at", "updated_at", "comments_count", "likes_count"]

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
            return f"data:{obj.content_type};base64,{image_base64}#v={obj.updated_at.timestamp()}"
        return None

    def to_representation(self, instance):
        """
        Customize the representation to match project spec format.
        """
        data = super().to_representation(instance)
        
        # Override id to be the full URL as per spec
        data['id'] = instance.url
        
        # Include full author object as per spec
        if instance.author:
            data['author'] = AuthorSerializer(instance.author, context=self.context).data
        
        return data

    from django.utils import timezone

    def update(self, instance, validated_data):
        for field in ['title', 'description', 'visibility']:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        content_type = validated_data.get('content_type', instance.content_type)
        content = validated_data.get('content', instance.content)

        # Handle base64 image update if content_type is image/*
        if content_type in ['image/png', 'image/jpeg'] and content.startswith("data:image/"):
            import base64
            import re

            instance.content_type = content_type
            instance.content = content

            match = re.match(r"^data:image/\w+;base64,(.+)$", content)
            if match:
                try:
                    image_bytes = base64.b64decode(match.group(1))
                    instance.image_data = image_bytes

                    # ✅ Force updated_at to change
                    instance.updated_at = timezone.now()

                except base64.binascii.Error:
                    raise serializers.ValidationError("Invalid base64 image data.")
        else:
            if 'content_type' in validated_data:
                instance.content_type = validated_data['content_type']
            if 'content' in validated_data:
                instance.content = validated_data['content']
            if validated_data.get('content_type', '').startswith("text/"):
                instance.image_data = None

        instance.save()
        return instance
        
