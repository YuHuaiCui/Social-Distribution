from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from app.models import Follow, Author
from app.serializers.follow import FollowSerializer, FollowCreateSerializer
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from requests.auth import HTTPBasicAuth
import requests
import json
from app.utils import url_utils


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
    - GET /api/follows/requests/ - Get requesting follow requests
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
        Returns only requesting follow requests for the authenticated user by default
        """
        user_url = self.request.user.url

        # If this is the requests action, return requesting requests
        if self.action == "requests":
            return Follow.objects.filter(
                followed__url=user_url, status=Follow.REQUESTING
            )

        # Default behavior - incoming follow requests
        return Follow.objects.filter(followed__url=user_url, status=Follow.REQUESTING)

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

            # Note: Inbox functionality has been removed from the system

            # If following a remote author, send the follow request to their node
            if follow.followed.is_remote:
                self._send_follow_to_remote_node(follow)

            return Response(
                {"message": "Follow request sent successfully"},
                status=status.HTTP_201_CREATED,
            )

        except IntegrityError:
            return Response(
                {"error": "Follow request already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to create follow request: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _send_follow_to_remote_node(self, follow):
        """
        Send a follow request to a remote node's inbox using the spec format
        """
        try:
            remote_author = follow.followed
            if not remote_author.is_remote or not remote_author.node:
                return

            # Get the remote node
            remote_node = remote_author.node

            # Create follow data in the spec format
            follow_data = {
                "type": "follow",
                "summary": f"{follow.follower.displayName} wants to follow {follow.followed.displayName}",
                "actor": {
                    "type": "author",
                    "id": follow.follower.url,
                    "host": follow.follower.host,
                    "displayName": follow.follower.displayName,
                    "github": f"http://github.com/{follow.follower.github_username}" if follow.follower.github_username else "",
                    "profileImage": follow.follower.profileImage,
                    "web": follow.follower.web,
                },
                "object": {
                    "type": "author", 
                    "id": follow.followed.url,
                    "host": follow.followed.host,
                    "displayName": follow.followed.displayName,
                    "web": follow.followed.web,
                    "github": f"http://github.com/{follow.followed.github_username}" if follow.followed.github_username else "",
                    "profileImage": follow.followed.profileImage,
                }
            }

            # Construct proper inbox URL
            # Extract UUID from the author's URL
            from app.utils.url_utils import parse_uuid_from_url
            author_uuid = parse_uuid_from_url(remote_author.url)
            if not author_uuid:
                # Fallback: try to extract from the URL path
                author_uuid = remote_author.url.rstrip('/').split('/')[-1]
            
            inbox_url = f"{remote_node.host.rstrip('/')}/api/authors/{author_uuid}/inbox/"

            response = requests.post(
                inbox_url,
                json=follow_data,
                auth=HTTPBasicAuth(remote_node.username, remote_node.password),
                headers={"Content-Type": "application/json"},
                timeout=10,
            )

            if response.status_code in [200, 201]:
                print(f"Successfully sent follow request to {remote_author.displayName}")
            else:
                print(f"Failed to send follow request to {inbox_url}: {response.status_code}")

        except Exception as e:
            print(f"Error sending follow request to remote node: {str(e)}")

    def get_object(self):
        """
        Get the follow object by ID
        """
        follow_id = self.kwargs.get("pk")
        return get_object_or_404(Follow, id=follow_id)

    def destroy(self, request, *args, **kwargs):
        """
        Delete a follow relationship (unfollow)
        """
        follow = self.get_object()
        follow.delete()
        return Response(
            {"message": "Follow relationship deleted"}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["get"])
    def status(self, request):
        """
        Check follow status between two authors
        Query parameters: follower_url, followed_url
        """
        follower_url = request.query_params.get("follower_url")
        followed_url = request.query_params.get("followed_url")

        if not follower_url or not followed_url:
            return Response(
                {"error": "Both follower_url and followed_url are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Decode URL parameters in case they are percent-encoded
        follower_url = url_utils.percent_decode_url(follower_url)
        followed_url = url_utils.percent_decode_url(followed_url)

        try:
            follower = Author.objects.get(url=follower_url)
            followed = Author.objects.get(url=followed_url)
        except Author.DoesNotExist:
            return Response(
                {"error": "One or both authors not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if there's a follow relationship
        follow = Follow.objects.filter(follower=follower, followed=followed).first()

        if follow:
            return Response(
                {
                    "follower": follower_url,
                    "followed": followed_url,
                    "status": follow.status,
                    "created_at": follow.created_at,
                }
            )
        else:
            return Response(
                {
                    "follower": follower_url,
                    "followed": followed_url,
                    "status": "not_following",
                }
            )

    @action(detail=False, methods=["get"])
    def requests(self, request):
        """
        Get follow requests for the authenticated user
        Query parameter 'all_statuses=true' returns all follow requests regardless of status
        Otherwise returns only requesting follow requests
        """
        all_statuses = (
            request.query_params.get("all_statuses", "false").lower() == "true"
        )

        if all_statuses:
            # Return all follow requests regardless of status
            follow_requests = (
                Follow.objects.filter(followed__url=request.user.url)
                .select_related("follower")
                .order_by("-created_at")
            )
        else:
            # Return only requesting follow requests (default behavior)
            follow_requests = (
                Follow.objects.filter(
                    followed__url=request.user.url, status=Follow.REQUESTING
                )
                .select_related("follower")
                .order_by("-created_at")
            )

        serializer = self.get_serializer(follow_requests, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        """
        Accept a follow request
        """
        follow = self.get_object()

        # Check if the authenticated user is the one being followed
        if follow.followed.url != request.user.url:
            raise PermissionDenied("You can only accept follow requests sent to you")

        follow.status = Follow.ACCEPTED
        follow.save()

        # If this is a remote follow, send acceptance notification
        if follow.follower.is_remote:
            self._send_follow_response(follow, "Accept")

        return Response(
            {"message": "Follow request accepted"}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """
        Reject a follow request
        """
        follow = self.get_object()

        # Check if the authenticated user is the one being followed
        if follow.followed.url != request.user.url:
            raise PermissionDenied("You can only reject follow requests sent to you")

        follow.status = Follow.REJECTED
        follow.save()

        # If this is a remote follow, send rejection notification
        if follow.follower.is_remote:
            self._send_follow_response(follow, "Reject")

        return Response(
            {"message": "Follow request rejected"}, status=status.HTTP_200_OK
        )

    def _send_follow_response(self, follow, response_type):
        """
        Send follow response (Accept/Reject) to remote node using compliant format
        """
        try:
            remote_author = follow.follower
            if not remote_author.is_remote or not remote_author.node:
                return

            # Get the remote node credentials
            remote_node = remote_author.node

            # Create a follow object with the updated status for the response
            from app.models.follow import Follow

            # Update the follow status for the response
            if response_type == "Accept":
                follow.status = Follow.ACCEPTED
            elif response_type == "Reject":
                follow.status = Follow.REJECTED

            # Use the follow serializer to get the proper format
            response_data = FollowSerializer(follow).data

            # Add the response type to indicate this is an accept/reject
            response_data["response_type"] = response_type

            # Send to remote node's inbox
            # Extract author ID from the URL properly
            author_id = (
                remote_author.id.split("/")[-1]
                if remote_author.id.endswith("/")
                else remote_author.id.split("/")[-1]
            )
            inbox_url = f"{remote_author.host}authors/{author_id}/inbox/"

            response = requests.post(
                inbox_url,
                json=response_data,
                auth=HTTPBasicAuth(remote_node.username, remote_node.password),
                headers={"Content-Type": "application/activity+json"},
                timeout=5,
            )

            if response.status_code not in [200, 201, 202]:
                print(
                    f"Failed to send follow response to {inbox_url}: {response.status_code}"
                )

        except Exception as e:
            print(f"Error sending follow response: {str(e)}")


@api_view(['DELETE', 'PUT', 'GET'])
def remote_followers(request, author_serial, foreign_author_fqid):
    """
    Remote followers endpoint for foreign authors
    /api/authors/{AUTHOR_SERIAL}/followers/{FOREIGN_AUTHOR_FQID}
    
    DELETE: Remove FOREIGN_AUTHOR_FQID as a follower of AUTHOR_SERIAL (must be authenticated)
    PUT: Add FOREIGN_AUTHOR_FQID as a follower of AUTHOR_SERIAL (must be authenticated) 
    GET: Check if FOREIGN_AUTHOR_FQID is a follower of AUTHOR_SERIAL (returns 404 if not following)
    """
    if request.method in ['DELETE', 'PUT'] and not request.user.is_authenticated:
        return Response(
            {"error": "Authentication required"}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Get the local author
    try:
        local_author = Author.objects.get(id=author_serial)
    except Author.DoesNotExist:
        return Response(
            {"error": "Author not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Decode the foreign author FQID
    foreign_author_url = url_utils.percent_decode_url(foreign_author_fqid)
    
    # Get or create the foreign author
    try:
        foreign_author = Author.objects.get(url=foreign_author_url)
    except Author.DoesNotExist:
        return Response(
            {"error": "Foreign author not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'DELETE':
        # Remove foreign author as follower
        try:
            follow = Follow.objects.get(
                follower=foreign_author, 
                followed=local_author
            )
            follow.delete()
            return Response(
                {"message": "Foreign author removed as follower"}, 
                status=status.HTTP_200_OK
            )
        except Follow.DoesNotExist:
            return Response(
                {"error": "Follow relationship not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    elif request.method == 'PUT':
        # Add foreign author as follower
        try:
            follow, created = Follow.objects.get_or_create(
                follower=foreign_author,
                followed=local_author,
                defaults={'status': Follow.ACCEPTED}
            )
            if not created:
                # Update existing follow to accepted
                follow.status = Follow.ACCEPTED
                follow.save()
            
            return Response(
                {"message": "Foreign author added as follower"}, 
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to add follower: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method == 'GET':
        # Check if foreign author is a follower
        try:
            follow = Follow.objects.get(
                follower=foreign_author, 
                followed=local_author,
                status=Follow.ACCEPTED
            )
            return Response(
                {
                    "follower": foreign_author_url,
                    "followed": local_author.url,
                    "status": follow.status,
                    "created_at": follow.created_at
                },
                status=status.HTTP_200_OK
            )
        except Follow.DoesNotExist:
            return Response(
                {"error": "Follow relationship not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
