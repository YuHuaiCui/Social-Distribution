from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from django.conf import settings
from uuid import UUID

from app.models import Like, Entry, Comment, Node
from app.serializers.like import LikeSerializer, LikesCollectionSerializer
from requests.auth import HTTPBasicAuth
import requests
import logging

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def received_likes(request):
    """
    Get likes received by the current user on their entries.
    Returns a list of likes on entries authored by the current user.
    """
    user = request.user

    # Get all likes on entries authored by the current user
    likes = (
        Like.objects.filter(entry__author=user)
        .select_related("author", "entry")
        .order_by("-created_at")
    )

    # Use LikeSerializer to format the response
    serializer = LikeSerializer(likes, many=True, context={"request": request})

    return Response({"type": "likes", "items": serializer.data})


def send_like_to_remote_inbox(like):
    """
    Send like to remote author's inbox using the spec format.
    Handles both entry and comment likes.
    """
    print(f"DEBUG: send_like_to_remote_inbox called for like {like.id}")
    try:
        # Determine if it's an entry or comment like
        if like.entry:
            # Entry like
            target = like.entry
            target_author = like.entry.author
            target_url = like.entry.url
            print(f"DEBUG: Entry like - target: {target.title}, author: {target_author.displayName}")
        elif like.comment:
            # Comment like
            target = like.comment
            target_author = like.comment.author
            target_url = like.comment.url
            print(f"DEBUG: Comment like - target: {target.content[:50]}..., author: {target_author.displayName}")
        else:
            logger.error("Like has neither entry nor comment")
            return
            
        print(f"DEBUG: Target author is_remote: {target_author.is_remote}, has node: {target_author.node is not None}")
        
        # Only send if the target author is remote
        if not target_author.is_remote or not target_author.node:
            print(f"DEBUG: Skipping federation - target author is local or has no node")
            return
            
        remote_author = target_author
        remote_node = remote_author.node
        
        print(f"DEBUG: Sending like to remote node: {remote_node.name} ({remote_node.host})")
        
        # Create like data in the spec format
        like_data = {
            "type": "like",
            "id": like.url,
            "author": {
                "type": "author",
                "id": like.author.url,
                "host": like.author.host,
                "displayName": like.author.displayName,
                "web": like.author.web,
                "profileImage": like.author.profileImage,
            },
            "object": target_url,
            "published": like.created_at.isoformat() if hasattr(like, 'created_at') else None,
        }
        
        # Construct inbox URL with trailing slash
        inbox_url = f"{remote_node.host.rstrip('/')}/api/authors/{remote_author.id}/inbox/"
        
        print(f"DEBUG: Sending like to inbox URL: {inbox_url}")
        print(f"DEBUG: Like data: {like_data}")
        
        response = requests.post(
            inbox_url,
            json=like_data,
            auth=HTTPBasicAuth(remote_node.username, remote_node.password),
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        
        print(f"DEBUG: Like federation response: {response.status_code} - {response.text}")
        
        if response.status_code in [200, 201]:
            logger.info(f"Successfully sent like to {remote_author.displayName}")
        else:
            logger.warning(f"Failed to send like to {inbox_url}: {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error sending like to remote inbox: {str(e)}")
        print(f"DEBUG: Exception in send_like_to_remote_inbox: {str(e)}")


def send_unlike_to_remote_inbox(like):
    """
    Send unlike (undo like) activity to remote author's inbox.
    Handles both entry and comment unlikes.
    """
    print(f"DEBUG: send_unlike_to_remote_inbox called for like {like.id}")
    try:
        # Determine if it's an entry or comment like
        if like.entry:
            # Entry like
            target = like.entry
            target_author = like.entry.author
            target_url = like.entry.url
            print(f"DEBUG: Entry unlike - target: {target.title}, author: {target_author.displayName}")
        elif like.comment:
            # Comment like
            target = like.comment
            target_author = like.comment.author
            target_url = like.comment.url
            print(f"DEBUG: Comment unlike - target: {target.content[:50]}..., author: {target_author.displayName}")
        else:
            logger.error("Like has neither entry nor comment")
            return
            
        print(f"DEBUG: Target author is_remote: {target_author.is_remote}, has node: {target_author.node is not None}")
        
        # Only send if the target author is remote
        if not target_author.is_remote or not target_author.node:
            print(f"DEBUG: Skipping unlike federation - target author is local or has no node")
            return
            
        remote_author = target_author
        remote_node = remote_author.node
        
        print(f"DEBUG: Sending unlike to remote node: {remote_node.name} ({remote_node.host})")
        
        # Create undo activity in the spec format
        undo_data = {
            "type": "undo",
            "id": f"{like.author.url}/undo/{like.id}",
            "actor": {
                "type": "author",
                "id": like.author.url,
                "host": like.author.host,
                "displayName": like.author.displayName,
                "web": like.author.web,
                "profileImage": like.author.profileImage,
            },
            "object": {
                "type": "like",
                "id": like.url,
                "author": {
                    "type": "author",
                    "id": like.author.url,
                    "host": like.author.host,
                    "displayName": like.author.displayName,
                    "web": like.author.web,
                    "profileImage": like.author.profileImage,
                },
                "object": target_url,
            },
            "published": like.created_at.isoformat() if hasattr(like, 'created_at') else None,
        }
        
        # Construct inbox URL with trailing slash
        inbox_url = f"{remote_node.host.rstrip('/')}/api/authors/{remote_author.id}/inbox/"
        
        print(f"DEBUG: Sending unlike to inbox URL: {inbox_url}")
        print(f"DEBUG: Undo data: {undo_data}")
        
        response = requests.post(
            inbox_url,
            json=undo_data,
            auth=HTTPBasicAuth(remote_node.username, remote_node.password),
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        
        print(f"DEBUG: Unlike federation response: {response.status_code} - {response.text}")
        
        if response.status_code in [200, 201]:
            logger.info(f"Successfully sent unlike to {remote_author.displayName}")
        else:
            logger.warning(f"Failed to send unlike to {inbox_url}: {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error sending unlike to remote inbox: {str(e)}")
        print(f"DEBUG: Exception in send_unlike_to_remote_inbox: {str(e)}")


class EntryLikeView(APIView):
    """
    API endpoint for managing likes on entries (posts).

    This view handles the like/unlike functionality for entries in the social
    distribution platform. Authenticated users can like entries, remove their
    likes, and view like counts for entries. Each user can only like an entry
    once, and duplicate like attempts are handled gracefully.

    Attributes:
        permission_classes: Requires authentication for all operations
    """

    permission_classes = [permissions.IsAuthenticated]

    def dispatch(self, request, *args, **kwargs):
        """Route requests based on available parameters."""
        if "entry_fqid" in kwargs:
            # Extract entry ID from FQID for FQID-based endpoints
            entry_fqid = kwargs["entry_fqid"]
            try:
                # Try to extract UUID from the FQID
                if entry_fqid.startswith("http"):
                    # Full URL - extract last part
                    entry_id = (
                        entry_fqid.split("/")[-1]
                        if entry_fqid.split("/")[-1]
                        else entry_fqid.split("/")[-2]
                    )
                else:
                    # Assume it's already a UUID
                    entry_id = entry_fqid

                # Validate UUID format
                UUID(entry_id)
                kwargs["entry_id"] = entry_id

                # Remove the entry_fqid parameter since view methods expect entry_id
                del kwargs["entry_fqid"]
            except (ValueError, IndexError):
                return Response(
                    {"detail": "Invalid entry FQID format"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif "author_fqid" in kwargs:
            # Handle author FQID for liked endpoints
            from urllib.parse import unquote

            author_fqid = unquote(kwargs["author_fqid"])
            kwargs["author_fqid_decoded"] = author_fqid

        return super().dispatch(request, *args, **kwargs)

    def post(self, request, entry_id):
        """
        Create a like for an entry.

        Allows an authenticated user to like an entry. If the user has already
        liked the entry, returns a success response without creating a duplicate.
        This ensures idempotent behavior for like operations.

        Args:
            request: The HTTP request from the authenticated user
            entry_id: UUID or FQID of the entry to be liked

        Returns:
            Response:
                - 201 Created with like data if new like created
                - 200 OK if entry was already liked by this user
                - 404 Not Found if entry doesn't exist
        """
        # Debug information
        print(f"[DEBUG] ===== LIKE POST REQUEST RECEIVED =====")
        print(f"[DEBUG] Entry ID: {entry_id}")
        print(f"[DEBUG] User authenticated: {request.user.is_authenticated}")
        print(f"[DEBUG] User: {request.user}")
        print(f"[DEBUG] Request method: {request.method}")
        print(f"[DEBUG] Request path: {request.path}")
        print(f"[DEBUG] Request headers: {dict(request.headers)}")
        print(f"[DEBUG] Request body: {request.body}")
        print(f"[DEBUG] User agent: {request.META.get('HTTP_USER_AGENT', 'Unknown')}")
        print(f"[DEBUG] Remote addr: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        print(f"[DEBUG] ======================================")

        # Try to find the entry by UUID first, then by URL/FQID
        entry = None

        # First, try to find by UUID (for local likes)
        try:
            entry = Entry.objects.get(id=entry_id)
            print(f"[DEBUG] Entry found by UUID: {entry.title}")
        except Entry.DoesNotExist:
            print(f"[DEBUG] Entry not found by UUID, trying by URL/FQID")

            # If not found by UUID, try to find by URL/FQID (for remote likes)
            try:
                # Convert entry_id to string for string operations
                entry_id_str = str(entry_id)

                # Check if entry_id looks like a URL/FQID
                if entry_id_str.startswith("http") or "/" in entry_id_str:
                    # Try to find by URL
                    entry = Entry.objects.get(
                        url__icontains=entry_id_str.split("/")[-1]
                    )
                    print(f"[DEBUG] Entry found by URL/FQID: {entry.title}")
                else:
                    # Try to find by URL that contains this ID
                    entry = Entry.objects.get(url__icontains=entry_id_str)
                    print(f"[DEBUG] Entry found by URL containing ID: {entry.title}")
            except Entry.DoesNotExist:
                print(
                    f"[DEBUG] Entry with ID/FQID {entry_id} does not exist in database"
                )
                return Response(
                    {"detail": f"Entry with ID {entry_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        author = request.user

        # Check if user has already liked this entry to prevent duplicates
        if Like.objects.filter(author=author, entry=entry).exists():
            print(f"[DEBUG] User already liked this entry")
            return Response({"detail": "Already liked."}, status=status.HTTP_200_OK)

        # Create new like record
        like = Like.objects.create(author=author, entry=entry)
        serializer = LikeSerializer(like)
        print(f"[DEBUG] Like created successfully: {like.id}")
        print(
            f"[DEBUG] Like author: {like.author.username} (local: {like.author.is_local})"
        )
        print(f"[DEBUG] Like entry: {like.entry.title}")
        print(
            f"[DEBUG] Entry author: {like.entry.author.username} (local: {like.entry.author.is_local})"
        )
        print(f"[DEBUG] About to call RemoteActivitySender.send_like")

        # Send like to remote node if entry author is remote
        send_like_to_remote_inbox(like)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def delete(self, request, entry_id):
        """
        Remove a like from an entry.

        Allows an authenticated user to unlike an entry they previously liked.
        If no like exists, returns success anyway to maintain idempotent behavior.
        This prevents errors when users attempt to unlike entries multiple times.

        Args:
            request: The HTTP request from the authenticated user
            entry_id: UUID or FQID of the entry to be unliked

        Returns:
            Response:
                - 200 OK if like was found and deleted
                - 204 No Content if no like was found (treated as success)
                - 404 Not Found if entry doesn't exist
        """
        # Debug information
        print(f"[DEBUG] ===== LIKE DELETE REQUEST RECEIVED =====")
        print(f"[DEBUG] Entry ID: {entry_id}")
        print(f"[DEBUG] User authenticated: {request.user.is_authenticated}")
        print(f"[DEBUG] User: {request.user}")
        print(f"[DEBUG] Request method: {request.method}")
        print(f"[DEBUG] Request path: {request.path}")
        print(f"[DEBUG] Request headers: {dict(request.headers)}")
        print(f"[DEBUG] User agent: {request.META.get('HTTP_USER_AGENT', 'Unknown')}")
        print(f"[DEBUG] Remote addr: {request.META.get('REMOTE_ADDR', 'Unknown')}")
        print(f"[DEBUG] ======================================")

        author = request.user

        # Try to find the entry by UUID first, then by URL/FQID (same logic as post method)
        entry = None

        # First, try to find by UUID (for local likes)
        try:
            entry = Entry.objects.get(id=entry_id)
            print(f"[DEBUG] Entry found by UUID for unlike: {entry.title}")
        except Entry.DoesNotExist:
            print(f"[DEBUG] Entry not found by UUID for unlike, trying by URL/FQID")

            # If not found by UUID, try to find by URL/FQID (for remote likes)
            try:
                # Convert entry_id to string for string operations
                entry_id_str = str(entry_id)

                # Check if entry_id looks like a URL/FQID
                if entry_id_str.startswith("http") or "/" in entry_id_str:
                    # Try to find by URL
                    entry = Entry.objects.get(
                        url__icontains=entry_id_str.split("/")[-1]
                    )
                    print(f"[DEBUG] Entry found by URL/FQID for unlike: {entry.title}")
                else:
                    # Try to find by URL that contains this ID
                    entry = Entry.objects.get(url__icontains=entry_id_str)
                    print(
                        f"[DEBUG] Entry found by URL containing ID for unlike: {entry.title}"
                    )
            except Entry.DoesNotExist:
                print(
                    f"[DEBUG] Entry with ID/FQID {entry_id} does not exist in database for unlike"
                )
                return Response(
                    {"detail": f"Entry with ID {entry_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Find and delete the like if it exists
        like = Like.objects.filter(author=author, entry=entry).first()
        if like:
            # Send unlike to remote node if entry author is remote
            send_unlike_to_remote_inbox(like)
            
            like.delete()
            print(f"[DEBUG] Like deleted successfully: {like.id}")
            return Response({"detail": "Unliked."}, status=status.HTTP_200_OK)
        # If no like found, return success for idempotent behavior
        print(f"[DEBUG] No like found to delete")
        return Response(
            {"detail": "Like not found, treated as success."},
            status=status.HTTP_204_NO_CONTENT,
        )

    def get(self, request, entry_id=None, author_id=None, **kwargs):
        """
        Handle GET requests for entry likes or author's liked entries.
        """
        # If we have an entry_id, return like stats for that entry
        if entry_id:
            # Try to find the entry by UUID first, then by URL/FQID (same logic as post/delete methods)
            entry = None

            # First, try to find by UUID (for local likes)
            try:
                entry = Entry.objects.get(id=entry_id)
                print(f"[DEBUG] Entry found by UUID for GET: {entry.title}")
            except Entry.DoesNotExist:
                print(f"[DEBUG] Entry not found by UUID for GET, trying by URL/FQID")

                # If not found by UUID, try to find by URL/FQID (for remote likes)
                try:
                    # Convert entry_id to string for string operations
                    entry_id_str = str(entry_id)

                    # Check if entry_id looks like a URL/FQID
                    if entry_id_str.startswith("http") or "/" in entry_id_str:
                        # Try to find by URL
                        entry = Entry.objects.get(
                            url__icontains=entry_id_str.split("/")[-1]
                        )
                        print(f"[DEBUG] Entry found by URL/FQID for GET: {entry.title}")
                    else:
                        # Try to find by URL that contains this ID
                        entry = Entry.objects.get(url__icontains=entry_id_str)
                        print(
                            f"[DEBUG] Entry found by URL containing ID for GET: {entry.title}"
                        )
                except Entry.DoesNotExist:
                    print(
                        f"[DEBUG] Entry with ID/FQID {entry_id} does not exist in database for GET"
                    )
                    return Response(
                        {"detail": f"Entry with ID {entry_id} not found"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

            # Get pagination parameters
            page_number = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('size', 50))
            
            # Get all likes for this entry, ordered newest first
            likes_queryset = Like.objects.filter(entry=entry).select_related('author').order_by('-created_at')
            total_count = likes_queryset.count()
            
            # Calculate pagination
            start_idx = (page_number - 1) * page_size
            end_idx = start_idx + page_size
            likes_page = likes_queryset[start_idx:end_idx]
            
            # Serialize likes
            likes_serializer = LikeSerializer(likes_page, many=True, context={'request': request})
            
            # Build response according to spec
            response_data = {
                "type": "likes",
                "web": entry.url.replace('/api/', '/') if entry.url else f"{getattr(settings, 'FRONTEND_URL', settings.SITE_URL)}/authors/{entry.author.id}/entries/{entry.id}",
                "id": f"{entry.url}/likes" if entry.url else f"{settings.SITE_URL}/api/authors/{entry.author.id}/entries/{entry.id}/likes",
                "page_number": page_number,
                "size": page_size,
                "count": total_count,
                "src": likes_serializer.data
            }
            
            return Response(response_data)

        # Otherwise, handle liked entries by author
        # Check if this is an author FQID request
        if "author_fqid_decoded" in kwargs:
            author_fqid = kwargs["author_fqid_decoded"]
            try:
                from app.models import Author

                author = Author.objects.get(url=author_fqid)
            except Author.DoesNotExist:
                return Response(
                    {"detail": "Author not found"}, status=status.HTTP_404_NOT_FOUND
                )
        elif author_id:
            from app.models import Author

            try:
                author = Author.objects.get(id=author_id)
            except Author.DoesNotExist:
                return Response(
                    {"detail": "Author not found"}, status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {"detail": "Author ID required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Get likes by this author
        likes = Like.objects.filter(author=author, entry__isnull=False).select_related(
            "entry"
        )

        serializer = LikeSerializer(likes, many=True, context={"request": request})

        return Response({"type": "likes", "items": serializer.data})


class CommentLikeView(APIView):
    """
    API endpoint for managing likes on comments.

    This view handles the like/unlike functionality for comments in the social
    distribution platform. Authenticated users can like comments, remove their
    likes, and view like counts for comments. Each user can only like a comment
    once, and duplicate like attempts are handled gracefully.

    Attributes:
        permission_classes: Requires authentication for all operations
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def post(self, request, comment_id=None, **kwargs):
        """
        Create a like for a comment.

        Allows an authenticated user to like a comment. If the user has already
        liked the comment, returns a success response without creating a duplicate.
        This ensures idempotent behavior for like operations.

        Args:
            request: The HTTP request from the authenticated user
            comment_id: UUID of the comment to be liked

        Returns:
            Response:
                - 201 Created with like data if new like created
                - 200 OK if comment was already liked by this user
                - 404 Not Found if comment doesn't exist
        """
        # Handle different parameter names from URL patterns
        if comment_id is None:
            if "comment_fqid" in kwargs:
                comment_fqid = kwargs["comment_fqid"]
                if comment_fqid.startswith("http"):
                    comment_id = (
                        comment_fqid.split("/")[-1]
                        if comment_fqid.split("/")[-1]
                        else comment_fqid.split("/")[-2]
                    )
                else:
                    comment_id = comment_fqid
            else:
                return Response(
                    {"detail": "Comment ID required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        comment = get_object_or_404(Comment, id=comment_id)
        author = request.user

        # Check if user has already liked this comment to prevent duplicates
        if Like.objects.filter(author=author, comment=comment).exists():
            return Response({"detail": "Already liked."}, status=status.HTTP_200_OK)

        # Create new like record
        like = Like.objects.create(author=author, comment=comment)
        serializer = LikeSerializer(like)

        # Send like to remote node if comment author is remote
        send_like_to_remote_inbox(like)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def delete(self, request, comment_id=None, **kwargs):
        """
        Remove a like from a comment.

        Allows an authenticated user to unlike a comment they previously liked.
        If no like exists, returns success anyway to maintain idempotent behavior.
        This prevents errors when users attempt to unlike comments multiple times.

        Args:
            request: The HTTP request from the authenticated user
            comment_id: UUID of the comment to be unliked

        Returns:
            Response:
                - 200 OK if like was found and deleted
                - 204 No Content if no like was found (treated as success)
                - 404 Not Found if comment doesn't exist
        """
        # Handle different parameter names from URL patterns
        if comment_id is None:
            if "comment_fqid" in kwargs:
                comment_fqid = kwargs["comment_fqid"]
                if comment_fqid.startswith("http"):
                    comment_id = (
                        comment_fqid.split("/")[-1]
                        if comment_fqid.split("/")[-1]
                        else comment_fqid.split("/")[-2]
                    )
                else:
                    comment_id = comment_fqid
            else:
                return Response(
                    {"detail": "Comment ID required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        author = request.user
        comment = get_object_or_404(Comment, id=comment_id)

        # Find and delete the like if it exists
        like = Like.objects.filter(author=author, comment=comment).first()
        if like:
            # Send unlike to remote node if comment author is remote
            send_unlike_to_remote_inbox(like)
            
            like.delete()
            return Response({"detail": "Unliked."}, status=status.HTTP_200_OK)
        # If no like found, return success for idempotent behavior
        return Response(
            {"detail": "Like not found, treated as success."},
            status=status.HTTP_204_NO_CONTENT,
        )

    def get(self, request, comment_id=None, **kwargs):
        """
        Get like statistics for a comment.

        Returns the total number of likes for a comment and whether the current
        authenticated user has liked it. This is useful for displaying like
        counts and the like button state in the UI.

        Args:
            request: The HTTP request (authentication optional)
            comment_id: UUID of the comment to get like stats for

        Returns:
            Response:
                - 200 OK with like_count and liked_by_current_user
                - 404 Not Found if comment doesn't exist

        Response format:
            {
                "like_count": int,
                "liked_by_current_user": bool
            }
        """
        # Handle different parameter names from URL patterns
        if comment_id is None:
            if "comment_fqid" in kwargs:
                comment_fqid = kwargs["comment_fqid"]
                if comment_fqid.startswith("http"):
                    comment_id = (
                        comment_fqid.split("/")[-1]
                        if comment_fqid.split("/")[-1]
                        else comment_fqid.split("/")[-2]
                    )
                else:
                    comment_id = comment_fqid
            else:
                return Response(
                    {"detail": "Comment ID required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        comment = get_object_or_404(Comment, id=comment_id)
        like_count = Like.objects.filter(comment=comment).count()

        # Check if current user has liked this comment
        liked_by_current_user = False

        if request.user.is_authenticated:
            liked_by_current_user = Like.objects.filter(
                author=request.user, comment=comment
            ).exists()

        return Response(
            {"like_count": like_count, "liked_by_current_user": liked_by_current_user}
        )
