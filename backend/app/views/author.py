from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
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
        return Response({"type": "followers", "followers": serializer.data})

    @action(detail=True, methods=["get"])
    def following(self, request, pk=None):
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
    def follow(self, request, pk=None):
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
                # If requesting, return error
                elif existing_follow.status == Follow.REQUESTING:
                    return Response(
                        {"error": "Follow request already requesting"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # If rejected, delete the old one and create a new one
                elif existing_follow.status == Follow.REJECTED:
                    existing_follow.delete()

            # Create follow request
            follow = Follow.objects.create(
                follower=current_user,
                followed=author_to_follow,
                status=Follow.REQUESTING,
            )

            # If following a remote author, send follow request using centralized service
            if not author_to_follow.is_local and author_to_follow.node:
                from app.utils.federation import FederationService

                success = FederationService.send_follow_request(
                    current_user, author_to_follow
                )
                if not success:
                    print(
                        f"Warning: Failed to send follow request to {author_to_follow.username}"
                    )
                    # Still create the local follow record, but mark it as requesting
                    follow.status = Follow.REQUESTING
                    follow.save()

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
                    if key not in ["profile_image_file", "profileImage"]:
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
        try:
            author = self.get_object()

            # Only allow authors to access their own inbox
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
        try:
            # Get the recipient author
            author = self.get_object()

            # Validate the incoming activity
            serializer = ActivitySerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
                )

            activity_data = serializer.validated_data
            activity_type = activity_data.get("type", "")

            # Process the activity based on its type to get serialized object data
            object_data = None

            if activity_type == "entry":
                object_data = self._process_entry_activity(activity_data, author)
            elif activity_type == "follow":
                object_data = self._process_follow_activity(activity_data, author)
            elif activity_type == "like":
                object_data = self._process_like_activity(activity_data, author)
            elif activity_type == "comment":
                object_data = self._process_comment_activity(activity_data, author)

            if object_data is None:
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

    def _process_entry_activity(self, activity_data, recipient):
        """Process an entry activity and create/update the entry per spec, return serialized data."""
        try:
            # Get or create the entry author
            author_data = activity_data.get("author", {})
            author_url = author_data.get("id")

            if not author_url:
                logger.error("Entry activity missing author id")
                return None

            # Extract username from displayName or URL
            display_name = author_data.get("displayName", "")
            username = (
                display_name.lower().replace(" ", "_") if display_name else "unknown"
            )

            author, _ = Author.objects.get_or_create(
                url=author_url,
                defaults={
                    "id": activity_data.get("id"),
                    "username": username,
                    "displayName": author_data.get("displayName", ""),
                    "profileImage": author_data.get("profileImage", ""),
                    "host": author_data.get("host", ""),
                    "web": author_data.get("web", ""),
                },
            )

            # Create or update the entry
            entry_url = activity_data.get("id")
            entry_uuid = parse_uuid_from_url(entry_url) if entry_url else None

            # Use UUID if we can parse it, otherwise use the URL
            entry_id = entry_uuid if entry_uuid else None

            if entry_id:
                # If we have a UUID, try to find existing entry by ID first
                entry, created = Entry.objects.update_or_create(
                    id=entry_id,
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
                        "url": entry_url,
                        "web": activity_data.get("web", ""),
                        "published": activity_data.get("published"),
                    },
                )
            else:
                # Fallback to URL-based creation
                entry, created = Entry.objects.get_or_create(
                    url=entry_url,
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
                        "published": activity_data.get("published"),
                    },
                )

            # Return serialized entry data instead of the model object
            from app.serializers.entry import EntrySerializer

            return EntrySerializer(entry).data

        except Exception as e:
            logger.error(f"Error processing entry activity: {str(e)}")
            return None

    def _process_follow_activity(self, activity_data, recipient):
        """Process a follow activity and create the follow request per spec, return serialized data."""
        try:
            # Get follower information from actor
            actor_data = activity_data.get("actor", {})
            actor_url = actor_data.get("id")

            if not actor_url:
                logger.error("Follow activity missing actor id")
                return None

            # Extract username from displayName or URL
            display_name = actor_data.get("displayName", "")
            username = (
                display_name.lower().replace(" ", "_") if display_name else "unknown"
            )

            follower, _ = Author.objects.get_or_create(
                url=actor_url,
                defaults={
                    "username": username,
                    "displayName": actor_data.get("displayName", ""),
                    "profileImage": actor_data.get("profileImage", ""),
                    "host": actor_data.get("host", ""),
                    "web": actor_data.get("web", ""),
                },
            )

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

    def _process_like_activity(self, activity_data, recipient):
        """Process a like activity and create the like per spec, return serialized data."""
        try:
            # Get liker information
            author_data = activity_data.get("author", {})
            author_url = author_data.get("id")

            if not author_url:
                logger.error("Like activity missing author id")
                return None

            # Extract username from displayName or URL
            display_name = author_data.get("displayName", "")
            username = (
                display_name.lower().replace(" ", "_") if display_name else "unknown"
            )

            liker, _ = Author.objects.get_or_create(
                url=author_url,
                defaults={
                    "username": username,
                    "displayName": author_data.get("displayName", ""),
                    "profileImage": author_data.get("profileImage", ""),
                    "host": author_data.get("host", ""),
                    "web": author_data.get("web", ""),
                },
            )

            # Get the liked object URL
            object_url = activity_data.get("object")
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

            if like_uuid:
                # If we have a UUID, use it for the like ID
                like, _ = Like.objects.update_or_create(
                    id=like_uuid,
                    defaults={
                        "author": liker,
                        "entry": entry,
                        "comment": comment,
                        "url": like_url,
                    },
                )
            else:
                # Fallback to URL-based creation
                like, _ = Like.objects.get_or_create(
                    url=like_url,
                    defaults={
                        "author": liker,
                        "entry": entry,
                        "comment": comment,
                    },
                )

            # Return serialized like data instead of the model object
            from app.serializers.like import LikeSerializer

            return LikeSerializer(like).data

        except Exception as e:
            logger.error(f"Error processing like activity: {str(e)}")
            return None

    def _process_comment_activity(self, activity_data, recipient):
        """Process a comment activity and create the comment per spec, return serialized data."""
        try:
            # Get commenter information
            author_data = activity_data.get("author", {})
            author_url = author_data.get("id")

            if not author_url:
                logger.error("Comment activity missing author id")
                return None

            # Extract username from displayName or URL
            display_name = author_data.get("displayName", "")
            username = (
                display_name.lower().replace(" ", "_") if display_name else "unknown"
            )

            commenter, _ = Author.objects.get_or_create(
                url=author_url,
                defaults={
                    "username": username,
                    "displayName": author_data.get("displayName", ""),
                    "profileImage": author_data.get("profileImage", ""),
                    "host": author_data.get("host", ""),
                    "web": author_data.get("web", ""),
                },
            )

            # Get the entry being commented on (from 'entry' field per spec)
            entry_url = activity_data.get("entry")
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
                        "url": comment_url,
                    },
                )
            else:
                # Fallback to URL-based creation
                comment, _ = Comment.objects.get_or_create(
                    url=comment_url,
                    defaults={
                        "author": commenter,
                        "entry": entry,
                        "content": activity_data.get("comment", ""),
                        "content_type": activity_data.get(
                            "contentType", Entry.TEXT_PLAIN
                        ),
                    },
                )

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
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = AuthorSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = AuthorSerializer(queryset, many=True, context={"request": request})
        return Response({"type": "authors", "authors": serializer.data})

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
    def followers(self, request, pk=None):
        """
        GET [local, remote]: get a list of authors who are AUTHOR_SERIAL's followers

        Returns followers in the CMPUT 404 compliant format:
        {
            "type": "followers",
            "followers": [...]
        }
        """
        author = self.get_object()
        followers = author.get_followers()
        serializer = AuthorSerializer(
            followers, many=True, context={"request": request}
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
                remote_author = Author.objects.create(
                    id=author_id,
                    url=author_url,
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

                logger = logging.getLogger(__name__)
                logger.info(
                    f"Author not found locally, attempting to fetch from remote: {decoded_fqid}"
                )

                try:
                    # Extract the base host from the FQID
                    parsed_url = urlparse(decoded_fqid)
                    base_host = f"{parsed_url.scheme}://{parsed_url.netloc}"

                    # Find the corresponding node in our database
                    from app.models import Node

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
                            from app.models import Author
                            import uuid

                            try:
                                author_id = uuid.UUID(author_id_str)
                            except ValueError:
                                logger.warning(
                                    f"Could not extract valid UUID from FQID: {decoded_fqid}"
                                )
                                # Return the data without caching if we can't parse the ID
                                return Response(response.json())

                            remote_author = Author(
                                id=author_id,
                                url=decoded_fqid,
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
