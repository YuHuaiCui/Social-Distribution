from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import AllowAny
from app.serializers.image import UploadedImageSerializer
from app.models import Entry
from django.http import HttpResponse
import base64
import logging

logger = logging.getLogger(__name__)

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

    def get_permissions(self):
        """
        Override permissions based on HTTP method.
        GET requests can be public for viewing images.
        """
        if self.request.method == 'GET':
            return [AllowAny()]
        return super().get_permissions()

    def get(self, request, author_id=None, entry_id=None, entry_fqid=None):
        """
        GET [local, remote] get the public entry converted to binary as an image
        return 404 if not an image
        
        URL: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/image
        """
        try:
            # Handle both UUID and FQID patterns
            if entry_fqid:
                # Extract UUID from FQID
                if "/" in entry_fqid:
                    entry_id = entry_fqid.rstrip("/").split("/")[-1]
                else:
                    entry_id = entry_fqid
            
            # Find the entry
            if author_id and entry_id:
                entry = Entry.objects.get(id=entry_id, author__id=author_id)
            elif entry_id:
                entry = Entry.objects.get(id=entry_id)
            else:
                return Response(
                    {"error": "Entry ID is required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check visibility permissions
            if entry.visibility == Entry.FRIENDS_ONLY and not request.user.is_authenticated:
                return Response(
                    {"detail": "Authentication required for friends-only entries."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Check if entry is an image
            if entry.content_type not in [
                Entry.IMAGE_PNG, 
                Entry.IMAGE_JPEG,
                Entry.IMAGE_PNG_BASE64,
                Entry.IMAGE_JPEG_BASE64,
                Entry.APPLICATION_BASE64
            ]:
                return Response(
                    {"error": "Entry is not an image"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get image data
            image_data = None
            content_type = None
            
            # Handle base64 encoded images
            if entry.content_type in [Entry.IMAGE_PNG_BASE64, Entry.IMAGE_JPEG_BASE64, Entry.APPLICATION_BASE64]:
                # Content contains base64 data
                try:
                    # Remove data URL prefix if present
                    base64_data = entry.content
                    if base64_data.startswith('data:'):
                        # Extract base64 part from data URL
                        base64_data = base64_data.split(',', 1)[1]
                    
                    # Decode base64 to binary
                    image_data = base64.b64decode(base64_data)
                    
                    # Determine content type
                    if entry.content_type == Entry.IMAGE_PNG_BASE64:
                        content_type = 'image/png'
                    elif entry.content_type == Entry.IMAGE_JPEG_BASE64:
                        content_type = 'image/jpeg'
                    else:
                        # Try to detect from data URL or default to PNG
                        if entry.content.startswith('data:image/jpeg'):
                            content_type = 'image/jpeg'
                        else:
                            content_type = 'image/png'
                            
                except Exception as e:
                    logger.error(f"Error decoding base64 image: {e}")
                    return Response(
                        {"error": "Invalid image data"}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
            # Handle binary image data stored in image_data field
            elif entry.image_data:
                image_data = entry.image_data
                content_type = entry.content_type
            
            # Handle URL-based images (legacy)
            elif hasattr(entry, 'image') and entry.image:
                # This would be a URL to an image - we can't convert it to binary here
                return Response(
                    {"error": "Image is URL-based, not binary"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            if not image_data:
                return Response(
                    {"error": "No image data found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Return binary image response
            response = HttpResponse(image_data, content_type=content_type)
            response['Content-Disposition'] = f'inline; filename="entry_{entry.id}.{content_type.split("/")[1]}"'
            response['Cache-Control'] = 'public, max-age=3600'
            
            return response
            
        except Entry.DoesNotExist:
            return Response(
                {"error": "Entry not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error retrieving image: {e}")
            return Response(
                {"error": "Could not retrieve image"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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