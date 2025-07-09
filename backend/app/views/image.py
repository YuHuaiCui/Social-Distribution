from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status, permissions
from app.serializers.image import UploadedImageSerializer

class ImageUploadView(APIView):
    """
    API endpoint for uploading images to the social distribution platform.
    
    This view handles multipart form data for image uploads, allowing authenticated
    users to upload images that can be embedded in posts or used as profile pictures.
    The uploaded images are associated with the authenticated user who uploaded them.
    
    Attributes:
        parser_classes: Accepts MultiPartParser and FormParser for handling file uploads
        permission_classes: Requires authentication to upload images
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        """
        Handle image upload via POST request.
        
        Processes the uploaded image file, validates it, and saves it to the server
        with the current authenticated user as the owner. Returns the serialized
        image data including the URL where the image can be accessed.
        
        Args:
            request: The HTTP request containing the image file in multipart form data
            format: Optional format suffix for content negotiation
            
        Returns:
            Response: 
                - 201 Created with serialized image data on success
                - 400 Bad Request with validation errors on failure
                
        Expected request format:
            - multipart/form-data with 'image' field containing the file
        """
        serializer = UploadedImageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Save the image with the current authenticated user as owner
            serializer.save(owner=request.user)
            # Re-serialize with context to generate proper absolute URLs
            serializer = UploadedImageSerializer(serializer.instance, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)