from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
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
        Override to implement proper visibility filtering for retrieve/update.
        """
        
    
        queryset = Entry.objects.all()
        lookup_url_kwarg = self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)

        if lookup_value is None:
            raise NotFound("No Entry ID provided.")
            
        try:
            obj = queryset.get(id=lookup_value)
        except Entry.DoesNotExist:
            raise NotFound(f"Entry with ID {lookup_value} does not exist.")
            
        # Check visibility permissions
        user = self.request.user
        
        # Staff can access any entry
        if user.is_staff:
            self.check_object_permissions(self.request, obj)
            return obj
            
        # Check if the entry is public
        if obj.visibility == "public":
            self.check_object_permissions(self.request, obj)
            return obj
            
        # Check if the user is the author
        try:
            user_author = user.author
            if user_author and obj.author == user_author:
                self.check_object_permissions(self.request, obj)
                return obj
        except AttributeError:
            pass
            
        # For friends-only entries, check if the user is a friend of the author
        if obj.visibility == "friends":
            try:
                from app.models import Friendship
                user_author = user.author
                
                # Check if friendship exists
                friendship_exists = Friendship.objects.filter(
                    models.Q(author1=user_author, author2=obj.author) | 
                    models.Q(author1=obj.author, author2=user_author)
                ).exists()
                
                if friendship_exists:
                    self.check_object_permissions(self.request, obj)
                    return obj
            except (AttributeError, Exception):
                pass
                
        # If we're here, deny access
        raise PermissionDenied("You do not have permission to access this entry.")


    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return Entry.objects.all().order_by("-created_at")

        try:
            user_author = user.author
        except AttributeError:
            return Entry.objects.filter(visibility="public").exclude(visibility=Entry.DELETED)

        # Check if we're viewing a specific author's entries
        author_id = self.kwargs.get("author_id") or self.request.query_params.get("author")
        if author_id:
            try:
                target_author = Author.objects.get(id=author_id)
            except Author.DoesNotExist:
                return Entry.objects.none()

            if user_author.id == target_author.id:
                # ✅ Viewing your own profile: show all entries except deleted
                return Entry.objects.filter(
                    author=target_author
                ).exclude(visibility=Entry.DELETED).order_by("-created_at")

            # Viewing someone else's profile: only show public entries
            return Entry.objects.filter(
                author=target_author,
                visibility="public"
            ).exclude(visibility=Entry.DELETED).order_by("-created_at")

        # General feed (not profile)
        return Entry.objects.filter(
            models.Q(author=user_author) | models.Q(visibility="public")
        ).exclude(visibility=Entry.DELETED).order_by("-created_at")


        

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
    
    def destroy(self, request, *args, **kwargs):
        entry = self.get_object()

        # Only mark as deleted
        entry.visibility = Entry.DELETED
        entry.save()

        return Response({'detail': 'Entry soft-deleted.'}, status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=["get"], url_path="saved")
    def saved_entries(self, request):
        """Get the current user's saved entries"""
        from app.models import Like  # Assuming we use Likes to track saved status
        
        # Get the current user's author
        user = request.user
        
        try:            # Get entries that this user has saved (liked)
            liked_entry_ids = Like.objects.filter(
                author=user,  # User is already an Author object
            ).values_list('entry__id', flat=True)
            
            entries = Entry.objects.filter(id__in=liked_entry_ids).order_by('-created_at')
            
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
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
                is_save=True  # Add this field to the Like model
            ).first()
            
            if request.method == "POST":
                # Save the entry
                if existing_save:
                    return Response({"detail": "Entry already saved"}, status=status.HTTP_200_OK)
                
                # Create a new saved entry record
                Like.objects.create(
                    author=user.author,
                    entry=entry,
                    is_save=True
                )
                return Response({"detail": "Entry saved successfully"}, status=status.HTTP_201_CREATED)
                
            elif request.method == "DELETE":
                # Unsave the entry
                if not existing_save:
                    return Response({"detail": "Entry was not saved"}, status=status.HTTP_404_NOT_FOUND)
                
                existing_save.delete()
                return Response({"detail": "Entry unsaved successfully"}, status=status.HTTP_204_NO_CONTENT)
                
        except Exception as e:
            return Response(
                {"error": f"Could not save/unsave entry: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
