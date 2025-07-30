"""
Remote Node Communication Utilities

This module provides utilities for communicating with remote federated nodes,
including authentication, request handling, and activity federation.
"""

from xmlrpc import client
import requests
from requests.auth import HTTPBasicAuth
import json
import logging
from urllib.parse import urljoin, urlparse
from django.conf import settings
from django.core.exceptions import ValidationError
from app.models import Node, Author

logger = logging.getLogger(__name__)


class RemoteNodeError(Exception):
    """Exception raised for remote node communication errors"""

    pass


class RemoteNodeAuth:
    """Handle authentication with remote nodes"""

    @staticmethod
    def get_auth_for_node(node):
        """Get HTTPBasicAuth for a node"""
        if not node or not node.username or not node.password:
            raise RemoteNodeError(f"Invalid authentication credentials for node {node}")
        return HTTPBasicAuth(node.username, node.password)

    @staticmethod
    def authenticate_incoming_request(request):
        """Authenticate incoming request from remote node"""
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")

        if not auth_header.startswith("Basic "):
            return None

        try:
            import base64

            encoded_credentials = auth_header.split(" ")[1]
            decoded_credentials = base64.b64decode(encoded_credentials).decode("utf-8")
            username, password = decoded_credentials.split(":", 1)

            # Find matching node
            node = Node.objects.filter(
                username=username, password=password, is_active=True
            ).first()

            return node
        except Exception as e:
            logger.warning(f"Failed to authenticate incoming request: {e}")
            return None


class RemoteNodeClient:
    """Client for making requests to remote nodes"""

    def __init__(self, node):
        self.node = node
        print(f"[DEBUG] RemoteNodeClient created for node: {node.name}")
        print(f"[DEBUG] Node host: {node.host}")
        print(f"[DEBUG] Node username: {node.username}")
        print(f"[DEBUG] Node has password: {'Yes' if node.password else 'No'}")
        print(f"[DEBUG] Node is active: {node.is_active}")

        self.auth = RemoteNodeAuth.get_auth_for_node(node)
        self.base_url = node.host.rstrip("/")
        self.session = requests.Session()
        self.session.auth = self.auth
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "User-Agent": f"SocialDistribution/{settings.SITE_URL}",
            }
        )

        print(f"[DEBUG] Base URL: {self.base_url}")
        print(f"[DEBUG] Auth setup complete")

    def get(self, path, timeout=30, **kwargs):
        """Make GET request to remote node"""
        url = urljoin(self.base_url, path.lstrip("/"))
        try:
            response = self.session.get(url, timeout=timeout, **kwargs)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            logger.error(f"GET request failed to {url}: {e}")
            raise RemoteNodeError(f"Failed to GET {url}: {e}")

    def post(self, path, data=None, **kwargs):
        """Make POST request to remote node"""
        url = urljoin(self.base_url, path.lstrip("/"))
        try:
            if data:
                kwargs["json"] = data

            # Debug logging for federation requests
            print(f"[DEBUG] RemoteNodeClient POST to: {url}")
            print(f"[DEBUG] Node: {self.node.name}")
            print(f"[DEBUG] Auth username: {self.node.username}")
            print(f"[DEBUG] Session headers: {dict(self.session.headers)}")
            print(f"[DEBUG] Auth type: {type(self.session.auth)}")
            if hasattr(self.session.auth, "username"):
                print(
                    f"[DEBUG] Auth username from session: {self.session.auth.username}"
                )
            print(f"[DEBUG] Request kwargs: {kwargs}")

            response = self.session.post(url, timeout=30, **kwargs)
            print(f"[DEBUG] Response status: {response.status_code}")
            print(f"[DEBUG] Response headers: {dict(response.headers)}")
            try:
                print(f"[DEBUG] Response content: {response.text[:500]}")
            except:
                print(f"[DEBUG] Could not decode response content")

            response.raise_for_status()
            return response
        except requests.RequestException as e:
            print(f"[DEBUG] POST request exception: {e}")
            logger.error(f"POST request failed to {url}: {e}")
            raise RemoteNodeError(f"Failed to POST {url}: {e}")

    def put(self, path, data=None, **kwargs):
        """Make PUT request to remote node"""
        url = urljoin(self.base_url, path.lstrip("/"))
        try:
            if data:
                kwargs["json"] = data
            response = self.session.put(url, timeout=30, **kwargs)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            logger.error(f"PUT request failed to {url}: {e}")
            raise RemoteNodeError(f"Failed to PUT {url}: {e}")

    def delete(self, path, **kwargs):
        """Make DELETE request to remote node"""
        url = urljoin(self.base_url, path.lstrip("/"))
        try:
            response = self.session.delete(url, timeout=30, **kwargs)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            logger.error(f"DELETE request failed to {url}: {e}")
            raise RemoteNodeError(f"Failed to DELETE {url}: {e}")


