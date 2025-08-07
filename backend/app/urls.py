from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app.views import AuthorViewSet
from app.views.entry import EntryViewSet
from app.views.follow import FollowViewSet, remote_followers
from app.views.like import EntryLikeView, CommentLikeView, received_likes
from app.views.auth import auth_status, github_callback, author_me, logout_view
from app.views.image import ImageUploadView
from app.views.comment import (
    CommentListCreateView,
    CommentDetailView,
    received_comments,
)
from app.views.github import GitHubValidationView, GitHubActivityView
from app.views.node import (
    GetNodesView,
    UpdateNodeView,
    AddNodeView,
    RefreshNodeView,
    DeleteNodeView,
    RemoteFolloweeView,
    RemoteAuthorsView,
)
from app.views.base import health_check

# namespacing app
app_name = "social-distribution"


# Main router for compliant endpoints
router = DefaultRouter()
router.register(r"authors", AuthorViewSet, basename="authors")
router.register(r"follows", FollowViewSet, basename="follows")

# Legacy views for backward compatibility
entry_list = EntryViewSet.as_view(
    {
        "get": "list",
        "post": "create",
    }
)
entry_detail = EntryViewSet.as_view(
    {
        "get": "retrieve",
        "patch": "partial_update",
        "put": "update",
        "delete": "destroy",
    }
)
entry_liked = EntryViewSet.as_view(
    {
        "get": "liked_entries",
    }
)
entry_feed = EntryViewSet.as_view(
    {
        "get": "feed_entries",
    }
)

