from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError
from uuid import UUID
from app.models.comment import Comment
from app.models.entry import Entry
from app.serializers.comment import CommentSerializer

import requests
from requests.auth import HTTPBasicAuth
from app.models import Node
from app.serializers.comment import CommentSerializer

def send_comment_to_remote_inbox(comment):
    """Send comment to remote inbox using centralized federation service."""
    if not comment.entry or not comment.entry.author or comment.entry.author.is_local:
        return  # Skip local targets

    try:
        from app.utils.federation import FederationService
        success = FederationService.send_comment(comment)
        
        if success:
            print(f"[Federation] Comment sent successfully to {comment.entry.author.username}")
        else:
            print(f"[Federation] Failed to send comment to {comment.entry.author.username}")
    except Exception as e:
        print(f"[Federation] Error sending comment: {e}")




class CommentListCreateView(generics.ListCreateAPIView):
    """
    GET: List comments for an entry
    POST: Create a comment on an entry
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def dispatch(self, request, *args, **kwargs):
        """Route requests based on available parameters - support both entry_id and entry_fqid."""
        if 'entry_fqid' in kwargs:
            # Extract entry ID from FQID for FQID-based endpoints
            entry_fqid = kwargs['entry_fqid']
            try:
                # Try to extract UUID from the FQID
                if entry_fqid.startswith('http'):
                    # Full URL - extract last part
                    entry_id = entry_fqid.split('/')[-1] if entry_fqid.split('/')[-1] else entry_fqid.split('/')[-2]
                else:
                    # Assume it's already a UUID
                    entry_id = entry_fqid
                
                # Validate UUID format
                UUID(entry_id)
                kwargs['entry_id'] = entry_id
                # Remove the entry_fqid parameter since view methods expect entry_id
                del kwargs['entry_fqid']
            except (ValueError, IndexError):
                return Response(
                    {"detail": "Invalid entry FQID format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return super().dispatch(request, *args, **kwargs)

    def get_queryset(self):
        # Handle different URL patterns
        if "entry_id" in self.kwargs:
            entry_id = self.kwargs["entry_id"]
            return Comment.objects.filter(entry__id=entry_id)
        elif "author_id" in self.kwargs:
            # For /api/authors/{author_id}/commented/ endpoint
            author_id = self.kwargs["author_id"]
            return Comment.objects.filter(author__id=author_id)
        elif "author_fqid" in self.kwargs:
            # For /api/authors/{author_fqid}/commented/ endpoint
            from urllib.parse import unquote
            from app.models import Author
            author_fqid = unquote(self.kwargs["author_fqid"])
            try:
                author = Author.objects.get(url=author_fqid)
                return Comment.objects.filter(author=author)
            except Author.DoesNotExist:
                return Comment.objects.none()
        else:
            # Return all comments if no specific filter
            return Comment.objects.all()

    def perform_create(self, serializer):
        # Handle different URL patterns
        if "entry_id" in self.kwargs:
            entry_id = self.kwargs["entry_id"]
            try:
                entry = Entry.objects.get(id=entry_id)
            except Entry.DoesNotExist:
                raise NotFound(f"Entry with ID {entry_id} not found")
        else:
            
            entry_url = serializer.validated_data.get('entry')
            if not entry_url:
                raise ValidationError({"entry": "Entry field is required"})
            try:
                entry = Entry.objects.get(url=entry_url)
            except Entry.DoesNotExist:
                raise NotFound(f"Entry not found")
            
        # Ensure required fields are present
        if not serializer.validated_data.get('content'):
            raise serializers.ValidationError({"content": "Content field is required"})
              # Make sure content_type is valid
        if serializer.validated_data.get('content_type') not in [Entry.TEXT_PLAIN, Entry.TEXT_MARKDOWN]:
            serializer.validated_data['content_type'] = Entry.TEXT_PLAIN
            
        # Pass the author's URL (not the User object) since the FK uses to_field="url"
        # request.user IS the Author instance (Author extends AbstractUser)
        author_url = self.request.user.url
        comment =serializer.save(author_id=author_url, entry_id=entry.url)

        send_comment_to_remote_inbox(comment)

class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a specific comment
    PATCH: Update a comment
    DELETE: Delete a comment
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'pk'

    def get_object(self):
        """Override to handle different URL parameter names"""
        # Check for different possible parameter names
        if 'pk' in self.kwargs:
            comment_id = self.kwargs['pk']
        elif 'comment_id' in self.kwargs:
            comment_id = self.kwargs['comment_id']
        elif 'comment_fqid' in self.kwargs:
            # For FQID-based lookups, extract the UUID
            comment_fqid = self.kwargs['comment_fqid']
            if comment_fqid.startswith('http'):
                comment_id = comment_fqid.split('/')[-1] if comment_fqid.split('/')[-1] else comment_fqid.split('/')[-2]
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
