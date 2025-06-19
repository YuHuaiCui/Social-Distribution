from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q

from app.models import Author, Entry, Follow
from app.serializers.author import AuthorSerializer, AuthorListSerializer
from app.serializers.entry import EntrySerializer
from app.serializers.follow import FollowSerializer

from django.http import HttpResponse
import base64
from django.conf import settings


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
        if view.action == "create":
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

        # Search by username, display name, github username, or email
        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(display_name__icontains=search)
                | Q(github_username__icontains=search)
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
        response_serializer = AuthorListSerializer(author, context={"request": request})
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
                "author": AuthorListSerializer(
                    author, context={"request": request}
                ).data,
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
                "author": AuthorListSerializer(
                    author, context={"request": request}
                ).data,
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
                "author": AuthorListSerializer(
                    author, context={"request": request}
                ).data,
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

    @action(detail=True, methods=["get"])
    def followers(self, request, pk=None):
        """Get all followers of this author (accepted follow requests)"""
        author = self.get_object()

        # Get all accepted follow relationships where this author is followed
        follows = Follow.objects.filter(followed=author, status=Follow.ACCEPTED)
        followers = [follow.follower for follow in follows]

        serializer = AuthorListSerializer(
            followers, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def following(self, request, pk=None):
        """Get all users this author is following (accepted follow requests)"""
        author = self.get_object()

        # Get all accepted follow relationships where this author is the follower
        follows = Follow.objects.filter(follower=author, status=Follow.ACCEPTED)
        following = [follow.followed for follow in follows]

        serializer = AuthorListSerializer(
            following, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def friends(self, request, pk=None):
        """Get all friends of this author (mutual follows)"""
        author = self.get_object()

        # Get friends using the model method
        friends = author.get_friends()

        serializer = AuthorListSerializer(
            friends, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post", "delete"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def follow(self, request, pk=None):
        """Follow or unfollow an author"""
        author_to_follow = self.get_object()
        current_user = request.user

        if request.method == "POST":
            # Check if trying to follow self
            if current_user.url == author_to_follow.url:
                return Response(
                    {"error": "Cannot follow yourself"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if follow request already exists
            existing_follow = Follow.objects.filter(
                follower=current_user, followed=author_to_follow
            ).first()

            if existing_follow:
                # If already accepted, return error
                if existing_follow.status == Follow.ACCEPTED:
                    return Response(
                        {"error": "Already following this user"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # If pending, return error
                elif existing_follow.status == Follow.PENDING:
                    return Response(
                        {"error": "Follow request already pending"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # If rejected, delete the old one and create a new one
                elif existing_follow.status == Follow.REJECTED:
                    existing_follow.delete()

            # Create follow request
            follow = Follow.objects.create(
                follower=current_user, followed=author_to_follow, status=Follow.PENDING
            )

            # Create inbox item for the followed user
            from app.models.inbox import Inbox

            Inbox.objects.create(
                recipient=follow.followed,
                item_type=Inbox.FOLLOW,
                follow=follow,
                raw_data={
                    "type": "Follow",
                    "actor": {
                        "id": follow.follower.url,
                        "display_name": follow.follower.display_name,
                        "username": follow.follower.username,
                        "profile_image": follow.follower.profile_image if follow.follower.profile_image else None,
                    },
                    "object": follow.followed.url,
                    "status": follow.status,
                },
            )

            serializer = FollowSerializer(follow)
            return Response(
                {"success": True, "follow": serializer.data},
                status=status.HTTP_201_CREATED,
            )

        elif request.method == "DELETE":
            # Find and delete the follow relationship
            follow = Follow.objects.filter(
                follower=current_user, followed=author_to_follow
            ).first()

            if not follow:
                return Response(
                    {"error": "Follow relationship does not exist"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            follow.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"], url_path="entries")
    def entries(self, request, pk=None):
        """GET = List entries visible to current user, POST = Create a new entry (must be owner)"""
        author = self.get_object()

        if request.method == "GET":
            # Admin can see all posts regardless of visibility
            if request.user.is_staff:
                entries = Entry.objects.filter(author=author).exclude(
                    visibility=Entry.DELETED
                )
            elif request.user.is_authenticated and str(request.user.id) == str(author.id):
                # Viewing your own profile: show all entries except deleted
                entries = Entry.objects.filter(author=author).exclude(
                    visibility=Entry.DELETED
                )
            else:
                # Viewing someone else's profile: use proper visibility logic
                # Get entries by this author that are visible to the current user
                if hasattr(request.user, "author"):
                    user_author = request.user.author
                else:
                    user_author = request.user

                visible_entries = Entry.objects.visible_to_author(user_author)
                entries = visible_entries.filter(author=author)

            serializer = EntrySerializer(entries, many=True)
            return Response(serializer.data)

        if request.method == "POST":
            print(
                "USER DEBUG:",
                request.user,
                request.user.id,
                request.user.is_authenticated,
                request.user.is_staff,
            )

            # Ensure only the author can post their own entry
            if not request.user.is_authenticated:
                return Response(
                    {"detail": "Not authorized to create entry for this author."},
                    status=403,
                )

            author = request.user  # Override to ensure no spoofing
            data = request.data.copy()
            data["author"] = str(author.id)  # Set author ID explicitly

            # Optional: auto-set source/origin if needed
            data["source"] = data.get(
                "source", f"{settings.SITE_URL}/api/authors/{author.id}/entries/"
            )
            data["origin"] = data.get("origin", data["source"])

            serializer = EntrySerializer(data=data)
            if serializer.is_valid():
                entry = serializer.save(author=author)
                return Response(EntrySerializer(entry).data, status=201)
            return Response(serializer.errors, status=400)

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        """
        Get or update the current user's profile
        This endpoint is more permissive than the regular update endpoint
        """
        try:
            author = Author.objects.get(id=request.user.id)

            if request.method == "GET":
                serializer = AuthorSerializer(author)
                return Response(serializer.data)

            elif request.method in ["PATCH", "PUT"]:
                # Check if there's an uploaded file
                if "profile_image_file" in request.FILES:
                    # Create an image entry for the profile image
                    image_file = request.FILES["profile_image_file"]
                    content_type = f"image/{image_file.name.split('.')[-1].lower()}"

                    # Create entry
                    from app.models import Entry

                    entry = Entry.objects.create(
                        author=author,
                        title="Profile Image",
                        content=base64.b64encode(image_file.read()).decode("utf-8"),
                        content_type=content_type,
                        visibility=Entry.UNLISTED,  # Make it unlisted
                    )

                    # Update profile_image to point to the entry's image URL
                    request.data["profile_image"] = (
                        f"{settings.SITE_URL}/api/authors/{author.id}/entries/{entry.id}/image"
                    )

                # Update the author profile
                serializer = AuthorSerializer(author, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                else:
                    return Response(serializer.errors, status=400)

        except Author.DoesNotExist:
            return Response({"message": "Author profile not found"}, status=404)

    def update(self, request, *args, **kwargs):
        """Handle PUT/PATCH requests with debugging"""

        # Check permission explicitly
        instance = self.get_object()

        # Call parent class's update method
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests for author updates"""
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def perform_update(self, serializer):
        """Perform the update"""
        serializer.save()

    @action(detail=True, methods=["get"], url_path="entries/(?P<entry_id>[^/.]+)/image")
    def entry_image(self, request, pk=None, entry_id=None):
        """
        Return the image content for a specific entry
        This is used for profile images stored as entries
        """
        try:
            # Get the author and entry
            author = self.get_object()
            entry = Entry.objects.get(id=entry_id, author=author)

            # Check that this is an image entry
            if not entry.content_type.startswith("image/"):
                return Response({"detail": "Not an image entry"}, status=400)

            # Get the content and decode from base64
            image_data = base64.b64decode(entry.content)

            # Return as raw image response
            response = HttpResponse(content=image_data, content_type=entry.content_type)
            return response

        except Entry.DoesNotExist:
            return Response({"detail": "Image not found"}, status=404)
    
    @action(detail=True, methods=["post"], url_path="inbox")
    def post_to_inbox(self, request, pk=None):
        """
        Post an item to an author's inbox
        POST /api/authors/{id}/inbox/
        
        Expected data:
        {
            "content_type": "entry" | "comment" | "like" | "follow" | "report",
            "content_id": "id of the content",
            "content_data": { ... additional data ... }
        }
        """
        from app.models import Inbox
        from app.serializers.inbox import InboxItemSerializer
        
        try:
            # Get the recipient author
            recipient = self.get_object()
            
            # Get the content type and data
            content_type = request.data.get('content_type')
            content_id = request.data.get('content_id')
            content_data = request.data.get('content_data', {})
            
            # Validate content type
            valid_types = ['entry', 'comment', 'like', 'follow', 'report']
            if content_type not in valid_types:
                return Response(
                    {"error": f"Invalid content_type. Must be one of: {', '.join(valid_types)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # For reports, we just store the data in raw_data
            if content_type == 'report':
                inbox_item = Inbox.objects.create(
                    recipient=recipient,
                    item_type='report',
                    raw_data={
                        'content_type': 'report',
                        'content_id': content_id,
                        **content_data
                    }
                )
                serializer = InboxItemSerializer(inbox_item)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            # For other types, we'd need to handle them appropriately
            # For now, just create with raw_data
            inbox_item = Inbox.objects.create(
                recipient=recipient,
                item_type=content_type,
                raw_data={
                    'content_type': content_type,
                    'content_id': content_id,
                    **content_data
                }
            )
            
            serializer = InboxItemSerializer(inbox_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
