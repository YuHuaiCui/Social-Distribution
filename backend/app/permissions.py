# permissions.py
from rest_framework import permissions 
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAuthorSelfOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # For nested views, we need to check if the author matches the entry's author
        print("DEBUG:", request.user, getattr(request.user, "author", None), obj.author_id)
        if request.method in SAFE_METHODS:
            return True
        author = request.user  # Because request.user *is* the Author

        if not author:
            return False
        return obj.author_id == author.url  # compare full URL (foreign key is to_field='url')
        
        
        
