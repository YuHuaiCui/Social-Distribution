# Import all serializers to make them available when importing from app.serializers
from .author import AuthorSerializer, AuthorListSerializer, NodeSerializer

# from .entry import EntrySerializer
# from .comment import CommentSerializer
# from .like import LikeSerializer
# from .follow import FollowSerializer
# from .inbox import InboxSerializer

# Add your serializers here as you create them
__all__ = [
    "AuthorSerializer",
    "AuthorListSerializer",
    "NodeSerializer",
    # 'EntrySerializer',
    # 'CommentSerializer',
    # 'LikeSerializer',
    # 'FollowSerializer',
    # 'InboxSerializer',
]
