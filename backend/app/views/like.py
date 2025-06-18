from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404

from app.models import Like, Entry, Comment
from app.serializers.like import LikeSerializer


class EntryLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, entry_id):
        entry = get_object_or_404(Entry, id=entry_id)
        author = request.user

        if Like.objects.filter(author=author, entry=entry).exists():
            return Response({"detail": "Already liked."}, status=status.HTTP_200_OK)

        like = Like.objects.create(author=author, entry=entry)
        serializer = LikeSerializer(like)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def delete(self, request, entry_id):
        author = request.user
        entry = get_object_or_404(Entry, id=entry_id)

        like = Like.objects.filter(author=author, entry=entry).first()
        if like:
            like.delete()
            return Response({"detail": "Unliked."}, status=status.HTTP_200_OK)
        # If no like found, just return success anyway
        return Response({"detail": "Like not found, treated as success."}, status=status.HTTP_204_NO_CONTENT)


    def get(self, request, entry_id):
        entry = get_object_or_404(Entry, id=entry_id)
        like_count = Like.objects.filter(entry=entry).count()

        # Check if current user liked this entry
        liked_by_current_user = False
        
        if request.user.is_authenticated:
            liked_by_current_user = Like.objects.filter(author=request.user, entry=entry).exists()

        return Response({
            "like_count": like_count,
            "liked_by_current_user": liked_by_current_user
        })