from rest_framework import serializers
from django.conf import settings
from app.models.follow import Follow
from app.models.author import Author
from app.serializers.author import AuthorSerializer


class FollowSerializer(serializers.ModelSerializer):
    follower = serializers.CharField(source="follower.url", read_only=True)
    followed = serializers.CharField(source="followed.url", read_only=True)

    class Meta:
        model = Follow
        fields = ["id", "follower", "followed", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        """
        Customize the representation to match CMPUT 404 spec format while maintaining compatibility.
        Returns follow objects in the required format:
        {
            "type": "follow",
            "summary": "Greg wants to follow Lara",
            "actor": { author object },
            "object": { author object }
        }
        """
        data = super().to_representation(instance)
        
        # CMPUT 404 compliant format with compatibility fields
        result = {
            # CMPUT 404 required fields
            "type": "follow",
            "summary": f"{instance.follower.display_name} wants to follow {instance.followed.display_name}",
            "actor": AuthorSerializer(instance.follower, context=self.context).data,
            "object": AuthorSerializer(instance.followed, context=self.context).data,
            
            # Additional fields for frontend compatibility
            "id": data.get("id"),
            "follower": instance.follower.url,
            "followed": instance.followed.url,
            "status": instance.status,
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
        }
        
        return result


class FollowCreateSerializer(serializers.ModelSerializer):
    followed = serializers.CharField(write_only=True)

    class Meta:
        model = Follow
        fields = ["followed"]

    def create(self, validated_data):
        followed_url = validated_data["followed"]
        follower = self.context["request"].user

        # Get the followed author
        try:
            followed_author = Author.objects.get(url=followed_url)
        except Author.DoesNotExist:
            raise serializers.ValidationError({"followed": "Author not found"})

        # Check if trying to follow self
        if follower.url == followed_url:
            raise serializers.ValidationError({"followed": "Cannot follow yourself"})

        # Check if follow request already exists
        if Follow.objects.filter(follower=follower, followed=followed_author).exists():
            raise serializers.ValidationError(
                {"followed": "Follow request already exists"}
            )

        # Create the follow request
        follow = Follow.objects.create(
            follower=follower, followed=followed_author, status=Follow.PENDING
        )

        return follow
