from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.decorators import api_view, permission_classes
from uuid import UUID
from app.models.comment import Comment
from app.models.entry import Entry
from app.serializers.comment import CommentSerializer

import requests
from requests.auth import HTTPBasicAuth
from app.models import Node
from app.serializers.comment import CommentSerializer
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def received_comments(request):
    """
    Get comments received by the current user on their entries.
    Returns a list of comments on entries authored by the current user.
    """
    user = request.user

    # Get all comments on entries authored by the current user
    comments = (
        Comment.objects.filter(entry__author=user)
        .exclude(author=user)  # Exclude comments by the user themselves
        .select_related("author", "entry")
        .order_by("-created_at")
    )

    # Create response data with entry information
    comments_data = []
    for comment in comments:
        comments_data.append(
            {
                "id": comment.id,
                "author": {
                    "id": comment.author.id,
                    "url": comment.author.url,
                    "display_name": comment.author.displayName,
                    "username": comment.author.username,
                    "profile_image": comment.author.profileImage,
                },
                "entry": {
                    "id": comment.entry.id,
                    "title": comment.entry.title,
                    "url": comment.entry.url,
                },
                "content": comment.content,
                "created_at": comment.created_at,
            }
        )

    return Response({"type": "comments", "comments": comments_data})


def send_comment_to_remote_inbox(comment):
    """Send comment to remote author's inbox using the spec format."""
    print(f"DEBUG: send_comment_to_remote_inbox called for comment {comment.id}")
    try:
        # Only send if the entry author is remote
        if not comment.entry or not comment.entry.author.is_remote or not comment.entry.author.node:
            print(f"DEBUG: Skipping comment federation - entry author is local or has no node")
            print(f"DEBUG: Entry exists: {comment.entry is not None}")
            if comment.entry:
                print(f"DEBUG: Entry author is_remote: {comment.entry.author.is_remote}")
                print(f"DEBUG: Entry author has node: {comment.entry.author.node is not None}")
            return
            
        remote_author = comment.entry.author
        remote_node = remote_author.node
        
        print(f"DEBUG: Remote author: {remote_author.displayName} from node: {remote_node.name}")
        
        # Create comment data in the spec format
        comment_data = {
            "type": "comment",
            "id": comment.url,
            "author": {
                "type": "author",
                "id": comment.author.url,
                "host": comment.author.host,
                "displayName": comment.author.displayName,
                "web": comment.author.web,
                "profileImage": comment.author.profileImage,
            },
            "comment": comment.content,
            "contentType": comment.content_type,
            "published": comment.created_at.isoformat() if hasattr(comment, 'created_at') else None,
            "entry": comment.entry.url,
        }
        
        # Construct inbox URL
        inbox_url = f"{remote_node.host.rstrip('/')}/api/authors/{remote_author.id}/inbox/"
        
        print(f"DEBUG: Sending comment to inbox URL: {inbox_url}")
        print(f"DEBUG: Comment data: {comment_data}")
        
        response = requests.post(
            inbox_url,
            json=comment_data,
            auth=HTTPBasicAuth(remote_node.username, remote_node.password),
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        
        print(f"DEBUG: Comment federation response: {response.status_code} - {response.text}")
        
        if response.status_code in [200, 201]:
            logger.info(f"Successfully sent comment to {remote_author.displayName}")
            print(f"DEBUG: Successfully sent comment to {remote_author.displayName}")
        else:
            logger.warning(f"Failed to send comment to {inbox_url}: {response.status_code}")
            print(f"DEBUG: Failed to send comment - status: {response.status_code}, response: {response.text}")
            
    except Exception as e:
        logger.error(f"Error sending comment to remote inbox: {str(e)}")


class CommentListCreateView(generics.ListCreateAPIView):
    """
    GET: List comments for an entry
    POST: Create a comment on an entry
    """

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def dispatch(self, request, *args, **kwargs):
        """Route requests based on available parameters - support both entry_id and entry_fqid."""
        if "entry_fqid" in kwargs:
            entry_fqid = kwargs["entry_fqid"]
            print(f"DEBUG: CommentListCreateView dispatch with entry_fqid: {entry_fqid}")
            
            # For full URLs (remote entries), keep as entry_fqid for special handling
            if entry_fqid.startswith("http"):
                print(f"DEBUG: Keeping full URL as entry_fqid for remote entry")
                # Keep entry_fqid as is - we'll handle it in get_queryset
                pass
            else:
                # For local entries or UUID-like FQIDs, try to extract UUID
                try:
                    entry_id = entry_fqid if "/" not in entry_fqid else entry_fqid.rstrip("/").split("/")[-1]
                    
                    # Validate UUID format
                    UUID(entry_id)
                    kwargs["entry_id"] = entry_id
                    # Remove the entry_fqid parameter since view methods expect entry_id
                    del kwargs["entry_fqid"]
                    print(f"DEBUG: Converted local FQID to entry_id: {entry_id}")
                except (ValueError, IndexError):
                    return Response(
                        {"detail": "Invalid entry FQID format"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        return super().dispatch(request, *args, **kwargs)

    def get_queryset(self):
        # Handle different URL patterns
        if "entry_id" in self.kwargs:
            entry_id = self.kwargs["entry_id"]
            print(f"DEBUG: Getting comments for entry_id: {entry_id}")
            return Comment.objects.filter(entry__id=entry_id).order_by("-created_at")
        elif "entry_fqid" in self.kwargs:
            # Handle remote entries by full URL
            entry_fqid = self.kwargs["entry_fqid"]
            print(f"DEBUG: Getting comments for entry_fqid: {entry_fqid}")
            return Comment.objects.filter(entry__url=entry_fqid).order_by("-created_at")
        elif "author_id" in self.kwargs:
            # For /api/authors/{author_id}/commented/ endpoint
            author_id = self.kwargs["author_id"]
            return Comment.objects.filter(author__id=author_id).order_by("-created_at")
        elif "author_fqid" in self.kwargs:
            # For /api/authors/{author_fqid}/commented/ endpoint
            from urllib.parse import unquote
            from app.models import Author

            author_fqid = unquote(self.kwargs["author_fqid"])
            try:
                author = Author.objects.get(url=author_fqid)
                return Comment.objects.filter(author=author).order_by("-created_at")
            except Author.DoesNotExist:
                return Comment.objects.none()
        else:
            # Return all comments if no specific filter
            return Comment.objects.all().order_by("-created_at")

    def list(self, request, *args, **kwargs):
        """Override list to return comments in the correct format"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Apply visibility rules
        entry = None
        if "entry_id" in self.kwargs:
            entry_id = self.kwargs["entry_id"]
            try:
                entry = Entry.objects.get(id=entry_id)
            except Entry.DoesNotExist:
                return Response(
                    {"detail": "Entry not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif "entry_fqid" in self.kwargs:
            entry_fqid = self.kwargs["entry_fqid"]
            try:
                entry = Entry.objects.get(url=entry_fqid)
                print(f"DEBUG: Found entry by FQID for comments: {entry.title}")
            except Entry.DoesNotExist:
                return Response(
                    {"detail": "Entry not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        
        if entry:
            # Check if user can see comments based on entry visibility
            viewing_author = request.user if request.user.is_authenticated else None
            if not self._should_include_comment_details(entry, viewing_author):
                # Return empty comments object if not visible
                return Response({
                    "type": "comments",
                    "web": f"{getattr(settings, 'FRONTEND_URL', settings.SITE_URL)}/authors/{entry.author.id}/entries/{entry.id}",
                    "id": f"{entry.url}/comments",
                    "page_number": 1,
                    "size": 5,
                    "count": 0,
                    "src": [],
                })
        else:
            return Response(
                {"detail": "Entry not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Serialize comments
        serializer = self.get_serializer(queryset[:5], many=True)
        
        # Return in the correct format
        return Response({
            "type": "comments",
            "web": f"{getattr(settings, 'FRONTEND_URL', settings.SITE_URL)}/authors/{entry.author.id}/entries/{entry.id}" if 'entry' in locals() else None,
            "id": f"{entry.url}/comments" if 'entry' in locals() else None,
            "page_number": 1,
            "size": 5,
            "count": queryset.count(),
            "src": serializer.data,
        })

    def _should_include_comment_details(self, instance, viewing_author):
        """
        Determine if comment details should be included based on visibility rules.
        Comments details are included for:
        - public entries
        - unlisted entries
        - friends-only entries when sending to a friend
        """
        if instance.visibility == Entry.PUBLIC:
            return True
        elif instance.visibility == Entry.UNLISTED:
            return True
        elif instance.visibility == Entry.FRIENDS_ONLY:
            # Check if viewing_author is a friend of the entry author
            if viewing_author and instance.author:
                from app.models.friendship import Friendship

                return (
                    Friendship.objects.filter(
                        author1=viewing_author, author2=instance.author
                    ).exists()
                    or Friendship.objects.filter(
                        author1=instance.author, author2=viewing_author
                    ).exists()
                )
        return False

    def perform_create(self, serializer):
        print(f"DEBUG: perform_create called for comment creation")
        print(f"DEBUG: kwargs: {self.kwargs}")
        print(f"DEBUG: serializer validated_data: {serializer.validated_data}")
        
        # Handle different URL patterns
        if "entry_id" in self.kwargs:
            entry_id = self.kwargs["entry_id"]
            print(f"DEBUG: Looking up entry by ID: {entry_id}")
            try:
                entry = Entry.objects.get(id=entry_id)
                print(f"DEBUG: Found entry by ID: {entry.title} by {entry.author.displayName}")
            except Entry.DoesNotExist:
                print(f"DEBUG: Entry with ID {entry_id} not found")
                raise NotFound(f"Entry with ID {entry_id} not found")
        elif "entry_fqid" in self.kwargs:
            entry_fqid = self.kwargs["entry_fqid"]
            print(f"DEBUG: Looking up entry by FQID: {entry_fqid}")
            try:
                # Try to find entry by URL first (for remote entries)
                entry = Entry.objects.get(url=entry_fqid)
                print(f"DEBUG: Found entry by FQID: {entry.title} by {entry.author.displayName}")
            except Entry.DoesNotExist:
                print(f"DEBUG: Entry with FQID {entry_fqid} not found")
                raise NotFound(f"Entry not found")
        else:
            entry_url = serializer.validated_data.get("entry")
            print(f"DEBUG: Looking up entry by URL: {entry_url}")
            if not entry_url:
                raise ValidationError({"entry": "Entry field is required"})
            try:
                entry = Entry.objects.get(url=entry_url)
                print(f"DEBUG: Found entry by URL: {entry.title} by {entry.author.displayName}")
            except Entry.DoesNotExist:
                print(f"DEBUG: Entry with URL {entry_url} not found")
                raise NotFound(f"Entry not found")

        # Ensure required fields are present
        content = serializer.validated_data.get("content")
        if not content:
            raise serializers.ValidationError({"content": "Content field is required"})
        
        # Make sure content_type is valid
        content_type = serializer.validated_data.get("content_type")
        if content_type not in [
            Entry.TEXT_PLAIN,
            Entry.TEXT_MARKDOWN,
        ]:
            serializer.validated_data["content_type"] = Entry.TEXT_PLAIN

        # Pass the author's URL (not the User object) since the FK uses to_field="url"
        # request.user IS the Author instance (Author extends AbstractUser)
        author_url = self.request.user.url
        print(f"DEBUG: Creating comment with author_url: {author_url}, entry_url: {entry.url}")
        comment = serializer.save(author_id=author_url, entry_id=entry.url)
        print(f"DEBUG: Comment created successfully: {comment.id}")
        print(f"DEBUG: Comment author: {comment.author.displayName}, Entry author: {comment.entry.author.displayName}")
        print(f"DEBUG: Entry author is_remote: {comment.entry.author.is_remote}")

        send_comment_to_remote_inbox(comment)


class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a specific comment
    PATCH: Update a comment
    DELETE: Delete a comment
    """

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = "pk"

    def get_object(self):
        """Override to handle different URL parameter names"""
        # Check for different possible parameter names
        if "pk" in self.kwargs:
            comment_id = self.kwargs["pk"]
        elif "comment_id" in self.kwargs:
            comment_id = self.kwargs["comment_id"]
        elif "comment_fqid" in self.kwargs:
            # For FQID-based lookups, extract the UUID
            comment_fqid = self.kwargs["comment_fqid"]
            if comment_fqid.startswith("http"):
                comment_id = (
                    comment_fqid.split("/")[-1]
                    if comment_fqid.split("/")[-1]
                    else comment_fqid.split("/")[-2]
                )
            else:
                comment_id = comment_fqid
        else:
            raise NotFound("No comment identifier provided")

        try:
            return Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            raise NotFound("Comment not found")

    def get_queryset(self):
        # Handle different URL patterns
        if "entry_id" in self.kwargs:
            return Comment.objects.filter(entry__id=self.kwargs["entry_id"])
        else:
            return Comment.objects.all()
