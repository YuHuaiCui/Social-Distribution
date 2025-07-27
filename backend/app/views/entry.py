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
        - Attempts to fetch remote entries when not found locally

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
            # Entry not found locally, try to fetch from remote nodes
            logger.info(f"Entry {lookup_value} not found locally, attempting remote fetch")
            
            try:
                # Try to fetch from remote nodes with timeout protection
                remote_entry = self._fetch_remote_entry(lookup_value)
                if remote_entry:
                    logger.info(f"Successfully fetched remote entry {lookup_value}")
                    
                    # Check if the fetched entry is visible to the user
                    if remote_entry in Entry.objects.visible_to_author(user_author):
                        return remote_entry
                    else:
                        raise PermissionDenied("You do not have permission to view this post.")
            except Exception as remote_error:
                # Log the error but don't let it cause a 503
                logger.warning(f"Remote fetch failed for entry {lookup_value}: {remote_error}")
                # Continue to raise NotFound instead of letting remote errors bubble up
            
            raise NotFound("Entry not found.")

        raise PermissionDenied("You do not have permission to view this post.")

    def _fetch_remote_entry(self, entry_id):
        """
        Attempt to fetch an entry from remote nodes when not found locally.
        
        Args:
            entry_id: The UUID of the entry to fetch
            
        Returns:
            Entry: The fetched entry if successful, None otherwise
        """
        try:
            from app.utils.remote import RemoteObjectFetcher, RemoteNodeClient
            from app.utils.federation import FederationService
            from app.models import Node
            import requests
            from requests.exceptions import Timeout, ConnectionError, RequestException
            
            # Get all active nodes
            active_nodes = Node.objects.filter(is_active=True)
            
            if not active_nodes.exists():
                logger.info(f"No active nodes configured for remote entry fetching")
                return None
                
            logger.info(f"Attempting to fetch entry {entry_id} from {active_nodes.count()} active nodes")
            
            for node in active_nodes:
                try:
                    # Skip if this is the same localhost instance (self-federation)
                    if FederationService.is_same_localhost_instance(node.host):
                        logger.debug(f"Skipping self-federation with node {node.name}")
                        continue
                    
                    logger.info(f"Trying to fetch entry {entry_id} from node {node.name} ({node.host})")
                    
                    # Try to fetch the entry from this node with shorter timeout
                    client = RemoteNodeClient(node)
                    
                    # Try different endpoint patterns
                    endpoints_to_try = [
                        f"/api/entries/{entry_id}/",
                        f"/entries/{entry_id}/",
                    ]
                    
                    for endpoint in endpoints_to_try:
                        try:
                            logger.debug(f"Trying endpoint: {endpoint}")
                            # Use a shorter timeout for remote fetching to prevent 503 errors
                            response = client.get(endpoint, timeout=10)
                            if response.status_code == 200:
                                entry_data = response.json()
                                logger.info(f"Successfully fetched entry data from {node.name}")
                                
                                # Create the entry locally
                                entry = self._create_local_entry_from_remote(entry_data, node)
                                if entry:
                                    logger.info(f"Successfully created local entry from remote: {entry_id}")
                                    return entry
                                else:
                                    logger.warning(f"Failed to create local entry from remote data")
                                    
                        except (Timeout, ConnectionError) as e:
                            logger.debug(f"Timeout/Connection error fetching from {endpoint} on node {node.name}: {e}")
                            continue
                        except RequestException as e:
                            logger.debug(f"Request error fetching from {endpoint} on node {node.name}: {e}")
                            continue
                        except Exception as e:
                            logger.debug(f"Unexpected error fetching from {endpoint} on node {node.name}: {e}")
                            continue
                            
                except Exception as e:
                    logger.warning(f"Error fetching from node {node.name}: {e}")
                    continue
                    
            logger.info(f"Failed to fetch entry {entry_id} from any remote nodes")
            
        except Exception as e:
            logger.error(f"Error in _fetch_remote_entry: {e}")
            
        return None

    def _create_local_entry_from_remote(self, entry_data, node):
        """
        Create a local entry from remote entry data.
        
        Args:
            entry_data: The entry data from the remote node
            node: The remote node
            
        Returns:
            Entry: The created entry if successful, None otherwise
        """
        try:
            from app.models import Author
            from urllib.parse import urlparse
            
            # Extract entry URL and ID
            entry_url = entry_data.get("id") or entry_data.get("url")
            if not entry_url:
                logger.warning("No entry URL found in remote data")
                return None
                
            # Parse entry ID from URL
            parsed = urlparse(entry_url)
            path_parts = parsed.path.strip("/").split("/")
            logger.info(f"Parsing entry URL: {entry_url}, path_parts: {path_parts}")
            if "entries" in path_parts:
                entry_index = path_parts.index("entries")
                if entry_index + 1 < len(path_parts):
                    entry_id = path_parts[entry_index + 1]
                    logger.info(f"Extracted entry_id: {entry_id}")
                else:
                    logger.warning("Could not extract entry ID from URL")
                    return None
            else:
                logger.warning("No 'entries' in URL path")
                return None
            
            # Get or create the author
            author_data = entry_data.get("author", {})
            if not author_data:
                logger.warning("No author data in remote entry")
                return None
                
            author_url = author_data.get("id") or author_data.get("url")
            if not author_url:
                logger.warning("No author URL in remote data")
                return None
                
            # Parse author ID from URL
            author_parsed = urlparse(author_url)
            author_path_parts = author_parsed.path.strip("/").split("/")
            if "authors" in author_path_parts:
                author_index = author_path_parts.index("authors")
                if author_index + 1 < len(author_path_parts):
                    author_id = author_path_parts[author_index + 1]
                else:
                    logger.warning("Could not extract author ID from URL")
                    return None
            else:
                logger.warning("No 'authors' in author URL path")
                return None
            
            # Get or create the remote author
            author, _ = Author.objects.get_or_create(
                url=author_url,
                defaults={
                    "id": author_id,
                    "username": author_data.get("username", ""),
                    "display_name": author_data.get(
                        "displayName", author_data.get("display_name", "")
                    ),
                    "github_username": author_data.get("github", ""),
                    "profile_image": author_data.get(
                        "profileImage", author_data.get("profile_image", "")
                    ),
                    "host": author_data.get("host", node.host),
                    "node": node,
                    "is_approved": True,
                    "is_active": True,
                },
            )
            
            # Create the entry
            logger.info(f"Creating entry with ID: {entry_id}, URL: {entry_url}")
            try:
                entry, created = Entry.objects.get_or_create(
                    id=entry_id,
                    defaults={
                        "url": entry_url,
                        "author": author,
                        "title": entry_data.get("title", ""),
                        "content": entry_data.get("content", ""),
                        "content_type": entry_data.get(
                            "contentType", "text/plain"
                        ),
                        "visibility": entry_data.get("visibility", "PUBLIC"),
                        "description": entry_data.get("description", ""),
                        "source": entry_data.get("source", ""),
                         "origin": entry_data.get("origin", ""),
                    },
                )
            except Exception as e:
                logger.error(f"Error in Entry.objects.get_or_create: {e}")
                raise
            
            if created:
                logger.info(f"Created new local entry from remote: {entry_id}")
            else:
                logger.info(f"Found existing local entry from remote: {entry_id}")
                
            return entry
            
        except Exception as e:
            logger.error(f"Error creating local entry from remote data: {e}")
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
        if self.request.path.endswith('/entries/'):
            from app.models import Author
            
            # Count posts by visibility and origin
            total_posts = queryset.count()
            public_posts = queryset.filter(visibility=Entry.PUBLIC).count()
            remote_public_count = queryset.filter(
                visibility=Entry.PUBLIC, 
                author__node__isnull=False
            ).count()
            local_public_count = queryset.filter(
                visibility=Entry.PUBLIC, 
                author__node__isnull=True
            ).count()
            
            print(f"\nDEBUG EntryViewSet.get_queryset for path: {self.request.path}")
            print(f"DEBUG: Total entries in queryset: {total_posts}")
            print(f"DEBUG: Total PUBLIC posts: {public_posts}")
            print(f"DEBUG: Local PUBLIC posts: {local_public_count}, Remote PUBLIC posts: {remote_public_count}")
            
            # Check if any remote posts exist at all
            total_remote_posts = Entry.objects.filter(author__node__isnull=False).count()
            total_remote_public = Entry.objects.filter(author__node__isnull=False, visibility=Entry.PUBLIC).count()
            print(f"DEBUG: Total remote posts in DB: {total_remote_posts}, Total remote PUBLIC in DB: {total_remote_public}")
            
            # Log first few remote PUBLIC posts if any
            remote_public_posts = queryset.filter(
                visibility=Entry.PUBLIC, 
                author__node__isnull=False
            )[:3]
            for post in remote_public_posts:
                print(f"DEBUG: Remote PUBLIC post - ID: {post.id}, Title: {post.title}, Author: {post.author.username} from {post.author.node.name if post.author.node else 'Unknown node'}, Created: {post.created_at}")
        
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
        
        # Send to remote nodes based on visibility
        if entry.visibility in [Entry.PUBLIC, Entry.FRIENDS]:
            self._send_to_remote_nodes(entry)

    def _send_to_remote_nodes(self, entry):
        """
        Send an entry to remote nodes based on visibility rules.
        PUBLIC: Broadcast to all connected nodes for discovery
        FRIENDS: Send only to remote friends
        """
        try:
            # Use the centralized federation service
            from app.utils.federation import FederationService
            results = FederationService.post_entry_to_remote_nodes(entry)
            
            # Log the results
            successful_nodes = [name for name, success in results.items() if success]
            failed_nodes = [name for name, success in results.items() if not success]
            
            if successful_nodes:
                print(f"Successfully posted entry '{entry.title}' to {len(successful_nodes)} nodes: {', '.join(successful_nodes)}")
            
            if failed_nodes:
                print(f"Failed to post entry '{entry.title}' to {len(failed_nodes)} nodes: {', '.join(failed_nodes)}")
                    
        except Exception as e:
            print(f"Error in _send_to_remote_nodes: {str(e)}")

    def _broadcast_to_node(self, entry, node):
        """
        Broadcast a PUBLIC post to a remote node.
        Sends the post directly to the general inbox endpoint for PUBLIC content discovery.
        """
        try:
            import requests
            from requests.auth import HTTPBasicAuth
            
            print(f"Broadcasting PUBLIC post '{entry.title}' to node: {node.name} ({node.host})")
            
            # For PUBLIC posts, send directly to the general inbox
            general_inbox_url = f"{node.host.rstrip('/')}/api/federation/inbox/"
            
            # Use the helper method to prepare post data
            post_data = self._prepare_post_data(entry)
            
            print(f"Sending PUBLIC post to general inbox: {general_inbox_url}")
            print(f"Authenticating as username: {node.username}")
            
            response = requests.post(
                general_inbox_url,
                json=post_data,
                auth=HTTPBasicAuth(node.username, node.password),
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code in [200, 201, 202]:
                print(f"Successfully sent PUBLIC post to {node.name} general inbox")
            else:
                print(f"Failed to send to {node.name} general inbox: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                
                # If general inbox fails, try to send to any known authors from this node
                self._broadcast_to_known_authors(entry, node)
                
        except Exception as e:
            print(f"Error broadcasting to node {node.name}: {str(e)}")
            # Fall back to sending to known authors from this node
            self._broadcast_to_known_authors(entry, node)
    
    def _broadcast_to_known_authors(self, entry, node):
        """
        Fallback method to broadcast to known authors from a node.
        Used when we can't fetch the full author list from the remote node.
        """
        # Find any active author from this node to receive the broadcast
        remote_authors = Author.objects.filter(node=node, is_active=True)
        
        if remote_authors.exists():
            for remote_author in remote_authors:
                self._send_post_to_author(entry, remote_author, node)
        else:
            print(f"Warning: No known authors from node {node.name} - post will be discovered when authors interact")
    
    def _prepare_post_data(self, entry):
        """
        Prepare post data in the format expected by remote nodes
        """
        post_data = {
            "content_type": "entry",
            "type": "Post",
            "id": entry.url,
            "title": entry.title,
            "content": entry.content,
            "contentType": entry.content_type,
            "visibility": entry.visibility,
            "published": entry.created_at.isoformat(),
            "author": {
                "id": entry.author.url,
                "url": entry.author.url,
                "host": entry.author.host,
                "displayName": entry.author.display_name,
                "username": entry.author.username,
                "github": entry.author.github_username if entry.author.github_username else "",
                "profileImage": entry.author.profile_image if entry.author.profile_image else "",
                "bio": entry.author.bio if entry.author.bio else "",
                "location": entry.author.location if entry.author.location else "",
                "website": entry.author.website if entry.author.website else "",
                "page": entry.author.web if entry.author.web else ""
            },
            "description": entry.description if entry.description else "",
            "source": entry.source if entry.source else entry.url,
            "origin": entry.origin if entry.origin else entry.url
        }
        
        # Include image if present
        if entry.content_type in ['image/png', 'image/jpeg'] and entry.image_data:
            import base64
            image_base64 = base64.b64encode(entry.image_data).decode('utf-8')
            post_data["image"] = f"data:{entry.content_type};base64,{image_base64}"
        
        return post_data
    
    def _send_post_to_author(self, entry, remote_author, remote_node):
        """
        Send a post to a specific remote author's inbox
        """
        from requests.auth import HTTPBasicAuth
        import requests
        
        # Use the helper method to prepare post data
        post_data = self._prepare_post_data(entry)
        
        # Send to remote node's inbox
        try:
            # Build the inbox URL from the author's URL
            if remote_author.url:
                # Extract author ID from URL like "http://nodeaaaa/authors/greg" 
                url_parts = remote_author.url.rstrip('/').split('/')
                author_id = url_parts[-1]
            else:
                # Fallback to UUID
                author_id = str(remote_author.id)
            
            # Construct inbox URL using the node's host, not the author's host
            # (author's host might be localhost from their local development)
            host = remote_node.host.rstrip('/')
            inbox_url = f"{host}/api/authors/{author_id}/inbox/"
            
            response = requests.post(
                inbox_url,
                json=post_data,
                auth=HTTPBasicAuth(remote_node.username, remote_node.password),
                headers={'Content-Type': 'application/json'},
                timeout=5
            )
            
            if response.status_code in [200, 201, 202]:
                InboxDelivery.objects.get_or_create(entry=entry, recipient=remote_author, success=True)
            else:
                print(f"Failed to send post to {inbox_url}: {response.status_code} - {response.text[:200]}")
                
        except Exception as e:
            print(f"Error sending post to remote author {remote_author.username}: {str(e)}")

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
                        headers={'Content-Type': 'application/json'},
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
                        headers={'Content-Type': 'application/json'},
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
        
        # Get the entry before update
        entry = self.get_object()
        old_visibility = entry.visibility
        
        response = super().partial_update(request, *args, **kwargs)
        
        # If update was successful, check if we need to send to remote nodes
        if response.status_code == 200:
            entry.refresh_from_db()
            
            # Send to remote nodes if visibility allows
            if entry.visibility in [Entry.PUBLIC, Entry.FRIENDS]:
                if old_visibility == entry.visibility:
                    # Visibility didn't change, send update
                    self._send_update_to_remote_nodes(entry)
                else:
                    # Visibility changed, send as new post
                    self._send_to_remote_nodes(entry)
        
        return response

    @action(detail=False, methods=["get"], url_path="by-url")
    def get_entry_by_url(self, request):
        """
        Get an entry by its full URL.
        
        This endpoint is useful for federation when we receive entry URLs
        from remote nodes and need to fetch the actual entry data.
        """
        entry_url = request.query_params.get('url')
        if not entry_url:
            return Response(
                {"error": "URL parameter is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # First try to find the entry locally by URL
            try:
                entry = Entry.objects.get(url=entry_url)
                serializer = self.get_serializer(entry)
                return Response(serializer.data)
            except Entry.DoesNotExist:
                pass
            
            # If not found locally, try to fetch from remote nodes
            logger.info(f"Entry not found locally for URL {entry_url}, attempting remote fetch")
            
            # Parse the URL to extract entry ID
            from urllib.parse import urlparse
            parsed = urlparse(entry_url)
            path_parts = parsed.path.strip("/").split("/")
            
            if "entries" in path_parts:
                entry_index = path_parts.index("entries")
                if entry_index + 1 < len(path_parts):
                    entry_id = path_parts[entry_index + 1]
                    
                    # Try to fetch the entry using our remote fetching logic
                    remote_entry = self._fetch_remote_entry(entry_id)
                    if remote_entry:
                        serializer = self.get_serializer(remote_entry)
                        return Response(serializer.data)
            
            return Response(
                {"error": "Entry not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        except Exception as e:
            logger.error(f"Error fetching entry by URL {entry_url}: {str(e)}")
            return Response(
                {"error": "Could not retrieve entry"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