class RemoteObjectFetcher:
    """Fetch and cache remote objects"""

    @staticmethod
    def fetch_author_by_url(author_url):
        """Fetch author data from remote node by URL"""
        try:
            # Use FederationService for better localhost handling
            from app.utils.federation import FederationService

            # Skip if this is the same localhost instance (self-federation)
            if FederationService.is_same_localhost_instance(author_url):
                logger.info(f"Skipping self-federation for author: {author_url}")
                return None

            # Get the appropriate node for this URL
            node = FederationService.get_node_for_url(author_url)

            if not node:
                logger.warning(f"No node found for author URL: {author_url}")
                return None

            client = RemoteNodeClient(node)

            # Extract author ID from URL
            parsed = urlparse(author_url)
            path_parts = parsed.path.strip("/").split("/")
            if "authors" in path_parts:
                author_index = path_parts.index("authors")
                if author_index + 1 < len(path_parts):
                    author_id = path_parts[author_index + 1]

                    # Try to fetch author data
                    try:
                        response = client.get(f"/api/authors/{author_id}/")
                        return response.json()
                    except RemoteNodeError:
                        # Try alternative path
                        response = client.get(f"/authors/{author_id}/")
                        return response.json()

            return None
        except Exception as e:
            logger.error(f"Failed to fetch author {author_url}: {e}")
            return None

    @staticmethod
    def fetch_entry_by_url(entry_url):
        """Fetch entry data from remote node by URL"""
        try:
            # Use FederationService for better localhost handling
            from app.utils.federation import FederationService

            # Skip if this is the same localhost instance (self-federation)
            if FederationService.is_same_localhost_instance(entry_url):
                logger.info(f"Skipping self-federation for entry: {entry_url}")
                return None

            # Get the appropriate node for this URL
            node = FederationService.get_node_for_url(entry_url)

            if not node:
                logger.warning(f"No node found for entry URL: {entry_url}")
                return None

            client = RemoteNodeClient(node)

            # Try to fetch entry data directly by URL path
            parsed = urlparse(entry_url)
            response = client.get(parsed.path)
            return response.json()

        except Exception as e:
            logger.error(f"Failed to fetch entry {entry_url}: {e}")
            return None


