from django.test import TestCase
from rest_framework.test import APIClient
from app.models.author import Author
from app.models.follow import Follow
from django.conf import settings
import uuid

class FollowTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create test authors
        self.author_a = Author.objects.create_user(
            username='userA',
            password='pass123',
            display_name='User A',
            url=f"{settings.SITE_URL}/api/authors/{uuid.uuid4()}/",
            is_approved=True
        )

        self.author_b = Author.objects.create_user(
            username='userB',
            password='pass123',
            display_name='User B',
            url=f"{settings.SITE_URL}/api/authors/{uuid.uuid4()}/",
            is_approved=True
        )

        self.author_c = Author.objects.create_user(
            username='userC',
            password='pass123',
            display_name='User C',
            url=f"{settings.SITE_URL}/api/authors/{uuid.uuid4()}/",
            is_approved=True
        )

    def test_send_follow_request(self):
        """Test sending a follow request"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post('/api/follows/', {
            'followed': self.author_b.url
        }, format='json')
        self.assertEqual(response.status_code, 201)
        follow = Follow.objects.get(follower__url=self.author_a.url, followed__url=self.author_b.url)
        self.assertEqual(follow.status, Follow.PENDING)

    def test_send_follow_request_unauthorized(self):
        """Test sending a follow request without authentication"""
        response = self.client.post('/api/follows/', {
            'followed': self.author_b.url
        }, format='json')
        self.assertEqual(response.status_code, 403) # 403 or 401?

    def test_send_follow_request_invalid_url(self):
        """Test sending a follow request with invalid author URL"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post('/api/follows/', {
            'followed': 'invalid-url'
        }, format='json')
        self.assertEqual(response.status_code, 404)

    def test_accept_follow_request(self):
        """Test accepting a follow request"""
        # Create a follow request
        follow = Follow.objects.create(
            follower=self.author_a,
            followed=self.author_b,
            status=Follow.PENDING
        )

        # Accept the request
        self.client.force_authenticate(user=self.author_b)
        response = self.client.post(f'/api/follows/{follow.id}/accept/', format='json')
        self.assertEqual(response.status_code, 200)
        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.ACCEPTED)

    def test_accept_already_accepted_request(self):
        """Test accepting an already accepted follow request"""
        # Create an accepted follow request
        follow = Follow.objects.create(
            follower=self.author_a,
            followed=self.author_b,
            status=Follow.ACCEPTED
        )

        # Try to accept again
        self.client.force_authenticate(user=self.author_b)
        response = self.client.post(f'/api/follows/{follow.id}/accept/', format='json')
        self.assertEqual(response.status_code, 200)
        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.ACCEPTED)

    def test_reject_follow_request(self):
        """Test rejecting a follow request"""
        # Create a follow request
        follow = Follow.objects.create(
            follower=self.author_a,
            followed=self.author_b,
            status=Follow.PENDING
        )

        # Reject the request
        self.client.force_authenticate(user=self.author_b)
        response = self.client.post(f'/api/follows/{follow.id}/reject/', format='json')
        self.assertEqual(response.status_code, 200)
        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.REJECTED)

    def test_reject_already_rejected_request(self):
        """Test rejecting an already rejected follow request"""
        # Create a rejected follow request
        follow = Follow.objects.create(
            follower=self.author_a,
            followed=self.author_b,
            status=Follow.REJECTED
        )

        # Try to reject again
        self.client.force_authenticate(user=self.author_b)
        response = self.client.post(f'/api/follows/{follow.id}/reject/', format='json')
        self.assertEqual(response.status_code, 200)
        follow.refresh_from_db()
        self.assertEqual(follow.status, Follow.REJECTED)

    def test_view_incoming_requests(self):
        """Test viewing incoming follow requests"""
        # Create follow requests
        Follow.objects.create(
            follower=self.author_a,
            followed=self.author_b,
            status=Follow.PENDING
        )
        Follow.objects.create(
            follower=self.author_c,
            followed=self.author_b,
            status=Follow.PENDING
        )

        # View incoming requests
        self.client.force_authenticate(user=self.author_b)
        response = self.client.get('/api/follows/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 2)

    def test_view_incoming_requests_unauthorized(self):
        """Test viewing incoming requests without authentication"""
        response = self.client.get('/api/follows/')
        self.assertEqual(response.status_code, 403)

    def test_view_incoming_requests_empty(self):
        """Test viewing incoming requests when there are none"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.get('/api/follows/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 0)

    def test_unauthorized_accept_reject(self):
        """Test that only the followed author can accept/reject requests"""
        # Create a follow request
        follow = Follow.objects.create(
            follower=self.author_a,
            followed=self.author_b,
            status=Follow.PENDING
        )

        # Try to accept as wrong user
        self.client.force_authenticate(user=self.author_c)
        response = self.client.post(f'/api/follows/{follow.id}/accept/', format='json')
        self.assertEqual(response.status_code, 403)

        # Try to reject as wrong user
        response = self.client.post(f'/api/follows/{follow.id}/reject/', format='json')
        self.assertEqual(response.status_code, 403)

    def test_duplicate_follow_request(self):
        """Test that duplicate follow requests are not allowed"""
        # Create initial follow request
        Follow.objects.create(
            follower=self.author_a,
            followed=self.author_b,
            status=Follow.PENDING
        )

        # Try to create duplicate request
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post('/api/follows/', {
            'followed': self.author_b.url
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'Follow request already exists')

    def test_follow_self(self):
        """Test that authors cannot follow themselves"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.post('/api/follows/', {
            'followed': self.author_a.url
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'Cannot follow yourself')

    def test_unfollow(self):
        """Test unfollowing functionality"""
        # Create an accepted follow relationship
        follow = Follow.objects.create(
            follower=self.author_a,
            followed=self.author_b,
            status=Follow.ACCEPTED
        )

        # Try to unfollow as the follower
        self.client.force_authenticate(user=self.author_a)
        response = self.client.delete(f'/api/follows/{follow.id}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Follow.objects.filter(id=follow.id).exists())

    def test_unauthorized_unfollow(self):
        """Test that only the follower can unfollow"""
        # Create an accepted follow relationship
        follow = Follow.objects.create(
            follower=self.author_a,
            followed=self.author_b,
            status=Follow.ACCEPTED
        )

        # Try to unfollow as wrong user
        self.client.force_authenticate(user=self.author_c)
        response = self.client.delete(f'/api/follows/{follow.id}/')
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Follow.objects.filter(id=follow.id).exists())

    def test_unfollow_nonexistent(self):
        """Test unfollowing a nonexistent follow relationship"""
        self.client.force_authenticate(user=self.author_a)
        response = self.client.delete('/api/follows/999/')
        self.assertEqual(response.status_code, 404)

    def test_unfollow_unauthorized(self):
        """Test unfollowing without authentication"""
        # Create an accepted follow relationship
        follow = Follow.objects.create(
            follower=self.author_a,
            followed=self.author_b,
            status=Follow.ACCEPTED
        )

        # Try to unfollow without authentication
        response = self.client.delete(f'/api/follows/{follow.id}/')
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Follow.objects.filter(id=follow.id).exists()) 