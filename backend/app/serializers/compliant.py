"""
CMPUT 404 Compliant Serializers

These serializers follow the exact API specification for the CMPUT 404 project.
They provide the required JSON structure and field naming.
"""

from rest_framework import serializers
from django.conf import settings
from app.models import Author, Entry, Comment, Like, Follow
from .author import AuthorSerializer as BaseAuthorSerializer


class CompliantAuthorSerializer(serializers.ModelSerializer):
    """
    CMPUT 404 Compliant Author Serializer
    
    Returns author objects in the required format:
    {
        "type": "author",
        "id": "http://nodeaaaa/api/authors/111",
        "host": "http://nodeaaaa/api/",
        "displayName": "Greg Johnson",
        "github": "http://github.com/gjohnson",
        "profileImage": "https://i.imgur.com/k7XVwpB.jpeg",
        "web": "http://nodeaaaa/authors/greg"
    }
    """
    
    type = serializers.CharField(default="author", read_only=True)
    id = serializers.CharField(source="url", read_only=True)
    host = serializers.SerializerMethodField()
    displayName = serializers.CharField(source="display_name")
    github = serializers.URLField(source="github_url", required=False, allow_blank=True, allow_null=True)
    profileImage = serializers.URLField(source="profile_image", required=False, allow_blank=True, allow_null=True)
    web = serializers.SerializerMethodField()

    class Meta:
        model = Author
        fields = ["type", "id", "host", "displayName", "github", "profileImage", "web"]

    def get_host(self, obj):
        """Return the API host URL"""
        return f"{settings.SITE_URL}/api/"

    def get_web(self, obj):
        """Return the HTML profile page URL"""
        return f"{settings.SITE_URL}/authors/{obj.id}"


class CompliantFollowSerializer(serializers.ModelSerializer):
    """
    CMPUT 404 Compliant Follow Request Serializer
    
    Returns follow objects in the required format:
    {
        "type": "follow",
        "summary": "Greg wants to follow Lara",
        "actor": { author object },
        "object": { author object }
    }
    """
    
    type = serializers.CharField(default="follow", read_only=True)
    summary = serializers.SerializerMethodField()
    actor = CompliantAuthorSerializer(source="follower", read_only=True)
    object = CompliantAuthorSerializer(source="followed", read_only=True)

    class Meta:
        model = Follow
        fields = ["type", "summary", "actor", "object"]

    def get_summary(self, obj):
        """Generate the summary text"""
        return f"{obj.follower.display_name} wants to follow {obj.followed.display_name}"


class CompliantLikeSerializer(serializers.ModelSerializer):
    """
    CMPUT 404 Compliant Like Serializer
    
    Returns like objects in the required format:
    {
        "type": "like",
        "author": { author object },
        "published": "2015-03-09T13:07:04+00:00",
        "id": "http://nodeaaaa/api/authors/111/liked/166",
        "object": "http://nodebbbb/api/authors/222/entries/249"
    }
    """
    
    type = serializers.CharField(default="like", read_only=True)
    author = CompliantAuthorSerializer(read_only=True)
    published = serializers.DateTimeField(source="created_at", read_only=True)
    id = serializers.CharField(source="url", read_only=True)
    object = serializers.SerializerMethodField()

    class Meta:
        model = Like
        fields = ["type", "author", "published", "id", "object"]

    def get_object(self, obj):
        """Return the URL of the object that was liked"""
        if obj.entry:
            return obj.entry.url
        elif obj.comment:
            return obj.comment.url
        return None


class CompliantLikesSerializer(serializers.Serializer):
    """
    CMPUT 404 Compliant Likes Collection Serializer
    
    Returns likes collections in the required format:
    {
        "type": "likes",
        "web": "http://nodeaaaa/authors/222/entries/249",
        "id": "http://nodeaaaa/api/authors/222/entries/249/likes",
        "page_number": 1,
        "size": 50,
        "count": 9001,
        "src": [...]
    }
    """
    
    type = serializers.CharField(default="likes", read_only=True)
    web = serializers.CharField()
    id = serializers.CharField()
    page_number = serializers.IntegerField(default=1)
    size = serializers.IntegerField(default=50)
    count = serializers.IntegerField()
    src = CompliantLikeSerializer(many=True)
    web = serializers.CharField()
    id = serializers.CharField()
    page_number = serializers.IntegerField(default=1)
    size = serializers.IntegerField(default=50)
    count = serializers.IntegerField()
    src = CompliantLikeSerializer(many=True)