class RemoteActivitySender:
    """Send activities to remote nodes"""

    @staticmethod
    def _extract_author_id_from_url(author_url, fallback_id):
        """
        Extract author ID from author URL for inbox endpoints.

        For remote authors, we need to use the ID from their URL, not the local database ID.

        Args:
            author_url: The author's URL (e.g., http://host/api/authors/{id}/)
            fallback_id: The local database ID to use as fallback

        Returns:
            str: The extracted author ID or fallback_id
        """
        if not author_url:
            return fallback_id

        try:
            from urllib.parse import urlparse

            parsed_url = urlparse(author_url)
            path_parts = parsed_url.path.strip("/").split("/")

            # Look for the author ID in the path
            if "authors" in path_parts:
                author_index = path_parts.index("authors")
                if author_index + 1 < len(path_parts):
                    extracted_id = path_parts[author_index + 1]
                    print(
                        f"[DEBUG] Extracted author ID from URL {author_url}: {extracted_id}"
                    )
                    return extracted_id

            print(
                f"[DEBUG] Could not extract author ID from URL {author_url}, using fallback: {fallback_id}"
            )
            return fallback_id

        except Exception as e:
            print(f"[DEBUG] Error extracting author ID from URL {author_url}: {e}")
            print(f"[DEBUG] Using fallback ID: {fallback_id}")
            return fallback_id

    @staticmethod
    def send_follow_request(follower, followed):
        """Send follow request to remote node using compliant format"""
        if not followed.node:
            return False

        try:
            client = RemoteNodeClient(followed.node)

            # Create a temporary follow object to use with the follow serializer
            from app.models.follow import Follow
            from app.serializers.follow import FollowSerializer

            temp_follow = Follow(
                follower=follower, followed=followed, status=Follow.REQUESTING
            )

            # Use the follow serializer to get the proper format
            follow_data = FollowSerializer(temp_follow).data

            # Extract the correct author ID for the inbox endpoint
            followed_author_id = RemoteActivitySender._extract_author_id_from_url(
                followed.url, followed.id
            )

            print(
                f"[DEBUG] Sending follow request to: /api/authors/{followed_author_id}/inbox/"
            )

            # Send to remote author's inbox
            response = client.post(
                f"/api/authors/{followed_author_id}/inbox/", follow_data
            )

            if response and response.status_code in [200, 201, 202]:
                print(f"[SUCCESS] Follow request sent successfully")
                return True
            else:
                print(f"[ERROR] Failed to send follow request: {response}")
                return False

        except Exception as e:
            print(f"[ERROR] Exception in send_follow_request: {e}")
            return False

    @staticmethod
    def send_follow_response(follow, response_type):
        """Send follow response (accept/reject) to remote node using FollowSerializer"""
        if not follow.follower.node:
            return False

        try:
            client = RemoteNodeClient(follow.follower.node)

            # Update follow status for response
            from app.models.follow import Follow

            if response_type.lower() == "accept":
                follow.status = Follow.ACCEPTED
            elif response_type.lower() == "reject":
                follow.status = Follow.REJECTED

            # Use FollowSerializer to get the follow object data
            from app.serializers.follow import FollowSerializer

            follow_data = FollowSerializer(follow).data

            # Add response type to indicate this is an accept/reject
            follow_data["response_type"] = response_type

            # Send to remote follower's inbox
            response = client.post(
                f"/api/authors/{follow.follower.id}/inbox/", follow_data
            )
            print(
                f"[INFO] Follow {response_type} sent to {follow.follower.url}: {response.status_code if response else 'No response'}"
            )
            return True

        except Exception as e:
            print(
                f"[ERROR] Failed to send follow {response_type} to {follow.follower.url}: {e}"
            )
            return False

    @staticmethod
    def send_like(like):
        """Send like to remote node"""
        print(f"[DEBUG] RemoteActivitySender.send_like called")
        print(
            f"[DEBUG] Like author: {like.author.username} (local: {like.author.is_local})"
        )

        # Determine the target object and its author
        if like.entry:
            target_object = like.entry
            target_author = like.entry.author
            print(f"[DEBUG] Target is entry: {target_object.title}")
        elif like.comment:
            target_object = like.comment
            target_author = like.comment.author
            print(f"[DEBUG] Target is comment: {target_object.content[:50]}...")
        else:
            print(f"[DEBUG] No target object found")
            return False

        print(
            f"[DEBUG] Target author: {target_author.username} (local: {target_author.is_local})"
        )
        print(f"[DEBUG] Target author ID: {target_author.id}")
        print(f"[DEBUG] Target author URL: {target_author.url}")
        print(
            f"[DEBUG] Target author node: {target_author.node.name if target_author.node else 'None'}"
        )

        if not target_author.node:
            print(f"[DEBUG] Target author has no node, skipping")
            return False

        try:
            client = RemoteNodeClient(target_author.node)
            print(f"[DEBUG] Created client for node: {target_author.node.name}")

            # Prepare author data to use for both actor and author fields
            author_data = {
                "type": "author",
                "id": like.author.url,
                "host": f"{settings.SITE_URL}/api/",
                "displayName": like.author.display_name,
                "github": (
                    f"https://github.com/{like.author.github_username}"
                    if like.author.github_username
                    else ""
                ),
                "profileImage": like.author.profile_image,
                "web": f"{settings.SITE_URL}/authors/{like.author.id}",
            }

            like_data = {
                "type": "like",
                "content_type": "like",
                "actor": author_data,
                "author": author_data,
                "published": like.created_at.isoformat(),
                "id": like.url,
                "object": target_object.url,
            }

            print(f"[DEBUG] Like data prepared: {like_data}")

            # Extract the correct author ID from the target author's URL
            # For remote authors, we need to use the ID from their URL, not the local database ID
            # target_author_id = RemoteActivitySender._extract_author_id_from_url(
            #    target_author.url, target_author.id
            # )
            target_author_id = RemoteActivitySender._extract_author_id_from_url(
                target_author.url, target_author.id
            )
            response = client.post(f"/api/authors/{target_author_id}/inbox/", like_data)

            print(f"[DEBUG] Final target author ID for inbox: {target_author_id}")
            print(f"[DEBUG] Sending to: /api/authors/{target_author_id}/inbox/")

            # Send to target author's inbox using the correct ID
            response = client.post(f"/api/authors/{target_author_id}/inbox/", like_data)
            logger.info(f"Like sent to {target_author.url}: {response.status_code}")
            print(f"[DEBUG] Response status: {response.status_code}")
            return True

        except Exception as e:
            logger.error(f"Failed to send like to {target_author.url}: {e}")
            print(f"[DEBUG] Exception: {e}")
            return False

    @staticmethod
    def send_comment(comment):
        """Send comment to remote node"""
        if not comment.entry.author.node:
            return False

        try:
            client = RemoteNodeClient(comment.entry.author.node)

            comment_data = {
                "type": "comment",
                "content_type": "comment",
                "author": {
                    "type": "author",
                    "id": comment.author.url,
                    "host": f"{settings.SITE_URL}/api/",
                    "displayName": comment.author.display_name,
                    "github": (
                        f"https://github.com/{comment.author.github_username}"
                        if comment.author.github_username
                        else ""
                    ),
                    "profileImage": comment.author.profile_image,
                    "web": f"{settings.SITE_URL}/authors/{comment.author.id}",
                },
                "comment": comment.content,
                "contentType": comment.content_type,
                "published": comment.created_at.isoformat(),
                "id": comment.url,
                "entry": comment.entry.url,
                "web": f"{settings.SITE_URL}/authors/{comment.entry.author.id}/entries/{comment.entry.id}",
                "likes": {
                    "type": "likes",
                    "id": f"{comment.url}/likes",
                    "web": f"{settings.SITE_URL}/authors/{comment.entry.author.id}/entries/{comment.entry.id}",
                    "page_number": 1,
                    "size": 50,
                    "count": 0,
                    "src": [],
                },
            }

            # Extract the correct author ID for the inbox endpoint
            entry_author_id = RemoteActivitySender._extract_author_id_from_url(
                comment.entry.author.url, comment.entry.author.id
            )

            print(f"[DEBUG] Sending comment to: /api/authors/{entry_author_id}/inbox/")

            # Send to entry author's inbox
            response = client.post(
                f"/api/authors/{entry_author_id}/inbox/", comment_data
            )
            logger.info(
                f"Comment sent to {comment.entry.author.url}: {response.status_code}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to send comment to {comment.entry.author.url}: {e}")
            return False

    @staticmethod
    def send_entry(entry):
        """Send entry to remote nodes based on visibility"""
        if entry.visibility == "PUBLIC":
            # Send to all connected nodes
            active_nodes = Node.objects.filter(is_active=True)
            for node in active_nodes:
                RemoteActivitySender._send_entry_to_node(entry, node)
        elif entry.visibility == "FRIENDS":
            # Send only to remote friends
            from app.models import Friendship, Follow
            from django.db import models

            friendships = Friendship.objects.filter(
                models.Q(author1=entry.author) | models.Q(author2=entry.author)
            )

            friend_ids = []
            for friendship in friendships:
                if friendship.author1 == entry.author:
                    friend_ids.append(friendship.author2.id)
                else:
                    friend_ids.append(friendship.author1.id)

            remote_friends = Author.objects.filter(
                id__in=friend_ids, node__isnull=False, node__is_active=True
            ).select_related("node")

            for friend in remote_friends:
                RemoteActivitySender._send_entry_to_author(entry, friend)

    @staticmethod
    def _send_entry_to_node(entry, node):
        """Send entry to a specific node's general inbox"""
        try:
            client = RemoteNodeClient(node)

            entry_data = RemoteActivitySender._prepare_entry_data(entry)

            # Send to general federation inbox
            response = client.post("/api/federation/inbox/", entry_data)
            logger.info(f"Entry sent to node {node.host}: {response.status_code}")

        except Exception as e:
            logger.error(f"Failed to send entry to node {node.host}: {e}")

    @staticmethod
    def _send_entry_to_author(entry, author):
        """Send entry to a specific remote author's inbox"""
        try:
            client = RemoteNodeClient(author.node)

            entry_data = RemoteActivitySender._prepare_entry_data(entry)

            # Extract the correct author ID for the inbox endpoint
            author_id = RemoteActivitySender._extract_author_id_from_url(
                author.url, author.id
            )

            print(f"[DEBUG] Sending entry to: /api/authors/{author_id}/inbox/")

            # Send to specific author's inbox
            response = client.post(f"/api/authors/{author_id}/inbox/", entry_data)
            logger.info(f"Entry sent to author {author.url}: {response.status_code}")

        except Exception as e:
            logger.error(f"Failed to send entry to author {author.url}: {e}")

    @staticmethod
    def _prepare_entry_data(entry):
        """Prepare entry data for remote sending"""
        from app.serializers.author import AuthorSerializer

        return {
            "type": "entry",
            "content_type": "entry",
            "title": entry.title,
            "id": entry.url,
            "web": f"{settings.SITE_URL}/authors/{entry.author.id}/entries/{entry.id}",
            "description": entry.description or "",
            "contentType": entry.content_type,
            "content": entry.content,
            "author": {
                "type": "author",
                "id": entry.author.url,
                "host": f"{settings.SITE_URL}/api/",
                "displayName": entry.author.display_name,
                "github": (
                    f"https://github.com/{entry.author.github_username}"
                    if entry.author.github_username
                    else ""
                ),
                "profileImage": entry.author.profile_image,
                "web": f"{settings.SITE_URL}/authors/{entry.author.id}",
            },
            "comments": {
                "type": "comments",
                "web": f"{settings.SITE_URL}/authors/{entry.author.id}/entries/{entry.id}",
                "id": f"{entry.url}/comments",
                "page_number": 1,
                "size": 5,
                "count": entry.comments.count(),
                "src": [],
            },
            "likes": {
                "type": "likes",
                "web": f"{settings.SITE_URL}/authors/{entry.author.id}/entries/{entry.id}",
                "id": f"{entry.url}/likes",
                "page_number": 1,
                "size": 50,
                "count": entry.likes.count(),
                "src": [],
            },
            "published": entry.created_at.isoformat(),
            "visibility": entry.visibility,
        }


