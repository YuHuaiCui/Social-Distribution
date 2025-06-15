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
from app.views import auth

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth endpoints
    path('api/auth/status/', auth.auth_status, name='auth-status'),
    path('api/auth/signup/', auth.signup, name='signup'),
    path('api/auth/login/', auth.login_view, name='login'),
    path('api/auth/github/callback/', auth.github_callback, name='github-callback'),
    path('api/author/me/', auth.author_me, name='author-me'),
    path('accounts/logout/', auth.logout_view, name='logout'),
 
    
    # Django AllAuth URLs - make sure this is included
    path('accounts/', include('allauth.urls')),
    
    
    path("", include("app.urls")),
]
