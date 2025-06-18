# Import all serializers to make them available when importing from app.serializers
from .author import AuthorSerializer, AuthorListSerializer, NodeSerializer
from .inbox import InboxItemSerializer, InboxCreateSerializer, InboxStatsSerializer

# from .entry import EntrySerializer
# from .comment import CommentSerializer
# from .like import LikeSerializer
# from .follow import FollowSerializer

# Add your serializers here as you create them
__all__ = [
    "AuthorSerializer",
    "AuthorListSerializer",
    "NodeSerializer",
    "InboxItemSerializer",
    "InboxCreateSerializer",
    "InboxStatsSerializer",
    # 'EntrySerializer',
    # 'CommentSerializer',
    # 'LikeSerializer',
    # 'FollowSerializer',
]
