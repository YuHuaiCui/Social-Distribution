# permissions.py
from rest_framework import permissions

class IsAuthorSelfOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Check that the author ID matches the logged-in user's author
        return str(view.kwargs.get('author_pk')) == str(getattr(request.user, 'author', None).id)
