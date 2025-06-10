from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app.views import AuthorViewSet

# namespacing app
app_name = "social-distribution"

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r"api/authors", AuthorViewSet)

urlpatterns = [
    # Include all router URLs
    path("", include(router.urls)),
    # Additional API endpoints can be added here
    # path('api/other-endpoint/', other_view, name='other-endpoint'),
]
