from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import models
from django.db.models import Q
from app.models import Entry, Author
from app.serializers.entry import EntrySerializer
from app.permissions import IsAuthorSelfOrReadOnly


class EntryViewSet(viewsets.ModelViewSet):
    lookup_field = "id"
    parser_classes = [MultiPartParser, FormParser, JSONParser]
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
        lookup_url_kwarg = self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)

        if lookup_value is None:
            raise NotFound("No Entry ID provided.")

        # Get the user's author instance
        user = self.request.user
        if hasattr(user, "author"):
            user_author = user.author
        else:
            user_author = user

        # Use the EntryManager's visibility logic to check if the entry is visible
        try:
            obj = Entry.objects.visible_to_author(user_author).get(id=lookup_value)
        except Entry.DoesNotExist:
            raise NotFound("Entry not found.")

        self.check_object_permissions(self.request, obj)
        return obj

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
                # Viewing your own profile: show all entries except deleted
                return (
                    Entry.objects.filter(author=target_author)
                    .exclude(visibility=Entry.DELETED)
                    .order_by("-created_at")
                )

            # Viewing someone else's profile: use proper visibility logic
            # Get all entries by the target author that are visible to the current user
            visible_entries = Entry.objects.visible_to_author(user_author)
            return visible_entries.filter(author=target_author).order_by("-created_at")

        # General feed (not profile) - show all entries visible to the user
        return Entry.objects.visible_to_author(user_author).order_by("-created_at")

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

    @action(detail=False, methods=["get"], url_path="liked")
    def liked_entries(self, request):
        """Get entries that the current user has liked"""
        from app.models import Like

        # Get the current user's author
        user = request.user
        
        try:
            # Get entries that this user has liked
            liked_entry_ids = Like.objects.filter(
                author=user,  # User is already an Author object
            ).values_list("entry__id", flat=True)

            entries = Entry.objects.filter(id__in=liked_entry_ids).order_by(
                "-created_at"
            )

            # Paginate the results
            page = self.paginate_queryset(entries)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(entries, many=True)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {"error": f"Could not retrieve liked entries: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="saved")
    def saved_entries(self, request):
        """Get the current user's saved entries"""
        from app.models import Like  # Assuming we use Likes to track saved status

        # Get the current user's author
        user = request.user

        try:  # Get entries that this user has saved (liked)
            liked_entry_ids = Like.objects.filter(
                author=user,  # User is already an Author object
            ).values_list("entry__id", flat=True)

            entries = Entry.objects.filter(id__in=liked_entry_ids).order_by(
                "-created_at"
            )

            # Paginate the results
            page = self.paginate_queryset(entries)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(entries, many=True)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {"error": f"Could not retrieve saved entries: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="feed")
    def feed_entries(self, request):
        """Get entries from friends (mutually following users) for the home feed"""
        from app.models import Follow
        
        user = request.user
        
        try:
            # Use the user's author instance if available
            if hasattr(user, 'author'):
                current_author = user.author
            else:
                current_author = user
            
            print(f"FEED DEBUG - Current author: {current_author}")
            
            # Get all users that the current user is following with ACCEPTED status
            following_ids = set(Follow.objects.filter(
                follower=current_author,
                status=Follow.ACCEPTED
            ).values_list("followed__id", flat=True))
            
            print(f"FEED DEBUG - Following IDs: {following_ids}")
            
            # Get all users that follow the current user with ACCEPTED status
            followers_ids = set(Follow.objects.filter(
                followed=current_author,
                status=Follow.ACCEPTED
            ).values_list("follower__id", flat=True))
            
            print(f"FEED DEBUG - Followers IDs: {followers_ids}")
            
            # Friends are users who mutually follow each other (intersection)
            friends_ids = following_ids & followers_ids
            
            print(f"FEED DEBUG - Friends IDs (mutual follows): {friends_ids}")
            
            # Debug: Let's also check the raw follow relationships
            all_follows = Follow.objects.filter(
                Q(follower=current_author) | Q(followed=current_author),
                status=Follow.ACCEPTED
            )
            for follow in all_follows:
                print(f"FEED DEBUG - Follow: {follow.follower.username} -> {follow.followed.username} (status: {follow.status})")
            
            # Get all entries from friends (all their posts, regardless of visibility)
            entries = Entry.objects.filter(
                author__id__in=friends_ids
            ).exclude(
                visibility=Entry.DELETED
            ).order_by("-created_at")
            
            print(f"FEED DEBUG - Found {entries.count()} entries from friends")
            
            # Paginate the results
            page = self.paginate_queryset(entries)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(entries, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": f"Could not retrieve feed entries: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post", "delete"], url_path="save")
    def save_entry(self, request, id=None):
        """Save or unsave a post (same as liking but for saving)"""
        from app.models import Like

        entry = self.get_object()
        user = request.user

        try:
            # Check if entry is already saved
            existing_save = Like.objects.filter(
                author=user.author,
                entry=entry,
                is_save=True,  # Add this field to the Like model
            ).first()

            if request.method == "POST":
                # Save the entry
                if existing_save:
                    return Response(
                        {"detail": "Entry already saved"}, status=status.HTTP_200_OK
                    )

                # Create a new saved entry record
                Like.objects.create(author=user.author, entry=entry, is_save=True)
                return Response(
                    {"detail": "Entry saved successfully"},
                    status=status.HTTP_201_CREATED,
                )

            elif request.method == "DELETE":
                # Unsave the entry
                if not existing_save:
                    return Response(
                        {"detail": "Entry was not saved"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                existing_save.delete()
                return Response(
                    {"detail": "Entry unsaved successfully"},
                    status=status.HTTP_204_NO_CONTENT,
                )

        except Exception as e:
            return Response(
                {"error": f"Could not save/unsave entry: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
