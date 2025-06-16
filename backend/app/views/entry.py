from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.db import models
from app.models import Entry, Author
from app.serializers.entry import EntrySerializer
from app.permissions import IsAuthorSelfOrReadOnly

class EntryViewSet(viewsets.ModelViewSet):
    """
    Handles CRUD operations for entries:
    /api/entries/
    """

    serializer_class = EntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return entries based on user permissions.
        Authors can see all their entries, others see only public entries.
        """
        user = self.request.user
        
        if user.is_staff:
            # Staff can see all entries
            return Entry.objects.all().order_by("-created_at")
        
        # Get the user's author instance
        try:
            user_author = user.author if hasattr(user, 'author') else user
        except AttributeError:
            # User doesn't have an associated author
            return Entry.objects.filter(visibility='public').order_by("-created_at")
        
        # Return user's own entries + public entries from others
        return Entry.objects.filter(
            models.Q(author=user_author) |  # User's own entries
            models.Q(visibility='public')   # Public entries from others
        ).order_by("-created_at")

    def perform_create(self, serializer):
        """
        Create an entry for the authenticated user's author.
        """
        user = self.request.user
        
        # Get the user's author instance
        try:
            user_author = user.author if hasattr(user, 'author') else user
        except AttributeError:
            raise PermissionDenied("You must have an author profile to create entries.")
        
        # Save the entry with the user's author
        serializer.save(author=user_author)

    def get_permissions(self):
        """
        Instantiate and return the list of permissions that this view requires.
        """
        if self.action == 'create':
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsAuthorSelfOrReadOnly]
        else:  # list, retrieve
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    def create(self, request, *args, **kwargs):
        """
        Override create to handle both JSON and FormData properly.
        """
        print(f"CREATE DEBUG - User: {request.user}")
        print(f"CREATE DEBUG - Data: {request.data}")
        print(f"CREATE DEBUG - Content-Type: {request.content_type}")
        
        # Handle the serializer context properly
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Perform the creation
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)