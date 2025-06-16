from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app.views import AuthorViewSet
from app.views import EntryViewSet  # or wherever you put it
from app.views.auth import auth_status, github_callback, author_me, logout_view

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
    
    # Auth endpoints
    path('api/auth/status/', auth_status, name='auth-status'),
    path('api/auth/github/callback/', github_callback, name='github-callback'),
    path('api/authors/me/', author_me, name='author-me'),
    path('api/auth/logout/', logout_view, name='logout'),
    
    # Additional API endpoints can be added here
    # path('api/other-endpoint/', other_view, name='other-endpoint'),
]