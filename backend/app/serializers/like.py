from rest_framework import serializers
from django.conf import settings
from app.models import Like, Entry, Comment
from app.serializers.author import AuthorSerializer

class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ["id", "url", "author", "entry", "comment", "created_at"]
        read_only_fields = ["id", "url", "author", "created_at"]

    def validate(self, attrs):
        if not attrs.get("entry") and not attrs.get("comment"):
            raise serializers.ValidationError("A like must target an entry or comment.")
        if attrs.get("entry") and attrs.get("comment"):
            raise serializers.ValidationError("A like can only target one: entry or comment.")
        return attrs

    def to_representation(self, instance):
        """
        Customize the representation to match CMPUT 404 spec format while maintaining compatibility.
        Returns like objects in the required format:
        {
            "type": "like",
            "author": { author object },
            "published": "2015-03-09T13:07:04+00:00",
            "id": "http://nodeaaaa/api/authors/111/liked/166",
            "object": "http://nodebbbb/api/authors/222/entries/249"
        }
        """
        data = super().to_representation(instance)
        
        # Determine the object URL
        object_url = None
        if instance.entry:
            object_url = instance.entry.url
        elif instance.comment:
            object_url = instance.comment.url
        
        # CMPUT 404 compliant format with compatibility fields
        result = {
            # CMPUT 404 required fields
            "type": "like",
            "author": AuthorSerializer(instance.author, context=self.context).data,
            "published": instance.created_at.isoformat() if instance.created_at else None,
            "id": instance.url,
            "object": object_url,
            
            # Additional fields for frontend compatibility
            "url": instance.url,
            "entry": instance.entry.url if instance.entry else None,
            "comment": instance.comment.url if instance.comment else None,
            "created_at": data.get("created_at"),
        }
        
        # For backward compatibility, also include author as URL string
        result["author"] = instance.author.url
        
        return result