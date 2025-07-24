from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import models
from django.db.models import Q
from app.models import Entry, Author
from app.serializers.entry import EntrySerializer
from app.permissions import IsAuthorSelfOrReadOnly
import uuid
import os
import logging
from app.models import Like,InboxDelivery, SavedEntry
from django.db.models import Count, F
from django.utils import timezone
from datetime import timedelta


logger = logging.getLogger(__name__)


class EntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Entry objects (posts/content).

    Handles CRUD operations for entries with complex visibility rules:
    - GET /api/entries/ - List entries visible to current user
    - POST /api/entries/ - Create new entry
    - GET /api/entries/{id}/ - Get specific entry
    - PATCH /api/entries/{id}/ - Update entry (author only)
    - DELETE /api/entries/{id}/ - Soft delete entry (author only)

    Special endpoints:
    - GET /api/entries/liked/ - Get entries liked by current user
    - GET /api/entries/saved/ - Get entries saved by current user
    - GET /api/entries/feed/ - Get entries from friends
    """

    lookup_field = "id"
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = EntrySerializer
    permission_classes = [IsAuthenticated]

    def rename_uploaded_file(file):
        """Generate a unique filename for uploaded files to avoid conflicts"""
        ext = os.path.splitext(file.name)[1]
        new_name = f"{uuid.uuid4().hex}{ext}"
        file.name = new_name
        return file

    def get_object(self):
        """
        Override to enforce visibility permissions and exclude deleted entries.

        This method implements the core security logic for entry access:
        - Prevents access to soft-deleted entries
        - Enforces visibility rules based on user relationships
        - Allows authors to access their own entries for editing
        - Allows staff to access any entry

        Returns:
            Entry: The requested entry if user has permission

        Raises:
            NotFound: If entry doesn't exist or user can't view it
            PermissionDenied: If user can't perform the requested action
        """
        lookup_url_kwarg = self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)

        if lookup_value is None:
            raise NotFound("No Entry ID provided.")

        user = self.request.user
        user_author = (
            getattr(user, "author", None) or user if user.is_authenticated else None
        )

        try:
            obj = Entry.objects.get(id=lookup_value)

            # Staff users can access any entry (including deleted ones for moderation)
            if user.is_staff:
                return obj

            # For write operations (PATCH, PUT, DELETE), check if user is the author
            if self.request.method in ["PATCH", "PUT", "DELETE"]:
                if user_author and obj.author == user_author:
                    return obj
                raise PermissionDenied("You cannot edit this post.")

            # For read operations, check if entry is visible to the user
            if obj in Entry.objects.visible_to_author(user_author):
                return obj

        except Entry.DoesNotExist:
            raise NotFound("Entry not found.")

        raise PermissionDenied("You do not have permission to view this post.")

    def get_queryset(self):
        """
        Get entries based on visibility rules and context.

        This method implements complex visibility logic based on:
        - Whether the user is staff (can see all non-deleted entries)
        - Whether viewing a specific author's profile or general feed
        - The relationship between the viewer and the entry author

        Returns:
            QuerySet: Filtered entries based on visibility permissions
        """
        user = self.request.user

        # Staff users can see all entries except deleted ones
        if user.is_staff:
            return Entry.objects.exclude(visibility=Entry.DELETED).order_by(
                "-created_at"
            )

        # Get the author instance for the current user
        if hasattr(user, "author"):
            user_author = user.author
        else:
            user_author = user

        # Check if we're viewing a specific author's entries (profile view)
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

            # Viewing someone else's profile: apply visibility rules
            visible_entries = Entry.objects.visible_to_author(user_author)
            return visible_entries.filter(author=target_author).order_by("-created_at")

        # General feed (not profile) - show all entries visible to the user
        return Entry.objects.visible_to_author(user_author).order_by("-created_at")

    def perform_create(self, serializer):
        """
        Create an entry for the authenticated user's author.

        Ensures that the entry is created with the current user as the author,
        preventing spoofing of authorship.
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
        entry = serializer.save(author=user_author)
        
        # Send to remote nodes based on visibility
        if entry.visibility in [Entry.PUBLIC, Entry.FRIENDS]:
            self._send_to_remote_nodes(entry)

    def _send_to_remote_nodes(self, entry):
        """
        Send an entry to remote nodes based on visibility rules.
        PUBLIC: Send to all remote followers
        FRIENDS: Send only to remote friends
        """
        try:
            from app.models import Follow, Node, Friendship
            from requests.auth import HTTPBasicAuth
            import requests
            
            # Get recipients based on visibility
            if entry.visibility == Entry.PUBLIC:
                # Get all remote followers
                remote_followers = Follow.objects.filter(
                    followed=entry.author,
                    status=Follow.ACCEPTED,
                    follower__node__isnull=False  # Only remote authors
                ).select_related('follower', 'follower__node')
            elif entry.visibility == Entry.FRIENDS:
                # Get only remote friends
                friendships = Friendship.objects.filter(
                    models.Q(author1=entry.author) | models.Q(author2=entry.author)
                )
                friend_ids = []
                for friendship in friendships:
                    if friendship.author1 == entry.author:
                        friend_ids.append(friendship.author2.id)
                    else:
                        friend_ids.append(friendship.author1.id)
                
                remote_followers = Follow.objects.filter(
                    followed=entry.author,
                    follower__id__in=friend_ids,
                    status=Follow.ACCEPTED,
                    follower__node__isnull=False  # Only remote authors
                ).select_related('follower', 'follower__node')
            else:
                return  # Don't send UNLISTED or PRIVATE posts
            
            for follow in remote_followers:
                remote_author = follow.follower
                remote_node = remote_author.node
                
                if not remote_node or not remote_node.is_active:
                    continue
                
                # Prepare the post data for ActivityPub
                post_object = {
                    "type": "Post",
                    "id": entry.url,
                    "title": entry.title,
                    "content": entry.content,
                    "contentType": entry.content_type,
                    "visibility": entry.visibility,
                    "published": entry.created_at.isoformat(),
                    "author": entry.author.url
                }
                
                # Include image if present
                if entry.content_type in ['image/png', 'image/jpeg'] and entry.image_data:
                    import base64
                    image_base64 = base64.b64encode(entry.image_data).decode('utf-8')
                    post_object["image"] = f"data:{entry.content_type};base64,{image_base64}"
                
                post_data = {
                    "@context": "https://www.w3.org/ns/activitystreams",
                    "type": "Create",
                    "actor": entry.author.url,
                    "object": post_object
                }
                
                # Send to remote node's inbox
                try:
                    # Extract author ID from the URL properly
                    author_id = remote_author.id.split('/')[-1] if remote_author.id.endswith('/') else remote_author.id.split('/')[-1]
                    inbox_url = f"{remote_author.host}authors/{author_id}/inbox/"
                    
                    response = requests.post(
                        inbox_url,
                        json=post_data,
                        auth=HTTPBasicAuth(remote_node.username, remote_node.password),
                        headers={'Content-Type': 'application/activity+json'},
                        timeout=5
                    )
                    
                    if response.status_code in [200, 201, 202]:
                        InboxDelivery.objects.get_or_create(entry=entry, recipient=remote_author, success=True)
                    else:
                        print(f"Failed to send post to {inbox_url}: {response.status_code}")

                        
                except Exception as e:
                    print(f"Error sending post to remote node {remote_node.host}: {str(e)}")
                    
        except Exception as e:
            print(f"Error in _send_to_remote_nodes: {str(e)}")

    def get_permissions(self):
        """
        Dynamically set permissions based on the action being performed.

        - Create/update/delete: Require authentication and author ownership
        - Retrieve: Allow public access (visibility rules applied in get_object)
        - Custom actions: Require authentication only (no object-level permissions)
        """        
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAuthorSelfOrReadOnly()]
        elif self.action == "retrieve":
            # Allow public access to individual entries (visibility rules applied in get_object)
            return [AllowAny()]
        else:
            # For all other actions (list, custom actions), require authentication only
            # Do NOT apply IsAuthorSelfOrReadOnly to avoid 400 errors on actions without objects
            return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """
        Override create to handle both JSON and FormData properly.

        Supports creation of both text and image posts with proper
        content type detection and validation.
        """
        logger.debug(
            f"Creating entry - User: {request.user}, Content-Type: {request.content_type}"
        )

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
        """
        Soft-delete an entry by marking it as deleted.

        Instead of permanently removing the entry from the database, this method
        sets the visibility to DELETED, preserving the data while hiding it from
        normal queries. This allows for potential recovery and maintains referential
        integrity with comments, likes, etc.

        Args:
            request: The HTTP DELETE request
            *args: Variable length argument list
            **kwargs: Arbitrary keyword arguments

        Returns:
            Response: 204 No Content on successful deletion
        """
        entry = self.get_object()

        # Send delete notification to remote nodes before soft delete
        self._send_delete_to_remote_nodes(entry)
        
        # Perform soft delete by changing visibility
        entry.visibility = Entry.DELETED
        entry.save()

        logger.info(f"Entry {entry.id} soft-deleted by user {request.user}")
        return Response(
            {"detail": "Entry soft-deleted."}, status=status.HTTP_204_NO_CONTENT
        )

    @action(detail=False, methods=["get"], url_path="liked")
    def liked_entries(self, request):
        """
        Get entries that the current user has liked.

        Returns a paginated list of entries that the authenticated user
        has liked, ordered by most recent first.
        """
        from app.models import Like

        user = request.user

        if not user.is_authenticated:
            return Response(
                {"error": "Authentication required"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            # The user is already an Author instance since Author extends AbstractUser
            user_author = user

            # Get entries that this user has liked
            liked_entry_ids = Like.objects.filter(
                author=user_author,  # Use the correct author instance
            ).values_list("entry__id", flat=True)

            entries = Entry.objects.filter(id__in=liked_entry_ids).order_by(
                "-created_at"
            )

            # Apply pagination
            page = self.paginate_queryset(entries)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(entries, many=True)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error retrieving liked entries for user {user}: {str(e)}")
            return Response(
                {"error": f"Could not retrieve liked entries: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="saved")
    def saved_entries(self, request):
        """
        Get the current user's saved entries.

        Returns a paginated list of entries that the authenticated user
        has saved/bookmarked, ordered by most recent save first.
        """
        from app.models import SavedEntry

        user = request.user

        if not user.is_authenticated:
            return Response(
                {"error": "Authentication required"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            # The user is already an Author instance since Author extends AbstractUser
            user_author = user

            # Get entries that this user has saved
            saved_entry_ids = SavedEntry.objects.filter(
                author=user_author,
            ).values_list("entry__id", flat=True)

            entries = Entry.objects.filter(id__in=saved_entry_ids).order_by(
                "-created_at"
            )

            # Apply pagination
            page = self.paginate_queryset(entries)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(entries, many=True)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error retrieving saved entries for user {user}: {str(e)}")
            return Response(
                {"error": f"Could not retrieve saved entries: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="feed")
    def feed_entries(self, request):
        """
        Get entries from friends (mutually following users) for the home feed.

        Friends are defined as users who mutually follow each other with ACCEPTED status.
        This endpoint returns all posts from friends regardless of visibility settings,
        as friends should be able to see each other's content.
        """
        from app.models import Follow

        user = request.user

        if not user.is_authenticated:
            return Response(
                {"error": "Authentication required"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            # The user is already an Author instance since Author extends AbstractUser
            current_author = user

            # Get all users that the current user is following with ACCEPTED status
            following_ids = set(
                Follow.objects.filter(
                    follower=current_author, status=Follow.ACCEPTED
                ).values_list("followed__id", flat=True)
            )

            # Get all users that follow the current user with ACCEPTED status
            followers_ids = set(
                Follow.objects.filter(
                    followed=current_author, status=Follow.ACCEPTED
                ).values_list("follower__id", flat=True)
            )

            # Friends are users who mutually follow each other (intersection of sets)
            friends_ids = following_ids & followers_ids

            # Get all entries from friends, excluding deleted entries
            entries = (
                Entry.objects.filter(author__id__in=friends_ids)
                .exclude(visibility=Entry.DELETED)
                .order_by("-created_at")
            )

            # Apply pagination
            page = self.paginate_queryset(entries)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(entries, many=True)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error retrieving feed entries for user {user}: {str(e)}")
            return Response(
                {"error": f"Could not retrieve feed entries: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="trending", permission_classes=[AllowAny])
    def trending_entries(self, request):
        """
        Get trending entries based on like count and recent activity.
        
        Returns entries ordered by a combination of like count and recency,
        giving preference to recent posts with high engagement.
        """

        try:
            # Get entries from the last 30 days with like counts
            thirty_days_ago = timezone.now() - timedelta(days=30)
            
            entries = (
                Entry.objects
                .filter(visibility__in=[Entry.PUBLIC, Entry.FRIENDS_ONLY])
                .exclude(visibility=Entry.DELETED)
                .filter(created_at__gte=thirty_days_ago)
                .annotate(like_count=Count('likes'))
                .order_by('-like_count', '-created_at')
            )

            # Apply visibility filtering for the current user
            if request.user.is_authenticated:
                # Get user's friends
                from app.models import Follow
                
                user_author = getattr(request.user, 'author', request.user)
                
                # Get users that the current user is following and who follow back (mutual)
                following = Follow.objects.filter(
                    follower=user_author, 
                    status=Follow.ACCEPTED
                ).values_list('followed_id', flat=True)
                
                followers = Follow.objects.filter(
                    followed=user_author, 
                    status=Follow.ACCEPTED
                ).values_list('follower_id', flat=True)
                
                # Friends are users who appear in both lists
                friends = list(set(following) & set(followers))
                
                # Include public posts and posts from friends
                entries = entries.filter(
                    Q(visibility=Entry.PUBLIC) |
                    (Q(visibility=Entry.FRIENDS_ONLY) & Q(author_id__in=friends))
                )
            else:
                # Non-authenticated users can only see public entries
                entries = entries.filter(visibility=Entry.PUBLIC)

            # Apply pagination
            page = self.paginate_queryset(entries)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(entries, many=True)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error retrieving trending entries: {str(e)}")
            return Response(
                {"error": f"Could not retrieve trending entries: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="categories", permission_classes=[AllowAny])
    def get_categories(self, request):
        """
        Get all categories used in entries.
        
        Returns a list of unique categories from all entries,
        ordered by frequency of use.
        """
        try:
            from django.db.models import Count
            from collections import Counter
            
            # Get all categories from all entries (excluding deleted)
            entries = Entry.objects.exclude(visibility=Entry.DELETED)
            
            # Extract all categories from JSONField
            all_categories = []
            for entry in entries:
                if entry.categories:
                    all_categories.extend(entry.categories)
            
            # Count occurrences and sort by frequency
            category_counts = Counter(all_categories)
            
            # Return categories sorted by frequency (most used first)
            categories = [
                {"name": category, "count": count}
                for category, count in category_counts.most_common()
            ]
            
            return Response(categories)
            
        except Exception as e:
            logger.error(f"Error retrieving categories: {str(e)}")
            return Response(
                {"error": f"Could not retrieve categories: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post", "delete"], url_path="save")
    def save_entry(self, request, id=None):
        """
        Save or unsave a post.

        Uses the SavedEntry model to track which entries users have saved.
        """
        from app.models import SavedEntry

        entry = self.get_object()
        user = request.user

        try:
            # The user is already an Author instance since Author extends AbstractUser
            user_author = user

            # Check if entry is already saved
            existing_save = SavedEntry.objects.filter(
                author=user_author,
                entry=entry,
            ).first()

            if request.method == "POST":
                # Save the entry
                if existing_save:
                    return Response(
                        {"detail": "Entry already saved"}, status=status.HTTP_200_OK
                    )

                # Create a new saved entry record
                SavedEntry.objects.create(
                    author=user_author,
                    entry=entry,
                )
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
            logger.error(
                f"Error saving/unsaving entry {entry.id} for user {user}: {str(e)}"
            )
            return Response(
                {"error": f"Could not save/unsave entry: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def save_entry_by_fqid(self, request, entry_fqid=None):
        """
        Save or unsave a post by FQID.
        
        Uses the SavedEntry model to track which entries users have saved.
        """
        if not entry_fqid:
            return Response(
                {"error": "Entry FQID is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Extract UUID from FQID
            if '/' in entry_fqid:
                entry_id = entry_fqid.rstrip('/').split('/')[-1]
            else:
                entry_id = entry_fqid
            
            # Validate UUID
            import uuid
            uuid.UUID(entry_id)
            
            # Use existing save logic
            self.kwargs['id'] = entry_id
            return self.save_entry(request, id=entry_id)
            
        except ValueError:
            return Response(
                {"error": "Invalid entry ID format"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error saving entry by FQID {entry_fqid}: {str(e)}")
            return Response(
                {"error": "Could not save/unsave entry"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _send_update_to_remote_nodes(self, entry):
        """
        Send an updated entry to remote nodes that previously received it.
        """
        try:
            from app.models import InboxDelivery
            from requests.auth import HTTPBasicAuth
            import requests
            
            # Get all successful deliveries for this entry
            deliveries = InboxDelivery.objects.filter(
                entry=entry,
                success=True,
                recipient__node__isnull=False
            ).select_related('recipient', 'recipient__node')
            
            for delivery in deliveries:
                remote_author = delivery.recipient
                remote_node = remote_author.node
                
                if not remote_node or not remote_node.is_active:
                    continue
                
                # Prepare the update data
                update_data = {
                    "@context": "https://www.w3.org/ns/activitystreams",
                    "type": "Update",
                    "actor": entry.author.url,
                    "object": {
                        "type": "Post",
                        "id": entry.url,
                        "title": entry.title,
                        "content": entry.content,
                        "contentType": entry.content_type,
                        "visibility": entry.visibility,
                        "published": entry.created_at.isoformat(),
                        "updated": entry.updated_at.isoformat(),
                        "author": entry.author.url
                    }
                }
                
                try:
                    author_id = remote_author.id.split('/')[-1] if remote_author.id.endswith('/') else remote_author.id.split('/')[-1]
                    inbox_url = f"{remote_author.host}authors/{author_id}/inbox/"
                    
                    response = requests.post(
                        inbox_url,
                        json=update_data,
                        auth=HTTPBasicAuth(remote_node.username, remote_node.password),
                        headers={'Content-Type': 'application/activity+json'},
                        timeout=5
                    )
                    
                    if response.status_code not in [200, 201, 202]:
                        print(f"Failed to send update to {inbox_url}: {response.status_code}")
                        
                except Exception as e:
                    print(f"Error sending update to remote node {remote_node.host}: {str(e)}")
                    
        except Exception as e:
            print(f"Error in _send_update_to_remote_nodes: {str(e)}")
    
    def _send_delete_to_remote_nodes(self, entry):
        """
        Send a delete notification to remote nodes that previously received the entry.
        """
        try:
            from app.models import InboxDelivery
            from requests.auth import HTTPBasicAuth
            import requests
            
            # Get all successful deliveries for this entry
            deliveries = InboxDelivery.objects.filter(
                entry=entry,
                success=True,
                recipient__node__isnull=False
            ).select_related('recipient', 'recipient__node')
            
            for delivery in deliveries:
                remote_author = delivery.recipient
                remote_node = remote_author.node
                
                if not remote_node or not remote_node.is_active:
                    continue
                
                # Prepare the delete data
                delete_data = {
                    "@context": "https://www.w3.org/ns/activitystreams",
                    "type": "Delete",
                    "actor": entry.author.url,
                    "object": {
                        "type": "Post",
                        "id": entry.url
                    }
                }
                
                try:
                    author_id = remote_author.id.split('/')[-1] if remote_author.id.endswith('/') else remote_author.id.split('/')[-1]
                    inbox_url = f"{remote_author.host}authors/{author_id}/inbox/"
                    
                    response = requests.post(
                        inbox_url,
                        json=delete_data,
                        auth=HTTPBasicAuth(remote_node.username, remote_node.password),
                        headers={'Content-Type': 'application/activity+json'},
                        timeout=5
                    )
                    
                    if response.status_code not in [200, 201, 202]:
                        print(f"Failed to send delete to {inbox_url}: {response.status_code}")
                        
                except Exception as e:
                    print(f"Error sending delete to remote node {remote_node.host}: {str(e)}")
                    
        except Exception as e:
            print(f"Error in _send_delete_to_remote_nodes: {str(e)}")

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests for entry updates with logging"""
        logger.debug(f"Updating entry - User: {request.user}, Data: {request.data}")
        return super().partial_update(request, *args, **kwargs)

    def retrieve_by_fqid(self, request, entry_fqid=None):
        """
        Retrieve an entry by its fully qualified ID (FQID).
        
        This is for CMPUT 404 compliance where entries can be referenced
        by their full URL/FQID instead of just UUID.
        """
        if not entry_fqid:
            return Response(
                {"error": "Entry FQID is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # For now, treat FQID as a simple UUID extraction
            # In a full implementation, this would parse the full URL
            if '/' in entry_fqid:
                # Extract UUID from the end of the path
                entry_id = entry_fqid.rstrip('/').split('/')[-1]
            else:
                entry_id = entry_fqid
            
            # Try to parse as UUID
            import uuid
            try:
                uuid.UUID(entry_id)
            except ValueError:
                return Response(
                    {"error": "Invalid entry ID format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the entry using the existing get_object logic
            self.kwargs['id'] = entry_id
            entry = self.get_object()
            
            serializer = self.get_serializer(entry)
            return Response(serializer.data)
            
        except Entry.DoesNotExist:
            return Response(
                {"error": "Entry not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error retrieving entry by FQID {entry_fqid}: {str(e)}")
            return Response(
                {"error": "Could not retrieve entry"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def partial_update_by_fqid(self, request, entry_fqid=None):
        """PATCH an entry by FQID"""
        return self._update_by_fqid(request, entry_fqid, partial=True)

    def update_by_fqid(self, request, entry_fqid=None):
        """PUT an entry by FQID"""
        return self._update_by_fqid(request, entry_fqid, partial=False)

    def destroy_by_fqid(self, request, entry_fqid=None):
        """DELETE an entry by FQID"""
        if not entry_fqid:
            return Response(
                {"error": "Entry FQID is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Extract UUID from FQID
            if '/' in entry_fqid:
                entry_id = entry_fqid.rstrip('/').split('/')[-1]
            else:
                entry_id = entry_fqid
            
            # Validate UUID
            import uuid
            uuid.UUID(entry_id)
            
            # Use existing destroy logic
            self.kwargs['id'] = entry_id
            return self.destroy(request, id=entry_id)
            
        except ValueError:
            return Response(
                {"error": "Invalid entry ID format"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error deleting entry by FQID {entry_fqid}: {str(e)}")
            return Response(
                {"error": "Could not delete entry"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _update_by_fqid(self, request, entry_fqid, partial=True):
        """Helper method for update operations by FQID"""
        if not entry_fqid:
            return Response(
                {"error": "Entry FQID is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Extract UUID from FQID
            if '/' in entry_fqid:
                entry_id = entry_fqid.rstrip('/').split('/')[-1]
            else:
                entry_id = entry_fqid
            
            # Validate UUID
            import uuid
            uuid.UUID(entry_id)
            
            # Use existing update logic
            self.kwargs['id'] = entry_id
            if partial:
                return self.partial_update(request, id=entry_id)
            else:
                return self.update(request, id=entry_id)
            
        except ValueError:
            return Response(
                {"error": "Invalid entry ID format"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error updating entry by FQID {entry_fqid}: {str(e)}")
            return Response(
                {"error": "Could not update entry"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve_author_entry(self, request, author_id=None, entry_id=None):
        """
        GET: Retrieve a specific entry by author and entry ID
        """
        try:
            entry = Entry.objects.get(id=entry_id, author__id=author_id)
            
            # Check visibility permissions
            user_author = getattr(request.user, 'author', None) or request.user if request.user.is_authenticated else None
            
            if entry not in Entry.objects.visible_to_author(user_author):
                return Response(
                    {"detail": "Entry not found or you don't have permission to view it."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = self.get_serializer(entry)
            return Response(serializer.data)
            
        except Entry.DoesNotExist:
            return Response(
                {"detail": "Entry not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def update_author_entry(self, request, author_id=None, entry_id=None):
        """
        PUT: Update a specific entry by author and entry ID
        """
        try:
            entry = Entry.objects.get(id=entry_id, author__id=author_id)
            
            # Check if user can edit this entry
            user_author = getattr(request.user, 'author', None) or request.user if request.user.is_authenticated else None
            if user_author != entry.author and not request.user.is_staff:
                return Response(
                    {"detail": "You cannot edit this entry."}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = self.get_serializer(entry, data=request.data, partial=False)
            if serializer.is_valid():
                updated_entry = serializer.save()
                # Send update to remote nodes
                if updated_entry.visibility in [Entry.PUBLIC, Entry.FRIENDS]:
                    self._send_update_to_remote_nodes(updated_entry)
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Entry.DoesNotExist:
            return Response(
                {"detail": "Entry not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def delete_author_entry(self, request, author_id=None, entry_id=None):
        """
        DELETE: Delete a specific entry by author and entry ID
        """
        try:
            entry = Entry.objects.get(id=entry_id, author__id=author_id)
            
            # Check if user can delete this entry
            user_author = getattr(request.user, 'author', None) or request.user if request.user.is_authenticated else None
            if user_author != entry.author and not request.user.is_staff:
                return Response(
                    {"detail": "You cannot delete this entry."}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            entry.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Entry.DoesNotExist:
            return Response(
                {"detail": "Entry not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
