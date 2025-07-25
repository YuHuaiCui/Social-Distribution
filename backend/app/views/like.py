from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from uuid import UUID

from app.models import Like, Entry, Comment
from app.serializers.like import LikeSerializer
from requests.auth import HTTPBasicAuth
from app.models import Node
from app.serializers.like import LikeSerializer
import requests
from app.utils.remote import RemoteActivitySender


def send_like_to_remote_inbox(like):
    # DEPRECATED: Use RemoteActivitySender.send_like instead
    RemoteActivitySender.send_like(like)


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
            entry_id: UUID of the entry to be liked

        Returns:
            Response:
                - 201 Created with like data if new like created
                - 200 OK if entry was already liked by this user
                - 404 Not Found if entry doesn't exist
        """
        entry = get_object_or_404(Entry, id=entry_id)
        author = request.user

        # Check if user has already liked this entry to prevent duplicates
        if Like.objects.filter(author=author, entry=entry).exists():
            return Response({"detail": "Already liked."}, status=status.HTTP_200_OK)

        # Create new like record
        like = Like.objects.create(author=author, entry=entry)
        serializer = LikeSerializer(like)
        RemoteActivitySender.send_like(like)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def delete(self, request, entry_id):
        """
        Remove a like from an entry.

        Allows an authenticated user to unlike an entry they previously liked.
        If no like exists, returns success anyway to maintain idempotent behavior.
        This prevents errors when users attempt to unlike entries multiple times.

        Args:
            request: The HTTP request from the authenticated user
            entry_id: UUID of the entry to be unliked

        Returns:
            Response:
                - 200 OK if like was found and deleted
                - 204 No Content if no like was found (treated as success)
                - 404 Not Found if entry doesn't exist
        """
        author = request.user
        entry = get_object_or_404(Entry, id=entry_id)

        # Find and delete the like if it exists
        like = Like.objects.filter(author=author, entry=entry).first()
        if like:
            like.delete()
            return Response({"detail": "Unliked."}, status=status.HTTP_200_OK)
        # If no like found, return success for idempotent behavior
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
            entry = get_object_or_404(Entry, id=entry_id)
            like_count = Like.objects.filter(entry=entry).count()

            # Check if current user has liked this entry
            liked_by_current_user = False

            if request.user.is_authenticated:
                liked_by_current_user = Like.objects.filter(
                    author=request.user, entry=entry
                ).exists()

            return Response(
                {
                    "like_count": like_count,
                    "liked_by_current_user": liked_by_current_user,
                }
            )

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
        from app.serializers.like import LikeSerializer

        serializer = LikeSerializer(likes, many=True, context={"request": request})

        return Response({"type": "liked", "items": serializer.data})


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
        RemoteActivitySender.send_like(like)
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
