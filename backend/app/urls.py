from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app.views import AuthorViewSet
from app.views import EntryViewSet  # or wherever you put it
from rest_framework_nested.routers import NestedDefaultRouter

# namespacing app
app_name = "social-distribution"

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r"api/authors", AuthorViewSet)

# Nested router: /api/authors/<author_id>/entries/
authors_router = NestedDefaultRouter(router, r"api/authors", lookup="author")
authors_router.register(r"entries", EntryViewSet, basename="author-entries")


urlpatterns = [
    # Include all router URLs
    path("", include(router.urls)),
    path("", include(authors_router.urls)),
    # Additional API endpoints can be added here
    # path('api/other-endpoint/', other_view, name='other-endpoint'),
]
