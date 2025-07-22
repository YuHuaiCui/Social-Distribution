from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from uuid import UUID
from app.models.comment import Comment
from app.models.entry import Entry
from app.serializers.comment import CommentSerializer


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
        entry_id = self.kwargs["entry_id"]
        return Comment.objects.filter(entry__id=entry_id)

    def perform_create(self, serializer):
        entry_id = self.kwargs["entry_id"]
        try:
            entry = Entry.objects.get(id=entry_id)
        except Entry.DoesNotExist:
            raise NotFound(f"Entry with ID {entry_id} not found")
            
        # Ensure required fields are present
        if not serializer.validated_data.get('content'):
            raise serializers.ValidationError({"content": "Content field is required"})
              # Make sure content_type is valid
        if serializer.validated_data.get('content_type') not in [Entry.TEXT_PLAIN, Entry.TEXT_MARKDOWN]:
            serializer.validated_data['content_type'] = Entry.TEXT_PLAIN
            
        # Pass the author's URL (not the User object) since the FK uses to_field="url"
        # request.user IS the Author instance (Author extends AbstractUser)
        author_url = self.request.user.url
        serializer.save(author_id=author_url, entry_id=entry.url)

class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a specific comment
    PATCH: Update a comment
    DELETE: Delete a comment
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Comment.objects.filter(entry__id=self.kwargs["entry_id"])
