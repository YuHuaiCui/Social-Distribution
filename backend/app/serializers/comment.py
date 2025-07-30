from rest_framework import serializers
from django.conf import settings
from app.models.comment import Comment
from app.serializers.author import AuthorSerializer  # adjust import if needed


class CommentSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)  # Nested author info
    comment = serializers.CharField(source='content', required=False)
    contentType = serializers.CharField(source='content_type', required=False)

    class Meta:
        model = Comment
        fields = [
            "id",
            "url",
            "author",
            "entry",
            "content",
            "content_type",
            "comment",
            "contentType",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "url", "author", "entry", "created_at", "updated_at"]

    def to_internal_value(self, data):
        """Handle both API spec field names and model field names"""
        # Map API spec field names to model field names
        if 'comment' in data:
            data['content'] = data.pop('comment')
        if 'contentType' in data:
            data['content_type'] = data.pop('contentType')
        return super().to_internal_value(data)

    def _get_likes_data(self, instance):
        """Get likes data for the comment with proper pagination"""
        from app.models.like import Like
        from app.serializers.like import LikeSerializer

        # Get likes for this comment, ordered newest first
        likes = Like.objects.filter(comment=instance).order_by("-created_at")
        likes_count = likes.count()

        # Get first page of likes (50 per page as specified)
        likes_page = likes[:50]

        # Include like details for comments
        likes_src = LikeSerializer(likes_page, many=True, context=self.context).data

        return {
            "type": "likes",
            "id": f"{instance.url}/likes",
            # in this example nodebbbb has a html page just for the likes
            "web": f"{getattr(settings, 'FRONTEND_URL', settings.SITE_URL)}/authors/{instance.author.id}/commented/{instance.id}/likes",
            "page_number": 1,
            "size": 50,
            "count": likes_count,
            "src": likes_src,
        }

    def to_representation(self, instance):
        """
        Customize the representation to match CMPUT 404 spec format while maintaining compatibility.
        Returns comment objects in the required format:
        {
            "type": "comment",
            "author": { author object },
            "comment": "Sick Olde English",
            "contentType": "text/markdown",
            "published": "2015-03-09T13:07:04+00:00",
            "id": "http://nodeaaaa/api/authors/111/commented/130",
            "entry": "http://nodebbbb/api/authors/222/entries/249",
            "web": "http://nodebbbb/authors/222/entries/249",
            "likes": { likes object }
        }
        """
        data = super().to_representation(instance)

        # CMPUT 404 compliant format
        result = {
            # CMPUT 404 required fields
            "type": "comment",
            "author": AuthorSerializer(instance.author, context=self.context).data,
            "comment": instance.content,
            "contentType": instance.content_type,
            "published": (
                instance.created_at.isoformat() if instance.created_at else None
            ),
            "id": instance.url,
            "entry": instance.entry.url if instance.entry else None,
            "web": (
                f"{settings.SITE_URL}/authors/{instance.entry.author.id}/entries/{instance.entry.id}"
                if instance.entry
                else None
            ),
            "likes": self._get_likes_data(instance),
        }

        return result
