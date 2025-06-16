# permissions.py
from rest_framework import permissions

class IsAuthorSelfOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        author = getattr(request.user, 'author', None)
        if not author:
            return False
        return str(view.kwargs.get('author_pk')) == str(author.id)
        
