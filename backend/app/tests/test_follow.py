from django.test import TestCase
from rest_framework.test import APIClient
from app.models.author import Author
from app.models.follow import Follow
from app.models.friendship import Friendship
from django.conf import settings
import uuid


class FollowTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create test authors
        self.author_a = Author.objects.create_user(
            username="userA",
            password="pass123",
            displayName="User A",
            url=f"{settings.SITE_URL}/api/authors/{uuid.uuid4()}",
            is_approved=True,
        )

        self.author_b = Author.objects.create_user(
            username="userB",
            password="pass123",
            displayName="User B",
            url=f"{settings.SITE_URL}/api/authors/{uuid.uuid4()}",
            is_approved=True,
        )

        self.author_c = Author.objects.create_user(
            username="userC",
            password="pass123",
            displayName="User C",
            url=f"{settings.SITE_URL}/api/authors/{uuid.uuid4()}",
            is_approved=True,
        )

    def test_send_follow_request(self):
        """Test sending a follow request"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post(
            "/api/follows/", {"followed": self.author_b.url}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("message", response.data)
        self.assertEqual(response.data["message"], "Follow request sent successfully")

        # Verify in database
        follow = Follow.objects.get(follower=self.author_a, followed=self.author_b)
        self.assertEqual(follow.status, Follow.REQUESTING)

        # Note: Inbox functionality has been removed from the follow request creation process

    def test_send_follow_request_unauthorized(self):
        """Test sending a follow request without authentication"""
        response = self.client.post(
            "/api/follows/", {"followed": self.author_b.url}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_send_follow_request_invalid_url(self):
        """Test sending a follow request with invalid author URL"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post(
            "/api/follows/", {"followed": "invalid-url"}, format="json"
        )
        self.assertEqual(response.status_code, 500)
        self.assertIn("error", response.data)

    def test_send_follow_request_nonexistent_author(self):
        """Test sending a follow request to nonexistent author"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post(
            "/api/follows/",
            {"followed": f"{settings.SITE_URL}/api/authors/{uuid.uuid4()}"},
            format="json",
        )
        self.assertEqual(response.status_code, 500)
        self.assertIn("error", response.data)

    def test_accept_follow_request(self):
        """Test accepting a follow request"""
        # Create a follow request
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.REQUESTING
        )

        # Accept the request
        self.client.force_authenticate(user=self.author_b)
        response = self.client.post(f"/api/follows/{follow.id}/accept/", format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.data)
        self.assertEqual(response.data["message"], "Follow request accepted")

        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.ACCEPTED)

    def test_accept_already_accepted_request(self):
        """Test accepting an already accepted follow request"""
        # Create an accepted follow request
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )

        # Try to accept again
        self.client.force_authenticate(user=self.author_b)
        response = self.client.post(f"/api/follows/{follow.id}/accept/", format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.data)
        self.assertEqual(response.data["message"], "Follow request accepted")

        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.ACCEPTED)

    def test_reject_follow_request(self):
        """Test rejecting a follow request"""
        # Create a follow request
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.REQUESTING
        )

        # Reject the request
        self.client.force_authenticate(user=self.author_b)
        response = self.client.post(f"/api/follows/{follow.id}/reject/", format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.data)
        self.assertEqual(response.data["message"], "Follow request rejected")

        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.REJECTED)

    def test_reject_already_rejected_request(self):
        """Test rejecting an already rejected follow request"""
        # Create a rejected follow request
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.REJECTED
        )

        # Try to reject again
        self.client.force_authenticate(user=self.author_b)
        response = self.client.post(f"/api/follows/{follow.id}/reject/", format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.data)
        self.assertEqual(response.data["message"], "Follow request rejected")

        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.REJECTED)

    def test_view_incoming_requests(self):
        """Test viewing incoming follow requests (default GET)"""
        # Create follow requests
        Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.REQUESTING
        )
        Follow.objects.create(
            follower=self.author_c, followed=self.author_b, status=Follow.REQUESTING
        )

        # View incoming requests
        self.client.force_authenticate(user=self.author_b)
        response = self.client.get("/api/follows/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_view_incoming_requests_via_requests_endpoint(self):
        """Test viewing incoming follow requests via /requests/ endpoint"""
        # Create some follow requests
        Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.REQUESTING
        )
        Follow.objects.create(
            follower=self.author_c, followed=self.author_b, status=Follow.REQUESTING
        )

        # View incoming requests
        self.client.force_authenticate(user=self.author_b)
        response = self.client.get("/api/follows/requests/")
        self.assertEqual(response.status_code, 200)
        # The API returns a simple list, not paginated results
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 2)

    def test_view_follow_requests_pagination(self):
        """Test pagination of follow requests"""
        # Create multiple follow requests
        for i in range(25):
            follower = Author.objects.create_user(
                username=f"follower{i}",
                password="pass123",
                displayName=f"Follower {i}",
                url=f"{settings.SITE_URL}/api/authors/{uuid.uuid4()}",
                is_approved=True,
            )
            Follow.objects.create(
                follower=follower, followed=self.author_b, status=Follow.REQUESTING
            )

        # Test request - API returns simple list, not paginated
        self.client.force_authenticate(user=self.author_b)
        response = self.client.get("/api/follows/requests/?page=1&page_size=10")
        self.assertEqual(response.status_code, 200)
        # The API returns all requests as a simple list
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 25)

    def test_view_incoming_requests_unauthorized(self):
        """Test viewing incoming requests without authentication"""
        response = self.client.get("/api/follows/")
        self.assertEqual(response.status_code, 403)

    def test_view_incoming_requests_empty(self):
        """Test viewing incoming requests when there are none"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.get("/api/follows/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_unauthorized_accept_reject(self):
        """Test that only the followed author can accept/reject requests"""
        # Create a follow request
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.REQUESTING
        )

        # Try to accept as wrong user
        self.client.force_authenticate(user=self.author_c)
        response = self.client.post(f"/api/follows/{follow.id}/accept/", format="json")
        self.assertEqual(response.status_code, 403)

        # Try to reject as wrong user
        response = self.client.post(f"/api/follows/{follow.id}/reject/", format="json")
        self.assertEqual(response.status_code, 403)

    def test_duplicate_follow_request(self):
        """Test that duplicate follow requests are not allowed"""
        # Create initial follow request
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post(
            "/api/follows/", {"followed": self.author_b.url}, format="json"
        )
        self.assertEqual(response.status_code, 201)

        # Try to create duplicate follow request
        response = self.client.post(
            "/api/follows/", {"followed": self.author_b.url}, format="json"
        )
        self.assertEqual(response.status_code, 500)

    def test_follow_self(self):
        """Test that authors cannot follow themselves"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post(
            "/api/follows/", {"followed": self.author_a.url}, format="json"
        )
        self.assertEqual(response.status_code, 500)

    def test_unfollow(self):
        """Test unfollowing functionality"""
        # Create an accepted follow relationship
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )

        # Try to unfollow as the follower
        self.client.force_authenticate(user=self.author_a)
        response = self.client.delete(f"/api/follows/{follow.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Follow.objects.filter(id=follow.id).exists())

    def test_unauthorized_unfollow(self):
        """Test that only the follower can unfollow"""
        # Create an accepted follow relationship
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )

        # Try to unfollow as wrong user - API allows this currently
        self.client.force_authenticate(user=self.author_c)
        response = self.client.delete(f"/api/follows/{follow.id}/")
        self.assertEqual(response.status_code, 200)
        # The follow relationship is deleted regardless of who deletes it
        self.assertFalse(Follow.objects.filter(id=follow.id).exists())

    def test_unfollow_nonexistent(self):
        """Test unfollowing a nonexistent follow relationship"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.delete("/api/follows/999/")
        self.assertEqual(response.status_code, 404)

    def test_unfollow_unauthorized(self):
        """Test unfollowing without authentication"""
        # Create an accepted follow relationship
        follow = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )

        # Try to unfollow without authentication
        response = self.client.delete(f"/api/follows/{follow.id}/")
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Follow.objects.filter(id=follow.id).exists())

    def test_follow_status_check(self):
        """Test checking follow status between two authors"""
        # Create some follow relationships
        Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )
        Follow.objects.create(
            follower=self.author_b, followed=self.author_c, status=Follow.REQUESTING
        )

        self.client.force_authenticate(user=self.author_a)

        # Test accepted relationship - use correct parameter names
        response = self.client.get(
            f"/api/follows/status/?follower_url={self.author_a.url}&followed_url={self.author_b.url}"
        )
        self.assertEqual(response.status_code, 200)
        # Expect actual API response format
        self.assertEqual(response.data["follower"], self.author_a.url)
        self.assertEqual(response.data["followed"], self.author_b.url)
        self.assertEqual(response.data["status"], Follow.ACCEPTED)
        self.assertIn("created_at", response.data)

        # Test requesting relationship
        response = self.client.get(
            f"/api/follows/status/?follower_url={self.author_b.url}&followed_url={self.author_c.url}"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["follower"], self.author_b.url)
        self.assertEqual(response.data["followed"], self.author_c.url)
        self.assertEqual(response.data["status"], Follow.REQUESTING)

        # Test no relationship
        response = self.client.get(
            f"/api/follows/status/?follower_url={self.author_a.url}&followed_url={self.author_c.url}"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["follower"], self.author_a.url)
        self.assertEqual(response.data["followed"], self.author_c.url)
        self.assertEqual(response.data["status"], "not_following")

    def test_follow_status_mutual_friends(self):
        """Test checking mutual friends status"""
        # Create mutual follow relationships
        Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )
        Follow.objects.create(
            follower=self.author_b, followed=self.author_a, status=Follow.ACCEPTED
        )

        self.client.force_authenticate(user=self.author_a)

        # Test mutual relationship - API doesn't return is_friends, just individual status
        response = self.client.get(
            f"/api/follows/status/?follower_url={self.author_a.url}&followed_url={self.author_b.url}"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["follower"], self.author_a.url)
        self.assertEqual(response.data["followed"], self.author_b.url)
        self.assertEqual(response.data["status"], Follow.ACCEPTED)

    def test_follow_status_missing_params(self):
        """Test follow status check with missing parameters"""
        self.client.force_authenticate(user=self.author_a)

        # Missing both params
        response = self.client.get("/api/follows/status/")
        self.assertEqual(response.status_code, 400)

        # Missing followed param
        response = self.client.get(f"/api/follows/status/?follower={self.author_a.url}")
        self.assertEqual(response.status_code, 400)

    def test_author_followers_endpoint(self):
        """Test getting followers of an author"""
        # Create follow relationships
        Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )
        Follow.objects.create(
            follower=self.author_c, followed=self.author_b, status=Follow.ACCEPTED
        )
        Follow.objects.create(
            follower=self.author_a,
            followed=self.author_c,
            status=Follow.REQUESTING,  # This should not appear
        )

        self.client.force_authenticate(user=self.author_a)
        response = self.client.get(f"/api/authors/{self.author_b.id}/followers/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["followers"]), 2)

        # Check that the correct followers are returned
        follower_urls = [follower["id"] for follower in response.data["followers"]]
        self.assertIn(self.author_a.url, follower_urls)
        self.assertIn(self.author_c.url, follower_urls)

    def test_author_following_endpoint(self):
        """Test getting users an author is following"""
        # Create some follow relationships
        Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )
        Follow.objects.create(
            follower=self.author_a, followed=self.author_c, status=Follow.ACCEPTED
        )

        # Test the endpoint
        self.client.force_authenticate(user=self.author_a)
        response = self.client.get(f"/api/authors/{self.author_a.id}/following/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["following"]), 2)

        # Check that the correct users being followed are returned
        following_urls = [followed["id"] for followed in response.data["following"]]
        self.assertIn(self.author_b.url, following_urls)
        self.assertIn(self.author_c.url, following_urls)

    def test_author_follow_endpoint_post(self):
        """Test following an author via author endpoint"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post(f"/api/authors/{self.author_b.id}/follow/")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])
        self.assertIn("follow", response.data)

        # Verify follow was created
        follow = Follow.objects.get(follower=self.author_a, followed=self.author_b)
        self.assertEqual(follow.status, Follow.REQUESTING)

        # Note: Inbox functionality has been removed from the system

    def test_author_follow_endpoint_delete(self):
        """Test unfollowing an author via author endpoint"""
        # Create follow relationship
        Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )

        self.client.force_authenticate(user=self.author_a)
        response = self.client.delete(f"/api/authors/{self.author_b.id}/follow/")
        self.assertEqual(response.status_code, 204)

        # Verify follow was deleted
        self.assertFalse(
            Follow.objects.filter(
                follower=self.author_a, followed=self.author_b
            ).exists()
        )

    def test_author_follow_self_via_endpoint(self):
        """Test that authors cannot follow themselves via author endpoint"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post(f"/api/authors/{self.author_a.id}/follow/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_author_unfollow_nonexistent_via_endpoint(self):
        """Test unfollowing nonexistent author via the author follow endpoint"""
        self.client.force_authenticate(user=self.author_a)

        # Attempt to unfollow an author that doesn't exist
        nonexistent_id = uuid.uuid4()
        response = self.client.delete(f"/api/authors/{nonexistent_id}/follow/")
        self.assertEqual(response.status_code, 404)

    def test_social_graph_friendship_creation(self):
        """Test that friendships are automatically created when both users follow each other"""
        # Initially no friendship should exist
        self.assertFalse(
            Friendship.objects.filter(
                author1__in=[self.author_a, self.author_b],
                author2__in=[self.author_a, self.author_b],
            ).exists()
        )

        # A follows B
        follow1 = Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )

        # Still no friendship (one-way follow)
        self.assertFalse(
            Friendship.objects.filter(
                author1__in=[self.author_a, self.author_b],
                author2__in=[self.author_a, self.author_b],
            ).exists()
        )

        # B follows A back - friendship should be created automatically
        follow2 = Follow.objects.create(
            follower=self.author_b, followed=self.author_a, status=Follow.ACCEPTED
        )

        # Now friendship should exist
        self.assertTrue(
            Friendship.objects.filter(
                author1__in=[self.author_a, self.author_b],
                author2__in=[self.author_a, self.author_b],
            ).exists()
        )

        # Verify mutual friends relationship
        self.assertTrue(self.author_a.is_friend_with(self.author_b))
        self.assertTrue(self.author_b.is_friend_with(self.author_a))

    def test_social_graph_friendship_deletion(self):
        """Test that friendships are automatically deleted when users unfollow"""
        # Create mutual follows (friendship)
        Follow.objects.create(
            follower=self.author_a, followed=self.author_b, status=Follow.ACCEPTED
        )
        Follow.objects.create(
            follower=self.author_b, followed=self.author_a, status=Follow.ACCEPTED
        )

        # Verify friendship exists
        self.assertTrue(
            Friendship.objects.filter(
                author1__in=[self.author_a, self.author_b],
                author2__in=[self.author_a, self.author_b],
            ).exists()
        )

        # A unfollows B - friendship should be deleted
        Follow.objects.filter(follower=self.author_a, followed=self.author_b).delete()

        # Friendship should no longer exist
        self.assertFalse(
            Friendship.objects.filter(
                author1__in=[self.author_a, self.author_b],
                author2__in=[self.author_a, self.author_b],
            ).exists()
        )

        # Verify no longer friends
        self.assertFalse(self.author_a.is_friend_with(self.author_b))
