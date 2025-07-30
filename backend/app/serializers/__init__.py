# Import all serializers to make them available when importing from app.serializers
from .author import AuthorSerializer, AuthorListSerializer
from .node import (
    NodeSerializer,
    NodeWithAuthenticationSerializer,
    NodeCreateSerializer,
    NodeUpdateSerializer,
)
from .entry import EntrySerializer
from .comment import CommentSerializer
from .like import LikeSerializer
from .follow import FollowSerializer, FollowCreateSerializer

# Add your serializers here as you create them
__all__ = [
    "AuthorSerializer",
    "AuthorListSerializer",
    "NodeSerializer",
    "NodeWithAuthenticationSerializer",
    "NodeCreateSerializer",
    "NodeUpdateSerializer",
    "EntrySerializer",
    "CommentSerializer",
    "LikeSerializer",
    "FollowSerializer",
    "FollowCreateSerializer",
    "AuthorsSerializer",
    "FollowersSerializer",
    "EntriesSerializer",
    "CommentsSerializer",
    "LikesSerializer",
]
