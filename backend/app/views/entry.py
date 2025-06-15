from rest_framework import viewsets, permissions , status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from app.models import Entry , Author
from app.serializers.entry import EntrySerializer
from app.permissions import IsAuthorSelfOrReadOnly

class EntryViewSet(viewsets.ModelViewSet):
    """
    Handles CRUD operations for entries nested under authors:
    /api/authors/{author_id}/entries/
    """

    serializer_class = EntrySerializer
    permission_classes = [IsAuthenticated, IsAuthorSelfOrReadOnly]


    def get_queryset(self):
        """
        Only allow access to entries by the specified author.
        Public entries for other authors are excluded unless admin.
        """
        author_id = self.kwargs["author_pk"]
        if self.request.user.is_staff:
            return Entry.objects.filter(author__id=author_id).order_by("-created_at")

    def perform_create(self, serializer):
        author_id = self.kwargs.get("author_pk")  # or "author_id" if using that
        user_author = getattr(self.request.user, "author", None)

        if str(user_author.id) != str(author_id):
            raise PermissionDenied("You can only create entries for yourself.")

        # ✅ Explicitly pass author into save
        serializer.save(author=user_author)



