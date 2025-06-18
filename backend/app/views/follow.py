from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from app.models import Follow, Author
from app.models.inbox import Inbox
from app.serializers.follow import FollowSerializer, FollowCreateSerializer
from rest_framework.decorators import api_view
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied


class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    """
    Only allow authenticated users to perform actions other than read operations
    """

    def has_permission(self, request, view):

        # Allow read operations for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # Require authentication for all other operations
        return request.user and request.user.is_authenticated


class FollowViewSet(viewsets.ModelViewSet):
    """
    View for followers and follow requests

    - POST /api/follows/ - Send follow request {"followed": "author_url"}
    - GET /api/follows/ - View incoming follow requests (to user)
    - POST /api/follows/<id>/accept - Accept an incoming follow request
    - POST /api/follows/<id>/reject - Reject an incoming follow request
    - DELETE /api/follows/<id>/ - Unfollow/delete a follow relationship
    - GET /api/follows/status/ - Check follow status between two authors
    - GET /api/follows/requests/ - Get pending follow requests
    """

    queryset = Follow.objects.all()
    serializer_class = FollowSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == "create":
            return FollowCreateSerializer
        return FollowSerializer

    def get_queryset(self):
        """
        Filter queryset based on query parameters
        Returns only pending follow requests for the authenticated user by default
        """
        user_url = self.request.user.url

        # If this is the requests action, return pending requests
        if self.action == "requests":
            return Follow.objects.filter(followed__url=user_url, status=Follow.PENDING)

        # Default behavior - incoming follow requests
        return Follow.objects.filter(followed__url=user_url, status=Follow.PENDING)

    def list(self, request, *args, **kwargs):
        """
        List incoming follow requests for the authenticated user
        Returns a simple list (not paginated) for backwards compatibility
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """
        Create a new follow request
        Uses the FollowCreateSerializer for validation and creation
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            follow = serializer.save()

            # Create inbox item for the followed user
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
                        "profile_image": (
                            follow.follower.profile_image.url
                            if follow.follower.profile_image
                            else None
                        ),
                    },
                    "object": follow.followed.url,
                    "status": follow.status,
                },
            )

            # Return the follow object using the main serializer
            response_serializer = FollowSerializer(follow)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except IntegrityError:
            return Response(
                {"error": "Follow request already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def get_object(self):
        """
        Get the follow object and check permissions
        For accept/reject, checks if the user is the followed author
        For unfollow, checks if the user is the follower
        For other, uses the default queryset filtering
        """
        obj = get_object_or_404(Follow, pk=self.kwargs["pk"])

        # For accept/reject actions, check if the user is the followed author
        if self.action in ["accept", "reject"]:
            if obj.followed.url != self.request.user.url:
                raise PermissionDenied(detail="Not authorized to perform this action")

        # For unfollow, check if the user is the follower
        elif self.action == "destroy":
            if obj.follower.url != self.request.user.url:
                raise PermissionDenied(detail="Not authorized to unfollow")

        # For other actions, use the default queryset filtering
        else:
            obj = get_object_or_404(self.get_queryset(), pk=self.kwargs["pk"])
        self.check_object_permissions(self.request, obj)
        return obj

    def destroy(self, request, *args, **kwargs):
        """
        Unfollow an author
        Only the follower can unfollow the relationship
        Returns 204 on success
        """
        follow = self.get_object()
        follow.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def status(self, request):
        """
        Check follow status between two authors
        Query params: follower (author URL), followed (author URL)
        """
        follower_url = request.query_params.get("follower")
        followed_url = request.query_params.get("followed")

        if not follower_url or not followed_url:
            return Response(
                {"error": "Both follower and followed parameters are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            follower = Author.objects.get(url=follower_url)
            followed = Author.objects.get(url=followed_url)
        except Author.DoesNotExist:
            return Response(
                {"error": "One or both authors not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check follow status
        follow_relation = Follow.objects.filter(
            follower=follower, followed=followed
        ).first()
        reverse_follow = Follow.objects.filter(
            follower=followed, followed=follower
        ).first()

        is_following = (
            follow_relation is not None and follow_relation.status == Follow.ACCEPTED
        )
        is_followed_by = (
            reverse_follow is not None and reverse_follow.status == Follow.ACCEPTED
        )
        is_friends = is_following and is_followed_by

        response_data = {
            "is_following": is_following,
            "is_followed_by": is_followed_by,
            "is_friends": is_friends,
        }

        if follow_relation:
            response_data["follow_status"] = follow_relation.status

        return Response(response_data)

    @action(detail=False, methods=["get"])
    def requests(self, request):
        """
        Get pending follow requests for current user
        Handles pagination via query params
        """
        queryset = self.get_queryset()

        # Handle pagination if needed
        page = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 20)

        try:
            page = int(page)
            page_size = int(page_size)
        except ValueError:
            page = 1
            page_size = 20

        # Simple pagination
        start = (page - 1) * page_size
        end = start + page_size

        paginated_queryset = queryset[start:end]
        total_count = queryset.count()

        serializer = FollowSerializer(paginated_queryset, many=True)

        return Response(
            {
                "results": serializer.data,
                "count": total_count,
                "page": page,
                "page_size": page_size,
                "has_next": end < total_count,
                "has_previous": page > 1,
            }
        )

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        """
        Accept a follow request
        Only the author that has the follow request can accept the request
        Returns 200 OK with status 'accepted' on success
        """
        follow = self.get_object()
        follow.status = Follow.ACCEPTED
        follow.save()
        return Response({"status": "accepted"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """
        Reject a follow request
        Only the author that has the follow request can reject the request
        Returns 200 OK with status 'rejected' on success
        """
        follow = self.get_object()
        follow.status = Follow.REJECTED
        follow.save()
        return Response({"status": "rejected"})
