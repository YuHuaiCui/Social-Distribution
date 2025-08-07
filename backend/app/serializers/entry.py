from rest_framework import serializers
from django.conf import settings
from django.utils import timezone
import binascii
from dateutil import parser as date_parser
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
            "comments_count",
            "likes_count",
            "image",
            "is_liked",
        ]
        read_only_fields = [
            "type",
            "id",
            "url",
            "web",
            "author",
            "source",
            "origin",
            "comments_count",
            "likes_count",
        ]

    def create(self, validated_data):
        # The author will be set by the view's perform_create method
        # Handle image upload if present in request
        request = self.context.get("request")
        if request and request.FILES.get("image"):
            image_file = request.FILES["image"]
            # Read the image file and store as binary data
            validated_data["image_data"] = image_file.read()
        
        # Handle image URL case: if content_type is image/* and content looks like a URL
        content = validated_data.get("content", "")
        content_type = validated_data.get("content_type", "")
        
        if (content_type in ["image/png", "image/jpeg", "image/png;base64", "image/jpeg;base64"] 
            and content.startswith(("http://", "https://")) 
            and not content.startswith("data:")):
            # This is an image URL, store it as-is in content
            # Don't convert to binary data, just keep the URL
            pass  # The URL will be stored in content field
        
        return super().create(validated_data)

    def get_comments_count(self, obj):
        """Get the number of comments for this entry"""
        return obj.comments.count()

    def get_likes_count(self, obj):
        """Get the number of likes for this entry"""
        from app.models import Like

        return Like.objects.filter(entry=obj).count()

    def get_image(self, obj):
        """Get the image data as base64 for image posts or URL for URL-based images"""
        if obj.content_type in ["image/png", "image/jpeg", "image/png;base64", "image/jpeg;base64"]:
            # Check if content is a URL
            if obj.content and obj.content.startswith(("http://", "https://")):
                return obj.content  # Return the URL directly
            
            # Handle binary image data
            if obj.image_data:
                import base64
                # Convert binary data to base64 data URL
                image_base64 = base64.b64encode(obj.image_data).decode("utf-8")
                return f"data:{obj.content_type.replace(';base64', '')};base64,{image_base64}#v={obj.updated_at.timestamp()}"
        
        return None

    def get_is_liked(self, obj):
        """Check if the current user has liked this entry"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        from app.models import Like

        return Like.objects.filter(author=request.user, entry=obj).exists()

    def _get_comments_data(self, instance, viewing_author):
        """Get comments data for the entry with proper visibility and pagination"""
        from app.models.comment import Comment
        from app.serializers.comment import CommentSerializer

        # Get comments for this entry, ordered newest first
        comments = Comment.objects.filter(entry=instance).order_by("-created_at")

        # Apply visibility rules for comments
        # Comments inherit the visibility of their parent entry
        # If the user can see the entry, they can see the comments

        comments_count = comments.count()

        # Get first page of comments (5 per page as specified)
        comments_page = comments[:5]

        # Only include comment details if entry is visible to the user
        comments_src = []
        if self._should_include_comment_details(instance, viewing_author):
            comments_src = CommentSerializer(
                comments_page, many=True, context=self.context
            ).data

        return {
            "type": "comments",
            # this may or may not be the same as page for the entry,
            # depending if there's a separate URL to just see the comments
            "web": f"{getattr(settings, 'FRONTEND_URL', settings.SITE_URL)}/authors/{instance.author.id}/entries/{instance.id}",
            "id": f"{instance.url}/comments",
            # comments.page, comments.size, comments.count,
            # comments.src are only sent if:
            # * public
            # * unlisted
            # * friends-only and sending it to a friend
            # You should return ~ 5 comments per entry.
            # should be sorted newest(first) to oldest(last)
            # this is to reduce API call counts
            # number of the first page of comments
            "page_number": 1,
            # size of comment pages
            "size": 5,
            # total number of comments for this entry
            "count": comments_count,
            # the first page of comments
            "src": comments_src,
        }

    def _get_likes_data(self, instance, viewing_author):
        """Get likes data for the entry with proper visibility and pagination"""
        from app.models.like import Like
        from app.serializers.like import LikeSerializer

        # Get likes for this entry, ordered newest first
        likes = Like.objects.filter(entry=instance).order_by("-created_at")
        likes_count = likes.count()

        # Get first page of likes (50 per page as specified)
        likes_page = likes[:50]

        # Only include like details for public and unlisted entries
        likes_src = []
        if self._should_include_like_details(instance, viewing_author):
            likes_src = LikeSerializer(likes_page, many=True, context=self.context).data

        return {
            "type": "likes",
            "web": f"{getattr(settings, 'FRONTEND_URL', settings.SITE_URL)}/authors/{instance.author.id}/entries/{instance.id}",
            "id": f"{instance.url}/likes",
            "page_number": 1,
            "size": 50,
            "count": likes_count,
            "src": likes_src,
        }

    def _should_include_comment_details(self, instance, viewing_author):
        """
        Determine if comment details should be included based on visibility rules.
        Comments details are included for:
        - public entries
        - unlisted entries
        - friends-only entries when sending to a friend
        """
        if instance.visibility == Entry.PUBLIC:
            return True
        elif instance.visibility == Entry.UNLISTED:
            return True
        elif instance.visibility == Entry.FRIENDS_ONLY:
            # Check if viewing_author is a friend of the entry author
            if viewing_author and instance.author:
                from app.models.friendship import Friendship

                return (
                    Friendship.objects.filter(
                        author1=viewing_author, author2=instance.author
                    ).exists()
                    or Friendship.objects.filter(
                        author1=instance.author, author2=viewing_author
                    ).exists()
                )
        return False

    def _should_include_like_details(self, instance, viewing_author):
        """
        Determine if like details should be included based on visibility rules.
        Like details are included for public and unlisted entries.
        """
        return instance.visibility in [Entry.PUBLIC, Entry.UNLISTED]

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
        try:
            # Get the base representation first
            data = super().to_representation(instance)

            # Get the viewing author from the request context
            request = self.context.get("request")
            viewing_author = None
            if request and request.user.is_authenticated:
                if hasattr(request.user, "author"):
                    viewing_author = request.user.author
                else:
                    viewing_author = request.user

            # Handle different types of image content
            content = instance.content
            if instance.content_type in [
                "image/png;base64",
                "image/jpeg;base64",
                "application/base64",
                "image/png",
                "image/jpeg",
            ]:
                # Check if content is a URL (keep URLs as-is)
                if content and content.startswith(("http://", "https://")):
                    content = content  # Keep URL as-is
                # Handle base64 images from binary data
                elif instance.image_data:
                    import base64
                    content = base64.b64encode(instance.image_data).decode("utf-8")
                    # Ensure proper data URL format for base64 content
                    if not content.startswith("data:"):
                        base_type = instance.content_type.replace(";base64", "")
                        content = f"data:{base_type};base64,{content}"
                # Handle existing base64 content
                elif content and not content.startswith("data:") and instance.content_type.startswith("image/"):
                    # If content doesn't have data URL prefix, add it for images
                    content = f"data:{instance.content_type};base64,{content}"

            # CMPUT 404 compliant format
            # For image entries, append /image to id, url, and web
            entry_id = instance.url
            entry_url = instance.url
            entry_web = instance.web or f"{settings.SITE_URL}/authors/{instance.author.id}/entries/{instance.id}"
            if instance.content_type and instance.content_type.startswith("image/"):
                entry_id = f"{instance.url}/image"
                entry_url = f"{instance.url}/image"
                entry_web = f"{entry_web}/image"
            
            result = {
                # CMPUT 404 required fields
                "type": "entry",
                "title": instance.title,
                "id": entry_id,  # Full URL as ID per spec, with /image for image entries
                "web": entry_web,  # Also append /image for image entries
                "description": instance.description or "",
                "contentType": instance.content_type,
                "content": content,
                "author": AuthorSerializer(instance.author, context=self.context).data,
                "comments": self._get_comments_data(instance, viewing_author),
                "likes": self._get_likes_data(instance, viewing_author),
                "published": (
                    instance.published.isoformat()
                    if instance.published
                    else (
                        instance.created_at.isoformat() if instance.created_at else None
                    )
                ),
                "visibility": instance.visibility,
                # Additional fields for frontend compatibility (internal use only)
                "url": entry_url,  # Also append /image for image entries
                "source": instance.source,
                "origin": instance.origin,
                "comments_count": self.get_comments_count(instance),
                "likes_count": self.get_likes_count(instance),
                "image": self.get_image(instance),
                "is_liked": self.get_is_liked(instance),
            }

            return result
        except Exception as e:
            # Log the error with more details
            import logging
            import traceback

            logger = logging.getLogger(__name__)
            logger.error(f"Error serializing entry {instance.id}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")

            # Try to get basic fields that should always work
            try:
                author_data = AuthorSerializer(
                    instance.author, context=self.context
                ).data
            except Exception as author_error:
                logger.error(f"Author serialization failed: {author_error}")
                author_data = {
                    "type": "author",
                    "id": getattr(instance.author, "url", ""),
                    "displayName": getattr(instance.author, "display_name", "Unknown"),
                    "host": f"{settings.SITE_URL}/api/",
                    "web": f"{getattr(settings, 'FRONTEND_URL', settings.SITE_URL)}/authors/{getattr(instance.author, 'id', 'unknown')}",
                }

            # Return a more complete minimal representation
            return {
                "type": "entry",
                "title": getattr(instance, "title", ""),
                "id": getattr(instance, "url", ""),
                "web": getattr(instance, "web", "")
                or f"{getattr(settings, 'FRONTEND_URL', settings.SITE_URL)}/authors/{getattr(instance.author, 'id', 'unknown')}/entries/{getattr(instance, 'id', 'unknown')}",
                "description": getattr(instance, "description", ""),
                "contentType": getattr(instance, "content_type", "text/plain"),
                "content": getattr(instance, "content", ""),
                "author": author_data,
                "comments": {
                    "type": "comments",
                    "id": f"{getattr(instance, 'url', '')}/comments",
                    "web": f"{getattr(settings, 'FRONTEND_URL', settings.SITE_URL)}/authors/{getattr(instance.author, 'id', 'unknown')}/entries/{getattr(instance, 'id', 'unknown')}/comments",
                    "page_number": 1,
                    "size": 5,
                    "count": 0,
                    "src": [],
                },
                "likes": {
                    "type": "likes",
                    "id": f"{getattr(instance, 'url', '')}/likes",
                    "web": f"{getattr(settings, 'FRONTEND_URL', settings.SITE_URL)}/authors/{getattr(instance.author, 'id', 'unknown')}/entries/{getattr(instance, 'id', 'unknown')}/likes",
                    "page_number": 1,
                    "size": 50,
                    "count": 0,
                    "src": [],
                },
                "published": (
                    instance.published.isoformat()
                    if getattr(instance, "published", None)
                    else (
                        instance.created_at.isoformat()
                        if getattr(instance, "created_at", None)
                        else None
                    )
                ),
                "visibility": getattr(instance, "visibility", "PUBLIC"),
                "comments_count": 0,
                "likes_count": 0,
                "error": f"Serialization error: {str(e)}",
            }

    def update(self, instance, validated_data):
        print("ENTRY UPDATE VALIDATED DATA:", validated_data)
        for field in ["title", "description", "visibility", "categories"]:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        # Update content_type if provided
        if "content_type" in validated_data:
            instance.content_type = validated_data["content_type"]

        content_type = validated_data.get("content_type", instance.content_type)
        content = validated_data.get("content", instance.content)

        # Update content if provided
        if "content" in validated_data:
            instance.content = validated_data["content"]

        # Handle base64 image update if content_type is image/*
        if (
            content_type
            in [
                "image/png",
                "image/jpeg",
                "image/png;base64",
                "image/jpeg;base64",
                "application/base64",
            ]
            and content
        ):
            import base64
            import re

            instance.content_type = content_type
            instance.content = content

            # Handle different base64 formats
            base64_data = None
            if content.startswith("data:image/"):
                match = re.match(r"^data:image/\w+;base64,(.+)$", content)
                if match:
                    base64_data = match.group(1)
            elif content_type == "application/base64":
                # Raw base64 data
                base64_data = content
            else:
                # Assume it's already base64 encoded
                base64_data = content

            if base64_data:
                try:
                    image_bytes = base64.b64decode(base64_data)
                    instance.image_data = image_bytes

                    # ✅ Force updated_at to change
                    instance.updated_at = timezone.now()

                except binascii.Error:
                    raise serializers.ValidationError("Invalid base64 image data.")
        else:
            if "content_type" in validated_data:
                instance.content_type = validated_data["content_type"]
            if "content" in validated_data:
                instance.content = validated_data["content"]
            if validated_data.get("content_type", "").startswith("text/"):
                instance.image_data = None

        instance.save()
        return instance

    def to_internal_value(self, data):
        """
        Handle conversion of API data to model data.
        - Convert contentType (camelCase) to content_type (snake_case) for model
        - Handle author object or URL reference
        - Handle published field
        """
        # Handle contentType field from API spec - convert to snake_case for model
        if "contentType" in data:
            data["content_type"] = data.pop("contentType")

        # Handle author field - can be a string URL or nested author object
        if "author" in data:
            author_data = data["author"]
            if isinstance(author_data, str) and author_data.startswith("http"):
                # Extract author ID from URL
                parsed = urlparse(author_data)
                author_id = parsed.path.rstrip("/").split("/")[-1]
                data["author"] = author_id
            elif isinstance(author_data, dict):
                # Handle nested author object
                if "id" in author_data and isinstance(author_data["id"], str):
                    if author_data["id"].startswith("http"):
                        # Extract ID from URL
                        parsed = urlparse(author_data["id"])
                        author_id = parsed.path.rstrip("/").split("/")[-1]
                        data["author"] = author_id
                    else:
                        data["author"] = author_data["id"]
                else:
                    # If no valid ID found, don't include author in data
                    # The view will handle setting the author
                    data.pop("author", None)

        # Handle published field - convert to datetime if string
        if "published" in data and isinstance(data["published"], str):
            try:
                # Parse ISO 8601 timestamp
                data["published"] = date_parser.isoparse(data["published"])
            except (ValueError, TypeError):
                # If parsing fails, remove the field to let model handle it
                data.pop("published", None)

        return super().to_internal_value(data)
