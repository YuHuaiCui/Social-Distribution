from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app.views import AuthorViewSet
from app.views.entry import EntryViewSet  
from app.views.like import EntryLikeView
from app.views.auth import auth_status, github_callback, author_me, logout_view
from app.views.image import ImageUploadView

# namespacing app
app_name = "social-distribution"

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r"api/authors", AuthorViewSet)

# Nested router: /api/authors/<author_id>/entries/
router.register(
    r"api/entries",
    EntryViewSet,
    basename="author-entries"
)


urlpatterns = [
    # Include all router URLs
    path("", include(router.urls)),

    # Nested like endpoint
    path("api/entries/<uuid:entry_id>/likes/", EntryLikeView.as_view(), name="entry-likes"),

    path('api/upload-image/', ImageUploadView.as_view(), name='upload-image'),
    
    # Auth endpoints
    path('api/auth/status/', auth_status, name='auth-status'),
    path('api/auth/github/callback/', github_callback, name='github-callback'),
    path('api/authors/me/', author_me, name='author-me'),
    path('api/auth/logout/', logout_view, name='logout'),
    
    # Additional API endpoints can be added here
    # path('api/other-endpoint/', other_view, name='other-endpoint'),
]