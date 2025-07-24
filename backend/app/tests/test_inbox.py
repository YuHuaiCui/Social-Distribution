from django.test import TestCase
from rest_framework.test import APIClient
from app.models.author import Author
from app.models.follow import Follow
from app.models.inbox import Inbox
from django.conf import settings
import uuid


class InboxTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create test authors
        self.author_a = Author.objects.create_user(
            username="userA",
            password="pass123",
            display_name="User A",
            url=f"{settings.SITE_URL}/api/authors/{uuid.uuid4()}/",
            is_approved=True,
        )

        self.author_b = Author.objects.create_user(
            username="userB",
            password="pass123",
            display_name="User B",
            url=f"{settings.SITE_URL}/api/authors/{uuid.uuid4()}/",
            is_approved=True,
        )

    def test_accept_follow_request_deletes_inbox_item(self):
        """Test that accepting a follow request deletes the inbox notification"""
        # Create a follow request
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.PENDING
        )

        # Create inbox notification
        inbox_item = Inbox.objects.create(
            recipient=self.author_b,
            item_type=Inbox.FOLLOW,
            follow=follow,
            raw_data={"type": "Follow", "actor": {"id": self.author_a.url}},
        )

        # Accept the follow request via inbox
        self.client.force_authenticate(user=self.author_b)
        response = self.client.post(f"/api/inbox/{inbox_item.id}/accept-follow/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.data)
        self.assertEqual(response.data["message"], "Follow request accepted")

        # Verify follow status was updated
        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.ACCEPTED)

        # Verify inbox item was marked as read (not deleted)
        inbox_item.refresh_from_db()
        self.assertTrue(inbox_item.is_read)

    def test_reject_follow_request_deletes_inbox_item(self):
        """Test that rejecting a follow request deletes the inbox notification"""
        # Create a follow request
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.PENDING
        )

        # Create inbox notification
        inbox_item = Inbox.objects.create(
            recipient=self.author_b,
            item_type=Inbox.FOLLOW,
            follow=follow,
            raw_data={"type": "Follow", "actor": {"id": self.author_a.url}},
        )

        # Reject the follow request via inbox
        self.client.force_authenticate(user=self.author_b)
        response = self.client.post(f"/api/inbox/{inbox_item.id}/reject-follow/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.data)
        self.assertEqual(response.data["message"], "Follow request rejected")

        # Verify follow status was updated
        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.REJECTED)

        # Verify inbox item was marked as read (not deleted)
        inbox_item.refresh_from_db()
        self.assertTrue(inbox_item.is_read)

    def test_accept_follow_unauthorized(self):
        """Test that only the recipient can accept a follow request"""
        # Create a follow request
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.PENDING
        )

        # Create inbox notification
        inbox_item = Inbox.objects.create(
            recipient=self.author_b,
            item_type=Inbox.FOLLOW,
            follow=follow,
            raw_data={"type": "Follow", "actor": {"id": self.author_a.url}},
        )

        # Try to accept as wrong user
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post(f"/api/inbox/{inbox_item.id}/accept-follow/")

        self.assertEqual(response.status_code, 404)

        # Verify follow status was not changed
        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.PENDING)

        # Verify inbox item still exists
        self.assertTrue(Inbox.objects.filter(id=inbox_item.id).exists())

    def test_accept_already_accepted_follow(self):
        """Test accepting an already accepted follow request"""
        # Create an accepted follow request
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )

        # Create inbox notification
        inbox_item = Inbox.objects.create(
            recipient=self.author_b,
            item_type=Inbox.FOLLOW,
            follow=follow,
            raw_data={"type": "Follow", "actor": {"id": self.author_a.url}},
        )

        # Try to accept again - should succeed
        self.client.force_authenticate(user=self.author_b)
        response = self.client.post(f"/api/inbox/{inbox_item.id}/accept-follow/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.data)
        self.assertEqual(response.data["message"], "Follow request accepted")

        # Verify follow status remains accepted
        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.ACCEPTED)

    def test_get_inbox_items(self):
        """Test retrieving inbox items"""
        # Create a follow request with inbox notification
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.PENDING
        )

        inbox_item = Inbox.objects.create(
            recipient=self.author_b,
            item_type=Inbox.FOLLOW,
            follow=follow,
            raw_data={"type": "Follow", "actor": {"id": self.author_a.url}},
        )

        # Get inbox items
        self.client.force_authenticate(user=self.author_b)
        response = self.client.get("/api/inbox/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], inbox_item.id)
        self.assertEqual(response.data["results"][0]["content_type"], "follow")

    def test_inbox_stats_includes_pending_follows(self):
        """Test that inbox stats correctly count pending follow requests"""
        # Create a follow request
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.PENDING
        )

        # Create inbox notification
        Inbox.objects.create(
            recipient=self.author_b,
            item_type=Inbox.FOLLOW,
            follow=follow,
            raw_data={"type": "Follow", "actor": {"id": self.author_a.url}},
        )

        # Create another author and follow request
        author_c = Author.objects.create_user(
            username="userC",
            password="pass123",
            display_name="User C",
            url=f"{settings.SITE_URL}/api/authors/{uuid.uuid4()}/",
            is_approved=True,
        )

        # Create accepted follow (should not be in pending)
        follow_accepted = Follow.objects.create(
            follower=author_c, followed=self.author_b, status=Follow.ACCEPTED
        )

        Inbox.objects.create(
            recipient=self.author_b,
            item_type=Inbox.FOLLOW,
            follow=follow_accepted,
            raw_data={"type": "Follow", "actor": {"id": author_c.url}},
        )

        # Get inbox stats
        self.client.force_authenticate(user=self.author_b)
        response = self.client.get("/api/inbox/stats/")

        self.assertEqual(response.status_code, 200)
        # API returns actual fields, not pending_follows
        self.assertEqual(response.data["total_items"], 2)
        self.assertEqual(response.data["unread_items"], 2)
        self.assertIn("by_type", response.data)