class CompliantCommentSerializer(serializers.ModelSerializer):
    """
    CMPUT 404 Compliant Comment Serializer
    
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
    
    type = serializers.CharField(default="comment", read_only=True)
    author = CompliantAuthorSerializer(read_only=True)
    comment = serializers.CharField(source="content")
    contentType = serializers.CharField(source="content_type")
    published = serializers.DateTimeField(source="created_at", read_only=True)
    id = serializers.CharField(source="url", read_only=True)
    entry = serializers.CharField(source="entry.url", read_only=True)
    web = serializers.SerializerMethodField()
    likes = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["type", "author", "comment", "contentType", "published", "id", "entry", "web", "likes"]

    def get_web(self, obj):
        """Return the web URL for this comment"""
        if obj.entry:
            return f"{settings.SITE_URL}/authors/{obj.entry.author.id}/entries/{obj.entry.id}"
        return None

    def get_likes(self, obj):
        """Return the likes collection for this comment"""
        likes_count = obj.like_set.count()
        return {
            "type": "likes",
            "id": f"{obj.url}/likes",
            "web": self.get_web(obj),
            "page_number": 1,
            "size": 50,
            "count": likes_count,
            "src": []
        }


class CompliantCommentsSerializer(serializers.Serializer):
    """
    CMPUT 404 Compliant Comments Collection Serializer
    
    Returns comments collections in the required format:
    {
        "type": "comments",
        "web": "http://nodebbbb/authors/222/entries/249",
        "id": "http://nodebbbb/api/authors/222/entries/249/comments",
        "page_number": 1,
        "size": 5,
        "count": 1023,
        "src": [...]
    }
    """
    
    type = serializers.CharField(default="comments", read_only=True)
    web = serializers.CharField()
    id = serializers.CharField()
    page_number = serializers.IntegerField(default=1)
    size = serializers.IntegerField(default=5)
    count = serializers.IntegerField()
    src = CompliantCommentSerializer(many=True)


class CompliantEntrySerializer(serializers.ModelSerializer):
    """
    CMPUT 404 Compliant Entry Serializer
    
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
    
    type = serializers.CharField(default="entry", read_only=True)
    title = serializers.CharField()
    id = serializers.CharField(source="url", read_only=True)
    web = serializers.SerializerMethodField()
    description = serializers.CharField(required=False, allow_blank=True)
    contentType = serializers.CharField(source="content_type")
    content = serializers.CharField()
    author = CompliantAuthorSerializer(read_only=True)
    comments = serializers.SerializerMethodField()
    likes = serializers.SerializerMethodField()
    published = serializers.DateTimeField(source="created_at", read_only=True)
    visibility = serializers.CharField()

    class Meta:
        model = Entry
        fields = [
            "type", "title", "id", "web", "description", "contentType", 
            "content", "author", "comments", "likes", "published", "visibility"
        ]

    def get_web(self, obj):
        """Return the web URL for this entry"""
        return f"{settings.SITE_URL}/authors/{obj.author.id}/entries/{obj.id}"

    def get_comments(self, obj):
        """Return the comments collection for this entry"""
        comments_count = obj.comment_set.count()
        return {
            "type": "comments",
            "web": self.get_web(obj),
            "id": f"{obj.url}/comments",
            "page_number": 1,
            "size": 5,
            "count": comments_count,
            "src": []
        }

    def get_likes(self, obj):
        """Return the likes collection for this entry"""
        likes_count = obj.like_set.count()
        return {
            "type": "likes",
            "web": self.get_web(obj),
            "id": f"{obj.url}/likes",
            "page_number": 1,
            "size": 50,
            "count": likes_count,
            "src": []
        }


class CompliantEntriesSerializer(serializers.Serializer):
    """
    CMPUT 404 Compliant Entries Collection Serializer
    
    Returns entries collections in the required format:
    {
        "type": "entries",
        "page_number": 23,
        "size": 10,
        "count": 9001,
        "src": [...]
    }
    """
    
    type = serializers.CharField(default="entries", read_only=True)
    page_number = serializers.IntegerField(default=1)
    size = serializers.IntegerField(default=10)
    count = serializers.IntegerField()
    src = CompliantEntrySerializer(many=True)


class CompliantAuthorsSerializer(serializers.Serializer):
    """
    CMPUT 404 Compliant Authors Collection Serializer
    
    Returns authors collections in the required format:
    {
        "type": "authors",
        "authors": [...]
    }
    """
    
    type = serializers.CharField(default="authors", read_only=True)
    authors = CompliantAuthorSerializer(many=True)


class CompliantFollowersSerializer(serializers.Serializer):
    """
    CMPUT 404 Compliant Followers Collection Serializer
    
    Returns followers collections in the required format:
    {
        "type": "followers",
        "followers": [...]
    }
    """
    
    type = serializers.CharField(default="followers", read_only=True)
    followers = CompliantAuthorSerializer(many=True)
