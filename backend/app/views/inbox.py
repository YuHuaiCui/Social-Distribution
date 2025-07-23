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
    
    def post(self, request, author_id):
        """
        Receive an ActivityPub object in an author's inbox
        """
        # Extract the author from the URL
        try:
            author = Author.objects.get(id=author_id)
        except Author.DoesNotExist:
            return Response({"error": "Author not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check authentication
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Basic '):
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Verify credentials against known nodes
        import base64
        credentials = base64.b64decode(auth_header.split(' ')[1]).decode('utf-8')
        username, password = credentials.split(':', 1)
        
        # Check if this is a known node
        try:
            node = Node.objects.get(username=username, password=password, is_active=True)
        except Node.DoesNotExist:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Process the incoming object
        try:
            data = request.data
            object_type = data.get('type', '')
            
            if object_type == 'Follow':
                return self._handle_follow_request(author, data, node)
            elif object_type == 'Like':
                return self._handle_like(author, data, node)
            elif object_type == 'Comment':
                return self._handle_comment(author, data, node)
            elif object_type == 'Post':
                return self._handle_post(author, data, node)
            else:
                return Response({"error": f"Unsupported object type: {object_type}"}, 
                              status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({"error": f"Failed to process object: {str(e)}"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _handle_follow_request(self, recipient, data, remote_node):
        """
        Handle incoming follow request from a remote node
        """
        actor_data = data.get('actor', {})
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
        # Implementation for handling likes
        # This would create a Like object and inbox item
        return Response({"message": "Like received"}, status=status.HTTP_200_OK)
    
    def _handle_comment(self, recipient, data, remote_node):
        """
        Handle incoming comment from a remote node
        """
        # Implementation for handling comments
        # This would create a Comment object and inbox item
        return Response({"message": "Comment received"}, status=status.HTTP_200_OK)
    
    def _handle_post(self, recipient, data, remote_node):
        """
        Handle incoming post from a remote node
        """
        # Implementation for handling posts
        # This would create an Entry object and inbox item
        return Response({"message": "Post received"}, status=status.HTTP_200_OK)


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
            inbox_url = f"{remote_author.host}authors/{remote_author.id.split('/')[-2]}/inbox/"
            
            response = requests.post(
                inbox_url,
                json=response_data,
                auth=HTTPBasicAuth(remote_node.username, remote_node.password),
                headers={'Content-Type': 'application/activity+json'},
                timeout=5
            )
            
            if response.status_code not in [200, 201, 202]:
                print(f"Failed to send follow response to {inbox_url}: {response.status_code}")
                
        except Exception as e:
            print(f"Error sending follow response: {str(e)}")