def get_or_create_remote_author(author_data, source_node):
    """Get or create a remote author from activity data"""
    from app.models import Author

    try:
        author_url = author_data.get("id") or author_data.get("url")
        if not author_url:
            return None

        # Try to find existing author
        author = Author.objects.filter(url=author_url).first()
        if author:
            return author

        # Create new remote author
        author = Author.objects.create(
            url=author_url,
            username=author_data.get("displayName", "").replace(" ", "_").lower()
            or f"remote_{hash(author_url) % 10000}",
            email=f"remote_{hash(author_url) % 10000}@{source_node.host}",
            display_name=author_data.get("displayName", ""),
            github_username=(
                author_data.get("github", "").split("/")[-1]
                if author_data.get("github")
                else ""
            ),
            profile_image=author_data.get("profileImage", ""),
            host=author_data.get("host", ""),
            web=author_data.get("web", ""),
            node=source_node,
            is_approved=True,  # Remote authors are auto-approved
            password="!",  # Invalid password for remote authors
        )

        logger.info(f"Created remote author: {author.url}")
        return author

    except Exception as e:
        logger.error(f"Failed to create remote author: {e}")
        return None


def entry_is_remote(entry):
    """
    Determines if an Entry is remote by comparing its host to the local host.
    """
    if not entry:
        return False
    entry_url = entry.fqid or entry.url
    parsed_host = urlparse(entry_url).netloc
    local_host = urlparse(settings.HOST_URL).netloc
    return parsed_host != local_host
