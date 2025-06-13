from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q

from app.models import Author,Entry
from app.serializers.author import AuthorSerializer, AuthorListSerializer
from app.serializers.entry import EntrySerializer


class IsAdminOrOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission that allows:
    - Read permissions for authenticated users
    - Admin users can create/edit any author
    - Users can edit their own profile
    """

    def has_permission(self, request, view):
        # Read permissions are allowed for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # For create operations, only admin users
        if view.action == 'create':
            return request.user.is_authenticated and request.user.is_staff
            
        # For other write operations, we'll check object-level permissions
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Admin users can edit any author
        if request.user.is_staff:
            return True
            
        # Use UUIDs for comparison or convert to strings if needed
        return str(obj.id) == str(request.user.id)


class AuthorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Author users.

    - GET /api/authors/ - List all authors (authenticated users)
    - POST /api/authors/ - Create new author (admin only)
    - GET /api/authors/{id}/ - Get specific author (authenticated users)
    - PUT/PATCH /api/authors/{id}/ - Update author (admin only)
    - DELETE /api/authors/{id}/ - Delete author (admin only)
    """

    queryset = Author.objects.all().order_by("-created_at")
    permission_classes = [IsAdminOrOwnerOrReadOnly]

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == "list":
            return AuthorListSerializer
        return AuthorSerializer

    def get_queryset(self):
        """Filter queryset based on query parameters"""
        queryset = self.queryset

        # Filter by approval status
        is_approved = self.request.query_params.get("is_approved", None)
        if is_approved is not None:
            queryset = queryset.filter(is_approved=is_approved.lower() == "true")

        # Filter by active status
        is_active = self.request.query_params.get("is_active", None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        # Filter local vs remote authors
        author_type = self.request.query_params.get("type", None)
        if author_type == "local":
            queryset = queryset.filter(node__isnull=True)
        elif author_type == "remote":
            queryset = queryset.filter(node__isnull=False)

        # Search by username or display name
        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(display_name__icontains=search)
                | Q(email__icontains=search)
            )

        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new author (admin only)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Perform the creation
        author = serializer.save()

        # Return the created author data
        response_serializer = AuthorListSerializer(author)
        return Response(
            {
                "message": "Author created successfully",
                "author": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        """Approve an author (admin only)"""
        author = self.get_object()
        author.is_approved = True
        author.save()

        return Response(
            {
                "message": f"Author {author.username} has been approved",
                "author": AuthorListSerializer(author).data,
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def deactivate(self, request, pk=None):
        """Deactivate an author (admin only)"""
        author = self.get_object()
        author.is_active = False
        author.save()

        return Response(
            {
                "message": f"Author {author.username} has been deactivated",
                "author": AuthorListSerializer(author).data,
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def activate(self, request, pk=None):
        """Activate an author (admin only)"""
        author = self.get_object()
        author.is_active = True
        author.save()

        return Response(
            {
                "message": f"Author {author.username} has been activated",
                "author": AuthorListSerializer(author).data,
            }
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get author statistics"""
        total_authors = Author.objects.count()
        approved_authors = Author.objects.filter(is_approved=True).count()
        active_authors = Author.objects.filter(is_active=True).count()
        local_authors = Author.objects.filter(node__isnull=True).count()
        remote_authors = Author.objects.filter(node__isnull=False).count()

        return Response(
            {
                "total_authors": total_authors,
                "approved_authors": approved_authors,
                "active_authors": active_authors,
                "local_authors": local_authors,
                "remote_authors": remote_authors,
            }
        )
    

    @action(detail=True, methods=["get"], url_path="entries")
    def public_entries(self, request, pk=None):
        """List all public entries by the author"""
        author = self.get_object()
        entries = Entry.objects.filter(author=author, visibility=Entry.PUBLIC).order_by("-created_at")
        serializer = EntrySerializer(entries, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        """
        Get or update the current user's profile
        This endpoint is more permissive than the regular update endpoint
        """
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=401)
            
        try:
            author = Author.objects.get(id=request.user.id)
        except Author.DoesNotExist:
            return Response({"detail": "Author profile not found"}, status=404)
            
        if request.method == "GET":
            serializer = AuthorSerializer(author)
            return Response(serializer.data)
            
        elif request.method == "PATCH":
            # Update only allowed fields for regular users
            data = request.data.copy()
            serializer = AuthorSerializer(author, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
    
    def update(self, request, *args, **kwargs):
        """Handle PUT/PATCH requests with debugging"""
        
        # Check permission explicitly
        instance = self.get_object()
        
        # Call parent class's update method
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests for author updates"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def perform_update(self, serializer):
        """Perform the update"""
        serializer.save()