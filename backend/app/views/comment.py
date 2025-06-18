from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import NotFound
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
            
        serializer.save(author=self.request.user, entry=entry)

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
