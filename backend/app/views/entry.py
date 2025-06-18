from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.permissions import IsAuthenticated
from django.db import models
from app.models import Entry, Author
from app.serializers.entry import EntrySerializer
from app.permissions import IsAuthorSelfOrReadOnly


class EntryViewSet(viewsets.ModelViewSet):
    lookup_field = "id"
    ...

    """
    Handles CRUD operations for entries:
    /api/entries/
    """

    serializer_class = EntrySerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """
        Override to exclude deleted entries and enforce visibility permissions.
        """
        queryset = Entry.objects.exclude(visibility=Entry.DELETED)
        lookup_url_kwarg = self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)

        if lookup_value is None:
            raise NotFound("No Entry ID provided.")

        try:
            obj = queryset.get(id=lookup_value)
        except Entry.DoesNotExist:
            raise NotFound("Entry not found.")

        # Check if user can access this entry
        user = self.request.user
        if hasattr(user, "author"):
            user_author = user.author
        else:
            user_author = user

        # Allow access if:
        # 1. Entry is public
        # 2. User is the author of the entry
        # 3. Entry is friends-only and user is a friend (simplified for now)
        if (
            obj.visibility == Entry.PUBLIC
            or obj.author == user_author
            or (obj.visibility == Entry.FRIENDS_ONLY and obj.author == user_author)
        ):
            self.check_object_permissions(self.request, obj)
            return obj
        else:
            raise NotFound("Entry not found.")

    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return Entry.objects.exclude(visibility=Entry.DELETED).order_by(
                "-created_at"
            )

        if hasattr(user, "author"):
            user_author = user.author
        else:
            user_author = user

        # Check if we're viewing a specific author's entries
        author_id = self.kwargs.get("author_id") or self.request.query_params.get(
            "author"
        )
        if author_id:
            try:
                target_author = Author.objects.get(id=author_id)
            except Author.DoesNotExist:
                return Entry.objects.none()

            if user_author == target_author:
                # ✅ Viewing your own profile: show all entries except deleted
                return (
                    Entry.objects.filter(author=target_author)
                    .exclude(visibility=Entry.DELETED)
                    .order_by("-created_at")
                )

            # Viewing someone else's profile: only show public entries
            return (
                Entry.objects.filter(author=target_author, visibility="public")
                .exclude(visibility=Entry.DELETED)
                .order_by("-created_at")
            )

        # General feed (not profile)
        return (
            Entry.objects.filter(
                models.Q(author=user_author) | models.Q(visibility="public")
            )
            .exclude(visibility=Entry.DELETED)
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        """
        Create an entry for the authenticated user's author.
        """
        user = self.request.user

        # Get the user's author instance
        if hasattr(user, "author"):
            user_author = user.author
        else:
            user_author = user

        if not user_author:
            raise PermissionDenied("You must have an author profile to create entries.")

        # Save the entry with the user's author
        serializer.save(author=user_author)

    def get_permissions(self):
        """
        Instantiate and return the list of permissions that this view requires.
        """
        if self.action == "create":
            permission_classes = [IsAuthenticated]
        elif self.action in ["update", "partial_update", "destroy"]:
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
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def destroy(self, request, *args, **kwargs):
        entry = self.get_object()

        # Only mark as deleted
        entry.visibility = Entry.DELETED
        entry.save()

        return Response(
            {"detail": "Entry soft-deleted."}, status=status.HTTP_204_NO_CONTENT
        )
