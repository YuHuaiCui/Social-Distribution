from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from app.models import Like
from serializers.like import LikeSerializer

class LikeViewSet(viewsets.ModelViewSet):
    queryset = Like.objects.all()
    serializer_class = LikeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter to current user's likes, optionally by entry or comment."""
        qs = super().get_queryset().filter(author=self.request.user.author)
        entry = self.request.query_params.get("entry")
        comment = self.request.query_params.get("comment")
        if entry:
            qs = qs.filter(entry=entry)
        if comment:
            qs = qs.filter(comment=comment)
        return qs

    def perform_create(self, serializer):
        author = self.request.user.author
        entry = self.request.data.get("entry")
        comment = self.request.data.get("comment")

        existing = Like.objects.filter(author=author, entry=entry, comment=comment).first()
        if existing:
            raise serializers.ValidationError("Already liked.")

        serializer.save(author=author)

    @action(detail=False, methods=["get"])
    def count(self, request):
        """GET /api/likes/count/?entry=... or ?comment=..."""
        entry = request.query_params.get("entry")
        comment = request.query_params.get("comment")

        if not entry and not comment:
            return Response({"detail": "Specify 'entry' or 'comment' in query."}, status=400)

        count = Like.objects.filter(entry=entry) if entry else Like.objects.filter(comment=comment)
        return Response({"like_count": count.count()})