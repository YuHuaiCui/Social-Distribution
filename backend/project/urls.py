"""
URL configuration for project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app import views
    2. Add a URL to urlpatterns:  path('', views.Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include, re_path
from app.views import auth
from app.views.frontend import ReactAppView

from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

router = DefaultRouter()
# Follows are now handled by app/urls.py router
# router.register(r"api/follows", FollowViewSet, basename="follow")

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth endpoints
    path("api/auth/status/", auth.auth_status, name="auth-status"),
    path("api/auth/signup/", auth.signup, name="signup"),
    path("api/auth/login/", auth.login_view, name="login"),
    path("api/auth/github/callback/", auth.github_callback, name="github-callback"),
    path("api/author/me/", auth.author_me, name="author-me"),
    path("accounts/logout/", auth.logout_view, name="logout"),
    # Django AllAuth URLs - make sure this is included
    path("accounts/", include("allauth.urls")),
    # API endpoints - all other app URLs are API endpoints
    path("api/", include("app.urls")),
    # Follow endpoints via router
    path("", include(router.urls)),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Catch-all pattern for React app - must be last!
    re_path(
        r"^(?!api|admin|accounts|static).*$", ReactAppView.as_view(), name="react-app"
    ),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
