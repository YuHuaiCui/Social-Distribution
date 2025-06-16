from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from app.models import Follow, Author
from app.serializers.follow import FollowSerializer
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
    - GET /api/followers/ - View all users following the authenticated user (accepted requests) In authors.py model  
    - GET /api/following/ - View all users the authenticated user is following (accepted requests) In authors.py model
    """

    queryset = Follow.objects.all()
    serializer_class = FollowSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        """
        Filter queryset based on query parameters
        Returns only pending follow requests for the authenticated user
        """
        user_url = self.request.user.url
        # Incoming follow requests
        return Follow.objects.filter(followed__url=user_url, status=Follow.PENDING)

    def create(self, request, *args, **kwargs):
        """
        Create a new follow request
        Checks that:
        - User is not trying to follow themselves
        - Follow request doesn't already exist
        - Followed author exists
        """
        follower_url = request.user.url
        followed_url = request.data.get('followed')

        # Check if trying to follow self
        if follower_url == followed_url:
            return Response(
                {'error': 'Cannot follow yourself'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if follow request already exists
        if Follow.objects.filter(follower__url=follower_url, followed__url=followed_url).exists():
            return Response(
                {'error': 'Follow request already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the followed author
        followed_author = get_object_or_404(Author, url=followed_url)

        data = request.data.copy()
        data['follower'] = follower_url
        data['followed'] = followed_url
        data['status'] = Follow.PENDING

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        try:
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except IntegrityError:
            return Response(
                {'error': 'Follow request already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        """
        Save the follow request to the database.
        """
        serializer.save()

    def get_object(self):
        """
        Get the follow object and check permissions
        For accept/reject, checks if the user is the followed author
        For unfollow, checks if the user is the follower
        For other, uses the default queryset filtering
        """
        obj = get_object_or_404(Follow, pk=self.kwargs["pk"])
        
        # For accept/reject actions, check if the user is the followed author
        if self.action in ['accept', 'reject']:
            if obj.followed.url != self.request.user.url:
                raise PermissionDenied(detail='Not authorized to perform this action')

        # For unfollow, check if the user is the follower
        elif self.action == 'destroy':
            if obj.follower.url != self.request.user.url:
                raise PermissionDenied(detail='Not authorized to unfollow')

        # For other actions, use the default queryset filtering
        else:
            obj = get_object_or_404(self.get_queryset(), pk=self.kwargs["pk"])
        self.check_object_permissions(self.request, obj)
        return obj

    def unfollow(self, request, *args, **kwargs):
        """
        Unfollow an author
        Only the follower can unfollow the relationship
        Returns 204 on success
        """
        follow = self.get_object()
        follow.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """
        Accept a follow request
        Only the author that has the follow request can accept the request
        Returns 200 OK with status 'accepted' on success
        """
        follow = self.get_object()
        follow.status = Follow.ACCEPTED
        follow.save()
        return Response({'status': 'accepted'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject a follow request
        Only the author that has the follow request can reject the request
        Returns 200 OK with status 'rejected' on success
        """
        follow = self.get_object()
        follow.status = Follow.REJECTED
        follow.save()
        return Response({'status': 'rejected'})