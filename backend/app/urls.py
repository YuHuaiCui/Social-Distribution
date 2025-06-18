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
#router.register(
#    r"api/entries",
#    EntryViewSet,
#    basename="author-entries"
#)

entry_list = EntryViewSet.as_view({
    'get': 'list',
    'post': 'create',
})
entry_detail = EntryViewSet.as_view({
    'get': 'retrieve',
    'patch': 'partial_update',
    'put': 'update',
    'delete': 'destroy',
}
)


urlpatterns = [
    # Router-based endpoints
    path("", include(router.urls)),
    path("api/entries/", entry_list, name="entry-list"),
    path("api/entries/<uuid:id>/", entry_detail, name="entry-detail"),

    # Like endpoint
    path("api/entries/<uuid:entry_id>/likes/", EntryLikeView.as_view(), name="entry-likes"),

    # Manual comment endpoints
    path("api/entries/<uuid:entry_id>/comments/", CommentListCreateView.as_view(), name="entry-comments"),
    path("api/entries/<uuid:entry_id>/comments/<uuid:pk>/", CommentDetailView.as_view(), name="entry-comment-detail"),

    # Image upload
    path('api/upload-image/', ImageUploadView.as_view(), name='upload-image'),

    # Auth endpoints
    path('api/auth/status/', auth_status, name='auth-status'),
    path('api/auth/github/callback/', github_callback, name='github-callback'),
    path('api/authors/me/', author_me, name='author-me'),
    path('api/auth/logout/', logout_view, name='logout'),
]
