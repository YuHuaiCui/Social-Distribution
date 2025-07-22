"""
CMPUT 404 Compliant Collection Serializers

These serializers handle collections of objects according to the CMPUT 404 specification.
"""

from rest_framework import serializers
from .author import AuthorSerializer
from .entry import EntrySerializer
from .comment import CommentSerializer
from .like import LikeSerializer


class AuthorsSerializer(serializers.Serializer):
    """
    CMPUT 404 Compliant Authors Collection Serializer
    
    Returns authors collections in the required format:
    {
        "type": "authors",
        "authors": [...]
    }
    """
    
    type = serializers.CharField(default="authors", read_only=True)
    authors = AuthorSerializer(many=True, read_only=True)


class FollowersSerializer(serializers.Serializer):
    """
    CMPUT 404 Compliant Followers Collection Serializer
    
    Returns followers collections in the required format:
    {
        "type": "followers",
        "followers": [...]
    }
    """
    
    type = serializers.CharField(default="followers", read_only=True)
    followers = AuthorSerializer(many=True, read_only=True)


class EntriesSerializer(serializers.Serializer):
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
    src = EntrySerializer(many=True, read_only=True)


class CommentsSerializer(serializers.Serializer):
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
    web = serializers.CharField(read_only=True)
    id = serializers.CharField(read_only=True)
    page_number = serializers.IntegerField(default=1)
    size = serializers.IntegerField(default=5)
    count = serializers.IntegerField()
    src = CommentSerializer(many=True, read_only=True)


class LikesSerializer(serializers.Serializer):
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
    web = serializers.CharField(read_only=True)
    id = serializers.CharField(read_only=True)
    page_number = serializers.IntegerField(default=1)
    size = serializers.IntegerField(default=50)
    count = serializers.IntegerField()
    src = LikeSerializer(many=True, read_only=True)
