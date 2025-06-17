from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app.views import AuthorViewSet
from app.views.entry import EntryViewSet  
from app.views.like import EntryLikeView
from app.views.auth import auth_status, github_callback, author_me, logout_view

# namespacing app
app_name = "social-distribution"

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r"authors", AuthorViewSet)

# Nested router: /authors/<author_id>/entries/
router.register(
    r"entries",
    EntryViewSet,
    basename="author-entries"
)


urlpatterns = [
    # Include all router URLs
    path("", include(router.urls)),

    # Nested like endpoint
    path("entries/<uuid:entry_id>/likes/", EntryLikeView.as_view(), name="entry-likes"),
    
    # Auth endpoints - these are duplicated in main urls.py, so commenting out
    # path('auth/status/', auth_status, name='auth-status'),
    # path('auth/github/callback/', github_callback, name='github-callback'),
    # path('authors/me/', author_me, name='author-me'),
    # path('auth/logout/', logout_view, name='logout'),
    
    # Additional API endpoints can be added here
    # path('api/other-endpoint/', other_view, name='other-endpoint'),
]