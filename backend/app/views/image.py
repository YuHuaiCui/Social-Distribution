from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status, permissions
from app.serializers.image import UploadedImageSerializer

class ImageUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        serializer = UploadedImageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Save with the current user as owner
            serializer.save(owner=request.user)
            # Re-serialize with context to get proper URLs
            serializer = UploadedImageSerializer(serializer.instance, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)