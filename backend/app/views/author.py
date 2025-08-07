from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.http import Http404
from urllib.parse import unquote

from app.models import Author, Entry, Follow, Like, Comment, Inbox
from app.utils.url_utils import parse_uuid_from_url
from app.serializers.author import AuthorSerializer, AuthorListSerializer
from app.serializers.entry import EntrySerializer
from app.serializers.follow import FollowSerializer
from app.serializers.inbox import ActivitySerializer

from django.http import HttpResponse
import base64
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
import logging

logger = logging.getLogger(__name__)


class IsAdminOrOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission that allows:
    - Read permissions for authenticated users
    - Admin users can create/edit any author
    - Users can edit their own profile
    """

    def has_permission(self, request, view):
        print(f"DEBUG 403: has_permission check for user {request.user} (authenticated: {request.user.is_authenticated})")
        print(f"DEBUG 403: Method: {request.method}, Action: {getattr(view, 'action', 'unknown')}")
        print(f"DEBUG 403: Safe methods: {permissions.SAFE_METHODS}")
        print(f"DEBUG 403: User is_staff: {getattr(request.user, 'is_staff', False)}")
        
        # Debug authentication header
        from app.views.auth import parse_basic_auth
        auth_username, auth_password = parse_basic_auth(request)
        print(f"DEBUG 403: Decoded auth header - username: {auth_username}, password: {'*' * len(auth_password) if auth_password else None}")
        
        # Debug request body
        try:
            print(f"DEBUG 403: Request body: {request.data if hasattr(request, 'data') else 'No data attribute'}")
        except Exception as e:
            print(f"DEBUG 403: Error reading request body: {str(e)}")
        
        # Read permissions are allowed for authenticated users
        if request.method in permissions.SAFE_METHODS:
            has_perm = request.user.is_authenticated
            print(f"DEBUG 403: Safe method permission result: {has_perm}")
            if not has_perm:
                print(f"DEBUG 403: DENIED - User not authenticated for safe method")
            return has_perm

        # For create operations, only admin users
        if view.action == "create":
            has_perm = request.user.is_authenticated and request.user.is_staff
            print(f"DEBUG 403: Create permission result: {has_perm}")
            if not has_perm:
                print(f"DEBUG 403: DENIED - User not authenticated or not staff for create")
            return has_perm

        # For other write operations, we'll check object-level permissions
        has_perm = request.user.is_authenticated
        print(f"DEBUG 403: Write operation permission result: {has_perm}")
        if not has_perm:
            print(f"DEBUG 403: DENIED - User not authenticated for write operation")
        return has_perm

    def has_object_permission(self, request, view, obj):
        print(f"DEBUG 403: has_object_permission check for user {request.user} on object {obj}")
        print(f"DEBUG 403: Method: {request.method}, Object ID: {obj.id}, User ID: {getattr(request.user, 'id', None)}")
        
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            print(f"DEBUG 403: Safe method object permission: True")
            return True

        # Admin users can edit any author
        if request.user.is_staff:
            print(f"DEBUG 403: Admin user object permission: True")
            return True

        # Use UUIDs for comparison or convert to strings if needed
        has_perm = str(obj.id) == str(request.user.id)
        print(f"DEBUG 403: Owner check - obj.id: {obj.id}, user.id: {request.user.id}, result: {has_perm}")
        if not has_perm:
            print(f"DEBUG 403: DENIED - User is not owner and not admin")
        return has_perm


@method_decorator(csrf_exempt, name='dispatch')
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

    def get_object(self):
        """
        Override get_object to handle both UUID and FQID (full URL) lookups.
        This allows the same endpoints to work for both local and remote authors.
        """
        pk = self.kwargs.get('pk') or self.kwargs.get('author_fqid')
        if not pk:
            return super().get_object()
        
        # If it looks like a URL, try FQID lookup
        if pk.startswith('http://') or pk.startswith('https://') or '/' in pk:
            from urllib.parse import unquote
            decoded_pk = unquote(pk)
            
            try:
                # Try to find by URL first
                return Author.objects.get(url=decoded_pk)
            except Author.DoesNotExist:
                # Try to find by ID if it contains a UUID
                import re
                uuid_pattern = r'[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
                uuid_match = re.search(uuid_pattern, decoded_pk, re.IGNORECASE)
                if uuid_match:
                    uuid_str = uuid_match.group()
                    try:
                        return Author.objects.get(id=uuid_str)
                    except Author.DoesNotExist:
                        pass
                
                # If still not found, this is likely a remote author we don't have locally
                from django.http import Http404
                raise Http404(f"Author with identifier '{decoded_pk}' not found")
        
        # Otherwise, try UUID lookup (default behavior)
        return super().get_object()

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
        # IMPORTANT: Only apply is_active filter if explicitly requested
        # Remote authors have is_active=False but should still be searchable
        is_active = self.request.query_params.get("is_active", None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        # If is_active is not specified, include both active and inactive authors
        # This ensures remote authors (is_active=False) are included in search results

        # Filter local vs remote authors
        author_type = self.request.query_params.get("type", None)
        if author_type == "local":
            queryset = queryset.filter(node__isnull=True)
        elif author_type == "remote":
            queryset = queryset.filter(node__isnull=False)
        # If no type filter is specified, include both local and remote authors
        # Remote authors are already in the database from inbox processing

        # Search by username, display name, or github username
        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(displayName__icontains=search)
                | Q(github_username__icontains=search)
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

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def promote_to_admin(self, request, pk=None):
        """Promote an author to admin (admin only)"""
        # Check if current user is admin
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"error": "Only admins can promote other users"},
                status=status.HTTP_403_FORBIDDEN,
            )

        author = self.get_object()

        # Don't allow self-promotion
        if author.id == request.user.id:
            return Response(
                {"error": "Cannot promote yourself"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already admin
        if author.is_staff:
            return Response(
                {"error": "User is already an admin"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Promote to admin
        author.is_staff = True
        author.is_approved = True  # Also approve them
        author.is_active = True  # Also activate them
        author.save()

        return Response(
            {
                "message": f"Author {author.username} has been promoted to admin",
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


    @action(detail=True, methods=["get"], url_path="following")
    def following(self, request, pk=None, author_fqid=None):
        """Get all users this author is following (accepted follow requests)"""
        author = self.get_object()

        # Get all accepted follow relationships where this author is the follower
        follows = Follow.objects.filter(follower=author, status=Follow.ACCEPTED)
        following = [follow.followed for follow in follows]

        serializer = AuthorSerializer(
            following, many=True, context={"request": request}
        )
        return Response({"type": "following", "following": serializer.data})

    @action(detail=True, methods=["get"])
    def friends(self, request, pk=None):
        """Get all friends of this author (mutual follows)"""
        author = self.get_object()

        # Get friends using the model method
        friends = author.get_friends()

        serializer = AuthorListSerializer(
            friends, many=True, context={"request": request}
        )
        return Response({"type": "friends", "friends": serializer.data})

    @action(
        detail=True,
        methods=["post", "delete"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def follow(self, request, pk=None, author_fqid=None):
        """Follow or unfollow an author"""
        try:
            # Try to get the author normally
            author_to_follow = self.get_object()
        except Http404:
            # If author not found locally, check if this is a remote author we need to create
            # The pk might be a UUID or a full URL for remote authors
            from app.models import Node
            import requests
            from requests.auth import HTTPBasicAuth

            # Check if pk looks like a UUID
            try:
                import uuid

                uuid.UUID(str(pk))
                # It's a UUID, but author doesn't exist locally
                # This might be a remote author from explore page
                # Check if we have any context about which node this author is from

                # Get the referrer to see if user came from explore page
                referrer = request.headers.get("Referer", "")

                # For now, we'll need to handle this differently
                # The frontend should pass node information when following remote authors
                return Response(
                    {
                        "error": "Remote author not found locally. Please try again from the explore page."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )
            except ValueError:
                # Not a valid UUID
                return Response(
                    {"error": "Invalid author ID format"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        current_user = request.user

        if request.method == "POST":
            # Check if trying to follow self
            if str(current_user.id) == str(author_to_follow.id):
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
                # If requesting, return error
                elif existing_follow.status == Follow.REQUESTING:
                    return Response(
                        {"error": "Follow request already requesting"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # If rejected, delete the old one and create a new one
                elif existing_follow.status == Follow.REJECTED:
                    existing_follow.delete()

            # Create follow request with appropriate status
            if author_to_follow.is_remote and author_to_follow.node:
                # For remote authors, create with ACCEPTED status and send federation request
                follow = Follow.objects.create(
                    follower=current_user,
                    followed=author_to_follow,
                    status=Follow.ACCEPTED,
                )
                
                # Send follow request to remote author's inbox
                self._send_follow_request_to_remote(current_user, author_to_follow)
                print(f"Following remote author {author_to_follow.displayName} - follow request sent to remote inbox")
            else:
                # For local authors, create with REQUESTING status (needs approval)
                follow = Follow.objects.create(
                    follower=current_user,
                    followed=author_to_follow,
                    status=Follow.REQUESTING,
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
        """
        GET [local, remote]: Get the recent entries from author AUTHOR_SERIAL (paginated)
        POST [local]: Create a new entry but generate a new ID

        Authentication requirements for GET:
        - Not authenticated: only public entries
        - Authenticated locally as author: all entries
        - Authenticated locally as follower of author: public + unlisted entries
        - Authenticated locally as friend of author: all entries
        - Authenticated as remote node: Should not happen (remote nodes get entries via inbox push)

        Authentication requirements for POST:
        - Authenticated locally as author
        """
        author = self.get_object()

        if request.method == "GET":
            # Staff can see all posts regardless of visibility
            if request.user.is_staff:
                entries = Entry.objects.filter(author=author).exclude(
                    visibility=Entry.DELETED
                )
            elif request.user.is_authenticated and str(request.user.id) == str(
                author.id
            ):
                # Viewing your own profile: show all entries except deleted
                entries = Entry.objects.filter(author=author).exclude(
                    visibility=Entry.DELETED
                )
            else:
                # Viewing someone else's profile: apply visibility rules
                if hasattr(request.user, "author"):
                    user_author = request.user.author
                else:
                    user_author = request.user

                visible_entries = Entry.objects.visible_to_author(user_author)
                entries = visible_entries.filter(author=author)

            serializer = EntrySerializer(
                entries, many=True, context={"request": request}
            )
            return Response(
                {
                    "type": "entries",
                    "page_number": 1,
                    "size": len(serializer.data),
                    "count": len(serializer.data),
                    "src": serializer.data,
                }
            )

        if request.method == "POST":
            # Ensure only the author can post their own entry (must be authenticated locally as author)
            if not request.user.is_authenticated:
                return Response(
                    {"detail": "Authentication required to create entries."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Ensure the user is creating an entry for themselves (prevent spoofing)
            if str(request.user.id) != str(author.id):
                return Response(
                    {"detail": "You can only create entries for yourself."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Use the authenticated user as the author
            data = request.data.copy()
            data["author"] = str(request.user.id)

            # Auto-set source/origin URLs if not provided
            data["source"] = data.get(
                "source", f"{settings.SITE_URL}/api/authors/{request.user.id}/entries/"
            )
            data["origin"] = data.get("origin", data["source"])

            serializer = EntrySerializer(data=data, context={"request": request})
            if serializer.is_valid():
                entry = serializer.save(author=request.user)
                return Response(
                    EntrySerializer(entry, context={"request": request}).data,
                    status=status.HTTP_201_CREATED,
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        """
        Get or update the current user's profile.

        This endpoint is more permissive than the regular update endpoint
        and handles profile image uploads via multipart/form-data.
        """
        try:
            author = Author.objects.get(id=request.user.id)

            if request.method == "GET":
                serializer = AuthorSerializer(author)
                return Response(serializer.data)

            elif request.method in ["PATCH", "PUT"]:
                # Prepare clean data for serializer (excluding file data)
                update_data = {}

                # Copy non-file fields from request data
                for key, value in request.data.items():
                    if key not in ["profile_image_file"]:
                        update_data[key] = value

                # Handle profile image upload if present (support both camelCase and snake_case)
                image_file = None
                if "profileImage" in request.FILES:
                    image_file = request.FILES["profileImage"]
                elif "profile_image_file" in request.FILES:
                    image_file = request.FILES["profile_image_file"]

                if image_file:

                    # Convert uploaded image to base64 data URL (consistent with post images)
                    import base64

                    # Determine content type from file extension
                    content_type = "image/jpeg"  # default
                    if image_file.name.lower().endswith(".png"):
                        content_type = "image/png"
                    elif image_file.name.lower().endswith((".jpg", ".jpeg")):
                        content_type = "image/jpeg"

                    # Read image data and convert to base64 data URL
                    image_data = image_file.read()
                    image_base64 = base64.b64encode(image_data).decode("utf-8")
                    profile_image_data_url = (
                        f"data:{content_type};base64,{image_base64}"
                    )

                    update_data["profileImage"] = profile_image_data_url

                # Update the author profile
                serializer = AuthorSerializer(author, data=update_data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                else:
                    return Response(serializer.errors, status=400)

        except Author.DoesNotExist:
            return Response({"message": "Author profile not found"}, status=404)

    # bah
    def update(self, request, *args, **kwargs):
        """Handle PUT/PATCH requests for author updates"""
        # Get the object to update and check permissions
        instance = self.get_object()

        # Call parent class's update method
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests for author updates"""
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def perform_update(self, serializer):
        """Perform the actual update operation"""
        serializer.save()

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAdminUser])
    def pending(self, request):
        """List unapproved users (admin only)"""
        unapproved = Author.objects.filter(is_approved=False, is_staff=False).order_by(
            "-created_at"
        )
        serializer = AuthorListSerializer(
            unapproved, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="inbox")
    def post_to_inbox(self, request, pk=None):
        """
        GET [local]: retrieve the author's inbox contents
        POST [remote]: send an activity to the author's inbox

        GET: Returns all activities (entries, follows, likes, comments) in the author's inbox.
             Only the author themselves can access their own inbox.

        POST: The inbox receives activities from remote nodes:
        - if the type is "entry" then add that entry to AUTHOR_SERIAL's inbox
        - if the type is "follow" then add that follow to AUTHOR_SERIAL's inbox to approve later
        - if the type is "Like" then add that like to AUTHOR_SERIAL's inbox
        - if the type is "comment" then add that comment to AUTHOR_SERIAL's inbox

        URL: /api/authors/{AUTHOR_SERIAL}/inbox
        """
        if request.method == "GET":
            return self._get_inbox(request, pk)
        elif request.method == "POST":
            return self._post_to_inbox(request, pk)

    def _get_inbox(self, request, pk=None):
        """Handle GET requests to retrieve inbox contents."""
        print(f"DEBUG: _get_inbox called for author pk={pk}")
        try:
            author = self.get_object()
            print(f"DEBUG: Retrieved author {author.username} (id={author.id})")

            # Only allow authors to access their own inbox
            print(f"DEBUG: Checking permissions - request.user={request.user.username if hasattr(request.user, 'username') else request.user}, author={author.username}")
            if request.user != author:
                return Response(
                    {"error": "You can only access your own inbox"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Get all inbox items for this author
            from app.serializers.inbox import InboxSerializer

            inbox_items = Inbox.objects.filter(recipient=author).order_by(
                "-delivered_at"
            )
            print(f"DEBUG: Found {inbox_items.count()} inbox items for {author.username}")

            # Apply pagination
            page = self.paginate_queryset(inbox_items)
            if page is not None:
                serializer = InboxSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = InboxSerializer(inbox_items, many=True)
            return Response({"type": "inbox", "items": serializer.data})

        except Exception as e:
            logger.error(f"Error retrieving inbox for author {pk}: {str(e)}")
            return Response(
                {"error": "Failed to retrieve inbox"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _post_to_inbox(self, request, pk=None):
        """Handle POST requests to add activities to inbox."""
        print(f"DEBUG: _post_to_inbox called for author pk={pk}")
        print(f"DEBUG: Request data: {request.data}")
        try:
            # Get the recipient author
            author = self.get_object()
            print(f"DEBUG: Retrieved recipient author {author.username} (id={author.id})")

            # Validate the incoming activity
            serializer = ActivitySerializer(data=request.data)
            if not serializer.is_valid():
                print(f"DEBUG: Activity serializer validation failed: {serializer.errors}")
                return Response(
                    {"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
                )

            activity_data = serializer.validated_data
            activity_type = activity_data.get("type", "")
            print(f"DEBUG: Processing activity type: {activity_type}")

            # Process the activity based on its type to get serialized object data
            object_data = None

            if activity_type == "entry":
                print(f"DEBUG: Processing entry activity")
                object_data = self._process_entry_activity(activity_data)
            elif activity_type == "follow":
                print(f"DEBUG: Processing follow activity")
                object_data = self._process_follow_activity(activity_data, author)
            elif activity_type == "like":
                print(f"DEBUG: Processing like activity")
                object_data = self._process_like_activity(activity_data, author)
            elif activity_type == "comment":
                print(f"DEBUG: Processing comment activity")
                object_data = self._process_comment_activity(activity_data, author)
            elif activity_type == "undo":
                print(f"DEBUG: Processing undo activity")
                object_data = self._process_undo_activity(activity_data, author)

            if object_data is None:
                print(f"DEBUG: Failed to process {activity_type} activity - object_data is None")
                return Response(
                    {"error": f"Failed to process {activity_type} activity"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create inbox entry with object data stored directly
            # Use a simple hash of object data to prevent duplicates
            import hashlib
            import json

            data_hash = hashlib.md5(
                json.dumps(object_data, sort_keys=True).encode()
            ).hexdigest()

            inbox_item, created = Inbox.objects.get_or_create(
                recipient=author,
                activity_type=activity_type,
                object_data=object_data,
                defaults={"raw_data": request.data},
            )
            print(f"DEBUG: Inbox item created={created} for {activity_type} activity")

            if created:
                logger.info(f"Added {activity_type} to {author.username}'s inbox")
                return Response(
                    {"message": "Activity added to inbox"},
                    status=status.HTTP_201_CREATED,
                )
            else:
                logger.info(
                    f"Duplicate {activity_type} for {author.username}'s inbox - ignored"
                )
                return Response(
                    {"message": "Activity already in inbox"}, status=status.HTTP_200_OK
                )

        except Exception as e:
            logger.error(f"Error processing inbox activity: {str(e)}")
            return Response(
                {"error": "Failed to process inbox activity"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @classmethod
    def _get_or_create_author_from_activity(cls, author_data):
        """
        Get or create an author from activity author data.
        This ensures the same remote author is reused across multiple activities.
        """
        author_url = author_data.get("id")
        print(f"DEBUG: Original Author URL: {author_url}")

        if not author_url:
            logger.error("Activity missing author id")
            return None

        # Normalize the URL to prevent integrity errors
        from app.utils.url_utils import normalize_author_url
        normalized_url = normalize_author_url(author_url)
        print(f"DEBUG: Normalized Author URL: {normalized_url}")

        # Extract username from displayName or URL
        display_name = author_data.get("displayName", "")
        username = (
            display_name.lower().replace(" ", "_") if display_name else "unknown"
        )

        try:
            # Use update_or_create to ensure we update existing authors with new info
            author, created = Author.objects.update_or_create(
                url=normalized_url,  # Use normalized URL as unique identifier
                defaults={
                    "username": username,
                    "displayName": author_data.get("displayName", ""),
                    "profileImage": author_data.get("profileImage") or "",  # Handle None/null values
                    "host": author_data.get("host", ""),
                    "web": author_data.get("web", ""),
                },
            )
            print(f"DEBUG: Author {'created' if created else 'updated'} for normalized URL {normalized_url}")
            return author
        except Exception as e:
            logger.error(f"Error creating/updating author with URL {normalized_url}: {str(e)}")
            # Try to find existing author with either URL format as fallback
            try:
                return Author.objects.get(url=normalized_url)
            except Author.DoesNotExist:
                try:
                    return Author.objects.get(url=author_url)
                except Author.DoesNotExist:
                    logger.error(f"Could not find or create author with URL {author_url}")
                    return None

    @classmethod
    def _get_or_create_entry_from_activity(cls, activity_data):
        """
        Get or create an entry from activity data. 
        This is a class method to ensure the same entry is reused across multiple inbox calls.
        """
        # Get or create the entry author using centralized method
        author_data = activity_data.get("author", {})
        author = cls._get_or_create_author_from_activity(author_data)
        
        if not author:
            logger.error("Failed to get or create author from activity data")
            return None

        # Create or update the entry based on URL (which is unique)
        entry_url = activity_data.get("id")
        entry_uuid = parse_uuid_from_url(entry_url) if entry_url else None
        print(f"DEBUG: Original Entry URL: {entry_url}, UUID: {entry_uuid}")

        if not entry_url:
            logger.error("Entry activity missing id/URL")
            return None

        # Normalize the URL to prevent integrity errors
        from app.utils.url_utils import normalize_author_url
        normalized_entry_url = normalize_author_url(entry_url)
        print(f"DEBUG: Normalized Entry URL: {normalized_entry_url}")

        # Parse published date if it's a string
        published_value = activity_data.get("published")
        if published_value and isinstance(published_value, str):
            from django.utils.dateparse import parse_datetime
            published_value = parse_datetime(published_value)

        try:
            # Always use URL-based get_or_create since URL is unique and identifies the same post
            entry, created = Entry.objects.update_or_create(
                url=normalized_entry_url,  # Use normalized URL as the unique identifier
                defaults={
                    "author": author,
                    "title": activity_data.get("title", ""),
                    "description": activity_data.get("description", ""),
                    "content": activity_data.get("content", ""),
                    "content_type": activity_data.get(
                        "contentType", Entry.TEXT_PLAIN
                    ),
                    "visibility": activity_data.get("visibility", Entry.PUBLIC),
                    "source": activity_data.get("source", ""),
                    "origin": activity_data.get("origin", ""),
                    "web": activity_data.get("web", ""),
                    "published": published_value,
                },
            )
            print(f"DEBUG: Entry {'created' if created else 'updated'} for normalized URL {normalized_entry_url}")
            return entry
        except Exception as e:
            logger.error(f"Error creating/updating entry with URL {normalized_entry_url}: {str(e)}")
            # Try to find existing entry with either URL format as fallback
            try:
                return Entry.objects.get(url=normalized_entry_url)
            except Entry.DoesNotExist:
                try:
                    return Entry.objects.get(url=entry_url)
                except Entry.DoesNotExist:
                    logger.error(f"Could not find or create entry with URL {entry_url}")
                    return None

    def _process_entry_activity(self, activity_data):
        """Process an entry activity and create/update the entry per spec, return serialized data."""
        print(f"DEBUG: _process_entry_activity called")
        try:
            # Use the class method to get or create the entry (ensures single entry per URL)
            entry = self._get_or_create_entry_from_activity(activity_data)
            
            if not entry:
                logger.error("Failed to get or create entry from activity data")
                return None

            # Return serialized entry data instead of the model object
            from app.serializers.entry import EntrySerializer

            return EntrySerializer(entry).data

        except Exception as e:
            logger.error(f"Error processing entry activity: {str(e)}")
            return None

    def _process_follow_activity(self, activity_data, recipient):
        """Process a follow activity and create the follow request per spec, return serialized data."""
        print(f"DEBUG: _process_follow_activity called for recipient {recipient.username}")
        try:
            # Check if this is a follow response (accept/reject)
            response_type = activity_data.get("response_type")
            if response_type:
                # This is a follow response from a remote node
                return self._process_follow_response(activity_data, recipient, response_type)
            
            # Get follower information from actor using centralized method
            actor_data = activity_data.get("actor", {})
            follower = self._get_or_create_author_from_activity(actor_data)
            
            if not follower:
                logger.error("Failed to get or create follower from activity data")
                return None

            # Verify the object matches the recipient
            object_data = activity_data.get("object", {})
            object_url = object_data.get("id")

            if object_url != recipient.url:
                logger.warning(
                    f"Follow object {object_url} doesn't match recipient {recipient.url}"
                )

            # Create the follow request
            follow, _ = Follow.objects.get_or_create(
                follower=follower,
                followed=recipient,
                defaults={"status": Follow.REQUESTING},
            )

            # Return serialized follow data instead of the model object
            from app.serializers.follow import FollowSerializer

            return FollowSerializer(follow).data

        except Exception as e:
            logger.error(f"Error processing follow activity: {str(e)}")
            return None
    
    def _process_follow_response(self, activity_data, recipient, response_type):
        """Process a follow response (accept/reject) from a remote node."""
        print(f"DEBUG: _process_follow_response called for recipient {recipient.username}, response_type: {response_type}")
        try:
            # Get the follower (who sent the original request) - that's the recipient
            # Get the followed (who is responding) - that's in the activity data
            follower_data = activity_data.get("follower", {})
            followed_data = activity_data.get("followed", {})
            
            # Find the follow relationship
            follow = Follow.objects.filter(
                follower__url=follower_data.get("url", follower_data.get("id")),
                followed__url=followed_data.get("url", followed_data.get("id"))
            ).first()
            
            if not follow:
                logger.error(f"Follow relationship not found for response")
                return None
            
            # Update the follow status based on the response
            if response_type == "Accept":
                follow.status = Follow.ACCEPTED
                follow.save()
                logger.info(f"Follow request from {follow.follower.displayName} to {follow.followed.displayName} accepted")
            elif response_type == "Reject":
                follow.status = Follow.REJECTED
                follow.save()
                logger.info(f"Follow request from {follow.follower.displayName} to {follow.followed.displayName} rejected")
            
            # Return serialized follow data
            from app.serializers.follow import FollowSerializer
            return FollowSerializer(follow).data
            
        except Exception as e:
            logger.error(f"Error processing follow response: {str(e)}")
            return None

    def _process_like_activity(self, activity_data, recipient):
        """Process a like activity and create the like per spec, return serialized data."""
        print(f"DEBUG: _process_like_activity called for recipient {recipient.username}")
        try:
            # Get liker information using centralized method
            author_data = activity_data.get("author", {})
            liker = self._get_or_create_author_from_activity(author_data)
            
            if not liker:
                logger.error("Failed to get or create liker from activity data")
                return None

            # Get the liked object URL
            object_url = activity_data.get("object")
            print(f"DEBUG: Like object URL: {object_url}")
            if not object_url:
                logger.error("Like activity missing object URL")
                return None

            # Try to find the entry or comment being liked
            entry = None
            comment = None

            # Try to parse UUID from object URL
            object_uuid = parse_uuid_from_url(object_url) if object_url else None

            # Try to find by UUID first, then by URL
            if object_uuid:
                try:
                    entry = Entry.objects.get(id=object_uuid)
                except Entry.DoesNotExist:
                    try:
                        comment = Comment.objects.get(id=object_uuid)
                    except Comment.DoesNotExist:
                        pass

            # Fallback to URL-based lookup if UUID lookup failed
            if not entry and not comment:
                try:
                    entry = Entry.objects.get(url=object_url)
                except Entry.DoesNotExist:
                    try:
                        comment = Comment.objects.get(url=object_url)
                    except Comment.DoesNotExist:
                        logger.error(f"Like object not found: {object_url}")
                        return None

            # Create the like
            like_url = activity_data.get("id")
            like_uuid = parse_uuid_from_url(like_url) if like_url else None
            
            # Normalize the like URL to prevent integrity errors
            from app.utils.url_utils import normalize_author_url
            normalized_like_url = normalize_author_url(like_url) if like_url else None
            
            print(f"DEBUG: Like creation - original_url: {like_url}, normalized_url: {normalized_like_url}, like_uuid: {like_uuid}")
            print(f"DEBUG: Liker info - username: {liker.username}, url: {liker.url}")
            if entry:
                print(f"DEBUG: Entry info - id: {entry.id}, url: {entry.url}")
            if comment:
                print(f"DEBUG: Comment info - id: {comment.id}, url: {comment.url}")

            try:
                if like_uuid:
                    # If we have a UUID, use it for the like ID
                    like, _ = Like.objects.update_or_create(
                        id=like_uuid,
                        defaults={
                            "author": liker,
                            "entry": entry,
                            "comment": comment,
                            "url": normalized_like_url,
                        },
                    )
                    print(f"DEBUG: Like created with UUID - id: {like.id}, url: {like.url}")
                elif normalized_like_url:
                    # Fallback to URL-based creation with normalized URL
                    like, _ = Like.objects.get_or_create(
                        url=normalized_like_url,
                        defaults={
                            "author": liker,
                            "entry": entry,
                            "comment": comment,
                        },
                    )
                    print(f"DEBUG: Like created with normalized URL - id: {like.id}, url: {like.url}")
                else:
                    logger.error("Like activity missing both UUID and URL")
                    return None
            except Exception as like_error:
                logger.error(f"Error creating like: {str(like_error)}")
                print(f"DEBUG: Like creation failed: {str(like_error)}")
                return None

            # Return serialized like data instead of the model object
            from app.serializers.like import LikeSerializer

            return LikeSerializer(like).data

        except Exception as e:
            logger.error(f"Error processing like activity: {str(e)}")
            return None

    def _process_comment_activity(self, activity_data, recipient):
        """Process a comment activity and create the comment per spec, return serialized data."""
        print(f"DEBUG: _process_comment_activity called for recipient {recipient.username}")
        try:
            # Get commenter information using centralized method
            author_data = activity_data.get("author", {})
            commenter = self._get_or_create_author_from_activity(author_data)
            
            if not commenter:
                logger.error("Failed to get or create commenter from activity data")
                return None

            # Get the entry being commented on (from 'entry' field per spec)
            entry_url = activity_data.get("entry")
            print(f"DEBUG: Comment entry URL: {entry_url}")
            if not entry_url:
                logger.error("Comment activity missing entry URL")
                return None

            # Try to parse UUID from entry URL
            entry_uuid = parse_uuid_from_url(entry_url) if entry_url else None

            # Try to find by UUID first, then by URL
            entry = None
            if entry_uuid:
                try:
                    entry = Entry.objects.get(id=entry_uuid)
                except Entry.DoesNotExist:
                    pass

            # Fallback to URL-based lookup
            if not entry:
                try:
                    entry = Entry.objects.get(url=entry_url)
                except Entry.DoesNotExist:
                    logger.error(f"Comment target entry not found: {entry_url}")
                    return None

            # Create the comment
            comment_url = activity_data.get("id")
            comment_uuid = parse_uuid_from_url(comment_url) if comment_url else None

            # Normalize the comment URL to prevent integrity errors
            from app.utils.url_utils import normalize_author_url
            normalized_comment_url = normalize_author_url(comment_url) if comment_url else None

            print(f"DEBUG: Comment creation - original_url: {comment_url}, normalized_url: {normalized_comment_url}, comment_uuid: {comment_uuid}")

            try:
                if comment_uuid:
                    # If we have a UUID, use it for the comment ID
                    comment, _ = Comment.objects.update_or_create(
                        id=comment_uuid,
                        defaults={
                            "author": commenter,
                            "entry": entry,
                            "content": activity_data.get("comment", ""),
                            "content_type": activity_data.get(
                                "contentType", Entry.TEXT_PLAIN
                            ),
                            "url": normalized_comment_url,
                        },
                    )
                elif normalized_comment_url:
                    # Fallback to URL-based creation with normalized URL
                    comment, _ = Comment.objects.get_or_create(
                        url=normalized_comment_url,
                        defaults={
                            "author": commenter,
                            "entry": entry,
                            "content": activity_data.get("comment", ""),
                            "content_type": activity_data.get(
                                "contentType", Entry.TEXT_PLAIN
                            ),
                        },
                    )
                else:
                    logger.error("Comment activity missing both UUID and URL")
                    return None
            except Exception as comment_error:
                logger.error(f"Error creating comment: {str(comment_error)}")
                # Try to find existing comment with either URL format as fallback
                try:
                    return Comment.objects.get(url=normalized_comment_url)
                except Comment.DoesNotExist:
                    try:
                        return Comment.objects.get(url=comment_url)
                    except Comment.DoesNotExist:
                        logger.error(f"Could not find or create comment with URL {comment_url}")
                        return None

            # Return serialized comment data instead of the model object
            from app.serializers.comment import CommentSerializer

            return CommentSerializer(comment).data

        except Exception as e:
            logger.error(f"Error processing comment activity: {str(e)}")
            return None

    # CMPUT 404 Compliant API Endpoints

    def list(self, request, *args, **kwargs):
        """
        GET [local, remote]: retrieve all profiles on the node (paginated)

        Returns authors in the CMPUT 404 compliant format:
        {
            "type": "authors",
            "authors": [...]
        }
        """
        print(f"DEBUG 403: AuthorViewSet.list called by user {request.user}")
        print(f"DEBUG 403: User authenticated: {request.user.is_authenticated}")
        print(f"DEBUG 403: User is_staff: {getattr(request.user, 'is_staff', False)}")
        print(f"DEBUG 403: Request method: {request.method}")
        print(f"DEBUG 403: Authorization header: {request.META.get('HTTP_AUTHORIZATION', 'None')}")
        
        # Debug authentication header parsing
        from app.views.auth import parse_basic_auth
        auth_username, auth_password = parse_basic_auth(request)
        print(f"DEBUG 403: Decoded auth header - username: {auth_username}, password: {'*' * len(auth_password) if auth_password else None}")
        
        # Debug request body
        try:
            print(f"DEBUG 403: Request body: {request.data if hasattr(request, 'data') else 'No data attribute'}")
        except Exception as e:
            print(f"DEBUG 403: Error reading request body: {str(e)}")
        
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)

            if page is not None:
                serializer = AuthorSerializer(page, many=True, context={"request": request})
                return Response({"type": "authors", "authors": serializer.data})

            serializer = AuthorSerializer(queryset, many=True, context={"request": request})
            return Response({"type": "authors", "authors": serializer.data})
        except Exception as e:
            print(f"DEBUG 403: Exception in list method: {str(e)}")
            print(f"DEBUG 403: Exception type: {type(e)}")
            raise

    def retrieve(self, request, *args, **kwargs):
        """
        GET [local]: retrieve AUTHOR_SERIAL's profile
        GET [remote]: retrieve AUTHOR_FQID's profile from remote node

        For remote authors (author.node is not null), fetches fresh data
        from the remote node using federation. Falls back to local cached
        data if remote fetch fails.

        Returns author in the CMPUT 404 compliant format
        """
        instance = self.get_object()

        # Return author data (remote authors should use retrieve_by_fqid for fresh data)
        serializer = AuthorSerializer(instance, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="followers")
    def followers(self, request, pk=None, author_fqid=None):
        """
        GET [local, remote]: get a list of authors who are AUTHOR_SERIAL's followers

        For remote authors, also fetches followers from their remote host.

        Returns followers in the CMPUT 404 compliant format:
        {
            "type": "followers",
            "followers": [...]
        }
        """
        author = self.get_object()
        local_followers = list(author.get_followers())
        
        # If this is a remote author, also fetch followers from their remote host
        # IMPORTANT: Only fetch if the author is truly from a different host
        if author.is_remote and author.node:
            try:
                import requests
                from requests.auth import HTTPBasicAuth
                from django.conf import settings
                import urllib.parse
                
                # Get the current host info from the request to compare against
                request_host = request.get_host()
                current_host_url = f"{request.scheme}://{request_host}"
                
                # Parse the remote node's host
                remote_host_url = author.node.host.rstrip('/')
                
                # Check if this is actually a different host
                is_same_host = (
                    remote_host_url == current_host_url or
                    remote_host_url.startswith('http://127.0.0.1') or
                    remote_host_url.startswith('http://localhost') or
                    urllib.parse.urlparse(remote_host_url).netloc == request.get_host()
                )
                
                if is_same_host:
                    print(f"DEBUG: Skipping remote fetch - author {author.displayName} is from same host ({remote_host_url} == {current_host_url})")
                    # This is actually a local author, skip remote fetching
                    pass
                else:
                    print(f"DEBUG: Author {author.displayName} is truly remote from {remote_host}, fetching followers...")
                    
                    # Extract author ID from the author's URL/ID
                    if author.url:
                        # Parse the author ID from the URL
                        # e.g., "http://remote-host/api/authors/uuid/" -> "uuid"
                        author_id = author.url.rstrip('/').split('/')[-1]
                    else:
                        # Fallback to author.id if no URL
                        author_id = str(author.id)
                    
                    # Construct the remote followers endpoint
                    remote_url = f"{author.node.host.rstrip('/')}/api/authors/{author_id}/followers/"
                    
                    print(f"DEBUG: Fetching remote followers from: {remote_url}")
                    
                    # Make the request to the remote node
                    response = requests.get(
                        remote_url,
                        auth=HTTPBasicAuth(author.node.username, author.node.password),
                        timeout=10,
                    )
                    
                    if response.status_code == 200:
                        remote_data = response.json()
                        remote_followers_data = remote_data.get("followers", [])
                        
                        print(f"DEBUG: Retrieved {len(remote_followers_data)} remote followers")
                        
                        # Create or update remote followers locally and add them to the list
                        for follower_data in remote_followers_data:
                            try:
                                # Try to find existing remote follower
                                follower_url = follower_data.get("url") or follower_data.get("id")
                                if not follower_url:
                                    continue
                                    
                                # Look for existing author by URL (try both normalized and original)
                                try:
                                    from app.utils.url_utils import normalize_author_url
                                    normalized_follower_url = normalize_author_url(follower_url)
                                    
                                    # Try normalized URL first
                                    try:
                                        existing_follower = Author.objects.get(url=normalized_follower_url)
                                    except Author.DoesNotExist:
                                        # Fallback to original URL
                                        existing_follower = Author.objects.get(url=follower_url)
                                    
                                    if existing_follower not in local_followers:
                                        local_followers.append(existing_follower)
                                except Author.DoesNotExist:
                                    # Create a new remote author record
                                    from app.utils.url_utils import normalize_author_url
                                    normalized_follower_url = normalize_author_url(follower_url)
                                    remote_follower = Author.objects.create(
                                        username=follower_data.get("username", "unknown"),
                                        displayName=follower_data.get("displayName") or follower_data.get("display_name", "Unknown User"),
                                        url=normalized_follower_url,
                                        profile_image=follower_data.get("profileImage") or follower_data.get("profile_image", ""),
                                        github_username=follower_data.get("github_username", ""),
                                        node=author.node,  # Same node as the author being followed
                                        is_active=True,
                                        is_approved=True,
                                    )
                                    local_followers.append(remote_follower)
                                    print(f"DEBUG: Created new remote follower: {remote_follower.displayName}")
                            except Exception as e:
                                print(f"DEBUG: Error processing remote follower {follower_data.get('displayName', 'unknown')}: {str(e)}")
                                continue
                    else:
                        print(f"DEBUG: Failed to fetch remote followers: {response.status_code}")
                    
            except Exception as e:
                print(f"DEBUG: Error fetching remote followers for {author.displayName}: {str(e)}")
                # Continue with local followers only
        
        # Serialize all followers (local + remote)
        serializer = AuthorSerializer(
            local_followers, many=True, context={"request": request}
        )

        return Response({"type": "followers", "followers": serializer.data})

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="follow-remote",
    )
    def follow_remote(self, request):
        """
        Follow a remote author by creating/fetching their local record first.

        Expected data:
        {
            "author_id": "uuid-of-remote-author",
            "author_url": "full-url-of-remote-author",
            "node_id": "uuid-of-node"
        }
        """
        author_id = request.data.get("author_id")
        author_url = request.data.get("author_url")
        node_id = request.data.get("node_id")

        if not author_id or not author_url or not node_id:
            return Response(
                {"error": "author_id, author_url, and node_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the node
        from app.models import Node

        try:
            node = Node.objects.get(id=node_id, is_active=True)
        except Node.DoesNotExist:
            return Response(
                {"error": "Node not found or inactive"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if author already exists locally
        try:
            remote_author = Author.objects.get(id=author_id)
        except Author.DoesNotExist:
            # Fetch author data from remote node
            import requests
            from requests.auth import HTTPBasicAuth

            try:
                response = requests.get(
                    f"{node.host.rstrip('/')}/api/authors/{author_id}/",
                    auth=HTTPBasicAuth(node.username, node.password),
                    timeout=5,
                )

                if response.status_code != 200:
                    return Response(
                        {
                            "error": f"Failed to fetch author from remote node: {response.status_code}"
                        },
                        status=status.HTTP_502_BAD_GATEWAY,
                    )

                author_data = response.json()

                # Create local author record
                from app.utils.url_utils import normalize_author_url
                normalized_author_url = normalize_author_url(author_url)
                remote_author = Author.objects.create(
                    id=author_id,
                    url=normalized_author_url,
                    username=author_data.get("username", ""),
                    displayName=author_data.get("displayName", ""),
                    github_username=author_data.get("github", ""),
                    profileImage=author_data.get("profileImage", ""),
                    host=author_data.get("host", node.host),
                    web=author_data.get("page", ""),
                    node=node,
                    is_approved=True,  # Remote authors are auto-approved
                    is_active=True,
                )

            except requests.RequestException as e:
                return Response(
                    {"error": f"Failed to connect to remote node: {str(e)}"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            except Exception as e:
                return Response(
                    {"error": f"Failed to create remote author: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        # Now follow the remote author
        current_user = request.user

        # Check if trying to follow self
        if current_user.url == remote_author.url:
            return Response(
                {"error": "Cannot follow yourself"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if follow request already exists
        existing_follow = Follow.objects.filter(
            follower=current_user, followed=remote_author
        ).first()

        if existing_follow:
            if existing_follow.status == Follow.ACCEPTED:
                return Response(
                    {"error": "Already following this user"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            elif existing_follow.status == Follow.REQUESTING:
                return Response(
                    {"error": "Follow request already requesting"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            elif existing_follow.status == Follow.REJECTED:
                existing_follow.delete()

        # Create follow request
        follow = Follow.objects.create(
            follower=current_user, followed=remote_author, status=Follow.REQUESTING
        )

        # Send follow request to remote node (don't create local inbox item for remote author)
        self._send_follow_to_remote(follow, remote_author, node)

        serializer = FollowSerializer(follow)
        return Response(
            {"success": True, "follow": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def _send_follow_request_to_remote(self, follower, remote_author):
        """Send follow request to remote author's inbox using ActivityPub format"""
        import requests
        from requests.auth import HTTPBasicAuth
        from django.conf import settings

        try:
            # Create ActivityPub follow activity
            follow_activity = {
                "type": "follow",
                "actor": {
                    "id": follower.url or f"{settings.SITE_URL}/api/authors/{follower.id}/",
                    "displayName": follower.displayName,
                    "username": follower.username,
                    "profileImage": follower.profileImage or "",
                    "host": settings.SITE_URL,
                    "web": follower.web or f"{settings.SITE_URL}/profile/{follower.id}/",
                    "github": follower.github_username or "",
                },
                "object": {
                    "id": remote_author.url,
                    "displayName": remote_author.displayName,
                    "username": remote_author.username,
                }
            }

            # Send to remote author's inbox
            inbox_url = f"{remote_author.node.host.rstrip('/')}/api/authors/{remote_author.id}/inbox/"

            response = requests.post(
                inbox_url,
                json=follow_activity,
                auth=HTTPBasicAuth(remote_author.node.username, remote_author.node.password),
                headers={"Content-Type": "application/json"},
                timeout=10,
            )

            if response.status_code not in [200, 201, 202]:
                print(f"Failed to send follow request to remote node: {response.status_code}")
                print(f"Response: {response.text}")
            else:
                print(f"Successfully sent follow request to {remote_author.displayName}")
                
        except Exception as e:
            print(f"Error sending follow request to remote node: {str(e)}")

    def _send_follow_to_remote(self, follow, remote_author, node):
        """Send follow request to remote node using compliant format"""
        import requests
        from requests.auth import HTTPBasicAuth

        try:
            # Use the follow serializer to get the proper format
            from app.serializers.follow import FollowSerializer

            follow_data = FollowSerializer(follow).data

            # Send to remote author's inbox
            inbox_url = f"{node.host.rstrip('/')}/api/authors/{remote_author.id}/inbox/"

            response = requests.post(
                inbox_url,
                json=follow_data,
                auth=HTTPBasicAuth(node.username, node.password),
                headers={"Content-Type": "application/json"},
                timeout=5,
            )

            if response.status_code not in [200, 201, 202]:
                print(
                    f"Failed to send follow request to remote node: {response.status_code}"
                )
                print(f"Response: {response.text}")
        except Exception as e:
            print(f"Error sending follow request to remote node: {str(e)}")

    @action(
        detail=True,
        methods=["get", "put", "delete"],
        url_path="followers/(?P<foreign_author_fqid>.+)",
    )
    def follower_detail(self, request, pk=None, foreign_author_fqid=None):
        """
        DELETE [local]: remove FOREIGN_AUTHOR_FQID as a follower of AUTHOR_SERIAL (must be authenticated)
        PUT [local]: Add FOREIGN_AUTHOR_FQID as a follower of AUTHOR_SERIAL (must be authenticated)
        GET [local, remote] check if FOREIGN_AUTHOR_FQID is a follower of AUTHOR_SERIAL
        """
        author = self.get_object()

        # Decode the URL-encoded FQID
        decoded_fqid = unquote(foreign_author_fqid)

        try:
            foreign_author = Author.objects.get(url=decoded_fqid)
        except Author.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            # Check if foreign_author is following author
            is_follower = Follow.objects.filter(
                follower=foreign_author, followed=author, status=Follow.ACCEPTED
            ).exists()

            if is_follower:
                serializer = AuthorSerializer(
                    foreign_author, context={"request": request}
                )
                return Response(serializer.data)
            else:
                return Response(status=status.HTTP_404_NOT_FOUND)

        elif request.method == "PUT":
            # Add as follower (approve follow request)
            follow, created = Follow.objects.get_or_create(
                follower=foreign_author,
                followed=author,
                defaults={"status": Follow.ACCEPTED},
            )
            if not created and follow.status != Follow.ACCEPTED:
                follow.status = Follow.ACCEPTED
                follow.save()

            serializer = AuthorSerializer(foreign_author, context={"request": request})
            return Response(serializer.data)

        elif request.method == "DELETE":
            # Remove as follower
            Follow.objects.filter(follower=foreign_author, followed=author).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(
        detail=False,
        methods=["get"],
        url_path="by-url/(?P<author_url>.+)",
    )
    def get_by_url(self, request, author_url=None):
        """
        Get an author by their full URL (FQID).

        This endpoint supports fetching both local and remote authors
        by their full URL, enabling proper federation support.

        Usage: GET /api/authors/by-url/{URL_ENCODED_AUTHOR_URL}/
        """
        if not author_url:
            return Response(
                {"error": "Author URL is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Decode the URL-encoded FQID
            decoded_url = unquote(author_url)

            # Try to find the author by URL first (handles both local and remote)
            try:
                author = Author.objects.get(url=decoded_url)

                # Return local cached data
                serializer = AuthorSerializer(author, context={"request": request})
                return Response(serializer.data)

            except Author.DoesNotExist:
                # Author not found locally - return 404
                return Response(
                    {"error": "Author not found"}, status=status.HTTP_404_NOT_FOUND
                )

        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Error retrieving author by URL {author_url}: {str(e)}")
            return Response(
                {"error": "Could not retrieve author"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve_by_fqid(self, request, author_fqid=None):
        """
        GET [remote]: retrieve AUTHOR_FQID's profile

        This endpoint retrieves an author by their FQID (Fully Qualified ID),
        which is their complete URL. It supports fetching both local and remote authors.

        For remote authors, it attempts to fetch fresh data from the remote node
        and falls back to local cached data if the remote fetch fails.
        """
        if not author_fqid:
            return Response(
                {"error": "Author FQID is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Decode the URL-encoded FQID
            decoded_fqid = unquote(author_fqid)

            # Try to find the author by URL first (handles both local and remote)
            try:
                author = Author.objects.get(url=decoded_fqid)

                # If this is a remote author, try to fetch fresh data
                if author.node is not None:
                    import requests
                    from requests.auth import HTTPBasicAuth
                    import logging

                    logger = logging.getLogger(__name__)

                    try:
                        # Make request to the remote author endpoint for fresh data
                        response = requests.get(
                            decoded_fqid,
                            auth=HTTPBasicAuth(
                                author.node.username, author.node.password
                            ),
                            timeout=5,
                            headers={"Accept": "application/json"},
                        )

                        if response.status_code == 200:
                            logger.info(
                                f"Successfully fetched fresh remote author data from {decoded_fqid}"
                            )

                            # Update local cached data with fresh remote data
                            try:
                                remote_data = response.json()

                                # Update the local author record with fresh data
                                author.displayName = remote_data.get(
                                    "displayName", author.displayName
                                )
                                author.github_username = self._extract_github_username(
                                    remote_data.get("github", "")
                                )
                                author.profileImage = (
                                    remote_data.get("profileImage", "") or ""
                                )
                                author.host = remote_data.get("host", author.host)
                                author.web = remote_data.get("web", author.web)
                                author.save()

                                logger.info(
                                    f"Updated local cache for remote author: {author.displayName}"
                                )

                            except Exception as e:
                                logger.error(
                                    f"Failed to update local cache for remote author: {str(e)}"
                                )
                                # Continue with returning the remote data even if cache update fails

                            return Response(response.json())
                        else:
                            logger.warning(
                                f"Failed to fetch fresh remote author data from {decoded_fqid}: {response.status_code}"
                            )
                            # Fall back to local cached data

                    except requests.RequestException as e:
                        logger.error(
                            f"Network error fetching fresh remote author data from {decoded_fqid}: {str(e)}"
                        )
                        # Fall back to local cached data

                # Return local cached data (for local authors or as fallback for remote authors)
                serializer = AuthorSerializer(author, context={"request": request})
                return Response(serializer.data)

            except Author.DoesNotExist:
                # Author not found locally, try to fetch from remote node
                import requests
                from requests.auth import HTTPBasicAuth
                from urllib.parse import urlparse
                import logging
                from app.models import Node  # Move import here to avoid scope issues
                import uuid

                logger = logging.getLogger(__name__)
                logger.info(
                    f"Author not found locally, attempting to fetch from remote: {decoded_fqid}"
                )

                try:
                    # Extract the base host from the FQID
                    parsed_url = urlparse(decoded_fqid)
                    base_host = f"{parsed_url.scheme}://{parsed_url.netloc}"

                    # Find the corresponding node in our database
                    try:
                        node = Node.objects.get(
                            host__icontains=parsed_url.netloc, is_active=True
                        )
                    except Node.DoesNotExist:
                        logger.warning(
                            f"No active node found for host {parsed_url.netloc}"
                        )
                        return Response(
                            {"error": "Author not found"},
                            status=status.HTTP_404_NOT_FOUND,
                        )

                    # Make request to the remote author endpoint
                    response = requests.get(
                        decoded_fqid,
                        auth=HTTPBasicAuth(node.username, node.password),
                        timeout=5,
                        headers={"Accept": "application/json"},
                    )

                    if response.status_code == 200:
                        logger.info(
                            f"Successfully fetched remote author data from {decoded_fqid}"
                        )

                        # Save the newly fetched remote author to our local database for caching
                        try:
                            remote_data = response.json()

                            # Extract author ID from the FQID
                            author_id_str = (
                                decoded_fqid.split("/")[-2]
                                if decoded_fqid.endswith("/")
                                else decoded_fqid.split("/")[-1]
                            )

                            # Create new remote author record
                            try:
                                author_id = uuid.UUID(author_id_str)
                            except ValueError:
                                logger.warning(
                                    f"Could not extract valid UUID from FQID: {decoded_fqid}"
                                )
                                # Return the data without caching if we can't parse the ID
                                return Response(response.json())

                            # Normalize the URL to prevent integrity errors
                            from app.utils.url_utils import normalize_author_url
                            normalized_fqid = normalize_author_url(decoded_fqid)
                            
                            remote_author = Author(
                                id=author_id,
                                url=normalized_fqid,
                                username=remote_data.get(
                                    "displayName", f"remote_user_{str(author_id)[:8]}"
                                ),
                                displayName=remote_data.get("displayName", ""),
                                github_username=self._extract_github_username(
                                    remote_data.get("github", "")
                                ),
                                profileImage=remote_data.get("profileImage") or "",
                                host=remote_data.get("host", base_host),
                                web=remote_data.get("web", ""),
                                node=node,
                                is_approved=True,  # Remote authors are auto-approved
                                is_active=False,  # Remote authors can't log in
                                password="!",  # Unusable password
                            )
                            remote_author.save()
                            logger.info(
                                f"Cached new remote author: {remote_author.displayName}"
                            )

                        except Exception as e:
                            logger.error(f"Failed to cache new remote author: {str(e)}")
                            # Continue with returning the remote data even if caching fails

                        return Response(response.json())
                    else:
                        logger.warning(
                            f"Failed to fetch remote author from {decoded_fqid}: {response.status_code}"
                        )
                        return Response(
                            {"error": "Author not found"},
                            status=status.HTTP_404_NOT_FOUND,
                        )

                except requests.RequestException as e:
                    logger.error(
                        f"Network error fetching remote author from {decoded_fqid}: {str(e)}"
                    )
                    return Response(
                        {"error": "Author not found"}, status=status.HTTP_404_NOT_FOUND
                    )
                except Exception as e:
                    logger.error(
                        f"Unexpected error fetching remote author from {decoded_fqid}: {str(e)}"
                    )
                    return Response(
                        {"error": "Author not found"}, status=status.HTTP_404_NOT_FOUND
                    )

        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Error retrieving author by FQID {author_fqid}: {str(e)}")
            return Response(
                {"error": "Could not retrieve author"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _extract_github_username(self, github_url):
        """
        Extract GitHub username from GitHub URL.

        Args:
            github_url: GitHub URL or username

        Returns:
            str: GitHub username or empty string
        """
        if not github_url:
            return ""

        # If it's already just a username, return it
        if "/" not in github_url:
            return github_url

        # Extract username from GitHub URL
        if "github.com/" in github_url:
            return github_url.split("github.com/")[-1].rstrip("/")

        return ""
    
    def _process_undo_activity(self, activity_data, recipient):
        """Process an undo activity (like unlike) and perform the undo action, return serialized data."""
        print(f"DEBUG: _process_undo_activity called for recipient {recipient.username}")
        try:
            # Get the actor (person doing the undo)
            actor_data = activity_data.get("actor", {})
            actor = self._get_or_create_author_from_activity(actor_data)
            
            if not actor:
                logger.error("Failed to get or create actor from undo activity data")
                return None

            # Get the object being undone (the original activity)
            object_data = activity_data.get("object", {})
            object_type = object_data.get("type", "")
            
            print(f"DEBUG: Undo object type: {object_type}")
            
            if object_type == "like":
                # Process unlike (undo like)
                return self._process_unlike_activity(object_data, actor, recipient)
            elif object_type == "follow":
                # Process unfollow (undo follow) - could be implemented later
                print(f"DEBUG: Unfollow not implemented yet")
                return {"type": "undo", "object_type": "follow", "status": "not_implemented"}
            else:
                logger.error(f"Unsupported undo object type: {object_type}")
                return None

        except Exception as e:
            logger.error(f"Error processing undo activity: {str(e)}")
            return None

    def _process_unlike_activity(self, like_data, actor, recipient):
        """Process an unlike activity by removing the like."""
        print(f"DEBUG: _process_unlike_activity called")
        try:
            # Get the object that was liked
            object_url = like_data.get("object")
            print(f"DEBUG: Unlike object URL: {object_url}")
            
            if not object_url:
                logger.error("Unlike activity missing object URL")
                return None

            # Try to find the like to delete
            like_url = like_data.get("id")
            like_uuid = parse_uuid_from_url(like_url) if like_url else None
            
            print(f"DEBUG: Looking for like to delete - url: {like_url}, uuid: {like_uuid}")
            
            like = None
            
            # Try to find by like UUID first
            if like_uuid:
                try:
                    like = Like.objects.get(id=like_uuid, author=actor)
                    print(f"DEBUG: Found like by UUID: {like.id}")
                except Like.DoesNotExist:
                    pass
            
            # Fallback to finding by like URL
            if not like and like_url:
                try:
                    like = Like.objects.get(url=like_url, author=actor)
                    print(f"DEBUG: Found like by URL: {like.id}")
                except Like.DoesNotExist:
                    pass
            
            # If we still haven't found the like, try to find by actor and object
            if not like:
                try:
                    # Try to find the entry or comment being unliked
                    object_uuid = parse_uuid_from_url(object_url) if object_url else None
                    
                    if object_uuid:
                        # Try entry first
                        try:
                            entry = Entry.objects.get(id=object_uuid)
                            like = Like.objects.get(author=actor, entry=entry)
                            print(f"DEBUG: Found like by actor and entry: {like.id}")
                        except (Entry.DoesNotExist, Like.DoesNotExist):
                            # Try comment
                            try:
                                comment = Comment.objects.get(id=object_uuid)
                                like = Like.objects.get(author=actor, comment=comment)
                                print(f"DEBUG: Found like by actor and comment: {like.id}")
                            except (Comment.DoesNotExist, Like.DoesNotExist):
                                pass
                    
                    # Fallback to URL-based lookup
                    if not like:
                        try:
                            entry = Entry.objects.get(url=object_url)
                            like = Like.objects.get(author=actor, entry=entry)
                            print(f"DEBUG: Found like by actor and entry URL: {like.id}")
                        except (Entry.DoesNotExist, Like.DoesNotExist):
                            try:
                                comment = Comment.objects.get(url=object_url)
                                like = Like.objects.get(author=actor, comment=comment)
                                print(f"DEBUG: Found like by actor and comment URL: {like.id}")
                            except (Comment.DoesNotExist, Like.DoesNotExist):
                                pass
                
                except Exception as lookup_error:
                    logger.error(f"Error during like lookup: {str(lookup_error)}")
            
            if like:
                # Delete the like
                like.delete()
                print(f"DEBUG: Successfully deleted like {like.id}")
                logger.info(f"Processed unlike - deleted like {like.id} by {actor.username}")
                
                return {
                    "type": "undo",
                    "object_type": "like",
                    "actor": actor.username,
                    "object_url": object_url,
                    "status": "success"
                }
            else:
                print(f"DEBUG: Like not found for unlike activity")
                logger.warning(f"Like not found for unlike activity - actor: {actor.username}, object: {object_url}")
                
                # Return success anyway for idempotent behavior
                return {
                    "type": "undo",
                    "object_type": "like",
                    "actor": actor.username,
                    "object_url": object_url,
                    "status": "not_found_but_success"
                }

        except Exception as e:
            logger.error(f"Error processing unlike activity: {str(e)}")
            return None
