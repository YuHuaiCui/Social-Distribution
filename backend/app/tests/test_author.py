from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse
from app.models import Entry
import base64
from django.core.files.uploadedfile import SimpleUploadedFile

Author = get_user_model()

class BaseAPITestCase(APITestCase):
    """Base test case with common setup and helper methods"""
    
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.admin_user = Author.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        
        self.regular_user = Author.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            display_name='Test User',
            is_approved=True
        )
        
        self.another_user = Author.objects.create_user(
            username='anotheruser',
            email='another@example.com',
            password='anotherpass123',
            display_name='Another User',
            is_approved=True
        )
        
        # Create test entries
        self.public_entry = Entry.objects.create(
            author=self.regular_user,
            title='Public Entry',
            content='This is a public entry',
            visibility='public'
        )
        
        self.private_entry = Entry.objects.create(
            author=self.regular_user,
            title='Private Entry',
            content='This is a private entry',
            visibility='friends'
        )

        self.private_entry_2 = Entry.objects.create(
            author=self.another_user,
            title='Private Entry 2',
            content='This is a private entry 2',
            visibility='friends'
        )
        
        # Set up API clients
        self.client = APIClient()
        self.admin_client = APIClient()
        self.user_client = APIClient()
        self.another_user_client = APIClient()
        
        # Authenticate clients
        self.admin_client.force_authenticate(user=self.admin_user)
        self.user_client.force_authenticate(user=self.regular_user)
        self.another_user_client.force_authenticate(user=self.another_user)

class AuthorAPITest(BaseAPITestCase):
    """Test cases for Author API endpoints"""
    
    def test_author_list(self):
        """Test author list endpoint"""
        url = reverse('social-distribution:author-list')
        
        # Test unauthenticated access
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test authenticated access
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Debug prints
        # print("\nResponse data:", response.data)
        # print("Number of authors in response:", len(response.data['results']))
        # print("Authors in database:", Author.objects.count())
        # print("Author usernames in response:", [author['username'] for author in response.data['results']])
        # print("Author usernames in database:", [author.username for author in Author.objects.all()])
        
        expected_authors = Author.objects.count()
        self.assertEqual(len(response.data['results']), expected_authors)
        
        # Verify our test users are in the response
        usernames = [author['username'] for author in response.data['results']]
        self.assertIn('admin', usernames)
        self.assertIn('testuser', usernames)
        self.assertIn('anotheruser', usernames)
    
    def test_author_list_filtering(self):
        """Test author list filtering"""
        url = reverse('social-distribution:author-list')
        
        # Test filtering by approval status
        response = self.user_client.get(url, {'is_approved': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(author['is_approved'] for author in response.data['results']))
        
        # Test filtering by active status
        response = self.user_client.get(url, {'is_active': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(author['is_active'] for author in response.data['results']))
        
        # Test filtering by type (local)
        response = self.user_client.get(url, {'type': 'local'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(author.get('node') is None for author in response.data['results']))
        
        # Test search functionality
        response = self.user_client.get(url, {'search': 'test'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any('test' in author['username'].lower() for author in response.data['results']))
    
    def test_author_detail(self):
        """Test retrieving author details"""
        url = reverse('social-distribution:author-detail', args=[self.regular_user.id])
        
        # Test unauthenticated access
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test authenticated access
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
    
    def test_author_create(self):
        """Test creating new authors"""
        url = reverse('social-distribution:author-list')
        data = {
            'username': 'newauthor',
            'email': 'new@example.com',
            'password': 'newpass123',
            'password_confirm': 'newpass123',
            'display_name': 'New Author',
            'github_username': 'newauthor',
            'bio': 'Test bio',
            'location': 'Test location',
            'website': 'https://test.com',
            'is_active': True
        }
        
        # Test unauthenticated creation
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test non-admin creation
        response = self.user_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test admin creation
        response = self.admin_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['author']['username'], 'newauthor')
        
        # Verify author was created
        author = Author.objects.get(username='newauthor')
        self.assertEqual(author.email, 'new@example.com')
        self.assertTrue(author.check_password('newpass123'))
        self.assertEqual(author.display_name, 'New Author')
        self.assertEqual(author.github_username, 'newauthor')
        self.assertEqual(author.bio, 'Test bio')
        # self.assertEqual(author.location, 'Test location') in the model but not in serializer
        # self.assertEqual(author.website, 'https://test.com') in the model but not in serializer
        self.assertFalse(author.is_approved)  # Should be unapproved by default
        self.assertTrue(author.is_active)  # Should be active by default
    
    def test_author_update(self):
        """Test updating author details"""
        url = reverse('social-distribution:author-detail', args=[self.regular_user.id])
        data = {'display_name': 'Updated Name'}
        
        # Test unauthorized update
        response = self.another_user_client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test self update
        response = self.user_client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['display_name'], 'Updated Name')
        
        # Test admin update
        response = self.admin_client.patch(url, {'is_approved': True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_approved'])
    
    def test_author_approve(self):
        """Test author approval endpoint"""
        # Create an unapproved user
        unapproved_user = Author.objects.create_user(
            username='unapproved',
            email='unapproved@example.com',
            password='unapproved123',
            is_approved=False
        )
        
        url = reverse('social-distribution:author-approve', args=[unapproved_user.id])
        
        # Test unauthorized approval
        response = self.user_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test admin approval
        response = self.admin_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['author']['is_approved'])
    
    def test_author_activate_deactivate(self):
        """Test author activation/deactivation"""
        url_activate = reverse('social-distribution:author-activate', args=[self.regular_user.id])
        url_deactivate = reverse('social-distribution:author-deactivate', args=[self.regular_user.id])
        
        # Test unauthorized deactivation
        response = self.user_client.post(url_deactivate)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test admin deactivation
        response = self.admin_client.post(url_deactivate)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['author']['is_active'])
        
        # Test admin activation
        response = self.admin_client.post(url_activate)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['author']['is_active'])
    
    def test_author_stats(self):
        """Test author statistics endpoint"""
        url = reverse('social-distribution:author-stats')
        
        # Test unauthenticated access
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test authenticated access
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_authors', response.data)
        self.assertIn('approved_authors', response.data)
        self.assertIn('active_authors', response.data)
        self.assertIn('local_authors', response.data)
        self.assertIn('remote_authors', response.data)
    
    def test_author_me(self):
        """Test author me endpoint"""
        url = reverse('social-distribution:author-me')
        
        # Test unauthenticated access
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test get profile
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        
        # Test update profile
        data = {'display_name': 'Updated Me'}
        response = self.user_client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['display_name'], 'Updated Me')
        
        # Test profile image upload
        image_content = b'fake-image-content'
        image_file = SimpleUploadedFile(
            "test_image.jpg",
            image_content,
            content_type="image/jpeg"
        )
        data = {'profile_image_file': image_file}
        response = self.user_client.patch(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('profile_image', response.data)

class AuthorModelTest(TestCase):
    """Test the Author model directly"""
    
    def test_author_creation(self):
        """Test basic author creation"""
        author = Author.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword',
            display_name='Test User'
        )
        
        self.assertEqual(author.username, 'testuser')
        self.assertEqual(author.email, 'test@example.com')
        self.assertEqual(author.display_name, 'Test User')
        self.assertTrue(author.check_password('testpassword'))
        self.assertTrue(author.is_active)
        self.assertFalse(author.is_staff)
        self.assertFalse(author.is_superuser)