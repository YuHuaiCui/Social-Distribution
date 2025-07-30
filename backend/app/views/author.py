from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.http import Http404
from urllib.parse import unquote

from app.models import Author, Entry, Follow
from app.serializers.author import AuthorSerializer, AuthorListSerializer
from app.serializers.entry import EntrySerializer
from app.serializers.follow import FollowSerializer
from app.serializers.collections import AuthorsSerializer, FollowersSerializer

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
        # If no type filter is specified, include both local and remote authors
        # Remote authors are already in the database from inbox processing

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
        GET = List entries visible to current user
        POST = Create a new entry (must be owner)

        For GET requests, applies visibility rules based on the relationship
        between the requesting user and the author whose entries are being viewed.

        For POST requests, ensures only the author can create entries for themselves
        to prevent spoofing.
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
            # Ensure only the author can post their own entry
            if not request.user.is_authenticated:
                return Response(
                    {"detail": "Not authorized to create entry for this author."},
                    status=403,
                )

            # Override author to ensure no spoofing
            author = request.user
            data = request.data.copy()
            data["author"] = str(author.id)

            # Auto-set source/origin URLs if not provided
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
                    if key != "profile_image_file":
                        update_data[key] = value

                # Handle profile image upload if present
                if "profile_image_file" in request.FILES:
                    image_file = request.FILES["profile_image_file"]

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

                    update_data["profile_image"] = profile_image_data_url

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

    @action(detail=True, methods=["post"], url_path="inbox")
    def post_to_inbox(self, request, pk=None):
        """
        Post an item to an author's inbox for federation support.

        This endpoint supports the ActivityPub-style inbox pattern where
        remote instances can deliver activities (follows, likes, comments, etc.)
        to local users.

        Expected data format:
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

            # Extract content information from request
            content_type = request.data.get("content_type")
            content_id = request.data.get("content_id")
            content_data = request.data.get("content_data", {})

            # Validate content type
            valid_types = ["entry", "comment", "like", "follow", "report"]
            if content_type not in valid_types:
                return Response(
                    {
                        "error": f"Invalid content_type. Must be one of: {', '.join(valid_types)}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create inbox item with the provided data
            inbox_item = Inbox.objects.create(
                recipient=recipient,
                item_type=content_type,
                raw_data={
                    "content_type": content_type,
                    "content_id": content_id,
                    **content_data,
                },
            )

            serializer = InboxItemSerializer(inbox_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

        # If this is a remote author, try to fetch fresh data from the remote node
        if instance.node is not None:
            from app.utils.remote import RemoteObjectFetcher
            import logging

            logger = logging.getLogger(__name__)
            logger.info(
                f"Fetching remote author data for {instance.username} from {instance.node.host}"
            )

            # Try to fetch fresh data from the remote node
            remote_data = RemoteObjectFetcher.fetch_author_by_url(instance.url)

            if remote_data:
                logger.info(
                    f"Successfully fetched remote author data for {instance.username}"
                )
                return Response(remote_data)
            else:
                logger.warning(
                    f"Failed to fetch remote author data for {instance.username}, falling back to local cache"
                )
            # If remote fetch fails, fall through to return local cached data

        # Return local data (either for local authors or as fallback for remote authors)
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
                    display_name=author_data.get("displayName", ""),
                    github_username=author_data.get("github", ""),
                    profile_image=author_data.get("profileImage", ""),
                    bio=author_data.get("bio", ""),
                    location=author_data.get("location", ""),
                    website=author_data.get("website", ""),
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

                # If this is a remote author, try to fetch fresh data from the remote node
                if author.node is not None:
                    from app.utils.remote import RemoteObjectFetcher
                    import logging

                    logger = logging.getLogger(__name__)
                    logger.info(
                        f"Fetching fresh remote author data for {author.username} from {author.node.host}"
                    )

                    # Try to fetch fresh data from the remote node
                    remote_data = RemoteObjectFetcher.fetch_author_by_url(author.url)

                    if remote_data:
                        logger.info(
                            f"Successfully fetched fresh remote author data for {author.username}"
                        )
                        return Response(remote_data)
                    else:
                        logger.warning(
                            f"Failed to fetch fresh remote author data for {author.username}, falling back to local cache"
                        )
                        # Fall through to return local cached data

                # Return local data (either for local authors or as fallback for remote authors)
                serializer = AuthorSerializer(author, context={"request": request})
                return Response(serializer.data)

            except Author.DoesNotExist:
                # Author not found locally, try to fetch from remote node
                from app.utils.remote import RemoteObjectFetcher
                import logging

                logger = logging.getLogger(__name__)
                logger.info(
                    f"Author not found locally, attempting to fetch from remote: {decoded_url}"
                )

                # Try to fetch fresh data from the remote node
                remote_data = RemoteObjectFetcher.fetch_author_by_url(decoded_url)

                if remote_data:
                    logger.info(
                        f"Successfully fetched remote author data from URL: {decoded_url}"
                    )
                    return Response(remote_data)
                else:
                    logger.warning(
                        f"Failed to fetch remote author data for URL: {decoded_url}"
                    )
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
