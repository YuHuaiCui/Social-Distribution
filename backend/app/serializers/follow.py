from rest_framework import serializers
from django.conf import settings
from app.models.follow import Follow
from app.models.author import Author
from app.serializers.author import AuthorSerializer


class FollowSerializer(serializers.ModelSerializer):
    type = serializers.CharField(default="follow", read_only=True)
    summary = serializers.SerializerMethodField()
    actor = serializers.SerializerMethodField()
    object = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Follow
        fields = ["type", "summary", "actor", "object", "status"]

    def get_summary(self, obj):
        """Generate the summary text"""
        return (
            f"{obj.follower.display_name} wants to follow {obj.followed.display_name}"
        )

    def get_actor(self, obj):
        """Get the actor (follower) in compliant format"""
        follower = obj.follower
        return {
            "type": "author",
            "id": follower.url,
            "host": follower.host,
            "displayName": follower.display_name,
            "github": (
                f"https://github.com/{follower.github_username}"
                if follower.github_username
                else ""
            ),
            "profileImage": follower.profile_image if follower.profile_image else "",
            "web": (
                follower.web
                if follower.web
                else f"{follower.host}authors/{follower.id}"
            ),
        }

    def get_object(self, obj):
        """Get the object (followed author) in compliant format"""
        followed = obj.followed
        return {
            "type": "author",
            "id": followed.url,
            "host": followed.host,
            "displayName": followed.display_name,
            "github": (
                f"https://github.com/{followed.github_username}"
                if followed.github_username
                else ""
            ),
            "profileImage": followed.profile_image if followed.profile_image else "",
            "web": (
                followed.web
                if followed.web
                else f"{followed.host}authors/{followed.id}"
            ),
        }


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
            follower=follower, followed=followed_author, status=Follow.REQUESTING
        )

        return follow
