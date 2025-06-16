"""
URL configuration for project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from app.views.follow import FollowViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'api/follows', FollowViewSet, basename='follow')

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),
    path("", include("app.urls")),
    path("", include(router.urls)),

    # Following end points
    path('api/follows/<int:pk>/accept/', FollowViewSet.as_view({'post': 'accept'}), name='accept-follow'),
    path('api/follows/<int:pk>/reject/', FollowViewSet.as_view({'post': 'reject'}), name='reject-follow'),

]