urlpatterns = [
    # Core router endpoints - CMPUT 404 Compliant
    path("", include(router.urls)),
    # CMPUT 404 Compliant API Endpoints
    # Single Author Entry Detail: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/
    path(
        "authors/<uuid:author_id>/entries/<uuid:entry_id>/",
        EntryViewSet.as_view(
            {
                "get": "retrieve_author_entry",
                "put": "update_author_entry",
                "delete": "delete_author_entry",
            }
        ),
        name="author-entry-detail",
    ),
    # Single Author Entry Detail (no trailing slash): /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}
    path(
        "authors/<uuid:author_id>/entries/<uuid:entry_id>",
        EntryViewSet.as_view(
            {
                "get": "retrieve_author_entry",
                "put": "update_author_entry",
                "delete": "delete_author_entry",
            }
        ),
        name="author-entry-detail-no-slash",
    ),
    # Entry Image API: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/image
    path(
        "authors/<uuid:author_id>/entries/<uuid:entry_id>/image/",
        ImageUploadView.as_view(),
        name="author-entry-image",
    ),
    # Entry Image API (no trailing slash): /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/image
    path(
        "authors/<uuid:author_id>/entries/<uuid:entry_id>/image",
        ImageUploadView.as_view(),
        name="author-entry-image-no-slash",
    ),
    # Legacy endpoints for backward compatibility - MUST BE BEFORE FQID patterns
    path(
        "entries/",
        EntryViewSet.as_view({"get": "list", "post": "create"}),
        name="entry-list",
    ),
    path(
        "entries/trending/",
        EntryViewSet.as_view({"get": "trending_entries"}),
        name="entry-trending",
    ),
    path(
        "entries/categories/",
        EntryViewSet.as_view({"get": "get_categories"}),
        name="entry-categories",
    ),
    path(
        "entries/liked/",
        EntryViewSet.as_view({"get": "liked_entries"}),
        name="entry-liked",
    ),
    path(
        "entries/feed/",
        EntryViewSet.as_view({"get": "feed_entries"}),
        name="entry-feed",
    ),
    path(
        "entries/by-url/",
        EntryViewSet.as_view({"get": "get_entry_by_url"}),
        name="entry-by-url",
    ),
    # Remote entry endpoints - MUST BE BEFORE FQID patterns
    path(
        "entries/fetch-remote/",
        EntryViewSet.as_view({"get": "fetch_remote_entry"}),
        name="entry-fetch-remote",
    ),
    path(
        "entries/local-comments-for-remote/",
        EntryViewSet.as_view({"get": "get_local_comments_for_remote_entry"}),
        name="entry-local-comments-remote",
    ),
    path(
        "entries/<uuid:id>/",
        EntryViewSet.as_view(
            {
                "get": "retrieve",
                "patch": "partial_update",
                "put": "update",
                "delete": "destroy",
            }
        ),
        name="entry-detail",
    ),
    path("entries/<uuid:entry_id>/likes/", EntryLikeView.as_view(), name="entry-likes"),
    path(
        "entries/<uuid:entry_id>/comments/",
        CommentListCreateView.as_view(),
        name="entry-comments",
    ),
    path(
        "entries/<uuid:entry_id>/comments/<uuid:pk>/",
        CommentDetailView.as_view(),
        name="entry-comment-detail",
    ),
    # Entry Likes by FQID: /api/entries/{ENTRY_FQID}/likes
    path(
        "entries/<path:entry_fqid>/likes/",
        EntryLikeView.as_view(),
        name="entry-likes-by-fqid",
    ),
    # Entry Comments by FQID: /api/entries/{ENTRY_FQID}/comments
    path(
        "entries/<path:entry_fqid>/comments/",
        CommentListCreateView.as_view(),
        name="entry-comments-by-fqid",
    ),
    # Entry Image by FQID: /api/entries/{ENTRY_FQID}/image
    path(
        "entries/<path:entry_fqid>/image/",
        ImageUploadView.as_view(),
        name="entry-image-by-fqid",
    ),
    # Entry by FQID: /api/entries/{ENTRY_FQID}/ (most general, should be last)
    path(
        "entries/<path:entry_fqid>/",
        EntryViewSet.as_view(
            {
                "get": "retrieve_by_fqid",
                "patch": "partial_update_by_fqid",
                "put": "update_by_fqid",
                "delete": "destroy_by_fqid",
            }
        ),
        name="entry-by-fqid",
    ),
    # Comments API: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/comments
    path(
        "authors/<uuid:author_id>/entries/<uuid:entry_id>/comments/",
        CommentListCreateView.as_view(),
        name="author-entry-comments",
    ),
    # Specific Comment: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/comment/{REMOTE_COMMENT_FQID}
    path(
        "authors/<uuid:author_id>/entries/<uuid:entry_id>/comment/<path:comment_fqid>/",
        CommentDetailView.as_view(),
        name="specific-comment",
    ),
    # Commented API: /api/authors/{AUTHOR_SERIAL}/commented
    path(
        "authors/<uuid:author_id>/commented/",
        CommentListCreateView.as_view(),
        name="author-commented",
    ),
    # Commented API by FQID: /api/authors/{AUTHOR_FQID}/commented
    path(
        "authors/<path:author_fqid>/commented/",
        CommentListCreateView.as_view(),
        name="author-commented-by-fqid",
    ),
    # Specific commented: /api/authors/{AUTHOR_SERIAL}/commented/{COMMENT_SERIAL}
    path(
        "authors/<uuid:author_id>/commented/<uuid:comment_id>/",
        CommentDetailView.as_view(),
        name="author-commented-detail",
    ),
    # Comment by FQID: /api/commented/{COMMENT_FQID}
    path(
        "commented/<path:comment_fqid>/",
        CommentDetailView.as_view(),
        name="comment-by-fqid",
    ),
    # Likes API: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/likes
    path(
        "authors/<uuid:author_id>/entries/<uuid:entry_id>/likes/",
        EntryLikeView.as_view(),
        name="author-entry-likes",
    ),
    # Comment Likes: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/comments/{COMMENT_FQID}/likes
    path(
        "authors/<uuid:author_id>/entries/<uuid:entry_id>/comments/<path:comment_fqid>/likes/",
        CommentLikeView.as_view(),
        name="comment-likes-detailed",
    ),
    # Liked API: /api/authors/{AUTHOR_SERIAL}/liked
    path(
        "authors/<uuid:author_id>/liked/", EntryLikeView.as_view(), name="author-liked"
    ),
    # Liked API by FQID: /api/authors/{AUTHOR_FQID}/liked
    path(
        "authors/<path:author_fqid>/liked/",
        EntryLikeView.as_view(),
        name="author-liked-by-fqid",
    ),
    # Single Like: /api/authors/{AUTHOR_SERIAL}/liked/{LIKE_SERIAL}
    path(
        "authors/<uuid:author_id>/liked/<uuid:like_id>/",
        EntryLikeView.as_view(),
        name="author-liked-detail",
    ),
    # Like by FQID: /api/liked/{LIKE_FQID}
    path("liked/<path:like_fqid>/", EntryLikeView.as_view(), name="like-by-fqid"),
    path(
        "comments/<uuid:comment_id>/likes/",
        CommentLikeView.as_view(),
        name="comment-likes",
    ),
    # Other endpoints
    path("upload-image/", ImageUploadView.as_view(), name="upload-image"),
    path("api/auth/status/", auth_status, name="auth-status"),
    path("api/auth/github/callback/", github_callback, name="github-callback"),
    path("authors/me/", author_me, name="author-me"),
    path("api/auth/logout/", logout_view, name="logout"),
    path(
        "github/validate/<str:username>/",
        GitHubValidationView.as_view(),
        name="github-validate",
    ),
    path(
        "github/activity/<str:username>/",
        GitHubActivityView.as_view(),
        name="github-activity",
    ),
    # Node management endpoints
    path("nodes/", GetNodesView.as_view(), name="get-nodes"),
    path("nodes/add/", AddNodeView.as_view(), name="add-node"),
    path("nodes/update/", UpdateNodeView.as_view(), name="update-node"),
    path("nodes/refresh/", RefreshNodeView.as_view(), name="refresh-node"),
    path("nodes/remove/", DeleteNodeView.as_view(), name="delete-node"),
    # Remote API endpoints
    path(
        "remote/followee/<str:local_serial>/<path:remote_fqid>/",
        RemoteFolloweeView.as_view(),
        name="remote-followee",
    ),
    path("remote/authors/", RemoteAuthorsView.as_view(), name="remote-authors"),
    # API endpoints for likes (moved higher for priority)
    path(
        "api/entries/<uuid:entry_id>/likes/",
        EntryLikeView.as_view(),
        name="api-entry-likes",
    ),
    path(
        "api/entries/<path:entry_fqid>/likes/",
        EntryLikeView.as_view(),
        name="api-entry-likes-by-fqid",
    ),
    # Health check endpoint
    path("health/", health_check, name="health-check"),
    # Inbox notification endpoints
    path("api/likes/received/", received_likes, name="received-likes"),
    path("api/comments/received/", received_comments, name="received-comments"),
    # Remote followers endpoint: /api/authors/{AUTHOR_SERIAL}/followers/{FOREIGN_AUTHOR_FQID}
    path(
        "authors/<uuid:author_serial>/followers/<path:foreign_author_fqid>/",
        remote_followers,
        name="remote-followers",
    ),
    # Followers by FQID: /api/authors/{AUTHOR_FQID}/followers/
    path(
        "authors/<path:author_fqid>/followers/",
        AuthorViewSet.as_view({"get": "followers"}),
        name="author-followers-by-fqid",
    ),
    # Following by FQID: /api/authors/{AUTHOR_FQID}/following/
    path(
        "authors/<path:author_fqid>/following/",
        AuthorViewSet.as_view({"get": "following"}),
        name="author-following-by-fqid",
    ),
    # Follow by FQID: /api/authors/{AUTHOR_FQID}/follow/
    path(
        "authors/<path:author_fqid>/follow/",
        AuthorViewSet.as_view({"post": "follow", "delete": "follow"}),
        name="author-follow-by-fqid",
    ),
    # Author by FQID: /api/authors/{AUTHOR_FQID}/ (most general, should be last)
    path(
        "authors/<path:author_fqid>/",
        AuthorViewSet.as_view({"get": "retrieve_by_fqid"}),
        name="author-by-fqid",
    ),
]
