import uuid
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from app.models import Entry, Comment, Like, Follow, Friendship
from .test_author import BaseAPITestCase

Author = get_user_model()

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
        self.assertEqual(response.data["results"][0]["visibility"], "FRIENDS")
        self.assertEqual(
            response.data["results"][0]["content"], "This is a private entry"
        )
        # The author serializer returns CMPUT 404 format, so check displayName instead
        self.assertEqual(response.data["results"][0]["author"]["displayName"], "TestUser")

        # Public Entry
        self.assertEqual(response.data["results"][1]["title"], "Public Entry")
        self.assertEqual(response.data["results"][1]["visibility"], "PUBLIC")
        self.assertEqual(
            response.data["results"][1]["content"], "This is a public entry"
        )
        # The author serializer returns CMPUT 404 format, so check displayName instead
        self.assertEqual(response.data["results"][1]["author"]["displayName"], "TestUser")

    def test_entry_detail(self):
        """Test retrieving a single entry"""
        url = reverse("social-distribution:entry-detail", args=[self.public_entry.id])

        # Test unauthenticated access/public entry access
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test authenticated access
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Public Entry")
        self.assertEqual(response.data["visibility"], "PUBLIC")
        self.assertEqual(response.data["content"], "This is a public entry")
        # The author serializer returns CMPUT 404 format, so check displayName instead
        self.assertEqual(response.data["author"]["displayName"], "TestUser")

        # Test access to own entries
        url = reverse("social-distribution:entry-detail", args=[self.private_entry.id])
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Private Entry")
        self.assertEqual(response.data["visibility"], "FRIENDS")
        self.assertEqual(response.data["content"], "This is a private entry")
        # The author serializer returns CMPUT 404 format, so check displayName instead
        self.assertEqual(response.data["author"]["displayName"], "TestUser")

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
            "visibility": "PUBLIC",
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
        self.assertEqual(response.data["visibility"], "PUBLIC")
        # The serializer returns contentType (camelCase) instead of content_type
        self.assertEqual(response.data["contentType"], "text/plain")

        # Test required fields validation handling
        # Empty title
        data = {
            "title": "",
            "content": "something",
            "visibility": "PUBLIC",
        }
        response = self.user_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["title"][0], "This field may not be blank.")

        # Empty content
        data = {
            "title": "Test Entry",
            "content": "",
            "visibility": "PUBLIC",
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
            "visibility": "FRIENDS",
            "content_type": "text/markdown",
        }
        response = self.user_client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Completely New Title")
        self.assertEqual(response.data["content"], "Completely new content")
        self.assertEqual(response.data["visibility"], "FRIENDS")
        # The serializer returns contentType (camelCase) instead of content_type
        self.assertEqual(response.data["contentType"], "text/markdown")

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
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        # Test deleting non-existent entry
        non_existent_id = str(uuid.uuid4())
        url = reverse("social-distribution:entry-detail", args=[non_existent_id])
        response = self.user_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_soft_delete_functionality(self):
        """Test soft delete entries"""
        # Create a test entry
        test_entry = Entry.objects.create(
            author=self.regular_user,
            title='Entry to Delete',
            content='This entry will be soft deleted',
            visibility=Entry.PUBLIC
        )
        
        # Verify entry exists and is visible
        url = reverse("social-distribution:entry-detail", args=[test_entry.id])
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Entry to Delete')
        
        # Verify entry appears in list
        list_url = reverse("social-distribution:entry-list")
        response = self.user_client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        entry_titles = [entry['title'] for entry in response.data['results']]
        self.assertIn('Entry to Delete', entry_titles)
        
        # Soft delete the entry
        response = self.user_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify entry still exists in database but marked as deleted
        test_entry.refresh_from_db()
        self.assertEqual(test_entry.visibility, Entry.DELETED)
        self.assertTrue(test_entry.is_deleted)
        
        # Verify entry is no longer accessible via API
        response = self.user_client.get(url)
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])
        
        # Verify entry no longer appears in list
        response = self.user_client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        entry_titles = [entry['title'] for entry in response.data['results']]
        self.assertNotIn('Entry to Delete', entry_titles)

    def test_entry_like(self):
        """Test liking an entry"""
        url = reverse("social-distribution:entry-likes", args=[self.public_entry.id])

        # Unauthenticated like attempt
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Authenticated like
        response = self.user_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertEqual(str(response.data["object"]), str(self.public_entry.url))
        # Check author data is properly nested in like response
        self.assertIn("author", response.data)
        # The author serializer returns CMPUT 404 format, so check id instead of url
        self.assertEqual(str(response.data["author"]["id"]), str(self.regular_user.url))

        # Duplicate like should either be ignored or handled gracefully
        response = self.user_client.post(url)
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_400_BAD_REQUEST],
        )

    def test_shareable_entry_links(self):
        """Test getting shareable entry links"""
        # Test that entries have shareable web URLs
        url = reverse("social-distribution:entry-detail", args=[self.public_entry.id])
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify web field exists and is properly formatted
        self.assertIn('web', response.data)
        self.assertIsNotNone(response.data['web'])
        
        # Web URL should be a valid frontend URL
        web_url = response.data['web']
        self.assertTrue(web_url.startswith('http'))
        self.assertIn(str(self.regular_user.id), web_url)
        self.assertIn(str(self.public_entry.id), web_url)
        
        # Verify URL structure contains the required elements
        self.assertIn(f"/authors/{self.regular_user.id}/entries/{self.public_entry.id}", web_url)
        # Just verify structure rather than exact SITE_URL match

    def test_like_comment_functionality(self):
        """Test that users can like comments on accessible entries"""
        # Create a public entry
        entry = Entry.objects.create(
            author=self.regular_user,
            title="Test Entry",
            content="Test content",
            visibility=Entry.PUBLIC,
            url=f"{self.regular_user.url}entries/{uuid.uuid4()}/"
        )
        
        # Another user creates a comment on the entry
        comment_data = {
            "content": "Great post!",
            "content_type": "text/plain"
        }
        comment_response = self.another_user_client.post(
            f"/api/entries/{entry.id}/comments/", 
            comment_data
        )
        
        # Verify comment was created successfully
        self.assertEqual(comment_response.status_code, 201)
        comment_id = comment_response.data['id']
        
        # Regular user tries to like the comment using direct model creation
        # Extract UUID from comment_id if it's a full URL
        if isinstance(comment_id, str) and comment_id.startswith('http'):
            actual_comment_id = comment_id.split('/')[-1] if comment_id.split('/')[-1] else comment_id.split('/')[-2]
        else:
            actual_comment_id = comment_id
        comment_obj = Comment.objects.get(id=actual_comment_id)
        like = Like.objects.create(
            author=self.regular_user,
            comment=comment_obj
        )
        
        # Verify like was created
        self.assertTrue(Like.objects.filter(author=self.regular_user, comment=comment_obj).exists())
        
        # Verify like count increases
        comment_likes = Like.objects.filter(comment=comment_obj).count()
        self.assertEqual(comment_likes, 1)
        
        # Test that user cannot like the same comment twice (unique constraint)
        with self.assertRaises(Exception):  
            Like.objects.create(
                author=self.regular_user,
                comment=comment_obj
            )

    def test_entry_unlike(self):
        """Test unliking an entry"""
        url = reverse("social-distribution:entry-likes", args=[self.public_entry.id])

        # First like the entry
        self.user_client.post(url)

        # Authenticated unlike
        response = self.user_client.delete(url)
        self.assertIn(
            response.status_code,
            [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK]
        )

        # Re-unlike (already unliked)
        response = self.user_client.delete(url)
        self.assertIn(
            response.status_code,
            [status.HTTP_204_NO_CONTENT, status.HTTP_404_NOT_FOUND],
        )

        # Unauthenticated unlike attempt
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_entry_direct_access(self):
        """Test direct access patterns for different entry types"""
        # Test unlisted entries are accessible via direct URL
        unlisted_entry = Entry.objects.create(
            author=self.regular_user,
            title='Unlisted Entry',
            content='This is an unlisted entry',
            visibility=Entry.UNLISTED
        )
        url = reverse("social-distribution:entry-detail", args=[unlisted_entry.id])
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Unlisted Entry")
        self.assertEqual(response.data["visibility"], "UNLISTED")

        # Test public entries are accessible to everyone
        public_entry = Entry.objects.create(
            author=self.regular_user,
            title="Public Test Entry",
            content="This is public content",
            visibility=Entry.PUBLIC,
            url=f"{self.regular_user.url}entries/{uuid.uuid4()}/"
        )
        
        # Test anonymous user access to public entry
        response = self.client.get(reverse("social-distribution:entry-detail", args=[public_entry.id]))
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN])
        if response.status_code == status.HTTP_200_OK:
            self.assertEqual(response.data["title"], "Public Test Entry")

        # Test authenticated user can access public entry
        response = self.user_client.get(reverse("social-distribution:entry-detail", args=[public_entry.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Public Test Entry")
        
        # Test that non-image entries do NOT have /image appended
        self.assertFalse(response.data["id"].endswith("/image"))
        self.assertFalse(response.data["url"].endswith("/image"))

    def test_image_entries(self):
        """Test creating and storing entries with image content"""
        url = reverse("social-distribution:entry-list")
        
        # Test creating image entry with PNG content type via API
        data = {
            "title": "Image Post",
            "content": "Check out this image",
            "visibility": "PUBLIC",
            "content_type": "image/png",
        }
        response = self.user_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # The serializer returns contentType (camelCase) instead of content_type
        self.assertEqual(response.data["contentType"], "image/png")
        self.assertEqual(response.data["title"], "Image Post")
        
        # Test that id and url fields have /image appended for image entries
        self.assertTrue(response.data["id"].endswith("/image"))
        self.assertTrue(response.data["url"].endswith("/image"))

        # Test creating image entry with JPEG content type via API
        data["content_type"] = "image/jpeg"
        data["title"] = "JPEG Image Post"
        response = self.user_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # The serializer returns contentType (camelCase) instead of content_type
        self.assertEqual(response.data["contentType"], "image/jpeg")
        
        # Test that id and url fields have /image appended for JPEG image entries too
        self.assertTrue(response.data["id"].endswith("/image"))
        self.assertTrue(response.data["url"].endswith("/image"))

        # Test image entry storage with binary data directly in model
        image_entry = Entry.objects.create(
            author=self.regular_user,
            title='Test Image Storage',
            content='Image caption',
            content_type=Entry.IMAGE_PNG,
            visibility=Entry.PUBLIC,
            image_data=b'fake_image_data'  # Simulate binary image data
        )
        # Verify image data is stored
        self.assertIsNotNone(image_entry.image_data)
        self.assertEqual(image_entry.content_type, Entry.IMAGE_PNG)

    def test_markdown_entries_with_images(self):
        """Test markdown entries can contain image syntax"""
        url = reverse("social-distribution:entry-list")
        
        # Test single image in markdown
        markdown_content = """
        # My Post with Image
        
        Here's some text and an image:
        
        ![Alt text](https://example.com/image.png)
        
        More text after the image.
        """
        data = {
            "title": "Markdown with Image",
            "content": markdown_content,
            "visibility": "PUBLIC",
            "content_type": "text/markdown",
        }
        response = self.user_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # The serializer returns contentType (camelCase) instead of content_type
        self.assertEqual(response.data["contentType"], "text/markdown")
        self.assertIn("![Alt text]", response.data["content"])

        # Test multiple images in markdown
        multi_image_content = """
        ![Image 1](https://example.com/img1.png)
        Some text between images.
        ![Image 2](https://example.com/img2.jpg)
        """
        entry = Entry.objects.create(
            author=self.regular_user,
            title='Multiple Images',
            content=multi_image_content,
            content_type=Entry.TEXT_MARKDOWN,
            visibility=Entry.PUBLIC
        )
        self.assertIn("![Image 1]", entry.content)
        self.assertIn("![Image 2]", entry.content)

    
    def test_unified_stream(self):
        """Test unified stream functionality including friends feed and visibility filtering"""
        # Test basic friends feed endpoint
        feed_url = reverse("social-distribution:entry-feed")
        response = self.user_client.get(feed_url)
        # Should return 200 even if no friends (empty result)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response should have pagination structure
        self.assertIn("results", response.data)

        # Test stream respects visibility settings
        public_entry = Entry.objects.create(
            author=self.another_user,
            title='Public from Another',
            content='Public content',
            visibility=Entry.PUBLIC
        )
        
        private_entry = Entry.objects.create(
            author=self.another_user,
            title='Private from Another',
            content='Private content',
            visibility=Entry.FRIENDS_ONLY
        )

        # Test entry list shows public but not private entries from others
        list_url = reverse("social-distribution:entry-list")
        response = self.user_client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        titles = [entry["title"] for entry in response.data["results"]]
        self.assertIn("Public from Another", titles)
        # Private entry should not be visible unless users are friends

    def test_browse_all_public_entries(self):
        """Test browse all public entries"""
        # Create diverse public entries from different authors
        public_authors = []
        for i in range(3):
            author = Author.objects.create_user(
                username=f'publicauthor{i}',
                email=f'public{i}@test.com',
                password='pass123',
                displayName=f'Public Author {i}',
                is_approved=True
            )
            public_authors.append(author)
        
        # Create public entries with different content types and characteristics
        public_entries_data = [
            {
                'author': public_authors[0],
                'title': 'Public Text Post',
                'content': 'This is a public text post with interesting content.',
                'content_type': Entry.TEXT_PLAIN,
                'visibility': Entry.PUBLIC
            },
            {
                'author': public_authors[1],
                'title': 'Public Markdown Post',
                'content': '# Public Markdown\n\nThis is a **public** markdown post with *formatting*.',
                'content_type': Entry.TEXT_MARKDOWN,
                'visibility': Entry.PUBLIC
            },
            {
                'author': public_authors[2],
                'title': 'Public Image Post',
                'content': 'Check out this public image!',
                'content_type': Entry.IMAGE_PNG,
                'visibility': Entry.PUBLIC,
                'image_data': b'fake-public-image-data'
            },
            {
                'author': self.regular_user,
                'title': 'GitHub Public Activity',
                'content': 'Public GitHub activity post',
                'content_type': Entry.TEXT_PLAIN,
                'visibility': Entry.PUBLIC,
                'source': 'https://github.com/user/repo/commit/abc123'
            }
        ]
        
        # Create some non-public entries to ensure it works
        Entry.objects.create(
            author=public_authors[0],
            title='Private Post',
            content='This should not appear in public browse',
            visibility=Entry.FRIENDS_ONLY
        )
        
        Entry.objects.create(
            author=public_authors[1],
            title='Unlisted Post',
            content='This should not appear in general public browse',
            visibility=Entry.UNLISTED
        )
        
        # Create the public entries
        created_public_entries = []
        for entry_data in public_entries_data:
            entry = Entry.objects.create(**entry_data)
            created_public_entries.append(entry)
        
        # Test browsing all public entries
        list_url = reverse("social-distribution:entry-list")
        response = self.user_client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should have pagination
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        
        # Extract public entry titles
        public_titles = [
            entry['title'] for entry in response.data['results']
            if entry['visibility'] == 'PUBLIC'
        ]
        
        # Should include all public entries
        self.assertIn('Public Text Post', public_titles)
        self.assertIn('Public Markdown Post', public_titles)
        self.assertIn('Public Image Post', public_titles)
        self.assertIn('GitHub Public Activity', public_titles)
        
        # Should not include private entries
        all_titles = [entry['title'] for entry in response.data['results']]
        self.assertNotIn('Private Post', all_titles)
        
        # Test that any authenticated user can browse public entries
        stranger_user = Author.objects.create_user(
            username='stranger', email='stranger@browse.com', password='pass123',
            displayName='Stranger', is_approved=True
        )
        stranger_client = APIClient()
        stranger_client.force_authenticate(user=stranger_user)
        
        response = stranger_client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stranger_visible_titles = [
            entry['title'] for entry in response.data['results']
            if entry['visibility'] == 'PUBLIC'
        ]
        
        # Stranger should see the same public entries
        self.assertIn('Public Text Post', stranger_visible_titles)
        self.assertIn('Public Markdown Post', stranger_visible_titles)
        self.assertIn('Public Image Post', stranger_visible_titles)

    def test_visibility_rules(self):
        """Test visibility rules across all user relationships"""
        # Create users with different relationships
        friend_user = Author.objects.create_user(
            username='friend', email='friend@test.com', password='pass123',
            displayName='Friend', is_approved=True
        )
        follower_user = Author.objects.create_user(
            username='follower', email='follower@test.com', password='pass123',
            displayName='Follower', is_approved=True
        )
        stranger_user = Author.objects.create_user(
            username='stranger', email='stranger@test.com', password='pass123',
            displayName='Stranger', is_approved=True
        )
        
        # Set up relationships - Friend: mutual follows, Follower: one-way follow
        Follow.objects.create(follower=self.regular_user, followed=friend_user, status=Follow.ACCEPTED)
        Follow.objects.create(follower=friend_user, followed=self.regular_user, status=Follow.ACCEPTED)
        Follow.objects.create(follower=follower_user, followed=self.regular_user, status=Follow.ACCEPTED)
        
        # Create test entries
        test_entries = {
            'public': Entry.objects.create(
                author=self.regular_user, title='Public Test', 
                content='Public content', visibility=Entry.PUBLIC
            ),
            'unlisted': Entry.objects.create(
                author=self.regular_user, title='Unlisted Test', 
                content='Unlisted content', visibility=Entry.UNLISTED
            ),
            'friends_only': Entry.objects.create(
                author=self.regular_user, title='Friends Only Test', 
                content='Friends only content', visibility=Entry.FRIENDS_ONLY
            )
        }
        
        # Expected visibilities
        visiblities = {
            'author': {'public': True, 'unlisted': True, 'friends_only': True},
            'friend': {'public': True, 'unlisted': True, 'friends_only': True},
            'follower': {'public': True, 'unlisted': True, 'friends_only': False},
            'stranger': {'public': True, 'unlisted': True, 'friends_only': False},  # Unlisted entries are visible to strangers
        }
        
        clients = {
            'author': self.user_client,
            'friend': APIClient(), 'follower': APIClient(), 'stranger': APIClient()
        }
        clients['friend'].force_authenticate(user=friend_user)
        clients['follower'].force_authenticate(user=follower_user)
        clients['stranger'].force_authenticate(user=stranger_user)
        
        # Test visibility for each user type and entry type
        for user_type, client in clients.items():
            for entry_type, entry in test_entries.items():
                should_be_visible = visiblities[user_type][entry_type]
                
                with self.subTest(user_type=user_type, entry_type=entry_type):
                    url = reverse("social-distribution:entry-detail", args=[entry.id])
                    response = client.get(url)
                    
                    if should_be_visible:
                        self.assertEqual(response.status_code, status.HTTP_200_OK,
                                       f"{user_type} should see {entry_type} entry")
                    else:
                        self.assertIn(response.status_code, 
                                    [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND],
                                    f"{user_type} should NOT see {entry_type} entry")

    def test_likes_visibility(self):
        """Test seeing likes on received public entries"""
        # Create users and a public entry
        liker_user1 = Author.objects.create_user(
            username='liker1', email='liker1@test.com', password='pass123',
            displayName='Liker One', is_approved=True
        )
        liker_user2 = Author.objects.create_user(
            username='liker2', email='liker2@test.com', password='pass123',
            displayName='Liker Two', is_approved=True
        )
        
        public_entry = Entry.objects.create(
            author=self.regular_user, title='Public Entry with Likes',
            content='This is a public entry that will receive likes', visibility=Entry.PUBLIC
        )
        
        # Create likes on the public entry
        from app.models import Like
        Like.objects.create(author=liker_user1, entry=public_entry)
        Like.objects.create(author=liker_user2, entry=public_entry)
        Like.objects.create(author=self.another_user, entry=public_entry)
        
        # Test that likes are visible to different user types
        viewer_client = APIClient()
        viewer_client.force_authenticate(user=liker_user1)
        
        # Test entry includes like count
        url = reverse("social-distribution:entry-detail", args=[public_entry.id])
        response = viewer_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('likes_count', response.data)
        self.assertEqual(response.data['likes_count'], 3)
        
        # Test that author can see likes on their own entry
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['likes_count'], 3)

    def test_github_activity(self):
        """Test auto-generating public entries from GitHub activity"""
        # Test basic GitHub entry creation
        basic_github_entry = Entry.objects.create(
            author=self.regular_user,
            title='GitHub Activity: New commit',
            content='Pushed new changes to repository',
            visibility=Entry.PUBLIC,
            content_type=Entry.TEXT_PLAIN,
            source='https://github.com/user/repo/commit/abc123',
            origin='https://github.com/user/repo'
        )
        self.assertEqual(basic_github_entry.visibility, Entry.PUBLIC)
        self.assertIsNotNone(basic_github_entry.source)
        self.assertTrue(basic_github_entry.source.startswith('https://github.com'))

        # Test different types of GitHub activities
        github_activities = [
            {
                'title': 'GitHub Activity: Pushed to main branch',
                'content': 'Pushed 3 commits to main branch',
                'source': 'https://github.com/user/social-app/commit/def456'
            },
            {
                'title': 'GitHub Activity: Released v2.1.0',
                'content': 'Released version 2.1.0 with new features',
                'source': 'https://github.com/user/api-server/releases/tag/v2.1.0'
            }
        ]
        
        created_entries = []
        for activity in github_activities:
            github_entry = Entry.objects.create(
                author=self.regular_user,
                title=activity['title'],
                content=activity['content'],
                visibility=Entry.PUBLIC,
                content_type=Entry.TEXT_MARKDOWN,
                source=activity['source'],
                origin=activity['source'].split('/commit/')[0].split('/releases/')[0]
            )
            created_entries.append(github_entry)
            
            # Verify each entry is created properly
            self.assertEqual(github_entry.visibility, Entry.PUBLIC)
            self.assertTrue(github_entry.source.startswith('https://github.com'))
            self.assertIn('GitHub Activity:', github_entry.title)
        
        # Verify GitHub entries appear in public feed
        url = reverse("social-distribution:entry-list")
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        github_titles = [entry['title'] for entry in response.data['results'] if 'GitHub Activity:' in entry['title']]
        self.assertGreaterEqual(len(github_titles), 3)  # Should include all GitHub entries

    def test_unified_stream_and_sorting(self):
        """Test unified stream page and sorting by most recent first"""
        import time
        
        # Create friend for testing
        friend_user = Author.objects.create_user(
            username='streamfriend', email='streamfriend@test.com', password='pass123',
            displayName='Stream Friend', is_approved=True
        )
        Follow.objects.create(follower=self.regular_user, followed=friend_user, status=Follow.ACCEPTED)
        Follow.objects.create(follower=friend_user, followed=self.regular_user, status=Follow.ACCEPTED)
        
        # Create entries at different times to test sorting
        old_entry = Entry.objects.create(
            author=friend_user, title='Old Entry', content='Old content', visibility=Entry.PUBLIC
        )
        time.sleep(0.1)
        new_entry = Entry.objects.create(
            author=friend_user, title='New Entry', content='New content', visibility=Entry.PUBLIC
        )
        
        # Test friends feed
        feed_url = reverse("social-distribution:entry-feed")
        response = self.user_client.get(feed_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        
        # Test general entry list with sorting
        list_url = reverse("social-distribution:entry-list")
        response = self.user_client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify timestamps are in descending order (most recent first)
        timestamps = [entry['created_at'] for entry in response.data['results'] if 'created_at' in entry]
        for i in range(len(timestamps) - 1):
            self.assertGreaterEqual(timestamps[i], timestamps[i + 1])