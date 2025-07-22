from rest_framework import serializers
from django.conf import settings
from django.utils import timezone
import binascii
from app.models import Entry
from app.models import Author
from app.serializers.author import AuthorSerializer
from urllib.parse import urlparse



class EntrySerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)  
    comments_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()

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
            "is_liked",
            "is_saved",
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

    def get_is_liked(self, obj):
        """Check if the current user has liked this entry"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        from app.models import Like
        return Like.objects.filter(author=request.user, entry=obj).exists()

    def get_is_saved(self, obj):
        """Check if the current user has saved this entry"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        from app.models import SavedEntry
        # Get the user's author instance
        if hasattr(request.user, 'author'):
            user_author = request.user.author
        else:
            user_author = request.user
            
        return SavedEntry.objects.filter(author=user_author, entry=obj).exists()

    def to_representation(self, instance):
        """
        Customize the representation to match CMPUT 404 spec format while maintaining compatibility.
        Returns entry objects in the required format:
        {
            "type": "entry",
            "title": "An entry title about an entry about web dev",
            "id": "http://nodebbbb/api/authors/222/entries/249",
            "web": "http://nodebbbb/authors/222/entries/293",
            "description": "This entry discusses stuff -- brief",
            "contentType": "text/plain",
            "content": "...",
            "author": { author object },
            "comments": { comments object },
            "likes": { likes object },
            "published": "2015-03-09T13:07:04+00:00",
            "visibility": "PUBLIC"
        }
        """
        data = super().to_representation(instance)
        
        # Get counts for nested objects
        comments_count = instance.comments.count()
        likes_count = instance.likes.count()
        
        # CMPUT 404 compliant format with compatibility fields
        result = {
            # CMPUT 404 required fields
            "type": "entry",
            "title": instance.title,
            "id": instance.url,  # Full URL as ID per spec
            "web": f"{settings.SITE_URL}/authors/{instance.author.id}/entries/{instance.id}",
            "description": instance.description or "",
            "contentType": instance.content_type,
            "content": instance.content,
            "author": AuthorSerializer(instance.author, context=self.context).data,
            "comments": {
                "type": "comments",
                "web": f"{settings.SITE_URL}/authors/{instance.author.id}/entries/{instance.id}",
                "id": f"{instance.url}/comments",
                "page_number": 1,
                "size": 5,
                "count": comments_count,
                "src": []
            },
            "likes": {
                "type": "likes",
                "web": f"{settings.SITE_URL}/authors/{instance.author.id}/entries/{instance.id}",
                "id": f"{instance.url}/likes",
                "page_number": 1,
                "size": 50,
                "count": likes_count,
                "src": []
            },
            "published": instance.created_at.isoformat() if instance.created_at else None,
            "visibility": instance.visibility,
            
            # Additional fields for frontend compatibility  
            "url": instance.url,
            "content_type": instance.content_type,  # Snake case version
            "source": instance.source,
            "origin": instance.origin,
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
            "comments_count": comments_count,
            "likes_count": likes_count,
            "image": data.get("image"),
            "is_liked": data.get("is_liked"),
            "is_saved": data.get("is_saved"),
        }
        
        return result

    def update(self, instance, validated_data):
        print("ENTRY UPDATE VALIDATED DATA:", validated_data)
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

                except binascii.Error:
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
    
    def to_internal_value(self, data):
        """
        Handle conversion of 'author' URL to UUID if it's included.
        """
        if 'author' in data and isinstance(data['author'], str) and data['author'].startswith("http"):
            parsed = urlparse(data['author'])
            author_id = parsed.path.rstrip('/').split('/')[-1]
            data['author'] = author_id
        return super().to_internal_value(data)

        
