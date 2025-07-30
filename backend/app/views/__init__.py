# Import all views to make them available when importing from app.views
from .author import AuthorViewSet, IsAdminOrOwnerOrReadOnly
from .entry import EntryViewSet
from app.permissions import IsAuthorSelfOrReadOnly


from .base import *  # Import existing views

# from .entry import EntryViewSet
# from .comment import CommentViewSet
# from .like import LikeViewSet
# from .follow import FollowViewSet

# Add your views here as you create them
__all__ = [
    "AuthorViewSet",
    "IsAdminOrOwnerOrReadOnly",
    'EntryViewSet',
    # 'CommentViewSet',
    # 'LikeViewSet',
    # 'FollowViewSet',
]
