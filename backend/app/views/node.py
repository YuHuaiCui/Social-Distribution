from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiResponse,
    OpenApiExample,
)
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from django.core.validators import URLValidator
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from urllib.parse import urlparse
from ..models import Node, Follow, Author
from ..serializers import (
    NodeSerializer,
    NodeWithAuthenticationSerializer,
    NodeCreateSerializer,
)
from ..utils import url_utils
from requests.auth import HTTPBasicAuth
import requests
import random
import os


class GetNodesView(APIView):
    @extend_schema(
        summary="Fetch the list of Nodes.",
        description="Fetch a list of all nodes (Node entries), including their host, username, password, and authentication status.",
        responses={
            status.HTTP_200_OK: OpenApiResponse(
                description="A list of Node users retrieved successfully.",
                response={
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "host": {"type": "string", "example": "http://example.com"},
                            "username": {"type": "string", "example": "node1"},
                            "password": {
                                "type": "string",
                                "example": "securepassword123",
                            },
                            "is_authenticated": {"type": "boolean", "example": True},
                        },
                    },
                },
            ),
        },
        tags=["Node API"],
    )
    def get(self, request):
        """
        Fetch the list of `Node` table.
        """
        # Return all node fields for the frontend
        nodes = Node.objects.all()
        serializer = NodeSerializer(nodes, many=True)
        print(f"GetNodesView: Returning {len(serializer.data)} nodes")
        print(f"GetNodesView: Data: {serializer.data}")
        return Response(serializer.data, status=status.HTTP_200_OK)


class AddNodeView(APIView):
    @extend_schema(
        summary="Adds a new Node.",
        description="Create a new Node object by providing the `host`, `username`, and `password`. The `is_active` status defaults to True.",
        request=NodeCreateSerializer,
        responses={
            status.HTTP_201_CREATED: OpenApiResponse(
                description="Node created successfully.",
                response={
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "example": "Node added successfully",
                        }
                    },
                },
            ),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(
                description="Invalid input or missing required fields.",
                response={
                    "type": "object",
                    "properties": {
                        "error": {
                            "type": "string",
                            "example": "Missing required fields.",
                        }
                    },
                },
            ),
        },
        tags=["Node API"],
    )
    def post(self, request):
        """
        Add a node to Node by providing the node's URL, username, and password.
        """
        serializer = NodeCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"error": "Invalid input data", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Validate URL format
            url_validator = URLValidator()
            host = serializer.validated_data["host"]

            # Add scheme if missing
            parsed_url = urlparse(host)
            if not parsed_url.scheme:
                host = f"http://{host}"
                serializer.validated_data["host"] = host

            url_validator(host)

            # Check if node already exists
            if Node.objects.filter(host=host).exists():
                return Response(
                    {"error": "Node already exists"}, status=status.HTTP_400_BAD_REQUEST
                )

            # Create the node
            node = serializer.save()

            return Response(
                {"message": "Node added successfully"}, status=status.HTTP_201_CREATED
            )

        except DjangoValidationError:
            return Response(
                {"error": "Invalid URL."}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to create node: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class UpdateNodeView(APIView):
    @extend_schema(
        summary="Update details of a Node.",
        description="Update an existing Node object by providing the `host`, `username`, `password`, and `is_active` fields.",
        request=NodeWithAuthenticationSerializer,
        responses={
            status.HTTP_200_OK: OpenApiResponse(
                description="Node updated successfully.",
                response={
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "example": "Node updated successfully!",
                        }
                    },
                },
            ),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(
                description="Invalid input or missing required fields.",
                response={
                    "type": "object",
                    "properties": {
                        "error": {"type": "string", "example": "Host is required."}
                    },
                },
            ),
            status.HTTP_404_NOT_FOUND: OpenApiResponse(
                description="Node not found.",
                response={
                    "type": "object",
                    "properties": {
                        "error": {"type": "string", "example": "Node not found."}
                    },
                },
            ),
        },
        tags=["Node API"],
    )
    def put(self, request):
        """
        Update an existing Node object.
        """
        try:
            host = request.data.get("host")
            username = request.data.get("username")
            password = request.data.get("password")
            is_auth = request.data.get("isAuth")
            old_host = request.data.get("oldHost")

            if not old_host:
                return Response(
                    {"error": "Old host is required to locate the node."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not host:
                return Response(
                    {"error": "Host is required."}, status=status.HTTP_400_BAD_REQUEST
                )

            if is_auth not in [True, False]:
                return Response(
                    {"error": "Status must be boolean."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not username or not password:
                return Response(
                    {"error": "Username and password are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            url_validator = URLValidator()
            try:
                url_validator(host)
            except DjangoValidationError:
                return Response(
                    {"error": "Invalid URL for host."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            parsed_url = urlparse(host)
            if not parsed_url.scheme:
                host = f"http://{host}"

            try:
                url_validator(host)
            except DjangoValidationError:
                return Response(
                    {"error": "Invalid URL after adding scheme."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            node_obj = get_object_or_404(Node, host=old_host)
            node_obj.host = host
            node_obj.username = username
            node_obj.password = password
            node_obj.is_active = is_auth
            node_obj.save()

            return Response(
                {"message": "Node updated successfully!"}, status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Unable to edit node: {str(e)}")
            return Response(
                {"error": "Failed to update node. Please try again later."}, status=500
            )


class DeleteNodeView(APIView):
    @extend_schema(
        summary="Delete a Node.",
        description="Remove a Node object from the system by providing the `username` of the node to be deleted.",
        parameters=[
            OpenApiParameter(
                name="username",
                description="The `username` of the node to be deleted.",
                type=str,
                required=True,
                location=OpenApiParameter.QUERY,
            ),
        ],
        responses={
            status.HTTP_200_OK: OpenApiResponse(
                description="Node deleted successfully.",
                response={
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "example": "Node removed successfully",
                        }
                    },
                },
            ),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(
                description="Missing required field (username).",
                response={
                    "type": "object",
                    "properties": {
                        "error": {
                            "type": "string",
                            "example": "Missing required field.",
                        }
                    },
                },
            ),
            status.HTTP_404_NOT_FOUND: OpenApiResponse(
                description="Node not found.",
                response={
                    "type": "object",
                    "properties": {
                        "error": {"type": "string", "example": "Node not found."}
                    },
                },
            ),
        },
        tags=["Node API"],
    )
    def delete(self, request):
        """
        Remove a node from Node (hard-delete).
        """
        # Support both query parameter and request body
        node_identifier = request.query_params.get("username") or request.data.get(
            "host"
        )

        if not node_identifier:
            return Response(
                {"error": "Missing required field (username or host)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Try to find by host first, then by username
            try:
                node = Node.objects.get(host=node_identifier)
            except Node.DoesNotExist:
                node = Node.objects.get(username=node_identifier)

            node.delete()

            return Response(
                {"message": "Node removed successfully"}, status=status.HTTP_200_OK
            )
        except Node.DoesNotExist:
            return Response(
                {"error": "Node not found."}, status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(
    summary="Check Follow Status of Remote Followee.",
    description="Check if the local user with `local_serial` is following the remote user with `remote_fqid`.",
    parameters=[
        OpenApiParameter(
            name="local_serial",
            description="UUID of the local user whose following status we want to check.",
            type=str,
            required=True,
            location=OpenApiParameter.PATH,
        ),
        OpenApiParameter(
            name="remote_fqid",
            description="Fully qualified ID (FQID) of the remote followee to check.",
            type=str,
            required=True,
            location=OpenApiParameter.PATH,
        ),
    ],
    responses={
        status.HTTP_200_OK: OpenApiResponse(
            description="The local user is following the remote followee.",
            response={
                "type": "object",
                "properties": {"is_follower": {"type": "boolean", "example": True}},
            },
        ),
        status.HTTP_404_NOT_FOUND: OpenApiResponse(
            description="The local user is not following the remote followee.",
            response={
                "type": "object",
                "properties": {"is_follower": {"type": "boolean", "example": False}},
            },
        ),
    },
    tags=["Remote API"],
)
class RemoteFolloweeView(APIView):
    def get(self, request, local_serial, remote_fqid):
        """
        Checks if our local user with `local_serial` is following remote followee with `remote_fqid`
        """
        # Instead of calling remote server, we can check our Follow table
        follower = Follow.objects.filter(
            follower__id=local_serial, followed__url__contains=remote_fqid
        )

        if follower:
            return Response({"is_follower": True}, status=200)
        else:
            return Response({"is_follower": False}, status=404)


@extend_schema(
    summary="Retrieve Remote Authors.",
    description="Fetch a list of remote authors from remote nodes listed in Node, using basic authentication.",
    responses={
        status.HTTP_200_OK: OpenApiResponse(
            description="A response containing a list of selected remote authors.",
            response={
                "type": "object",
                "properties": {
                    "type": {"type": "string", "example": "authors"},
                    "authors": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string", "example": "author"},
                                "id": {
                                    "type": "string",
                                    "example": "http://nodeaaaa/api/authors/111",
                                },
                                "host": {
                                    "type": "string",
                                    "example": "http://nodeaaaa/api/",
                                },
                                "displayName": {
                                    "type": "string",
                                    "example": "Greg Johnson",
                                },
                                "github": {
                                    "type": "string",
                                    "example": "http://github.com/gjohnson",
                                },
                                "profileImage": {
                                    "type": "string",
                                    "example": "https://i.imgur.com/k7XVwpB.jpeg",
                                },
                                "page": {
                                    "type": "string",
                                    "example": "http://nodeaaaa/authors/greg",
                                },
                            },
                        },
                    },
                },
            },
        ),
        status.HTTP_500_INTERNAL_SERVER_ERROR: OpenApiResponse(
            description="An error occurred while fetching remote authors."
        ),
    },
    tags=["Remote API"],
)
class RemoteAuthorsView(APIView):
    def get(self, request):
        """
        Fetch remote authors for recommended panel section.
        """
        if not request.user:
            return Response({"recommended_authors": []}, status=status.HTTP_200_OK)

        try:
            all_remote_authors = []
            node_users = Node.objects.filter(is_active=True)

            for node in node_users:
                # We send our local credentials to the remote host
                authors = self.fetch_remote_authors(
                    node.host, node.username, node.password
                )
                all_remote_authors.extend(authors)

            random_authors = (
                self.select_random_authors(all_remote_authors, request.user.id)
                if all_remote_authors
                else []
            )

            return Response(
                {"recommended_authors": random_authors}, status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def fetch_remote_authors(self, host, username, password, page=1, size=3):
        """
        Use BasicAuth to call remote endpoints with the given credentials.
        """
        try:
            base_host = url_parser.get_base_host(host)

            # Send a GET request to the remote node's authors endpoint
            response = requests.get(
                f"{base_host}/api/authors/",
                auth=HTTPBasicAuth(username, password),
                params={"page": page, "size": size},
                timeout=5,
            )

            # Check if request was successful
            if response.status_code == 200:
                # Extract authors list from JSON response
                return response.json().get("authors", [])
            else:
                # This could mean the remote node does not grant us access to their data
                print(f"Failed to fetch authors from {host}: {response.status_code}")
                return []

        except requests.RequestException as e:
            print(f"Error fetching authors from {host}: {e}")
            return []

    def select_random_authors(self, authors, local_serial, min_count=5, max_count=5):
        """
        Randomly select authors from a list.

        Args:
        - authors (list): List of author dictionaries.
        - min_count (int): Minimum number of authors to select.
        - max_count (int): Maximum number of authors to select.

        Returns:
        - list: List of randomly selected authors.
        """

        def is_followed(author_id):
            """
            Check if the local user is already following the given author.

            Args:
            - author_id (str): The ID of the remote author.

            Returns:
            - bool: True if the author is followed, False otherwise.
            """

            # Create a mock request for the RemoteFolloweeView
            class MockRequest:
                pass

            mock_request = MockRequest()
            response = RemoteFolloweeView().get(mock_request, local_serial, author_id)
            return response.status_code == 200

        # Filter out authors already followed
        unfollowed_authors = [
            author for author in authors if not is_followed(author["id"])
        ]
        count = min(len(unfollowed_authors), random.randint(min_count, max_count))

        # If there are fewer unfollowed authors than min_count, return all of them
        if len(unfollowed_authors) <= min_count:
            return unfollowed_authors

        # Otherwise, sample the desired number from unfollowed authors
        return random.sample(unfollowed_authors, count)
