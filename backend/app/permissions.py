# permissions.py
from rest_framework import permissions
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAuthorSelfOrReadOnly(permissions.BasePermission):
    """
    Custom permission that allows read access to everyone, but write access
    only to the owner of the object (entry author).

    This permission is specifically designed for Entry objects where:
    - Anyone can read entries (subject to visibility rules)
    - Only the author can edit/delete their own entries
    - Staff users can edit/delete any entry
    """

    def has_object_permission(self, request, view, obj):
        """
        Check if the user has permission to perform the requested action on the object.

        Args:
            request: The incoming HTTP request
            view: The view being accessed
            obj: The object being accessed (Entry in this case)

        Returns:
            bool: True if permission is granted, False otherwise
        """
        # Read permissions (GET, HEAD, OPTIONS) are allowed for everyone
        if request.method in SAFE_METHODS:
            return True

        # Staff users can edit/delete any entry
        if request.user.is_staff:
            return True

        # Write permissions are only allowed to the owner of the entry
        # Handle both cases: user.author (if separate) or user itself (if Author extends User)
        if hasattr(request.user, "author"):
            author = request.user.author
        else:
            # If request.user IS the author (custom user model extending Author)
            author = request.user

        # Compare the author with the entry's author
        # Entry.author is a ForeignKey with to_field='url', so we compare instances directly
        return obj.author == author
