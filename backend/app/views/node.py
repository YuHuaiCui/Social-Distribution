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
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.decorators import permission_classes
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


class IsAdminUser(BasePermission):
    """
    Custom permission to only allow admin users to access node management.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_staff or request.user.is_superuser)
        )


class GetNodesView(APIView):
    permission_classes = [IsAdminUser]
    
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
    permission_classes = [IsAdminUser]
    
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

            # Check if trying to add self as a remote node
            from django.conf import settings
            current_host = settings.SITE_URL.rstrip('/')
            normalized_host = host.rstrip('/')
            
            if normalized_host == current_host:
                return Response(
                    {"error": "Cannot add this node as a remote node (this is the current node)"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if node already exists
            if Node.objects.filter(host=host).exists():
                return Response(
                    {"error": "Node already exists"}, status=status.HTTP_400_BAD_REQUEST
                )

            # Create the node
            node = serializer.save()

            # Fetch and store all authors from the remote node
            try:
                print(f"Starting to fetch authors from new node: {host}")
                self._fetch_and_store_remote_authors(node)
            except Exception as e:
                # Log the error but don't fail the node creation
                print(f"Warning: Failed to fetch authors from new node {host}: {str(e)}")
                import traceback
                traceback.print_exc()

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

    def _fetch_and_store_remote_authors(self, node):
        """
        Fetch all authors from a remote node and store them locally.
        
        Args:
            node: The Node object representing the remote node
        """
        try:
            page = 1
            authors_stored = 0
            
            while True:
                # Fetch authors from remote node with pagination
                url = f"{node.host.rstrip('/')}/api/authors/"
                print(f"Fetching authors from URL: {url}, page: {page}")
                
                response = requests.get(
                    url,
                    auth=HTTPBasicAuth(node.username, node.password),
                    params={"page": page, "size": 50},  # Fetch 50 at a time
                    timeout=10,
                )
                
                print(f"Response status: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"Failed to fetch authors from {node.host}: {response.status_code}")
                    print(f"Response content: {response.text[:500]}")  # First 500 chars
                    break
                
                data = response.json()
                print(f"Response data keys: {data.keys()}")
                
                # Handle both formats: CMPUT 404 spec format and DRF pagination format
                if "authors" in data:
                    # CMPUT 404 spec format
                    authors = data.get("authors", [])
                elif "results" in data:
                    # Django REST Framework pagination format
                    authors = data.get("results", [])
                else:
                    print(f"Unexpected response format. Keys: {data.keys()}")
                    authors = []
                
                print(f"Found {len(authors)} authors on page {page}")
                
                if not authors:
                    print("No more authors to fetch")
                    break  # No more authors to fetch
                
                # Store each author locally
                for author_data in authors:
                    try:
                        stored = self._store_remote_author(author_data, node)
                        if stored:
                            authors_stored += 1
                    except Exception as e:
                        print(f"Failed to store author {author_data.get('id', 'unknown')}: {str(e)}")
                        continue
                
                # Check if there are more pages
                if "next" in data and data["next"]:
                    # DRF pagination - use next URL if available
                    page += 1
                elif len(authors) < 50:
                    # CMPUT 404 format - check by count
                    break  # Last page
                else:
                    page += 1
            
            print(f"Successfully stored {authors_stored} authors from {node.host}")
            
        except requests.RequestException as e:
            print(f"Network error fetching authors from {node.host}: {str(e)}")
            raise
        except Exception as e:
            print(f"Unexpected error fetching authors from {node.host}: {str(e)}")
            raise

    def _store_remote_author(self, author_data, node):
        """
        Store a single remote author locally.
        
        Args:
            author_data: Dictionary containing author information from remote node
            node: The Node object representing the remote node
        """
        from uuid import UUID
        
        try:
            # Extract author ID from the URL
            author_url = author_data.get("id", "")
            if not author_url:
                print(f"Author data missing ID: {author_data}")
                return False
            
            # Check if author's host matches the remote node's host
            author_host = author_data.get("host", "")
            node_host = node.host.rstrip("/")
            
            # Normalize hosts for comparison (remove trailing slashes)
            author_host_normalized = author_host.rstrip("/")
            
            # Check if the author is local to this remote node
            # The author's host should contain the node's host URL
            if not author_host_normalized or node_host not in author_host_normalized:
                print(f"Skipping author from different host: {author_host} (expected to contain {node_host})")
                return False
            
            # Try to parse UUID from the URL
            # Remove trailing slash and split
            url_parts = author_url.rstrip("/").split("/")
            author_id_str = url_parts[-1]
            
            print(f"Extracting UUID from URL: {author_url}")
            print(f"Extracted ID string: {author_id_str}")
            
            try:
                author_id = UUID(author_id_str)
                print(f"Successfully parsed UUID: {author_id}")
            except ValueError:
                print(f"Invalid UUID in author URL: {author_url}")
                print(f"Failed to parse: '{author_id_str}'")
                return False
            
            # Check if author already exists
            existing_author = Author.objects.filter(id=author_id).first()
            
            if existing_author:
                # Update existing remote author
                existing_author.url = author_url
                existing_author.displayName = author_data.get("displayName", "")
                existing_author.github_username = self._extract_github_username(author_data.get("github", ""))
                existing_author.profileImage = author_data.get("profileImage") or ""  # Ensure empty string instead of None
                existing_author.host = author_data.get("host", "")
                existing_author.web = author_data.get("web", "")
                existing_author.node = node
                existing_author.is_approved = True  # Remote authors are auto-approved
                existing_author.save()
                print(f"Updated existing remote author: {existing_author.displayName}")
            else:
                # Create new remote author (bypass create_user to avoid password requirement)
                remote_author = Author(
                    id=author_id,
                    url=author_url,
                    username=author_data.get("displayName", f"remote_user_{author_id_str[:8]}"),
                    displayName=author_data.get("displayName", ""),
                    github_username=self._extract_github_username(author_data.get("github", "")),
                    profileImage=author_data.get("profileImage") or "",  # Ensure empty string instead of None
                    host=author_data.get("host", ""),
                    web=author_data.get("web", ""),
                    node=node,
                    is_approved=True,  # Remote authors are auto-approved
                    is_active=False,  # Remote authors can't log in
                    password="!",  # Unusable password
                )
                remote_author.save()
                print(f"Created new remote author: {remote_author.displayName}")
            
            return True
                
        except Exception as e:
            print(f"Error storing remote author: {str(e)}")
            raise

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


class UpdateNodeView(APIView):
    permission_classes = [IsAdminUser]
    
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

            # Refetch authors from the updated node
            try:
                print(f"Refetching authors from updated node: {host}")
                AddNodeView()._fetch_and_store_remote_authors(node_obj)
            except Exception as e:
                print(f"Warning: Failed to refetch authors from updated node {host}: {str(e)}")

            return Response(
                {"message": "Node updated successfully!"}, status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Unable to edit node: {str(e)}")
            return Response(
                {"error": "Failed to update node. Please try again later."}, status=500
            )


class RefreshNodeView(APIView):
    permission_classes = [IsAdminUser]
    
    @extend_schema(
        summary="Refresh authors from a Node.",
        description="Refetch and update all authors from an existing Node.",
        request={
            "type": "object",
            "properties": {
                "host": {"type": "string", "example": "http://192.168.1.72:8000"}
            },
            "required": ["host"]
        },
        responses={
            status.HTTP_200_OK: OpenApiResponse(
                description="Authors refreshed successfully.",
                response={
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "example": "Authors refreshed successfully! Stored 5 authors.",
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
    def post(self, request):
        """
        Refresh authors from an existing node.
        """
        try:
            host = request.data.get("host")
            
            if not host:
                return Response(
                    {"error": "Host is required."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            node_obj = get_object_or_404(Node, host=host)
            
            # Fetch and store authors from the node
            try:
                print(f"Refreshing authors from node: {host}")
                AddNodeView()._fetch_and_store_remote_authors(node_obj)
                return Response(
                    {"message": "Authors refreshed successfully!"}, 
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                print(f"Failed to refresh authors from node {host}: {str(e)}")
                return Response(
                    {"error": "Failed to refresh authors from node."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            print(f"Unable to refresh node: {str(e)}")
            return Response(
                {"error": "Failed to refresh node. Please try again later."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DeleteNodeView(APIView):
    permission_classes = [IsAdminUser]
    
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
            base_host = url_utils.get_base_host(host)

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
