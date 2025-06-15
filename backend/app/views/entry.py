from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.db import models
from app.models import Entry, Author
from app.serializers.entry import EntrySerializer
from app.permissions import IsAuthorSelfOrReadOnly
import json
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class EntryViewSet(viewsets.ModelViewSet):
    """
    Handles CRUD operations for entries:
    /api/entries/
    """

    serializer_class = EntrySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        """
        Return entries based on user permissions.
        Authors can see all their entries, others see only public entries.
        """
        user = self.request.user
        
        if user.is_staff:
            # Staff can see all entries
            return Entry.objects.all().order_by("-created_at")
        
        # Get the user's author instance
        try:
            user_author = user.author if hasattr(user, 'author') else user
        except AttributeError:
            # User doesn't have an associated author
            return Entry.objects.filter(visibility='public').order_by("-created_at")
        
        # Return user's own entries + public entries from others
        return Entry.objects.filter(
            models.Q(author=user_author) |  # User's own entries
            models.Q(visibility='public')   # Public entries from others
        ).order_by("-created_at")

    def perform_create(self, serializer):
        """
        Create an entry for the authenticated user's author.
        """
        user = self.request.user
        
        # Get the user's author instance
        try:
            user_author = user.author if hasattr(user, 'author') else user
        except AttributeError:
            raise PermissionDenied("You must have an author profile to create entries.")
        
        # Save the entry with the user's author
        serializer.save(author=user_author)

    def get_permissions(self):
        """
        Instantiate and return the list of permissions that this view requires.
        """
        if self.action == 'create':
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsAuthorSelfOrReadOnly]
        else:  # list, retrieve
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]

    def create(self, request, *args, **kwargs):
        print(f"Request content type: {request.content_type}")
        print(f"Request POST data: {request.POST}")
        print(f"Request FILES: {request.FILES}")
        
        try:
            # Handle multipart form data (with image)
            if hasattr(request, 'FILES') and request.FILES:
                # Get form data
                entry_data = {
                    'title': request.POST.get('title', ''),
                    'content': request.POST.get('content', ''),
                    'content_type': request.POST.get('content_type', 'text'),
                    'visibility': request.POST.get('visibility', 'public'),
                }
                
                # Handle categories
                categories_str = request.POST.get('categories')
                if categories_str and categories_str not in ['undefined', 'null', '']:
                    try:
                        categories = json.loads(categories_str)
                        if isinstance(categories, list):
                            entry_data['categories'] = categories
                    except (json.JSONDecodeError, TypeError):
                        pass
                
                # Add image if present
                image = request.FILES.get('image')
                if image:
                    entry_data['image'] = image
                    
            else:
                # Handle JSON data (no image)
                entry_data = request.data.copy()
            
            print(f"Final entry_data: {entry_data}")
            
            # Use the serializer
            serializer = self.get_serializer(data=entry_data)
            if serializer.is_valid():
                entry = serializer.save(author=request.user)
                return Response(
                    self.get_serializer(entry).data, 
                    status=status.HTTP_201_CREATED
                )
            else:
                print(f"Serializer errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print(f"Exception in create: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Server error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )