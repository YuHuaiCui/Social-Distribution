from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app.views import AuthorViewSet
from app.views.entry import EntryViewSet
from app.views.like import EntryLikeView, CommentLikeView
from app.views.auth import auth_status, github_callback, author_me, logout_view
from app.views.image import ImageUploadView
from app.views.comment import CommentListCreateView, CommentDetailView
from app.views.github import GitHubValidationView, GitHubActivityView  
from app.views.inbox import InboxViewSet

# namespacing app
app_name = "social-distribution"


# Main router for compliant endpoints
router = DefaultRouter()
router.register(r"authors", AuthorViewSet, basename="authors")
router.register(r"inbox", InboxViewSet, basename="inbox")

# Legacy views for backward compatibility
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
entry_save_action = EntryViewSet.as_view({
    'post': 'save_entry',
    'delete': 'save_entry',
})

urlpatterns = [
    # Core router endpoints - CMPUT 404 Compliant
    path("", include(router.urls)),
    
    # CMPUT 404 Compliant API Endpoints
    
    # Single Author Entry Detail: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/
    path("authors/<uuid:author_id>/entries/<uuid:entry_id>/", EntryViewSet.as_view({
        'get': 'retrieve_author_entry',
        'put': 'update_author_entry',
        'delete': 'delete_author_entry'
    }), name="author-entry-detail"),
    
    # Entry Image API: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/image
    path("authors/<uuid:author_id>/entries/<uuid:entry_id>/image/", ImageUploadView.as_view(), name="author-entry-image"),
    
    # Legacy endpoints for backward compatibility - MUST BE BEFORE FQID patterns
    path("entries/", EntryViewSet.as_view({'get': 'list', 'post': 'create'}), name="entry-list"),
    path("entries/trending/", EntryViewSet.as_view({'get': 'trending_entries'}), name="entry-trending"),
    path("entries/categories/", EntryViewSet.as_view({'get': 'get_categories'}), name="entry-categories"),
    path("entries/liked/", EntryViewSet.as_view({'get': 'liked_entries'}), name="entry-liked"),
    path("entries/feed/", EntryViewSet.as_view({'get': 'feed_entries'}), name="entry-feed"),
    path("entries/saved/", EntryViewSet.as_view({'get': 'saved_entries'}), name="entry-saved"),
    path("entries/<uuid:id>/", EntryViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
        'put': 'update',
        'delete': 'destroy'
    }), name="entry-detail"),    
    path("entries/<uuid:id>/save/", EntryViewSet.as_view({
        'post': 'save_entry',
        'delete': 'save_entry'
    }), name="entry-save"),    
    path("entries/<uuid:entry_id>/likes/", EntryLikeView.as_view(), name="entry-likes"),
    path("entries/<uuid:entry_id>/comments/", CommentListCreateView.as_view(), name="entry-comments"),
    path("entries/<uuid:entry_id>/comments/<uuid:pk>/", CommentDetailView.as_view(), name="entry-comment-detail"),
    
    # Entry Likes by FQID: /api/entries/{ENTRY_FQID}/likes
    path("entries/<path:entry_fqid>/likes/", EntryLikeView.as_view(), name="entry-likes-by-fqid"),
    
    # Entry Comments by FQID: /api/entries/{ENTRY_FQID}/comments
    path("entries/<path:entry_fqid>/comments/", CommentListCreateView.as_view(), name="entry-comments-by-fqid"),
    
    # Entry Image by FQID: /api/entries/{ENTRY_FQID}/image
    path("entries/<path:entry_fqid>/image/", ImageUploadView.as_view(), name="entry-image-by-fqid"),
    
    # Entry Save by FQID: /api/entries/{ENTRY_FQID}/save/ (specific patterns first)
    path("entries/<path:entry_fqid>/save/", EntryViewSet.as_view({
        'post': 'save_entry_by_fqid',
        'delete': 'save_entry_by_fqid'
    }), name="entry-save-by-fqid"),
    
    # Entry by FQID: /api/entries/{ENTRY_FQID}/ (most general, should be last)
    path("entries/<path:entry_fqid>/", EntryViewSet.as_view({
        'get': 'retrieve_by_fqid',
        'patch': 'partial_update_by_fqid',
        'put': 'update_by_fqid',
        'delete': 'destroy_by_fqid'
    }), name="entry-by-fqid"),
    
    # Comments API: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/comments
    path("authors/<uuid:author_id>/entries/<uuid:entry_id>/comments/", CommentListCreateView.as_view(), name="author-entry-comments"),
    
    # Specific Comment: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/comment/{REMOTE_COMMENT_FQID}
    path("authors/<uuid:author_id>/entries/<uuid:entry_id>/comment/<path:comment_fqid>/", CommentDetailView.as_view(), name="specific-comment"),
    
    # Commented API: /api/authors/{AUTHOR_SERIAL}/commented
    path("authors/<uuid:author_id>/commented/", CommentListCreateView.as_view(), name="author-commented"),
    
    # Commented API by FQID: /api/authors/{AUTHOR_FQID}/commented
    path("authors/<path:author_fqid>/commented/", CommentListCreateView.as_view(), name="author-commented-by-fqid"),
    
    # Specific commented: /api/authors/{AUTHOR_SERIAL}/commented/{COMMENT_SERIAL}
    path("authors/<uuid:author_id>/commented/<uuid:comment_id>/", CommentDetailView.as_view(), name="author-commented-detail"),
    
    # Comment by FQID: /api/commented/{COMMENT_FQID}
    path("commented/<path:comment_fqid>/", CommentDetailView.as_view(), name="comment-by-fqid"),
    
    # Likes API: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/likes
    path("authors/<uuid:author_id>/entries/<uuid:entry_id>/likes/", EntryLikeView.as_view(), name="author-entry-likes"),
    
    # Comment Likes: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/comments/{COMMENT_FQID}/likes
    path("authors/<uuid:author_id>/entries/<uuid:entry_id>/comments/<path:comment_fqid>/likes/", CommentLikeView.as_view(), name="comment-likes-detailed"),
    
    # Liked API: /api/authors/{AUTHOR_SERIAL}/liked
    path("authors/<uuid:author_id>/liked/", EntryLikeView.as_view(), name="author-liked"),
    
    # Liked API by FQID: /api/authors/{AUTHOR_FQID}/liked
    path("authors/<path:author_fqid>/liked/", EntryLikeView.as_view(), name="author-liked-by-fqid"),
    
    # Single Like: /api/authors/{AUTHOR_SERIAL}/liked/{LIKE_SERIAL}
    path("authors/<uuid:author_id>/liked/<uuid:like_id>/", EntryLikeView.as_view(), name="author-liked-detail"),
    
    # Like by FQID: /api/liked/{LIKE_FQID}
    path("liked/<path:like_fqid>/", EntryLikeView.as_view(), name="like-by-fqid"),
    
    path("comments/<uuid:comment_id>/likes/", CommentLikeView.as_view(), name="comment-likes"),
    
    # Other endpoints
    path('upload-image/', ImageUploadView.as_view(), name='upload-image'),
    path('api/auth/status/', auth_status, name='auth-status'),
    path('api/auth/github/callback/', github_callback, name='github-callback'),
    path('authors/me/', author_me, name='author-me'),
    path('api/auth/logout/', logout_view, name='logout'),
    path('github/validate/<str:username>/', GitHubValidationView.as_view(), name='github-validate'),
    path('github/activity/<str:username>/', GitHubActivityView.as_view(), name='github-activity'),
]
