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
from app.models import Like, InboxDelivery
from django.db.models import Count, F
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
import requests
import json


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

        Prevents access to soft-deleted entries
        Enforces visibility rules based on user relationships
        Allows authors to access their own entries for editing
        Allows staff to access any entry
        Attempts to fetch remote entries when not found locally

        Returns:
            Entry: The requested entry if user has permission

        Raises:
            NotFound: If entry doesn't exist or user can't view it
            PermissionDenied: If user can't perform the requested action
        """
        lookup_value = self.kwargs.get(self.lookup_field)
        if not lookup_value:
            raise NotFound("No Entry ID provided.")

        request = self.request
        user = request.user
        user_author = getattr(user, "author", None) or (
            user if user.is_authenticated else None
        )

        obj = None

        print(f"DEBUG: get_object called with lookup_value: {lookup_value}")
        
        # Try to find locally by UUID
        try:
            obj = Entry.objects.get(id=lookup_value)
            print(f"DEBUG: Found entry by UUID: {obj.title}")
        except Entry.DoesNotExist:
            pass

        # Try by fqid (if used)
        if not obj:
            try:
                obj = Entry.objects.get(fqid=lookup_value)
                print(f"DEBUG: Found entry by FQID: {obj.title}")
            except Entry.DoesNotExist:
                pass

        # Try by full URL
        if not obj:
            try:
                obj = Entry.objects.get(url=lookup_value)
                print(f"DEBUG: Found entry by URL: {obj.title}")
            except Entry.DoesNotExist:
                pass
                
        # If still not found and lookup_value looks like a UUID, 
        # check if there's a remote entry we know about with this UUID in its URL
        if not obj and len(str(lookup_value)) == 36:  # UUID length
            try:
                import uuid
                uuid.UUID(str(lookup_value))  # Validate it's a proper UUID
                print(f"DEBUG: Looking for remote entries containing UUID: {lookup_value}")
                
                # Look for entries where the URL contains this UUID
                possible_entries = Entry.objects.filter(
                    url__icontains=str(lookup_value),
                    author__node__isnull=False  # Only remote entries
                )
                
                if possible_entries.exists():
                    obj = possible_entries.first()
                    print(f"DEBUG: Found remote entry by UUID in URL: {obj.title}")
                    
            except (ValueError, TypeError):
                pass

        # Permissions + visibility
        if obj:
            if user.is_staff:
                return obj  # Staff can view everything

            if request.method in ["PATCH", "PUT", "DELETE"]:
                if user_author and obj.author == user_author:
                    return obj
                raise PermissionDenied("You cannot edit this post.")

            # For GET/read operations
            if request.method in ["GET", "HEAD", "OPTIONS"]:
                if obj.visibility == Entry.PUBLIC:
                    return obj

                if obj.visibility == Entry.UNLISTED:
                    return obj  # Anyone with the link can view

                # FRIENDS_ONLY or UNLISTED (if not author) require relationship
                if user.is_authenticated:
                    is_author = obj.author == user_author
                    from app.models import Friendship, Follow

                    is_friend = Friendship.objects.filter(
                        Q(author1=obj.author, author2=user_author)
                        | Q(author1=user_author, author2=obj.author)
                    ).exists()
                    is_follower = Follow.objects.filter(
                        follower=user_author,
                        followed=obj.author,
                        status=Follow.ACCEPTED,
                    ).exists()

                    if obj.visibility == Entry.UNLISTED and (
                        is_author or is_friend or is_follower
                    ):
                        return obj

                    if obj.visibility == Entry.FRIENDS_ONLY and (
                        is_author or is_friend
                    ):
                        return obj

                raise PermissionDenied("You do not have permission to view this post.")

        # Remote functionality removed

        raise NotFound("Entry not found.")

    def _fetch_remote_entry(self, entry_id):
        """
        Remote functionality removed.
        """
        return None

    def _create_local_entry_from_remote(self, entry_data, node):
        """
        Remote functionality removed.
        """
        return None

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
        queryset = Entry.objects.visible_to_author(user_author).order_by("-created_at")

        # Debug logging for explore/recent and home page
        if self.request.path.endswith("/entries/"):
            from app.models import Author

            # Count posts by visibility and origin
            total_posts = queryset.count()
            public_posts = queryset.filter(visibility=Entry.PUBLIC).count()
            remote_public_count = queryset.filter(
                visibility=Entry.PUBLIC, author__node__isnull=False
            ).count()
            local_public_count = queryset.filter(
                visibility=Entry.PUBLIC, author__node__isnull=True
            ).count()

            print(f"\nDEBUG EntryViewSet.get_queryset for path: {self.request.path}")
            print(f"DEBUG: Total entries in queryset: {total_posts}")
            print(f"DEBUG: Total PUBLIC posts: {public_posts}")
            print(
                f"DEBUG: Local PUBLIC posts: {local_public_count}, Remote PUBLIC posts: {remote_public_count}"
            )

            # Check if any remote posts exist at all
            total_remote_posts = Entry.objects.filter(
                author__node__isnull=False
            ).count()
            total_remote_public = Entry.objects.filter(
                author__node__isnull=False, visibility=Entry.PUBLIC
            ).count()
            print(
                f"DEBUG: Total remote posts in DB: {total_remote_posts}, Total remote PUBLIC in DB: {total_remote_public}"
            )

            # Log first few remote PUBLIC posts if any
            remote_public_posts = queryset.filter(
                visibility=Entry.PUBLIC, author__node__isnull=False
            )[:3]
            for post in remote_public_posts:
                print(
                    f"DEBUG: Remote PUBLIC post - ID: {post.id}, Title: {post.title}, Author: {post.author.username} from {post.author.node.name if post.author.node else 'Unknown node'}, Created: {post.created_at}"
                )

        return queryset

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
        
        # Ensure the entry is saved and has a proper URL before sending to remote inboxes
        entry.refresh_from_db()

        # Send the entry to remote authors' inboxes
        self._send_to_remote_authors(entry)

    def _send_to_remote_authors(self, entry):
        """
        Send the entry to all remote authors' inboxes.
        """
        import requests
        from requests.auth import HTTPBasicAuth
        from app.serializers.entry import EntrySerializer
        
        print(f"DEBUG: _send_to_remote_authors called for entry {entry.id} (visibility: {entry.visibility})")
        
        try:
            # Get all remote authors (authors with node set)
            remote_authors = Author.objects.filter(node__isnull=False)
            
            print(f"DEBUG: Found {remote_authors.count()} remote authors")
            logger.info(f"Sending entry {entry.id} to {remote_authors.count()} remote authors")
            
            if remote_authors.count() == 0:
                print("DEBUG: No remote authors found - skipping federation")
                return
            
            # Serialize the entry
            entry_data = EntrySerializer(entry).data
            
            for remote_author in remote_authors:
                try:
                    # Construct the inbox URL for the remote author
                    # The inbox URL should be author_url/inbox/
                    inbox_url = remote_author.url.rstrip('/') + '/inbox/'
                    
                    # Ensure we have the full backend URL as the entry ID
                    # The entry.url should already be the full URL, but make sure it's set
                    entry_full_url = entry.url or f"{settings.SITE_URL}/api/authors/{entry.author.id}/entries/{entry.id}"
                    
                    print(f"Sending entry activity with ID: {entry_full_url} to {remote_author.username}")
                    
                    # Prepare the activity object for the inbox
                    activity = {
                        'type': 'entry',
                        'id': entry_full_url,
                        'title': entry_data.get('title', ''),
                        'description': entry_data.get('description', ''),
                        'content': entry_data.get('content', ''),
                        'contentType': entry_data.get('contentType', 'text/plain'),
                        'visibility': entry_data.get('visibility', 'PUBLIC'),
                        'source': entry_data.get('source', ''),
                        'origin': entry_data.get('origin', ''),
                        'web': entry_data.get('web', ''),
                        'published': entry_data.get('published'),
                        'author': entry_data.get('author'),
                    }
                    
                    # Get the node credentials if available
                    node = remote_author.node
                    auth = None
                    auth_info = "No authentication"
                    if node and node.username and node.password:
                        auth = HTTPBasicAuth(node.username, node.password)
                        auth_info = f"Basic Auth (username: {node.username})"
                    
                    # Print out the entire request details
                    print("=" * 80)
                    print(f"INBOX REQUEST TO: {remote_author.username} ({remote_author.url})")
                    print(f"Target URL: {inbox_url}")
                    print(f"Authentication: {auth_info}")
                    print(f"Headers: {{'Content-Type': 'application/json'}}")
                    print("Request Body (JSON):")
                    print(json.dumps(activity, indent=2, default=str))
                    print("=" * 80)
                    
                    # Send the POST request to the inbox
                    response = requests.post(
                        inbox_url,
                        json=activity,
                        auth=auth,
                        headers={'Content-Type': 'application/json'},
                        timeout=10
                    )
                    
                    # Print the response details
                    print("-" * 40)
                    print(f"RESPONSE FROM {remote_author.username}'s inbox:")
                    print(f"Status Code: {response.status_code}")
                    print(f"Response Headers: {dict(response.headers)}")
                    print(f"Response Body: {response.text}")
                    print("-" * 40)
                    
                    if response.status_code in [200, 201, 202]:
                        print(f"✓ Successfully sent entry to {remote_author.username}'s inbox at {inbox_url}")
                    else:
                        print(f"✗ Failed to send entry to {remote_author.username}'s inbox: {response.status_code} - {response.text}")
                        
                except Exception as e:
                    logger.error(f"Error sending entry to {remote_author.username}'s inbox: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error in _send_to_remote_authors: {str(e)}")
            # Don't fail the entry creation if inbox distribution fails
            pass

    def _send_to_remote_nodes(self, entry):
        """
        Remote functionality removed.
        """
        pass

    def _broadcast_to_node(self, entry, node):
        """
        Remote functionality removed.
        """
        pass

    def _broadcast_to_known_authors(self, entry, node):
        """
        Remote functionality removed.
        """
        pass

    def _prepare_post_data(self, entry):
        """
        Remote functionality removed.
        """
        return {}

    def _send_post_to_author(self, entry, remote_author, remote_node):
        """
        Remote functionality removed.
        """
        pass

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

        # Perform soft delete by changing visibility
        entry.visibility = Entry.DELETED
        entry.save()

        # Send deleted entry to remote authors' inboxes
        # This will update the entry on remote nodes to also mark it as DELETED
        self._send_to_remote_authors(entry)

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
                status=status.HTTP_401_UNAUTHORIZED,
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
                status=status.HTTP_401_UNAUTHORIZED,
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

    @action(
        detail=False,
        methods=["get"],
        url_path="trending",
        permission_classes=[AllowAny],
    )
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
                Entry.objects.filter(visibility__in=[Entry.PUBLIC, Entry.FRIENDS_ONLY])
                .exclude(visibility=Entry.DELETED)
                .filter(created_at__gte=thirty_days_ago)
                .annotate(like_count=Count("likes"))
                .order_by("-like_count", "-created_at")
            )

            # Apply visibility filtering for the current user
            if request.user.is_authenticated:
                # Get user's friends
                from app.models import Follow

                user_author = getattr(request.user, "author", request.user)

                # Get users that the current user is following and who follow back (mutual)
                following = Follow.objects.filter(
                    follower=user_author, status=Follow.ACCEPTED
                ).values_list("followed_id", flat=True)

                followers = Follow.objects.filter(
                    followed=user_author, status=Follow.ACCEPTED
                ).values_list("follower_id", flat=True)

                # Friends are users who appear in both lists
                friends = list(set(following) & set(followers))

                # Include public posts and posts from friends
                entries = entries.filter(
                    Q(visibility=Entry.PUBLIC)
                    | (Q(visibility=Entry.FRIENDS_ONLY) & Q(author_id__in=friends))
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

    @action(
        detail=False,
        methods=["get"],
        url_path="categories",
        permission_classes=[AllowAny],
    )
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

    def _send_update_to_remote_nodes(self, entry):
        """
        Remote functionality removed.
        """
        pass

    def _send_delete_to_remote_nodes(self, entry):
        """
        Remote functionality removed.
        """
        pass

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests for entry updates with logging"""
        logger.debug(f"Updating entry - User: {request.user}, Data: {request.data}")
        print(f"DEBUG: partial_update called for entry update")

        # Get the entry before update
        entry = self.get_object()
        old_visibility = entry.visibility

        response = super().partial_update(request, *args, **kwargs)

        print(f"DEBUG: Update response status: {response.status_code}")
        
        # If update was successful, check if we need to send to remote nodes
        if response.status_code == 200:
            entry.refresh_from_db()
            print(f"DEBUG: Calling _send_to_remote_authors for updated entry {entry.id}")

            # Send updated entry to remote authors' inboxes
            self._send_to_remote_authors(entry)

        return response

    def update(self, request, *args, **kwargs):
        """Handle PUT requests for entry updates with logging"""
        logger.debug(f"Updating entry (PUT) - User: {request.user}, Data: {request.data}")
        print(f"DEBUG: update called for entry update")

        # Get the entry before update
        entry = self.get_object()
        old_visibility = entry.visibility

        response = super().update(request, *args, **kwargs)

        print(f"DEBUG: Update (PUT) response status: {response.status_code}")

        # If update was successful, check if we need to send to remote nodes
        if response.status_code == 200:
            entry.refresh_from_db()
            print(f"DEBUG: Calling _send_to_remote_authors for updated entry {entry.id}")

            # Send updated entry to remote authors' inboxes
            self._send_to_remote_authors(entry)

        return response

    @action(detail=False, methods=["get"], url_path="by-url")
    def get_entry_by_url(self, request):
        """
        Get an entry by its full URL.

        This endpoint is useful for federation when we receive entry URLs
        from remote nodes and need to fetch the actual entry data.
        """
        entry_url = request.query_params.get("url")
        if not entry_url:
            return Response(
                {"error": "URL parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # First try to find the entry locally by URL
            try:
                entry = Entry.objects.get(url=entry_url)
                serializer = self.get_serializer(entry)
                return Response(serializer.data)
            except Entry.DoesNotExist:
                pass

            # Remote functionality removed

            return Response(
                {"error": "Entry not found"}, status=status.HTTP_404_NOT_FOUND
            )

        except Exception as e:
            logger.error(f"Error fetching entry by URL {entry_url}: {str(e)}")
            return Response(
                {"error": "Could not retrieve entry"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve_by_fqid(self, request, entry_fqid=None):
        """
        GET [local]: Get the public entry whose URL is ENTRY_FQID

        Authentication requirements:
        - friends-only entries: must be authenticated
        - public/unlisted entries: no authentication required
        """
        # Override permission check for this specific endpoint
        self.permission_classes = [AllowAny]
        self.check_permissions(request)
        if not entry_fqid:
            return Response(
                {"error": "Entry FQID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            print(f"DEBUG: retrieve_by_fqid called with entry_fqid: {entry_fqid}")
            
            entry = None
            
            # First try to look up by full URL (for remote entries)
            if entry_fqid.startswith("http"):
                try:
                    entry = Entry.objects.get(url=entry_fqid)
                    print(f"DEBUG: Found entry by full URL: {entry.title}")
                except Entry.DoesNotExist:
                    print(f"DEBUG: Entry not found by full URL")
                    pass
            
            # If not found by URL, try UUID extraction (for local entries or FQID format)
            if not entry:
                if "/" in entry_fqid:
                    # Extract UUID from the end of the path
                    entry_id = entry_fqid.rstrip("/").split("/")[-1]
                else:
                    entry_id = entry_fqid

                # Try to parse as UUID
                import uuid

                try:
                    uuid.UUID(entry_id)
                    print(f"DEBUG: Extracted UUID {entry_id} from FQID")
                    # Get the entry using the existing get_object logic
                    self.kwargs["id"] = entry_id
                    entry = self.get_object()
                    print(f"DEBUG: Found entry by UUID: {entry.title}")
                except ValueError:
                    return Response(
                        {"error": "Invalid entry ID format"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                except Entry.DoesNotExist:
                    print(f"DEBUG: Entry not found by UUID")
                    pass

            if not entry:
                return Response(
                    {"error": "Entry not found"}, status=status.HTTP_404_NOT_FOUND
                )

            serializer = self.get_serializer(entry)
            return Response(serializer.data)

        except Entry.DoesNotExist:
            return Response(
                {"error": "Entry not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error retrieving entry by FQID {entry_fqid}: {str(e)}")
            return Response(
                {"error": "Could not retrieve entry"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    
    @action(detail=False, methods=["get"], url_path="by-fqid-with-comments")
    def get_entry_with_comments_by_fqid(self, request):
        """
        Get entry details along with its comments by FQID.
        Supports both local and remote entries.
        
        Query parameters:
        - fqid: The full qualified ID (URL) of the entry
        """
        entry_fqid = request.query_params.get("fqid")
        if not entry_fqid:
            return Response(
                {"error": "FQID parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            print(f"DEBUG: get_entry_with_comments_by_fqid called with fqid: {entry_fqid}")
            
            # Find the entry by URL first, then by UUID
            entry = None
            
            # Try full URL lookup first (for remote entries)
            if entry_fqid.startswith("http"):
                try:
                    entry = Entry.objects.get(url=entry_fqid)
                    print(f"DEBUG: Found entry by URL: {entry.title}")
                except Entry.DoesNotExist:
                    pass
            
            # If not found by URL, try UUID extraction
            if not entry:
                try:
                    if "/" in entry_fqid:
                        entry_id = entry_fqid.rstrip("/").split("/")[-1]
                    else:
                        entry_id = entry_fqid
                    
                    import uuid
                    uuid.UUID(entry_id)  # Validate UUID format
                    entry = Entry.objects.get(id=entry_id)
                    print(f"DEBUG: Found entry by UUID: {entry.title}")
                except (ValueError, Entry.DoesNotExist):
                    pass
            
            if not entry:
                return Response(
                    {"error": "Entry not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get entry data
            entry_serializer = self.get_serializer(entry)
            entry_data = entry_serializer.data
            
            # Get comments for this entry
            from app.models import Comment
            from app.serializers.comment import CommentSerializer
            
            comments = Comment.objects.filter(entry=entry).order_by("-created_at")
            comment_serializer = CommentSerializer(comments, many=True, context={"request": request})
            
            # Combine entry and comments data
            response_data = {
                **entry_data,
                "comments": {
                    "type": "comments",
                    "count": comments.count(),
                    "items": comment_serializer.data
                }
            }
            
            print(f"DEBUG: Returning entry with {comments.count()} comments")
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error retrieving entry with comments by FQID {entry_fqid}: {str(e)}")
            return Response(
                {"error": "Could not retrieve entry with comments"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="local-comments-for-remote")
    def get_local_comments_for_remote_entry(self, request):
        """
        Get only the locally stored comments for a remote entry URL.
        This is used when the frontend fetches entry details from the remote node
        but wants to show local comments.
        
        Query parameters:
        - entry_url: The full URL of the remote entry
        """
        entry_url = request.query_params.get("entry_url")
        if not entry_url:
            return Response(
                {"error": "entry_url parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            print(f"DEBUG: get_local_comments_for_remote_entry called with entry_url: {entry_url}")
            
            # Get comments for this entry URL (whether the entry exists locally or not)
            from app.models import Comment
            from app.serializers.comment import CommentSerializer
            
            comments = Comment.objects.filter(entry__url=entry_url).order_by("-created_at")
            comment_serializer = CommentSerializer(comments, many=True, context={"request": request})
            
            print(f"DEBUG: Found {comments.count()} local comments for remote entry")
            
            # Return comments in the standard format
            response_data = {
                "type": "comments",
                "entry_url": entry_url,
                "count": comments.count(),
                "items": comment_serializer.data
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error retrieving local comments for remote entry {entry_url}: {str(e)}")
            return Response(
                {"error": "Could not retrieve local comments"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="fetch-remote")
    def fetch_remote_entry(self, request):
        """
        Fetch entry details from a remote node and return them.
        This is a proxy endpoint to help the frontend fetch remote entry details.
        
        Query parameters:
        - entry_url: The full URL of the remote entry
        """
        entry_url = request.query_params.get("entry_url")
        if not entry_url:
            return Response(
                {"error": "entry_url parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            print(f"DEBUG: fetch_remote_entry called with entry_url: {entry_url}")
            
            # First check if we have this entry locally (from previous federation)
            try:
                local_entry = Entry.objects.get(url=entry_url)
                print(f"DEBUG: Found entry locally: {local_entry.title}")
                serializer = self.get_serializer(local_entry)
                return Response(serializer.data)
            except Entry.DoesNotExist:
                print(f"DEBUG: Entry not found locally, will fetch from remote")
                pass
            
            # Parse the URL to get the remote node details
            from urllib.parse import urlparse
            import requests
            from requests.auth import HTTPBasicAuth
            from app.models import Node
            
            parsed_url = urlparse(entry_url)
            remote_host = f"{parsed_url.scheme}://{parsed_url.netloc}"
            
            print(f"DEBUG: Remote host: {remote_host}")
            
            # Try to find the node for authentication
            try:
                node = Node.objects.filter(host__icontains=parsed_url.netloc).first()
                if node:
                    print(f"DEBUG: Found node for authentication: {node.name}")
                    auth = HTTPBasicAuth(node.username, node.password)
                else:
                    print(f"DEBUG: No node found for {parsed_url.netloc}, trying without auth")
                    auth = None
            except Exception as e:
                print(f"DEBUG: Error finding node: {e}")
                auth = None
            
            # Fetch the entry from the remote node
            response = requests.get(
                entry_url,
                auth=auth,
                headers={"Accept": "application/json"},
                timeout=10,
            )
            
            print(f"DEBUG: Remote fetch response: {response.status_code}")
            
            if response.status_code == 200:
                entry_data = response.json()
                print(f"DEBUG: Successfully fetched remote entry: {entry_data.get('title', 'Unknown')}")
                return Response(entry_data)
            else:
                return Response(
                    {"error": f"Failed to fetch remote entry: {response.status_code}"},
                    status=response.status_code,
                )
                
        except Exception as e:
            logger.error(f"Error fetching remote entry {entry_url}: {str(e)}")
            return Response(
                {"error": "Could not fetch remote entry"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
                {"error": "Entry FQID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Extract UUID from FQID
            if "/" in entry_fqid:
                entry_id = entry_fqid.rstrip("/").split("/")[-1]
            else:
                entry_id = entry_fqid

            # Validate UUID
            import uuid

            uuid.UUID(entry_id)

            # Use existing destroy logic
            self.kwargs["id"] = entry_id
            return self.destroy(request, id=entry_id)

        except ValueError:
            return Response(
                {"error": "Invalid entry ID format"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error deleting entry by FQID {entry_fqid}: {str(e)}")
            return Response(
                {"error": "Could not delete entry"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _update_by_fqid(self, request, entry_fqid, partial=True):
        """Helper method for update operations by FQID"""
        if not entry_fqid:
            return Response(
                {"error": "Entry FQID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Extract UUID from FQID
            if "/" in entry_fqid:
                entry_id = entry_fqid.rstrip("/").split("/")[-1]
            else:
                entry_id = entry_fqid

            # Validate UUID
            import uuid

            uuid.UUID(entry_id)

            # Use existing update logic
            self.kwargs["id"] = entry_id
            if partial:
                return self.partial_update(request, id=entry_id)
            else:
                return self.update(request, id=entry_id)

        except ValueError:
            return Response(
                {"error": "Invalid entry ID format"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error updating entry by FQID {entry_fqid}: {str(e)}")
            return Response(
                {"error": "Could not update entry"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve_author_entry(self, request, author_id=None, entry_id=None):
        """
        GET [local, remote]: Get the public entry whose serial is ENTRY_SERIAL

        Authentication requirements:
        - friends-only entries: must be authenticated
        - public/unlisted entries: no authentication required
        """
        try:
            entry = Entry.objects.get(id=entry_id, author__id=author_id)

            # Apply authentication requirements based on visibility
            if (
                entry.visibility == Entry.FRIENDS_ONLY
                and not request.user.is_authenticated
            ):
                return Response(
                    {"detail": "Authentication required for friends-only entries."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Check visibility permissions
            user_author = (
                getattr(request.user, "author", None) or request.user
                if request.user.is_authenticated
                else None
            )

            if entry not in Entry.objects.visible_to_author(user_author):
                return Response(
                    {
                        "detail": "Entry not found or you don't have permission to view it."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            serializer = self.get_serializer(entry)
            return Response(serializer.data)

        except Entry.DoesNotExist:
            return Response(
                {"detail": "Entry not found."}, status=status.HTTP_404_NOT_FOUND
            )

    def update_author_entry(self, request, author_id=None, entry_id=None):
        """
        PUT [local]: Update an entry

        Authentication requirements:
        - local entries: must be authenticated locally as the author
        """
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            entry = Entry.objects.get(id=entry_id, author__id=author_id)

            # Check if user can edit this entry (must be the author for local entries)
            user_author = (
                getattr(request.user, "author", None) or request.user
                if request.user.is_authenticated
                else None
            )
            if user_author != entry.author and not request.user.is_staff:
                return Response(
                    {"detail": "You must be the author to edit this entry."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            serializer = self.get_serializer(entry, data=request.data, partial=False)
            if serializer.is_valid():
                updated_entry = serializer.save()
                
                # Send updated entry to remote authors' inboxes
                print(f"DEBUG: update_author_entry - sending updated entry {updated_entry.id} to remote inboxes")
                self._send_to_remote_authors(updated_entry)
                
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Entry.DoesNotExist:
            return Response(
                {"detail": "Entry not found."}, status=status.HTTP_404_NOT_FOUND
            )

    def delete_author_entry(self, request, author_id=None, entry_id=None):
        """
        DELETE [local]: Remove a local entry

        Authentication requirements:
        - local entries: must be authenticated locally as the author
        """
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            entry = Entry.objects.get(id=entry_id, author__id=author_id)

            # Check if user can delete this entry (must be the author for local entries)
            user_author = (
                getattr(request.user, "author", None) or request.user
                if request.user.is_authenticated
                else None
            )
            if user_author != entry.author and not request.user.is_staff:
                return Response(
                    {"detail": "You must be the author to delete this entry."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            entry.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Entry.DoesNotExist:
            return Response(
                {"detail": "Entry not found."}, status=status.HTTP_404_NOT_FOUND
            )
