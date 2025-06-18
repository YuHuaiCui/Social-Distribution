import uuid
from django.urls import reverse
from rest_framework import status
from app.models import Entry
from .test_author import BaseAPITestCase


class EntryAPITest(BaseAPITestCase):
    """Test cases for Entry API endpoints"""

    def test_entry_list(self):
        """Test listing entries"""
        url = reverse("social-distribution:entry-list")

        # Test unauthenticated access
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test authenticated access
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Response data structure
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

        # Private Entry
        self.assertEqual(response.data["results"][0]["title"], "Private Entry")
        self.assertEqual(response.data["results"][0]["visibility"], "friends")
        self.assertEqual(
            response.data["results"][0]["content"], "This is a private entry"
        )
        self.assertEqual(response.data["results"][0]["author"]["username"], "testuser")

        # Public Entry
        self.assertEqual(response.data["results"][1]["title"], "Public Entry")
        self.assertEqual(response.data["results"][1]["visibility"], "public")
        self.assertEqual(
            response.data["results"][1]["content"], "This is a public entry"
        )
        self.assertEqual(response.data["results"][1]["author"]["username"], "testuser")

    def test_entry_detail(self):
        """Test retrieving a single entry"""
        url = reverse("social-distribution:entry-detail", args=[self.public_entry.id])

        # Test unauthenticated access
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test authenticated access
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Public Entry")
        self.assertEqual(response.data["visibility"], "public")
        self.assertEqual(response.data["content"], "This is a public entry")
        self.assertEqual(response.data["author"]["username"], "testuser")

        # Test access to own entries
        url = reverse("social-distribution:entry-detail", args=[self.private_entry.id])
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Private Entry")
        self.assertEqual(response.data["visibility"], "friends")
        self.assertEqual(response.data["content"], "This is a private entry")
        self.assertEqual(response.data["author"]["username"], "testuser")

        # Test access to others' entries
        url = reverse(
            "social-distribution:entry-detail", args=[self.private_entry_2.id]
        )
        response = self.user_client.get(url)
        # Im not sure if we should get a 404 or a 403 here
        self.assertIn(
            response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        )

        # Test non-existent entry
        url = reverse("social-distribution:entry-detail", args=[uuid.uuid4()])
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_entry_create(self):
        """Test creating a new entry"""
        url = reverse("social-distribution:entry-list")
        data = {
            "title": "Test Entry",
            "content": "This is a test entry",
            "visibility": "public",
            "content_type": "text/plain",
        }

        # Test unauthenticated creation
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test authenticated creation
        response = self.user_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Test Entry")
        self.assertEqual(response.data["content"], "This is a test entry")
        self.assertEqual(response.data["visibility"], "public")
        self.assertEqual(response.data["content_type"], "text/plain")

        # Test required fields validation handling
        # Empty title
        data = {
            "title": "",
            "content": "something",
            "visibility": "public",
        }
        response = self.user_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["title"][0], "This field may not be blank.")

        # Empty content
        data = {
            "title": "Test Entry",
            "content": "",
            "visibility": "public",
        }
        response = self.user_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["content"][0], "This field may not be blank.")

    def test_entry_update(self):
        """Test updating an entry"""
        url = reverse("social-distribution:entry-detail", args=[self.public_entry.id])

        # Test unauthenticated update
        data = {"title": "Updated Title"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test updating own entries
        response = self.user_client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Updated Title")

        # Test updating others' entries (should fail)
        url = reverse(
            "social-distribution:entry-detail", args=[self.private_entry_2.id]
        )
        response = self.user_client.patch(url, data)
        self.assertIn(
            response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        )

        # Test partial updates
        url = reverse("social-distribution:entry-detail", args=[self.public_entry.id])
        data = {"content": "Updated content only"}
        response = self.user_client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["content"], "Updated content only")
        self.assertEqual(
            response.data["title"], "Updated Title"
        )  # Should remain from previous update

        # Test full updates (PUT)
        data = {
            "title": "Completely New Title",
            "content": "Completely new content",
            "visibility": "friends",
            "content_type": "text/markdown",
        }
        response = self.user_client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Completely New Title")
        self.assertEqual(response.data["content"], "Completely new content")
        self.assertEqual(response.data["visibility"], "friends")
        self.assertEqual(response.data["content_type"], "text/markdown")

    def test_entry_delete(self):
        """Test deleting an entry"""
        url = reverse("social-distribution:entry-detail", args=[self.public_entry.id])

        # Test unauthenticated deletion
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test deleting others' entries (should fail)
        url = reverse(
            "social-distribution:entry-detail", args=[self.private_entry_2.id]
        )
        response = self.user_client.delete(url)
        self.assertIn(
            response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        )

        # Test deleting own entries
        url = reverse("social-distribution:entry-detail", args=[self.public_entry.id])
        response = self.user_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify entry is deleted
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Test deleting non-existent entry
        non_existent_id = str(uuid.uuid4())
        url = reverse("social-distribution:entry-detail", args=[non_existent_id])
        response = self.user_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # Not implemented
    def test_entry_like(self):
        """Test liking an entry"""
        # TODO: Implement test cases

    # Not implemented
    def test_entry_unlike(self):
        """Test unliking an entry"""
        # TODO: Implement test cases

    # Not implemented
    def test_entry_comments(self):
        """Test entry comments"""
        # TODO: Implement test cases

    def test_entry_inbox(self):
        """Test entry inbox"""
        # TODO: Implement test cases (part 3)
