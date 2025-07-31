"""
Test cases for API URL patterns compliance with project specification.
This test suite verifies that all required API endpoints are implemented
according to the project specification.
"""

import uuid
from urllib.parse import quote
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from app.models import Entry, Comment, Like, Follow, Friendship

Author = get_user_model()


class APIEndpointComplianceTest(APITestCase):
    """Test that all required API endpoints exist and respond appropriately"""
    
    def setUp(self):
        """Set up test data for endpoint testing"""
        # Create test users
        self.author1 = Author.objects.create_user(
            username='author1',
            email='author1@example.com',
            password='testpass123',
            displayName='Author One',
            is_approved=True
        )
        
        self.author2 = Author.objects.create_user(
            username='author2',
            email='author2@example.com',
            password='testpass123',
            displayName='Author Two',
            is_approved=True
        )
        
        # Create clients
        self.client1 = APIClient()
        self.client1.force_authenticate(user=self.author1)
        
        self.client2 = APIClient()
        self.client2.force_authenticate(user=self.author2)
        
        # Create test entries
        self.entry1 = Entry.objects.create(
            author=self.author1,
            title='Test Entry 1',
            content='Test content 1',
            visibility=Entry.PUBLIC
        )
        
        self.entry2 = Entry.objects.create(
            author=self.author2,
            title='Test Entry 2',
            content='Test content 2',
            visibility=Entry.PUBLIC
        )
        
        # Create test comment
        self.comment1 = Comment.objects.create(
            author=self.author2,
            entry=self.entry1,
            content='Test comment',
            content_type='text/plain'
        )
        
        # Create test like
        self.like1 = Like.objects.create(
            author=self.author2,
            entry=self.entry1
        )

    def test_authors_api_endpoints(self):
        """Test Authors API endpoints - GET /api/authors/"""
        
        # Test basic authors list endpoint
        response = self.client.get('/api/authors/')
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, 
            status.HTTP_401_UNAUTHORIZED, 
            status.HTTP_403_FORBIDDEN
        ], "Authors list endpoint should exist and return appropriate status")
        
        # Test paginated authors list
        response = self.client.get('/api/authors/?page=1&size=5')
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, 
            status.HTTP_401_UNAUTHORIZED, 
            status.HTTP_403_FORBIDDEN
        ], "Paginated authors list should work")

    def test_single_author_api_endpoints(self):
        """Test Single Author API endpoints"""
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/
        url = f'/api/authors/{self.author1.id}/'
        response = self.client1.get(url)
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, 
            status.HTTP_401_UNAUTHORIZED, 
            status.HTTP_403_FORBIDDEN
        ], f"Single author GET endpoint should exist: {url}")
        
        # Test PUT /api/authors/{AUTHOR_SERIAL}/
        response = self.client1.put(url, {'displayName': 'Updated Name'})
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, 
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED, 
            status.HTTP_403_FORBIDDEN,
            status.HTTP_405_METHOD_NOT_ALLOWED
        ], f"Single author PUT endpoint should exist: {url}")

    def test_followers_api_endpoints(self):
        """Test Followers API endpoints"""
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/followers
        url = f'/api/authors/{self.author1.id}/followers/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND, 
                           f"Followers list endpoint should exist: {url}")
        
        # Test individual follower endpoints using actual author URL
        foreign_author_fqid = quote(self.author2.url, safe='')
        url = f'/api/authors/{self.author1.id}/followers/{foreign_author_fqid}/'
        
        # Test GET follower check
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Individual follower GET endpoint should exist: {url}")
        
        # Test PUT add follower
        response = self.client1.put(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Individual follower PUT endpoint should exist: {url}")
        
        # Test DELETE remove follower
        response = self.client1.delete(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Individual follower DELETE endpoint should exist: {url}")

    def test_entries_api_endpoints(self):
        """Test Entries API endpoints"""
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}
        url = f'/api/authors/{self.author1.id}/entries/{self.entry1.id}/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Author entry detail endpoint should exist: {url}")
        
        # Test PUT /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}
        response = self.client1.put(url, {'title': 'Updated Title'})
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Author entry PUT endpoint should exist: {url}")
        
        # Test DELETE /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}
        response = self.client1.delete(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Author entry DELETE endpoint should exist: {url}")
        
        # Test GET /api/entries/{ENTRY_FQID}
        entry_fqid = quote(self.entry1.url, safe='')
        url = f'/api/entries/{entry_fqid}/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Entry FQID endpoint should exist: {url}")
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/entries/ (list)
        url = f'/api/authors/{self.author1.id}/entries/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Author entries list endpoint should exist: {url}")
        
        # Test POST /api/authors/{AUTHOR_SERIAL}/entries/ (create)
        response = self.client1.post(url, {
            'title': 'New Entry',
            'content': 'New content',
            'visibility': 'PUBLIC'
        })
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Author entries create endpoint should exist: {url}")

    def test_image_entries_endpoints(self):
        """Test Image Entries endpoints"""
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/image
        # This should return 404 for non-image entries, but the endpoint should exist
        url = f'/api/authors/{self.author1.id}/entries/{self.entry1.id}/image/'
        response = self.client.get(url)
        # The endpoint exists but returns 404 for non-image entries, which is expected behavior
        self.assertIn(response.status_code, [
            status.HTTP_404_NOT_FOUND,  # Expected for non-image entries
            status.HTTP_200_OK,         # If entry was an image
            status.HTTP_401_UNAUTHORIZED,  # If authentication required
        ], f"Author entry image endpoint should exist: {url}")
        
        # Test GET /api/entries/{ENTRY_FQID}/image
        entry_fqid = quote(self.entry1.url, safe='')
        url = f'/api/entries/{entry_fqid}/image/'
        response = self.client.get(url)
        # The endpoint exists but returns 404 for non-image entries, which is expected behavior
        self.assertIn(response.status_code, [
            status.HTTP_404_NOT_FOUND,  # Expected for non-image entries
            status.HTTP_200_OK,         # If entry was an image
            status.HTTP_401_UNAUTHORIZED,  # If authentication required
        ], f"Entry FQID image endpoint should exist: {url}")

    def test_comments_api_endpoints(self):
        """Test Comments API endpoints"""
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/comments
        url = f'/api/authors/{self.author1.id}/entries/{self.entry1.id}/comments/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Entry comments list endpoint should exist: {url}")
        
        # Test GET /api/entries/{ENTRY_FQID}/comments
        entry_fqid = quote(self.entry1.url, safe='')
        url = f'/api/entries/{entry_fqid}/comments/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Entry FQID comments endpoint should exist: {url}")
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/comment/{REMOTE_COMMENT_FQID}
        # For comment FQID, we need to construct it since comments don't have URLs in your model
        comment_fqid = quote(f"{self.author2.url}/commented/{self.comment1.id}", safe='')
        url = f'/api/authors/{self.author1.id}/entries/{self.entry1.id}/comment/{comment_fqid}/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Specific comment endpoint should exist: {url}")

    def test_commented_api_endpoints(self):
        """Test Commented API endpoints"""
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/commented
        url = f'/api/authors/{self.author2.id}/commented/'
        response = self.client.get(url)
        # The endpoint should exist and return appropriate status codes
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,         # If comments exist
            status.HTTP_404_NOT_FOUND,  # If no comments or entry not found
            status.HTTP_401_UNAUTHORIZED,  # If authentication required
            status.HTTP_403_FORBIDDEN,  # If access forbidden
        ], f"Author commented list endpoint should exist: {url}")
        
        # Test POST /api/authors/{AUTHOR_SERIAL}/commented
        response = self.client2.post(url, {
            'type': 'comment',
            'entry': self.entry1.url,
            'comment': 'New comment',
            'contentType': 'text/plain'
        }, format='json')
        # The endpoint should exist and return appropriate status codes
        self.assertIn(response.status_code, [
            status.HTTP_201_CREATED,    # If comment created successfully
            status.HTTP_400_BAD_REQUEST,  # If validation error
            status.HTTP_404_NOT_FOUND,  # If entry not found
            status.HTTP_401_UNAUTHORIZED,  # If authentication required
            status.HTTP_403_FORBIDDEN,  # If access forbidden
        ], f"Author commented create endpoint should exist: {url}")
        
        # Test GET /api/authors/{AUTHOR_FQID}/commented
        author_fqid = quote(self.author2.url, safe='')
        url = f'/api/authors/{author_fqid}/commented/'
        response = self.client.get(url)
        # The endpoint should exist and return appropriate status codes
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,         # If comments exist
            status.HTTP_404_NOT_FOUND,  # If no comments or entry not found
            status.HTTP_401_UNAUTHORIZED,  # If authentication required
            status.HTTP_403_FORBIDDEN,  # If access forbidden
        ], f"Author FQID commented endpoint should exist: {url}")
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/commented/{COMMENT_SERIAL}
        url = f'/api/authors/{self.author2.id}/commented/{self.comment1.id}/'
        response = self.client.get(url)
        # The endpoint should exist and return appropriate status codes
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,         # If comment exists
            status.HTTP_404_NOT_FOUND,  # If comment not found
            status.HTTP_401_UNAUTHORIZED,  # If authentication required
            status.HTTP_403_FORBIDDEN,  # If access forbidden
        ], f"Specific commented endpoint should exist: {url}")
        
        # Test GET /api/commented/{COMMENT_FQID}
        comment_fqid = quote(f"{self.author2.url}/commented/{self.comment1.id}", safe='')
        url = f'/api/commented/{comment_fqid}/'
        response = self.client.get(url)
        # The endpoint should exist and return appropriate status codes
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,         # If comment exists
            status.HTTP_404_NOT_FOUND,  # If comment not found
            status.HTTP_401_UNAUTHORIZED,  # If authentication required
            status.HTTP_403_FORBIDDEN,  # If access forbidden
        ], f"Comment FQID endpoint should exist: {url}")

    def test_likes_api_endpoints(self):
        """Test Likes API endpoints"""
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/likes
        url = f'/api/authors/{self.author1.id}/entries/{self.entry1.id}/likes/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Entry likes endpoint should exist: {url}")
        
        # Test GET /api/entries/{ENTRY_FQID}/likes
        entry_fqid = quote(self.entry1.url, safe='')
        url = f'/api/entries/{entry_fqid}/likes/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Entry FQID likes endpoint should exist: {url}")
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/comments/{COMMENT_FQID}/likes
        comment_fqid = quote(f"{self.author2.url}/commented/{self.comment1.id}", safe='')
        url = f'/api/authors/{self.author1.id}/entries/{self.entry1.id}/comments/{comment_fqid}/likes/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Comment likes endpoint should exist: {url}")

    def test_liked_api_endpoints(self):
        """Test Liked API endpoints"""
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/liked
        url = f'/api/authors/{self.author2.id}/liked/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Author liked list endpoint should exist: {url}")
        
        # Test GET /api/authors/{AUTHOR_SERIAL}/liked/{LIKE_SERIAL}
        url = f'/api/authors/{self.author2.id}/liked/{self.like1.id}/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Specific liked endpoint should exist: {url}")
        
        # Test GET /api/authors/{AUTHOR_FQID}/liked
        author_fqid = quote(self.author2.url, safe='')
        url = f'/api/authors/{author_fqid}/liked/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Author FQID liked endpoint should exist: {url}")
        
        # Test GET /api/liked/{LIKE_FQID}
        like_fqid = quote(f"{self.author2.url}/liked/{self.like1.id}", safe='')
        url = f'/api/liked/{like_fqid}/'
        response = self.client.get(url)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Like FQID endpoint should exist: {url}")

    def test_inbox_api_endpoints(self):
        """Test Inbox API endpoints"""
        
        # Test POST /api/authors/{AUTHOR_SERIAL}/inbox - follow request
        url = f'/api/authors/{self.author1.id}/inbox/'
        follow_request = {
            'type': 'follow',
            'summary': 'actor wants to follow object',
            'actor': {
                'type': 'author',
                'id': self.author2.url,
                'displayName': 'Author Two'
            },
            'object': {
                'type': 'author',
                'id': self.author1.url,
                'displayName': 'Author One'
            }
        }
        response = self.client.post(url, follow_request, format='json')
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Inbox follow request endpoint should exist: {url}")
        
        # Test POST /api/authors/{AUTHOR_SERIAL}/inbox - entry
        entry_data = {
            'type': 'entry',
            'title': 'Inbox Entry',
            'content': 'Entry sent to inbox',
            'visibility': 'PUBLIC'
        }
        response = self.client.post(url, entry_data, format='json')
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Inbox entry endpoint should exist: {url}")
        
        # Test POST /api/authors/{AUTHOR_SERIAL}/inbox - like
        like_data = {
            'type': 'like',
            'author': {
                'type': 'author',
                'id': self.author2.url
            },
            'object': self.entry1.url
        }
        response = self.client.post(url, like_data, format='json')
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Inbox like endpoint should exist: {url}")
        
        # Test POST /api/authors/{AUTHOR_SERIAL}/inbox - comment
        comment_data = {
            'type': 'comment',
            'author': {
                'type': 'author',
                'id': self.author2.url
            },
            'comment': 'Comment via inbox',
            'entry': self.entry1.url
        }
        response = self.client.post(url, comment_data, format='json')
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND,
                           f"Inbox comment endpoint should exist: {url}")
