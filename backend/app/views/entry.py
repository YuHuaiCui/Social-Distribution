from rest_framework import viewsets, permissions , status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from app.models import Entry , Author
from app.serializers.entry import EntrySerializer

class EntryViewSet(viewsets.ModelViewSet):
    """
    Handles CRUD operations for entries nested under authors:
    /api/authors/{author_id}/entries/
    """

    serializer_class = EntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Only allow access to entries by the specified author.
        Public entries for other authors are excluded unless admin.
        """
        author_id = self.kwargs.get("author_pk")
        if self.request.user.is_staff:
            return Entry.objects.filter(author__id=author_id).order_by("-created_at")

        return Entry.objects.filter(
            author__id=author_id,
            visibility=Entry.PUBLIC
        ).order_by("-created_at")

    def perform_create(self, serializer):
        """
        Override create to associate the entry with the URL's author.
        Only allow if the user is the same as the author in the URL.
        """
        author_id = self.kwargs.get("author_pk")

        try:
            author = Author.objects.get(pk=author_id)
        except Author.DoesNotExist:
            raise PermissionDenied("Author not found.")

        if self.request.user != author and not self.request.user.is_staff:
            raise PermissionDenied("You are not allowed to create entries for this author.")

        serializer = self.get_serializer(data=self.request.data, context={"author": author})
        serializer.is_valid(raise_exception=True)
        serializer.save()


