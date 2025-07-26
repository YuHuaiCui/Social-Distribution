"""
Centralized Federation Service

This module provides a centralized service for handling all federation operations
including fetching from remote nodes and posting activities to remote nodes.
It consolidates the federation logic that was previously scattered across
different views and utilities.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from urllib.parse import urlparse

from app.models import Node, Author, Entry, Comment, Like, Follow, Inbox, InboxDelivery
from app.utils.remote import RemoteNodeClient, RemoteNodeError, RemoteObjectFetcher, RemoteActivitySender

logger = logging.getLogger(__name__)


class FederationService:
    """
    Centralized service for handling all federation operations.
    
    This service provides methods for:
    - Fetching remote content (authors, entries, comments, likes)
    - Posting local content to remote nodes
    - Managing inbox operations
    - Handling follow requests and responses
    - Synchronizing data between nodes
    """
    
    @staticmethod
    def is_localhost_url(url: str) -> bool:
        """
        Check if a URL is a localhost URL.
        
        Args:
            url: The URL to check
            
        Returns:
            bool: True if the URL is localhost, False otherwise
        """
        if not url:
            return False
        
        try:
            parsed = urlparse(url)
            netloc = parsed.netloc.lower()
            return netloc in ['localhost', '127.0.0.1', '::1'] or netloc.startswith('localhost:') or netloc.startswith('127.0.0.1:')
        except Exception:
            return False
    
    @staticmethod
    def is_same_localhost_instance(url: str) -> bool:
        """
        Check if a URL belongs to the same localhost instance as the current server.
        This is used to prevent self-federation while allowing federation with other localhost instances.
        
        Args:
            url: The URL to check
            
        Returns:
            bool: True if the URL belongs to the same localhost instance
        """
        if not url or not settings.DEBUG:
            return False
        
        try:
            parsed = urlparse(url)
            current_parsed = urlparse(settings.SITE_URL)
            
            # If both are localhost, check if they're the same port
            if (FederationService.is_localhost_url(url) and 
                FederationService.is_localhost_url(settings.SITE_URL)):
                return parsed.netloc == current_parsed.netloc
            
            return False
        except Exception:
            return False
    
    @staticmethod
    def is_same_domain(url1: str, url2: str) -> bool:
        """
        Check if two URLs belong to the same domain.
        
        Args:
            url1: First URL
            url2: Second URL
            
        Returns:
            bool: True if URLs belong to the same domain
        """
        try:
            parsed1 = urlparse(url1)
            parsed2 = urlparse(url2)
            return parsed1.netloc.lower() == parsed2.netloc.lower()
        except Exception:
            return False
    
    @staticmethod
    def get_node_for_url(url: str) -> Optional[Node]:
        """
        Get the appropriate node for a given URL.
        
        Args:
            url: The URL to find a node for
            
        Returns:
            Node or None: The matching node, or None if not found
        """
        if not url:
            return None
        
        try:
            parsed = urlparse(url)
            host_url = f"{parsed.scheme}://{parsed.netloc}"
            
            # First try exact match
            node = Node.objects.filter(host=host_url, is_active=True).first()
            if node:
                return node
            
            # Try partial match for localhost
            if FederationService.is_localhost_url(url):
                # For localhost, check if we have any localhost nodes
                localhost_nodes = Node.objects.filter(
                    host__icontains='localhost',
                    is_active=True
                )
                if localhost_nodes.exists():
                    return localhost_nodes.first()
                
                # If no localhost node configured, return None (treat as local)
                return None
            
            # Try partial match for other domains
            node = Node.objects.filter(
                host__icontains=parsed.netloc,
                is_active=True
            ).first()
            
            return node
            
        except Exception as e:
            logger.error(f"Error getting node for URL {url}: {e}")
            return None
    
    @staticmethod
    def fetch_remote_authors(node: Node, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Fetch authors from a remote node.
        
        Args:
            node: The remote node to fetch from
            limit: Maximum number of authors to fetch
            
        Returns:
            List of author data dictionaries
        """
        try:
            # Skip if this is the same localhost instance (self-federation)
            if FederationService.is_same_localhost_instance(node.host):
                logger.info(f"Skipping self-federation with node {node.name}")
                return []
            
            client = RemoteNodeClient(node)
            response = client.get(f'/api/authors/?size={limit}')
            data = response.json()
            
            # Handle different response formats
            if 'authors' in data:
                return data['authors']
            elif 'results' in data:
                return data['results']
            else:
                return data if isinstance(data, list) else []
                
        except RemoteNodeError as e:
            logger.error(f"Failed to fetch authors from {node.name}: {e}")
            return []
    
    @staticmethod
    def fetch_remote_entries(node: Node, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Fetch entries from a remote node.
        
        Args:
            node: The remote node to fetch from
            limit: Maximum number of entries to fetch
            
        Returns:
            List of entry data dictionaries
        """
        try:
            # Skip if this is the same localhost instance (self-federation)
            if FederationService.is_same_localhost_instance(node.host):
                logger.info(f"Skipping self-federation with node {node.name}")
                return []
            
            client = RemoteNodeClient(node)
            response = client.get(f'/api/entries/?size={limit}')
            data = response.json()
            
            # Handle different response formats
            if 'entries' in data:
                return data['entries']
            elif 'results' in data:
                return data['results']
            else:
                return data if isinstance(data, list) else []
                
        except RemoteNodeError as e:
            logger.error(f"Failed to fetch entries from {node.name}: {e}")
            return []
    
    @staticmethod
    def sync_remote_authors(node: Node, limit: int = 50) -> Tuple[int, int]:
        """
        Synchronize authors from a remote node to local database.
        
        Args:
            node: The remote node to sync from
            limit: Maximum number of authors to sync
            
        Returns:
            Tuple of (created_count, updated_count)
        """
        # Skip if this is the same localhost instance (self-federation)
        if FederationService.is_same_localhost_instance(node.host):
            logger.info(f"Skipping self-federation with node {node.name}")
            return 0, 0
        
        try:
            authors_data = FederationService.fetch_remote_authors(node, limit)
            created_count = 0
            updated_count = 0
            
            for author_data in authors_data:
                try:
                    with transaction.atomic():
                        # Extract author ID from URL
                        author_url = author_data.get('url', author_data.get('id', ''))
                        if not author_url:
                            continue
                        
                        # Parse author ID from URL
                        parsed = urlparse(author_url)
                        path_parts = parsed.path.strip('/').split('/')
                        if 'authors' in path_parts:
                            author_index = path_parts.index('authors')
                            if author_index + 1 < len(path_parts):
                                author_id = path_parts[author_index + 1]
                            else:
                                continue
                        else:
                            continue
                        
                        # Check if author already exists
                        author, created = Author.objects.get_or_create(
                            id=author_id,
                            defaults={
                                'url': author_url,
                                'username': author_data.get('username', ''),
                                'display_name': author_data.get('displayName', author_data.get('display_name', '')),
                                'github_username': author_data.get('github', ''),
                                'profile_image': author_data.get('profileImage', author_data.get('profile_image', '')),
                                'bio': author_data.get('bio', ''),
                                'location': author_data.get('location', ''),
                                'website': author_data.get('website', ''),
                                'host': author_data.get('host', node.host),
                                'web': author_data.get('web', author_data.get('page', '')),
                                'node': node,
                                'is_approved': True,  # Remote authors are auto-approved
                                'is_active': True
                            }
                        )
                        
                        if created:
                            created_count += 1
                        else:
                            # Update existing author
                            author.username = author_data.get('username', author.username)
                            author.display_name = author_data.get('displayName', author_data.get('display_name', author.display_name))
                            author.github_username = author_data.get('github', author.github_username)
                            author.profile_image = author_data.get('profileImage', author_data.get('profile_image', author.profile_image))
                            author.bio = author_data.get('bio', author.bio)
                            author.location = author_data.get('location', author.location)
                            author.website = author_data.get('website', author.website)
                            author.save()
                            updated_count += 1
                            
                except Exception as e:
                    logger.error(f"Error syncing author {author_data.get('username', 'unknown')}: {e}")
                    continue
            
            logger.info(f"Synced {created_count} new and {updated_count} updated authors from {node.name}")
            return created_count, updated_count
            
        except Exception as e:
            logger.error(f"Failed to sync authors from {node.name}: {e}")
            return 0, 0
    
    @staticmethod
    def sync_remote_entries(node: Node, limit: int = 50) -> Tuple[int, int]:
        """
        Synchronize entries from a remote node to local database.
        
        Args:
            node: The remote node to sync from
            limit: Maximum number of entries to sync
            
        Returns:
            Tuple of (created_count, updated_count)
        """
        # Skip if this is the same localhost instance (self-federation)
        if FederationService.is_same_localhost_instance(node.host):
            logger.info(f"Skipping self-federation with node {node.name}")
            return 0, 0
        
        try:
            remote_entries = FederationService.fetch_remote_entries(node, limit)
            created_count = 0
            updated_count = 0
            
            for entry_data in remote_entries:
                try:
                    with transaction.atomic():
                        entry_url = entry_data.get('id') or entry_data.get('url')
                        if not entry_url:
                            continue
                        
                        # Parse entry ID from URL
                        parsed = urlparse(entry_url)
                        path_parts = parsed.path.strip('/').split('/')
                        if 'entries' in path_parts:
                            entry_index = path_parts.index('entries')
                            if entry_index + 1 < len(path_parts):
                                entry_id = path_parts[entry_index + 1]
                            else:
                                continue
                        else:
                            continue
                        
                        # Get or create the author
                        author_data = entry_data.get('author', {})
                        if not author_data:
                            continue
                        
                        author_url = author_data.get('id') or author_data.get('url')
                        if not author_url:
                            continue
                        
                        # Parse author ID from URL
                        author_parsed = urlparse(author_url)
                        author_path_parts = author_parsed.path.strip('/').split('/')
                        if 'authors' in author_path_parts:
                            author_index = author_path_parts.index('authors')
                            if author_index + 1 < len(author_path_parts):
                                author_id = author_path_parts[author_index + 1]
                            else:
                                continue
                        else:
                            continue
                        
                        author, _ = Author.objects.get_or_create(
                            id=author_id,
                            defaults={
                                'url': author_url,
                                'username': author_data.get('username', ''),
                                'display_name': author_data.get('displayName', author_data.get('display_name', '')),
                                'github_username': author_data.get('github', ''),
                                'profile_image': author_data.get('profileImage', author_data.get('profile_image', '')),
                                'host': author_data.get('host', node.host),
                                'node': node,
                                'is_approved': True,
                                'is_active': True
                            }
                        )
                        
                        # Try to find existing entry
                        entry, created = Entry.objects.get_or_create(
                            id=entry_id,
                            defaults={
                                'url': entry_url,
                                'author': author,
                                'title': entry_data.get('title', ''),
                                'content': entry_data.get('content', ''),
                                'content_type': entry_data.get('contentType', 'text/plain'),
                                'visibility': entry_data.get('visibility', 'PUBLIC'),
                                'description': entry_data.get('description', ''),
                                'source': entry_data.get('source', ''),
                                'origin': entry_data.get('origin', ''),
                            }
                        )
                        
                        if created:
                            created_count += 1
                        else:
                            # Update existing entry with latest data
                            entry.title = entry_data.get('title', entry.title)
                            entry.content = entry_data.get('content', entry.content)
                            entry.content_type = entry_data.get('contentType', entry.content_type)
                            entry.visibility = entry_data.get('visibility', entry.visibility)
                            entry.description = entry_data.get('description', entry.description)
                            entry.save()
                            updated_count += 1
                            
                except Exception as e:
                    logger.error(f"Error syncing entry {entry_data.get('title', 'unknown')}: {e}")
                    continue
            
            logger.info(f"Synced {created_count} new and {updated_count} updated entries from {node.name}")
            return created_count, updated_count
            
        except Exception as e:
            logger.error(f"Failed to sync entries from {node.name}: {e}")
            return 0, 0
    
    @staticmethod
    def sync_all_nodes() -> Dict[str, Dict[str, int]]:
        """
        Synchronize all active nodes.
        
        Returns:
            Dictionary with sync results for each node
        """
        results = {}
        active_nodes = Node.objects.filter(is_active=True)
        
        for node in active_nodes:
            try:
                author_results = FederationService.sync_remote_authors(node)
                entry_results = FederationService.sync_remote_entries(node)
                
                results[node.name] = {
                    'authors_created': author_results[0],
                    'authors_updated': author_results[1],
                    'entries_created': entry_results[0],
                    'entries_updated': entry_results[1]
                }
                
            except Exception as e:
                logger.error(f"Failed to sync node {node.name}: {e}")
                results[node.name] = {'error': str(e)}
        
        return results
    
    @staticmethod
    def post_entry_to_remote_nodes(entry: Entry) -> Dict[str, bool]:
        """
        Post an entry to all relevant remote nodes based on visibility.
        
        Args:
            entry: The entry to post
            
        Returns:
            Dictionary mapping node names to success status
        """
        results = {}
        
        if entry.visibility == Entry.PUBLIC:
            # Send to all connected nodes (excluding localhost in development)
            active_nodes = Node.objects.filter(is_active=True)
            for node in active_nodes:
                # Skip if this is the same localhost instance (self-federation)
                if FederationService.is_same_localhost_instance(node.host):
                    logger.info(f"Skipping self-federation with node {node.name}")
                    results[node.name] = True  # Mark as successful to avoid errors
                    continue
                
                try:
                    FederationService._post_entry_to_node(entry, node)
                    results[node.name] = True
                except Exception as e:
                    logger.error(f"Failed to post entry to {node.name}: {e}")
                    results[node.name] = False
                    
        elif entry.visibility == Entry.FRIENDS_ONLY:
            # Send only to remote friends
            from django.db import models
            from app.models import Friendship
            
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
                id__in=friend_ids,
                node__isnull=False,
                node__is_active=True
            ).select_related('node')
            
            for friend in remote_friends:
                # Skip if this is the same localhost instance (self-federation)
                if FederationService.is_same_localhost_instance(friend.host):
                    logger.info(f"Skipping self-federation with friend {friend.username}")
                    results[friend.node.name] = True  # Mark as successful to avoid errors
                    continue
                
                try:
                    FederationService._post_entry_to_author(entry, friend)
                    results[friend.node.name] = True
                except Exception as e:
                    logger.error(f"Failed to post entry to friend {friend.username}: {e}")
                    results[friend.node.name] = False
        
        return results
    
    @staticmethod
    def _post_entry_to_node(entry: Entry, node: Node):
        """Post entry to a specific node's general inbox."""
        # Skip if this is the same localhost instance (self-federation)
        if FederationService.is_same_localhost_instance(node.host):
            logger.info(f"Skipping self-federation with node {node.name}")
            return
        
        try:
            client = RemoteNodeClient(node)
            entry_data = FederationService._prepare_entry_data(entry)
            
            # Send to general federation inbox
            response = client.post('/api/federation/inbox/', entry_data)
            logger.info(f"Entry sent to node {node.host}: {response.status_code}")
            
        except Exception as e:
            logger.error(f"Failed to send entry to node {node.host}: {e}")
            raise
    
    @staticmethod
    def _post_entry_to_author(entry: Entry, author: Author):
        """Post entry to a specific remote author's inbox."""
        # Skip if this is the same localhost instance (self-federation)
        if FederationService.is_same_localhost_instance(author.host):
            logger.info(f"Skipping self-federation with author {author.username}")
            return
        
        try:
            client = RemoteNodeClient(author.node)
            entry_data = FederationService._prepare_entry_data(entry)
            
            # Send to specific author's inbox
            response = client.post(f'/api/authors/{author.id}/inbox/', entry_data)
            logger.info(f"Entry sent to author {author.url}: {response.status_code}")
            
        except Exception as e:
            logger.error(f"Failed to send entry to author {author.url}: {e}")
            raise
    
    @staticmethod
    def _prepare_entry_data(entry: Entry) -> Dict[str, Any]:
        """Prepare entry data for remote sending."""
        return {
            "type": "entry",
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
                "github": f"https://github.com/{entry.author.github_username}" if entry.author.github_username else None,
                "profileImage": entry.author.profile_image,
                "web": f"{settings.SITE_URL}/authors/{entry.author.id}"
            },
            "comments": {
                "type": "comments",
                "web": f"{settings.SITE_URL}/authors/{entry.author.id}/entries/{entry.id}",
                "id": f"{entry.url}/comments",
                "page_number": 1,
                "size": 5,
                "count": entry.comments.count(),
                "src": []
            },
            "likes": {
                "type": "likes",
                "web": f"{settings.SITE_URL}/authors/{entry.author.id}/entries/{entry.id}",
                "id": f"{entry.url}/likes",
                "page_number": 1,
                "size": 50,
                "count": entry.likes.count(),
                "src": []
            },
            "published": entry.created_at.isoformat(),
            "visibility": entry.visibility
        }
    
    @staticmethod
    def send_follow_request(follower: Author, followed: Author) -> bool:
        """
        Send a follow request to a remote author.
        
        Args:
            follower: The local author making the request
            followed: The remote author to follow
            
        Returns:
            True if successful, False otherwise
        """
        return RemoteActivitySender.send_follow_request(follower, followed)
    
    @staticmethod
    def send_follow_response(follow: Follow, response_type: str) -> bool:
        """
        Send a follow response (accept/reject) to a remote author.
        
        Args:
            follow: The follow relationship
            response_type: 'accept' or 'reject'
            
        Returns:
            True if successful, False otherwise
        """
        return RemoteActivitySender.send_follow_response(follow, response_type)
    
    @staticmethod
    def send_like(like: Like) -> bool:
        """
        Send a like to a remote author.
        
        Args:
            like: The like object to send
            
        Returns:
            True if successful, False otherwise
        """
        return RemoteActivitySender.send_like(like)
    
    @staticmethod
    def send_comment(comment: Comment) -> bool:
        """
        Send a comment to a remote author.
        
        Args:
            comment: The comment object to send
            
        Returns:
            True if successful, False otherwise
        """
        return RemoteActivitySender.send_comment(comment)
    
    @staticmethod
    def process_inbox_item(recipient: Author, data: Dict[str, Any], remote_node: Node) -> bool:
        """
        Process an incoming inbox item from a remote node.
        
        Args:
            recipient: The local author receiving the item
            data: The inbox item data
            remote_node: The remote node sending the item
            
        Returns:
            True if processed successfully, False otherwise
        """
        try:
            item_type = data.get('type', '').lower()
            
            if item_type == 'like':
                return FederationService._process_like(recipient, data, remote_node)
            elif item_type == 'comment':
                return FederationService._process_comment(recipient, data, remote_node)
            elif item_type in ['entry', 'post']:
                return FederationService._process_entry(recipient, data, remote_node)
            elif item_type == 'follow':
                return FederationService._process_follow_request(recipient, data, remote_node)
            elif item_type in ['accept', 'reject']:
                return FederationService._process_follow_response(recipient, data, remote_node)
            else:
                logger.warning(f"Unknown inbox item type: {item_type}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to process inbox item: {e}")
            return False
    
    @staticmethod
    def _process_like(recipient: Author, data: Dict[str, Any], remote_node: Node) -> bool:
        """Process an incoming like."""
        try:
            # Extract like data - handle both 'actor' and 'author' fields for compatibility
            actor_data = data.get('actor', data.get('author', {}))
            object_data = data.get('object', {})
            
            # Get or create the remote author
            remote_author, _ = FederationService._get_or_create_remote_author(actor_data, remote_node)
            
            # Find the liked object
            object_url = object_data.get('id') if isinstance(object_data, dict) else object_data
            liked_object = FederationService._find_liked_object(object_url)
            
            if not liked_object:
                logger.warning(f"Liked object not found: {object_url}")
                return False
            
            # Create the like
            like, created = Like.objects.get_or_create(
                author=remote_author,
                entry=liked_object if isinstance(liked_object, Entry) else None,
                comment=liked_object if isinstance(liked_object, Comment) else None,
                defaults={'url': f"{settings.SITE_URL}/api/authors/{remote_author.id}/liked/temp"}
            )
            
            if created:
                like.url = f"{settings.SITE_URL}/api/authors/{remote_author.id}/liked/{like.id}"
                like.save(update_fields=['url'])
            
            # Create inbox item
            Inbox.objects.create(
                recipient=recipient,
                item_type=Inbox.LIKE,
                like=like.url,
                raw_data=data
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to process like: {e}")
            return False
    
    @staticmethod
    def _process_comment(recipient: Author, data: Dict[str, Any], remote_node: Node) -> bool:
        """Process an incoming comment."""
        try:
            # Extract comment data
            actor_data = data.get('actor', data.get('author', {}))
            
            # Get or create the remote author
            remote_author, _ = FederationService._get_or_create_remote_author(actor_data, remote_node)
            
            # Find the entry being commented on
            entry_url = data.get('entry')
            if not entry_url:
                logger.warning("No entry URL in comment data")
                return False
            
            try:
                entry = Entry.objects.get(url=entry_url)
            except Entry.DoesNotExist:
                logger.warning(f"Entry not found: {entry_url}")
                return False
            
            # Create the comment
            comment = Comment.objects.create(
                author=remote_author,
                entry=entry,
                content=data.get('comment', ''),
                content_type=data.get('contentType', 'text/plain'),
                url=f"{settings.SITE_URL}/api/authors/{remote_author.id}/comments/temp"
            )
            
            # Update comment URL
            comment.url = f"{settings.SITE_URL}/api/authors/{remote_author.id}/comments/{comment.id}"
            comment.save(update_fields=['url'])
            
            # Create inbox item
            Inbox.objects.create(
                recipient=recipient,
                item_type=Inbox.COMMENT,
                comment=comment.url,
                raw_data=data
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to process comment: {e}")
            return False
    
    @staticmethod
    def _process_entry(recipient: Author, data: Dict[str, Any], remote_node: Node) -> bool:
        """Process an incoming entry."""
        try:
            # Extract entry data
            actor_data = data.get('actor', data.get('author', {}))
            
            # Get or create the remote author
            remote_author, _ = FederationService._get_or_create_remote_author(actor_data, remote_node)
            
            # Create the entry
            entry = Entry.objects.create(
                author=remote_author,
                title=data.get('title', ''),
                content=data.get('content', ''),
                content_type=data.get('contentType', 'text/plain'),
                visibility=data.get('visibility', 'PUBLIC'),
                description=data.get('description', ''),
                url=data.get('id', f"{remote_author.host}posts/{remote_author.id}/temp"),
                source=data.get('source', ''),
                origin=data.get('origin', '')
            )
            
            # Update entry URL if needed
            if not data.get('id'):
                entry.url = f"{remote_author.host}posts/{remote_author.id}/{entry.id}"
                entry.save(update_fields=['url'])
            
            # Create inbox item
            Inbox.objects.create(
                recipient=recipient,
                item_type=Inbox.ENTRY,
                entry=entry.url,
                raw_data=data
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to process entry: {e}")
            return False
    
    @staticmethod
    def _process_follow_request(recipient: Author, data: Dict[str, Any], remote_node: Node) -> bool:
        """Process an incoming follow request."""
        try:
            # Extract follow data
            actor_data = data.get('actor', data.get('author', {}))
            
            # Get or create the remote author
            remote_author, _ = FederationService._get_or_create_remote_author(actor_data, remote_node)
            
            # Create the follow relationship
            follow, created = Follow.objects.get_or_create(
                follower=remote_author,
                followed=recipient,
                defaults={'status': Follow.PENDING}
            )
            
            # Create inbox item
            Inbox.objects.create(
                recipient=recipient,
                item_type=Inbox.FOLLOW_REQUEST,
                follow=follow,
                raw_data=data
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to process follow request: {e}")
            return False
    
    @staticmethod
    def _process_follow_response(recipient: Author, data: Dict[str, Any], remote_node: Node) -> bool:
        """Process an incoming follow response."""
        try:
            # Extract response data
            actor_data = data.get('actor', data.get('author', {}))
            object_data = data.get('object', {})
            
            # Get the remote author
            remote_author, _ = FederationService._get_or_create_remote_author(actor_data, remote_node)
            
            # Find the follow relationship
            follow_data = object_data.get('actor', {})
            followed_url = follow_data.get('id')
            
            if not followed_url:
                logger.warning("No followed URL in follow response data")
                return False
            
            try:
                followed = Author.objects.get(url=followed_url)
            except Author.DoesNotExist:
                logger.warning(f"Followed author not found: {followed_url}")
                return False
            
            # Update the follow relationship
            try:
                follow = Follow.objects.get(follower=remote_author, followed=followed)
                follow.status = Follow.ACCEPTED if data.get('type') == 'accept' else Follow.REJECTED
                follow.save()
            except Follow.DoesNotExist:
                logger.warning(f"Follow relationship not found")
                return False
            
            # Create inbox item
            Inbox.objects.create(
                recipient=recipient,
                item_type=Inbox.FOLLOW_RESPONSE,
                follow=follow,
                raw_data=data
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to process follow response: {e}")
            return False
    
    @staticmethod
    def _get_or_create_remote_author(actor_data: Dict[str, Any], remote_node: Node) -> Tuple[Author, bool]:
        """Get or create a remote author from actor data."""
        if isinstance(actor_data, str):
            # If actor_data is just a URL, we need to fetch the full data
            try:
                client = RemoteNodeClient(remote_node)
                response = client.get(actor_data)
                actor_data = response.json()
            except Exception as e:
                raise Exception(f"Failed to fetch actor data: {str(e)}")
        
        actor_url = actor_data.get('id')
        if not actor_url:
            raise Exception("Actor URL not found in data")
        
        # Try to get existing remote author
        try:
            return Author.objects.get(url=actor_url), False
        except Author.DoesNotExist:
            pass
        
        # Create new remote author
        remote_author = Author.objects.create(
            url=actor_url,
            username=actor_data.get('username', ''),
            display_name=actor_data.get('displayName', ''),
            github_username=actor_data.get('github', ''),
            profile_image=actor_data.get('profileImage', ''),
            bio=actor_data.get('bio', ''),
            location=actor_data.get('location', ''),
            website=actor_data.get('website', ''),
            host=actor_data.get('host', ''),
            web=actor_data.get('page', ''),
            node=remote_node,
            is_approved=True,
            is_active=True
        )
        
        return remote_author, True
    
    @staticmethod
    def _find_liked_object(object_url: str) -> Optional[Entry | Comment]:
        """Find the liked object (Entry or Comment) by URL."""
        
        # Try to find as entry first
        try:
            # Try exact match
            try:
                return Entry.objects.get(url=object_url)
            except Entry.DoesNotExist:
                pass
            
            # Try partial match by extracting ID from URL
            parsed_url = urlparse(object_url)
            path_parts = parsed_url.path.strip('/').split('/')
            
            # Look for entry ID in the path
            for part in reversed(path_parts):
                if part and part != 'entries':
                    try:
                        return Entry.objects.get(id=part)
                    except (Entry.DoesNotExist, ValueError):
                        continue
            
            # Try matching by URL containing the entry ID
            for part in reversed(path_parts):
                if part and part != 'entries':
                    try:
                        return Entry.objects.get(url__icontains=part)
                    except Entry.DoesNotExist:
                        continue
                        
        except Exception as e:
            logger.error(f"Error finding entry: {e}")
        
        # Try to find as comment
        try:
            # Try exact match
            try:
                return Comment.objects.get(url=object_url)
            except Comment.DoesNotExist:
                pass
            
            # Try partial match by extracting ID from URL
            parsed_url = urlparse(object_url)
            path_parts = parsed_url.path.strip('/').split('/')
            
            # Look for comment ID in the path
            for part in reversed(path_parts):
                if part and part != 'comments':
                    try:
                        return Comment.objects.get(id=part)
                    except (Comment.DoesNotExist, ValueError):
                        continue
                        
        except Exception as e:
            logger.error(f"Error finding comment: {e}")
        
        return None


# Import Friendship model here to avoid circular imports
from app.models.friendship import Friendship 