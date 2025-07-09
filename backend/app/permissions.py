# permissions.py
from rest_framework import permissions
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAuthorSelfOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        print("PERMISSION DEBUG - Entry Author:", obj.author)
        print("PERMISSION DEBUG - Request Author:", getattr(request.user, "author", None))

        if request.method in SAFE_METHODS:
            return True

        # ✅ Allow staff users to edit/delete any entry
        if request.user.is_staff:
            return True
        
        # Write permissions are only allowed to the owner of the entry.
        # Get the author from the request user
        if hasattr(request.user, "author"):
            author = request.user.author
        else:
            # If request.user IS the author (custom user model)
            author = request.user

        # Compare the author with the entry's author
        # Since Entry.author is a ForeignKey with to_field='url',
        # we need to compare the author instances directly
        return obj.author == author
