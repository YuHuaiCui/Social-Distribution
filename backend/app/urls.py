from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app.views import AuthorViewSet
from app.views.entry import EntryViewSet  
from app.views.like import EntryLikeView
from app.views.auth import auth_status, github_callback, author_me, logout_view
from app.views.image import ImageUploadView
from app.views.comment import CommentListCreateView, CommentDetailView  

# namespacing app
app_name = "social-distribution"

# Main router
router = DefaultRouter()
router.register(r"authors", AuthorViewSet)

# Nested router: /api/authors/<author_id>/entries/
# router.register(
#    r"entries",
#    EntryViewSet,
#    basename="author-entries"
# )

entry_list = EntryViewSet.as_view({
    'get': 'list',
    'post': 'create',
})
entry_detail = EntryViewSet.as_view({
    'get': 'retrieve',
    'patch': 'partial_update',
    'put': 'update',
    'delete': 'destroy',
})
entry_liked = EntryViewSet.as_view({
    'get': 'liked_entries',
})
entry_feed = EntryViewSet.as_view({
    'get': 'feed_entries',
})
entry_saved = EntryViewSet.as_view({
    'get': 'saved_entries',
})


urlpatterns = [    # Router-based endpoints
    path("", include(router.urls)),
    # Entry endpoints (note: api/ prefix is added at project-level urls.py)
    path("entries/", entry_list, name="entry-list"),
    path("entries/liked/", entry_liked, name="entry-liked"),
    path("entries/feed/", entry_feed, name="entry-feed"),
    path("entries/saved/", entry_saved, name="entry-saved"),
    path("entries/<uuid:id>/", entry_detail, name="entry-detail"),    
    
    # Like endpoint
    path("entries/<uuid:entry_id>/likes/", EntryLikeView.as_view(), name="entry-likes"),

    # Comment endpoints
    path("entries/<uuid:entry_id>/comments/", CommentListCreateView.as_view(), name="entry-comments"),
    path("entries/<uuid:entry_id>/comments/<uuid:pk>/", CommentDetailView.as_view(), name="entry-comment-detail"),

    # Image upload
    path('upload-image/', ImageUploadView.as_view(), name='upload-image'),

    # Auth endpoints
    path('api/auth/status/', auth_status, name='auth-status'),
    path('api/auth/github/callback/', github_callback, name='github-callback'),
    path('authors/me/', author_me, name='author-me'),
    path('api/auth/logout/', logout_view, name='logout'),
]
