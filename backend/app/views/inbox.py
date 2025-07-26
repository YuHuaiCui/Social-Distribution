from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser
from requests.auth import HTTPBasicAuth
import requests
import json

from app.models.inbox import Inbox
from app.models.follow import Follow
from app.models.author import Author
from app.models.node import Node
from app.serializers.inbox import InboxItemSerializer, InboxStatsSerializer
from rest_framework.permissions import IsAuthenticated


@method_decorator(csrf_exempt, name='dispatch')
class InboxReceiveView(APIView):
    """
    Handle incoming ActivityPub objects from remote nodes
    """
    parser_classes = [JSONParser]
    permission_classes = []  # Will handle auth manually
    
    def post(self, request, author_id=None):
        """
        Receive an ActivityPub object in an author's inbox or general broadcast
        """
        try:
            print(f"DEBUG: ===== INBOX POST REQUEST START =====")
            print(f"DEBUG: Received inbox request for author {author_id}" if author_id else "DEBUG: Received public inbox request")
            print(f"DEBUG: Request data: {request.data}")
            print(f"DEBUG: Request headers: {dict(request.headers)}")
            print(f"DEBUG: Request method: {request.method}")
            print(f"DEBUG: Request path: {request.path}")
            print(f"DEBUG: Request META: {dict(request.META)}")
            
            # If no author_id, this is a general broadcast (for PUBLIC posts)
            if author_id is None:
                # For general broadcasts, we'll use a system user or the first local user
                # This is typically for PUBLIC posts that should appear in explore/feed
                print("DEBUG: General inbox broadcast received")
                # Get the first active local author as a placeholder recipient
                author = Author.objects.filter(node__isnull=True, is_active=True).first()
                if not author:
                    print("DEBUG: No local authors found for general broadcast")
                    return Response({"error": "No local authors available"}, status=status.HTTP_404_NOT_FOUND)
            else:
                # Extract the author from the URL
                try:
                    author = Author.objects.get(id=author_id)
                    print(f"DEBUG: Found author: {author.username} (local: {author.is_local})")
                except Author.DoesNotExist:
                    # Try to find the author by other means (URL, username, etc.)
                    print(f"DEBUG: Author {author_id} not found, attempting to find by other means")
                    
                    # List all local authors for debugging
                    local_authors = Author.objects.filter(node__isnull=True, is_active=True)
                    print(f"DEBUG: Available local authors:")
                    for local_author in local_authors:
                        print(f"DEBUG: - {local_author.username} (ID: {local_author.id}, URL: {local_author.url})")
                    
                    # Check if this might be a remote author ID that we should handle differently
                    # For now, return a more informative error
                    error_msg = f"Author {author_id} not found in local database. Remote node may be using the wrong author ID. Available local authors: {[a.username for a in local_authors]}"
                    print(f"DEBUG: {error_msg}")
                    return Response({"error": error_msg}, status=status.HTTP_404_NOT_FOUND)
            
            # Check authentication
            auth_header = request.headers.get('Authorization')
            node = None
            
            # For general inbox (PUBLIC posts), allow any valid node credentials
            if author_id is None and auth_header and auth_header.startswith('Basic '):
                try:
                    import base64
                    credentials = base64.b64decode(auth_header.split(' ')[1]).decode('utf-8')
                    username, password = credentials.split(':', 1)
                    
                    print(f"DEBUG: General inbox auth - username: {username}")
                    
                    # For general inbox, accept any active node's credentials
                    # This allows nodes to send PUBLIC posts without being specifically configured
                    node = Node.objects.filter(is_active=True).first()
                    if node:
                        print(f"DEBUG: Accepting PUBLIC post from any node (using {node.name} as placeholder)")
                    else:
                        print("DEBUG: No active nodes configured")
                        return Response({"error": "No active nodes configured"}, status=status.HTTP_401_UNAUTHORIZED)
                except Exception as e:
                    print(f"DEBUG: Auth parsing error: {e}")
                    return Response({"error": "Invalid authorization header"}, status=status.HTTP_400_BAD_REQUEST)
            
            # For specific author inboxes, require proper authentication
            elif author_id is not None:
                if not auth_header or not auth_header.startswith('Basic '):
                    print("DEBUG: No valid Authorization header for author inbox")
                    return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
                
                # Verify credentials against known nodes
                try:
                    import base64
                    credentials = base64.b64decode(auth_header.split(' ')[1]).decode('utf-8')
                    username, password = credentials.split(':', 1)
                    
                    print(f"DEBUG: Authenticating with username: {username}")
                    print(f"DEBUG: Checking against configured nodes...")
                    
                    # List all configured nodes for debugging
                    all_nodes = Node.objects.all()
                    print(f"DEBUG: Total nodes configured: {all_nodes.count()}")
                    for node_obj in all_nodes:
                        print(f"DEBUG: Node - Name: {node_obj.name}, Host: {node_obj.host}, Username: {node_obj.username}, Active: {node_obj.is_active}")
                    
                    # Check if this is a known node
                    try:
                        node = Node.objects.get(username=username, password=password, is_active=True)
                        print(f"DEBUG: Found matching node: {node.name} ({node.host})")
                    except Node.DoesNotExist:
                        print(f"DEBUG: No matching node found for username: {username}")
                        print(f"DEBUG: Checking if username exists but password doesn't match...")
                        try:
                            node_with_username = Node.objects.get(username=username, is_active=True)
                            print(f"DEBUG: Found node with username but password doesn't match: {node_with_username.name}")
                        except Node.DoesNotExist:
                            print(f"DEBUG: No node found with username: {username}")
                        
                        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
                except Exception as e:
                    print(f"DEBUG: Error during authentication: {e}")
                    import traceback
                    print(f"DEBUG: Auth error traceback: {traceback.format_exc()}")
                    return Response({"error": "Authentication error"}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Ensure we have a node object
            if not node:
                print("DEBUG: No node object available")
                return Response({"error": "Node authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Process the incoming object using the centralized federation service
            data = request.data
            object_type = data.get('type', '')
            
            print(f"DEBUG: Processing object type: {object_type}")
            print(f"DEBUG: Data keys: {list(data.keys())}")
            
            # Use the centralized federation service to process the inbox item
            from app.utils.federation import FederationService
            success = FederationService.process_inbox_item(author, data, node)
            
            if success:
                print(f"DEBUG: Successfully processed inbox item")
                return Response({"message": "Inbox item processed"}, status=status.HTTP_200_OK)
            else:
                print(f"DEBUG: Failed to process inbox item")
                return Response({"error": "Failed to process inbox item"}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            import traceback
            print(f"DEBUG: ===== UNHANDLED ERROR IN INBOX POST =====")
            print(f"DEBUG: Error type: {type(e)}")
            print(f"DEBUG: Error message: {str(e)}")
            print(f"DEBUG: Full traceback: {traceback.format_exc()}")
            print(f"DEBUG: ==========================================")
            return Response({"error": f"Failed to process object: {str(e)}"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _handle_follow_request(self, recipient, data, remote_node):
        """
        Handle incoming follow request from a remote node
        """
        # Handle both 'actor' and 'author' fields for compatibility
        actor_data = data.get('actor', data.get('author', {}))
        actor_url = actor_data.get('id') if isinstance(actor_data, dict) else actor_data
        
        if not actor_url:
            return Response({"error": "Actor URL required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create the remote author
        remote_author, created = self._get_or_create_remote_author(actor_data, remote_node)
        
        # Check if follow request already exists
        existing_follow = Follow.objects.filter(
            follower=remote_author,
            followed=recipient
        ).first()
        
        if existing_follow:
            # Update existing follow request
            existing_follow.status = Follow.PENDING
            existing_follow.save()
            follow = existing_follow
        else:
            # Create new follow request
            follow = Follow.objects.create(
                follower=remote_author,
                followed=recipient,
                status=Follow.PENDING
            )
        
        # Create inbox item
        Inbox.objects.create(
            recipient=recipient,
            item_type=Inbox.FOLLOW,
            follow=follow,
            raw_data=data
        )
        
        return Response({"message": "Follow request received"}, status=status.HTTP_200_OK)
    
    def _get_or_create_remote_author(self, actor_data, remote_node):
        """
        Get or create a remote author based on actor data
        """
        if isinstance(actor_data, str):
            # If actor_data is just a URL, we need to fetch the full data
            try:
                response = requests.get(
                    actor_data,
                    auth=HTTPBasicAuth(remote_node.username, remote_node.password),
                    timeout=5
                )
                if response.status_code == 200:
                    actor_data = response.json()
                else:
                    raise Exception(f"Failed to fetch actor data: {response.status_code}")
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
            is_approved=True,  # Remote authors are auto-approved
            is_active=True
        )
        
        return remote_author, True
    
    def _handle_like(self, recipient, data, remote_node):
        """
        Handle incoming like from a remote node
        """
        print(f"DEBUG: Processing like activity for recipient: {recipient.username}")
        print(f"DEBUG: Like data: {data}")
        print(f"DEBUG: Remote node: {remote_node.name if remote_node else 'None'}")
        
        try:
            # Extract like data - handle both 'actor' and 'author' fields for compatibility
            actor_data = data.get('actor', data.get('author', {}))
            object_data = data.get('object', {})
            
            print(f"DEBUG: Actor data: {actor_data}")
            print(f"DEBUG: Object data: {object_data}")
            
            # Get or create the remote author
            remote_author, created = self._get_or_create_remote_author(actor_data, remote_node)
            print(f"DEBUG: Remote author: {remote_author.username} (created: {created})")
            
            # Determine what was liked (entry or comment)
            object_url = object_data.get('id') if isinstance(object_data, dict) else object_data
            print(f"DEBUG: Object URL: {object_url}")
            print(f"DEBUG: Object data type: {type(object_data)}")
            print(f"DEBUG: Object data: {object_data}")
            
            # Try to find the liked object with more flexible matching
            from app.models import Entry, Comment
            
            liked_object = None
            object_type = None
            
            # First try to find as entry with flexible URL matching
            try:
                if isinstance(object_url, str):
                    # Try exact match first
                    try:
                        liked_object = Entry.objects.get(url=object_url)
                        object_type = 'entry'
                        print(f"DEBUG: Found liked entry by exact URL: {liked_object.title}")
                    except Entry.DoesNotExist:
                        # Try partial match by extracting ID from URL
                        from urllib.parse import urlparse
                        parsed_url = urlparse(object_url)
                        path_parts = parsed_url.path.strip('/').split('/')
                        print(f"DEBUG: Parsed URL path parts: {path_parts}")
                        
                        # Look for entry ID in the path
                        for part in reversed(path_parts):
                            if part and part != 'entries':
                                print(f"DEBUG: Trying to find entry with ID: {part}")
                                try:
                                    liked_object = Entry.objects.get(id=part)
                                    object_type = 'entry'
                                    print(f"DEBUG: Found liked entry by ID from URL: {liked_object.title}")
                                    break
                                except (Entry.DoesNotExist, ValueError):
                                    print(f"DEBUG: No entry found with ID: {part}")
                                    continue
                        
                        if not liked_object:
                            # Try matching by URL containing the entry ID
                            for part in reversed(path_parts):
                                if part and part != 'entries':
                                    print(f"DEBUG: Trying to find entry with URL containing: {part}")
                                    try:
                                        liked_object = Entry.objects.get(url__icontains=part)
                                        object_type = 'entry'
                                        print(f"DEBUG: Found liked entry by URL contains: {liked_object.title}")
                                        break
                                    except Entry.DoesNotExist:
                                        print(f"DEBUG: No entry found with URL containing: {part}")
                                        continue
                else:
                    # If object_url is not a string, try to find by ID directly
                    try:
                        liked_object = Entry.objects.get(id=object_url)
                        object_type = 'entry'
                        print(f"DEBUG: Found liked entry by direct ID: {liked_object.title}")
                    except (Entry.DoesNotExist, ValueError):
                        pass
                        
            except Exception as e:
                print(f"DEBUG: Error finding entry: {e}")
            
            # If not found as entry, try as comment
            if not liked_object:
                try:
                    if isinstance(object_url, str):
                        # Try exact match first
                        try:
                            liked_object = Comment.objects.get(url=object_url)
                            object_type = 'comment'
                            print(f"DEBUG: Found liked comment by exact URL: {liked_object.content[:50]}...")
                        except Comment.DoesNotExist:
                            # Try partial match by extracting ID from URL
                            from urllib.parse import urlparse
                            parsed_url = urlparse(object_url)
                            path_parts = parsed_url.path.strip('/').split('/')
                            print(f"DEBUG: Parsed comment URL path parts: {path_parts}")
                            
                            # Look for comment ID in the path
                            for part in reversed(path_parts):
                                if part and part != 'comments':
                                    print(f"DEBUG: Trying to find comment with ID: {part}")
                                    try:
                                        liked_object = Comment.objects.get(id=part)
                                        object_type = 'comment'
                                        print(f"DEBUG: Found liked comment by ID from URL: {liked_object.content[:50]}...")
                                        break
                                    except (Comment.DoesNotExist, ValueError):
                                        print(f"DEBUG: No comment found with ID: {part}")
                                        continue
                    else:
                        # If object_url is not a string, try to find by ID directly
                        try:
                            liked_object = Comment.objects.get(id=object_url)
                            object_type = 'comment'
                            print(f"DEBUG: Found liked comment by direct ID: {liked_object.content[:50]}...")
                        except (Comment.DoesNotExist, ValueError):
                            pass
                            
                except Exception as e:
                    print(f"DEBUG: Error finding comment: {e}")
            
            if not liked_object:
                print(f"DEBUG: Liked object not found: {object_url}")
                return Response({"message": "Liked object not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Create the like with proper URL generation
            from app.models import Like
            from django.conf import settings
            
            # Generate proper like URL - we'll create the like first, then update the URL
            # The URL should be /api/authors/{author_id}/liked/{like_id}, not /api/authors/{author_id}/liked/{entry_id}
            # So we'll create a temporary URL first, then update it after creation
            temp_url = f"{settings.SITE_URL}/api/authors/{remote_author.id}/liked/temp"
            
            print(f"DEBUG: About to create like with:")
            print(f"DEBUG: - author: {remote_author.username} (URL: {remote_author.url})")
            print(f"DEBUG: - entry: {liked_object.title if object_type == 'entry' else 'None'}")
            print(f"DEBUG: - comment: {liked_object.content[:50] if object_type == 'comment' else 'None'}")
            print(f"DEBUG: - temp_url: {temp_url}")
            
            # Check if like already exists
            existing_like = None
            if object_type == 'entry':
                existing_like = Like.objects.filter(author=remote_author, entry=liked_object).first()
            elif object_type == 'comment':
                existing_like = Like.objects.filter(author=remote_author, comment=liked_object).first()
            
            if existing_like:
                print(f"DEBUG: Like already exists: {existing_like.id}")
                like = existing_like
                created = False
            else:
                print(f"DEBUG: Creating new like...")
                like, created = Like.objects.get_or_create(
                    author=remote_author,
                    entry=liked_object if object_type == 'entry' else None,
                    comment=liked_object if object_type == 'comment' else None,
                    defaults={'url': temp_url}
                )
                
                # Update URL with the actual like ID if it was created
                if created:
                    like.url = f"{settings.SITE_URL}/api/authors/{remote_author.id}/liked/{like.id}"
                    like.save(update_fields=['url'])
            
            print(f"DEBUG: Like result: {like.id} (created: {created})")
            print(f"DEBUG: Like URL: {like.url}")
            
            # Create inbox item
            print(f"DEBUG: Creating inbox item for recipient: {recipient.username}")
            print(f"DEBUG: - item_type: {Inbox.LIKE}")
            print(f"DEBUG: - like: {like.id}")
            print(f"DEBUG: - raw_data keys: {list(data.keys())}")
            
            inbox_item = Inbox.objects.create(
                recipient=recipient,
                item_type=Inbox.LIKE,
                like=like.url,  # Use the like's URL since the foreign key uses to_field="url"
                raw_data=data
            )
            print(f"DEBUG: Inbox item created: {inbox_item.id}")
            
            return Response({"message": "Like received"}, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"DEBUG: Error processing like: {str(e)}")
            import traceback
            print(f"DEBUG: Full traceback: {traceback.format_exc()}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _handle_comment(self, recipient, data, remote_node):
        """
        Handle incoming comment from a remote node
        """
        try:
            # Extract comment data - handle both 'actor' and 'author' fields for compatibility
            actor_data = data.get('actor', data.get('author', {}))
            object_data = data.get('object', {})
            comment_data = data.get('comment', {})
            
            # Get or create the remote author
            remote_author, created = self._get_or_create_remote_author(actor_data, remote_node)
            
            # Find the entry being commented on
            entry_url = object_data.get('id') if isinstance(object_data, dict) else object_data
            
            from app.models import Entry
            try:
                entry = Entry.objects.get(url=entry_url)
            except Entry.DoesNotExist:
                return Response({"message": "Entry not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Create the comment
            from app.models import Comment
            
            # Generate a temporary URL first, then update it after creation
            temp_url = f"{remote_author.host}comments/{remote_author.id}/{entry.id}/temp"
            
            comment = Comment.objects.create(
                author=remote_author,
                entry=entry,
                content=comment_data.get('content', ''),
                content_type=comment_data.get('contentType', 'text/plain'),
                url=temp_url
            )
            
            # Update the URL with the actual comment ID
            comment.url = f"{remote_author.host}comments/{remote_author.id}/{entry.id}/{comment.id}"
            comment.save(update_fields=['url'])
            
            # Create inbox item
            Inbox.objects.create(
                recipient=recipient,
                item_type=Inbox.COMMENT,
                comment=comment.url,  # Use the comment's URL since the foreign key uses to_field="url"
                raw_data=data
            )
            
            return Response({"message": "Comment received"}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _handle_post(self, recipient, data, remote_node):
        """
        Handle incoming post from a remote node
        """
        try:
            # Handle different post formats
            if data.get('content_type') == 'entry':
                # Direct post format (our new format)
                actor_data = data.get('author', {})
                post_data = data
            else:
                # ActivityPub format (wrapped in Create activity)
                # Handle both 'actor' and 'author' fields for compatibility
                actor_data = data.get('actor', data.get('author', {}))
                post_data = data.get('object', {})
            
            # Get or create the remote author
            remote_author, created = self._get_or_create_remote_author(actor_data, remote_node)
            
            # If this is a public broadcast (no specific recipient), we just store the post
            # The post will be visible to all local authors based on visibility rules
            
            # Create the entry
            from app.models import Entry
            
            # Generate a temporary URL first, then update it after creation
            temp_url = post_data.get('id', f"{remote_author.host}posts/{remote_author.id}/temp")
            
            # Check if there's image data
            image_data = None
            if post_data.get('image') and post_data.get('contentType', '').startswith('image/'):
                import base64
                import re
                image_content = post_data.get('image', '')
                match = re.match(r"^data:image/\w+;base64,(.+)$", image_content)
                if match:
                    try:
                        image_data = base64.b64decode(match.group(1))
                    except Exception as e:
                        print(f"Failed to decode image data: {e}")
            
            # Debug logging for visibility
            received_visibility = post_data.get('visibility', 'PUBLIC')
            print(f"DEBUG: Creating entry with visibility: {received_visibility}")
            print(f"DEBUG: Post data keys: {list(post_data.keys())}")
            print(f"DEBUG: Remote author: {remote_author.username} from node: {remote_author.node.name if remote_author.node else 'Unknown'}")
            
            entry = Entry.objects.create(
                author=remote_author,
                title=post_data.get('title', ''),
                content=post_data.get('content', ''),
                content_type=post_data.get('contentType', 'text/plain'),
                visibility=post_data.get('visibility', 'PUBLIC'),
                description=post_data.get('description', ''),
                url=temp_url,
                source=post_data.get('source', ''),
                origin=post_data.get('origin', ''),
                image_data=image_data
            )
            
            # Update the URL with the actual entry ID
            if not post_data.get('id'):
                entry.url = f"{remote_author.host}posts/{remote_author.id}/{entry.id}"
                entry.save(update_fields=['url'])
            
            # Debug the created entry
            print(f"DEBUG: Created entry - ID: {entry.id}, Visibility: {entry.visibility}, Author: {remote_author.username}")
            print(f"DEBUG: Entry is from remote node: {remote_author.node.name if remote_author.node else 'Unknown'}")
            
            # Only create inbox item for non-PUBLIC posts
            # PUBLIC posts should appear in explore/feed, not as notifications
            if entry.visibility != Entry.PUBLIC:
                Inbox.objects.create(
                    recipient=recipient,
                    item_type=Inbox.ENTRY,
                    entry=entry.url,  # Use the entry's URL since the foreign key uses to_field="url"
                    raw_data=data
                )
                print(f"DEBUG: Created inbox item for {entry.visibility} post from {remote_author.username}")
            else:
                print(f"DEBUG: PUBLIC post from {remote_author.username} added to explore/feed (no inbox item)")
                # Verify it's queryable
                from app.models import Entry as EntryModel
                found = EntryModel.objects.filter(id=entry.id, visibility='PUBLIC').exists()
                print(f"DEBUG: Can query the PUBLIC post: {found}")
            
            return Response({"message": "Post received"}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InboxViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing inbox items

    - GET /api/inbox/ - Get inbox items for authenticated user
    - GET /api/inbox/{id}/ - Get specific inbox item
    - POST /api/inbox/mark-read/ - Mark items as read
    - POST /api/inbox/mark-processed/ - Mark items as processed
    - POST /api/inbox/clear/ - Clear all inbox items
    - GET /api/inbox/stats/ - Get inbox statistics
    - GET /api/inbox/unread-count/ - Get unread count
    - POST /api/inbox/{id}/accept-follow/ - Accept follow request
    - POST /api/inbox/{id}/reject-follow/ - Reject follow request
    """

    serializer_class = InboxItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return inbox items for the authenticated user
        """
        user = self.request.user
        queryset = Inbox.objects.filter(recipient=user).select_related(
            "follow__follower", "like__author", "comment__author", "entry__author"
        )

        # Filter by content type if specified
        content_type = self.request.query_params.get("content_type")
        if content_type:
            # Map frontend content types to backend types
            content_type_mapping = {
                'entry_link': 'entry',  # For backward compatibility
                # Other types map directly
            }
            mapped_type = content_type_mapping.get(content_type, content_type)
            queryset = queryset.filter(item_type=mapped_type)

        # Filter by read status if specified
        is_read = self.request.query_params.get("read")
        if is_read is not None:
            is_read_bool = is_read.lower() == "true"
            queryset = queryset.filter(is_read=is_read_bool)

        # Filter by processed status for ActivityPub compatibility
        processed = self.request.query_params.get("processed")
        if processed is not None:
            # For now, we'll treat processed as read
            processed_bool = processed.lower() == "true"
            queryset = queryset.filter(is_read=processed_bool)

        return queryset.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        """
        List inbox items with pagination
        """
        queryset = self.get_queryset()

        # Handle pagination
        page = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 20)

        try:
            page = int(page)
            page_size = min(int(page_size), 100)  # Cap at 100 items per page
        except ValueError:
            page = 1
            page_size = 20

        # Calculate pagination
        start = (page - 1) * page_size
        end = start + page_size

        paginated_queryset = queryset[start:end]
        total_count = queryset.count()

        serializer = self.get_serializer(paginated_queryset, many=True)

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

    @action(detail=False, methods=["post"])
    def mark_read(self, request):
        """
        Mark multiple inbox items as read
        """
        item_ids = request.data.get("item_ids", [])
        if not item_ids:
            return Response(
                {"error": "item_ids is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        updated_count = Inbox.objects.filter(
            id__in=item_ids, recipient=request.user
        ).update(is_read=True)

        return Response(
            {"message": f"Marked {updated_count} items as read"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        """
        Mark a specific inbox item as read
        """
        inbox_item = get_object_or_404(Inbox, id=pk, recipient=request.user)
        inbox_item.is_read = True
        inbox_item.save()

        return Response(
            {"message": "Item marked as read"}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["post"])
    def mark_processed(self, request):
        """
        Mark multiple inbox items as processed (ActivityPub compatibility)
        """
        return self.mark_read(request)

    @action(detail=False, methods=["post"])
    def clear(self, request):
        """
        Clear all inbox items for the authenticated user
        """
        deleted_count = Inbox.objects.filter(recipient=request.user).delete()[0]

        return Response(
            {"message": f"Cleared {deleted_count} inbox items"},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """
        Get inbox statistics for the authenticated user
        """
        user_inbox = Inbox.objects.filter(recipient=request.user)

        stats = {
            "total_items": user_inbox.count(),
            "unread_items": user_inbox.filter(is_read=False).count(),
            "read_items": user_inbox.filter(is_read=True).count(),
            "by_type": {},
        }

        # Count by item type
        for item_type, _ in Inbox.ITEM_TYPE_CHOICES:
            count = user_inbox.filter(item_type=item_type).count()
            if count > 0:
                stats["by_type"][item_type] = count

        return Response(stats, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        """
        Get the count of unread inbox items
        """
        count = Inbox.objects.filter(
            recipient=request.user, is_read=False
        ).count()

        return Response({"unread_count": count}, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["post"],
        url_path="accept-follow",
        url_name="accept_follow",
    )
    def accept_follow(self, request, pk=None):
        """
        Accept a follow request from the inbox
        """
        inbox_item = get_object_or_404(Inbox, id=pk, recipient=request.user)

        if inbox_item.item_type != Inbox.FOLLOW:
            return Response(
                {"error": "This inbox item is not a follow request"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not inbox_item.follow:
            return Response(
                {"error": "Follow object not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Update follow status
        follow = inbox_item.follow
        follow.status = Follow.ACCEPTED
        follow.save()

        # Mark inbox item as read
        inbox_item.is_read = True
        inbox_item.save()

        # Send acceptance notification to remote node if it's a remote follow
        if follow.follower.is_remote:
            self._send_follow_response(follow, "Accept")

        return Response(
            {"message": "Follow request accepted"}, status=status.HTTP_200_OK
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="reject-follow",
        url_name="reject_follow",
    )
    def reject_follow(self, request, pk=None):
        """
        Reject a follow request from the inbox
        """
        inbox_item = get_object_or_404(Inbox, id=pk, recipient=request.user)

        if inbox_item.item_type != Inbox.FOLLOW:
            return Response(
                {"error": "This inbox item is not a follow request"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not inbox_item.follow:
            return Response(
                {"error": "Follow object not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Update follow status
        follow = inbox_item.follow
        follow.status = Follow.REJECTED
        follow.save()

        # Mark inbox item as read
        inbox_item.is_read = True
        inbox_item.save()

        # Send rejection notification to remote node if it's a remote follow
        if follow.follower.is_remote:
            self._send_follow_response(follow, "Reject")

        return Response(
            {"message": "Follow request rejected"}, status=status.HTTP_200_OK
        )

    def _send_follow_response(self, follow, response_type):
        """
        Send follow response (Accept/Reject) to remote node
        """
        try:
            remote_author = follow.follower
            if not remote_author.is_remote or not remote_author.node:
                return

            # Get the remote node credentials
            remote_node = remote_author.node
            
            # Prepare the response data
            response_data = {
                "@context": "https://www.w3.org/ns/activitystreams",
                "type": response_type,
                "actor": follow.followed.url,
                "object": {
                    "type": "Follow",
                    "actor": follow.follower.url,
                    "object": follow.followed.url
                }
            }

            # Send to remote node's inbox
            # Extract author ID from the URL properly
            author_id = remote_author.id.split('/')[-1] if remote_author.id.endswith('/') else remote_author.id.split('/')[-1]
            inbox_url = f"{remote_author.host}authors/{author_id}/inbox/"
            
            response = requests.post(
                inbox_url,
                json=response_data,
                auth=HTTPBasicAuth(remote_node.username, remote_node.password),
                headers={'Content-Type': 'application/json'},
                timeout=5
            )
            
            if response.status_code not in [200, 201, 202]:
                print(f"Failed to send follow response to {inbox_url}: {response.status_code}")
                
        except Exception as e:
            print(f"Error sending follow response: {str(e)}")
