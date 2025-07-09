from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.shortcuts import get_object_or_404

from app.models.inbox import Inbox
from app.models.follow import Follow
from app.serializers.inbox import InboxItemSerializer, InboxStatsSerializer
from rest_framework.permissions import IsAuthenticated


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
        Mark inbox items as read
        Body: {"ids": ["id1", "id2", ...]}
        """
        ids = request.data.get("ids", [])
        if not ids:
            return Response(
                {"error": "No IDs provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        updated_count = Inbox.objects.filter(id__in=ids, recipient=request.user).update(
            is_read=True
        )

        return Response({"success": True, "updated": updated_count})

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        """
        Mark a single inbox item as read
        """
        try:
            inbox_item = get_object_or_404(Inbox, id=pk, recipient=request.user)
            inbox_item.is_read = True
            inbox_item.save()

            serializer = self.get_serializer(inbox_item)
            return Response(serializer.data)
        except Inbox.DoesNotExist:
            return Response(
                {"error": "Inbox item not found"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=["post"])
    def mark_processed(self, request):
        """
        Mark inbox items as processed (ActivityPub compatibility)
        For now, we'll treat this the same as mark_read
        """
        return self.mark_read(request)

    @action(detail=False, methods=["post"])
    def clear(self, request):
        """
        Clear all inbox items for the user
        """
        deleted_count, _ = Inbox.objects.filter(recipient=request.user).delete()

        return Response({"success": True, "deleted": deleted_count})

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """
        Get inbox statistics
        """
        user = request.user

        # Get counts
        total_items = Inbox.objects.filter(recipient=user).count()
        unread_count = Inbox.objects.filter(recipient=user, is_read=False).count()
        pending_follows = Inbox.objects.filter(
            recipient=user, item_type=Inbox.FOLLOW, follow__status=Follow.PENDING
        ).count()

        stats_data = {
            "unread_count": unread_count,
            "pending_follows": pending_follows,
            "total_items": total_items,
        }

        serializer = InboxStatsSerializer(stats_data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        """
        Get unread notifications count
        """
        count = Inbox.objects.filter(recipient=request.user, is_read=False).count()

        return Response({"count": count})

    @action(
        detail=True,
        methods=["post"],
        url_path="accept-follow",
        url_name="accept_follow",
    )
    def accept_follow(self, request, pk=None):
        """
        Accept a follow request from inbox item
        """
        try:
            inbox_item = get_object_or_404(
                Inbox, id=pk, recipient=request.user, item_type=Inbox.FOLLOW
            )

            if not inbox_item.follow:
                return Response(
                    {"error": "No associated follow request"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if the follow request is still pending
            if inbox_item.follow.status != Follow.PENDING:
                return Response(
                    {"error": "Follow request is not pending"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Accept the follow request
            inbox_item.follow.status = Follow.ACCEPTED
            inbox_item.follow.save()

            # Delete the inbox item since it's been processed
            inbox_item.delete()

            return Response(
                {"status": "accepted", "message": "Follow request accepted"}
            )

        except Inbox.DoesNotExist:
            return Response(
                {"error": "Inbox item not found"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(
        detail=True,
        methods=["post"],
        url_path="reject-follow",
        url_name="reject_follow",
    )
    def reject_follow(self, request, pk=None):
        """
        Reject a follow request from inbox item
        """
        try:
            inbox_item = get_object_or_404(
                Inbox, id=pk, recipient=request.user, item_type=Inbox.FOLLOW
            )

            if not inbox_item.follow:
                return Response(
                    {"error": "No associated follow request"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if the follow request is still pending
            if inbox_item.follow.status != Follow.PENDING:
                return Response(
                    {"error": "Follow request is not pending"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Reject the follow request
            inbox_item.follow.status = Follow.REJECTED
            inbox_item.follow.save()

            # Delete the inbox item since it's been processed
            inbox_item.delete()

            return Response(
                {"status": "rejected", "message": "Follow request rejected"}
            )

        except Inbox.DoesNotExist:
            return Response(
                {"error": "Inbox item not found"}, status=status.HTTP_404_NOT_FOUND
            )
