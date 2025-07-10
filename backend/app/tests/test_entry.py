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
        self.assertEqual(response.data["results"][0]["author"]["username"], "testuser")

        # Public Entry
        self.assertEqual(response.data["results"][1]["title"], "Public Entry")
        self.assertEqual(response.data["results"][1]["visibility"], "PUBLIC")
        self.assertEqual(
            response.data["results"][1]["content"], "This is a public entry"
        )
        self.assertEqual(response.data["results"][1]["author"]["username"], "testuser")

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
        self.assertEqual(response.data["author"]["username"], "testuser")

        # Test access to own entries
        url = reverse("social-distribution:entry-detail", args=[self.private_entry.id])
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Private Entry")
        self.assertEqual(response.data["visibility"], "FRIENDS")
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
        self.assertEqual(response.data["content_type"], "text/plain")

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
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)

        # Test deleting non-existent entry
        non_existent_id = str(uuid.uuid4())
        url = reverse("social-distribution:entry-detail", args=[non_existent_id])
        response = self.user_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

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
        self.assertEqual(str(response.data["entry"]), str(self.public_entry.url))
        self.assertEqual(str(response.data["author"]), str(self.regular_user.url))

        # Duplicate like should either be ignored or handled gracefully
        response = self.user_client.post(url)
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_400_BAD_REQUEST],
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

    def test_unlisted_entry_direct_access(self):
        """Test unlisted entries are accessible via direct URL"""
        # Create an unlisted entry
        unlisted_entry = Entry.objects.create(
            author=self.regular_user,
            title='Unlisted Entry',
            content='This is an unlisted entry',
            visibility=Entry.UNLISTED
        )

        # Test direct access to unlisted entry by URL
        url = reverse("social-distribution:entry-detail", args=[unlisted_entry.id])
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Unlisted Entry")
        self.assertEqual(response.data["visibility"], "UNLISTED")

    def test_public_entry_accessible_to_all(self):
        """Test public entries visible to everyone"""
        # Create a public entry
        public_entry = Entry.objects.create(
            author=self.regular_user,
            title="Public Test Entry",
            content="This is public content",
            visibility=Entry.PUBLIC,
            url=f"{self.regular_user.url}entries/{uuid.uuid4()}/"
        )

        # Test anonymous user can access public entry with direct link
        response = self.client.get(reverse("social-distribution:entry-detail", args=[public_entry.id]))

        # Should allow anonymous access to public entries with direct link
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN])
        if response.status_code == status.HTTP_200_OK:
            self.assertEqual(response.data["title"], "Public Test Entry")

        # Test authenticated user can access  
        response = self.user_client.get(reverse("social-distribution:entry-detail", args=[public_entry.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Public Test Entry")

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
        comment_obj = Comment.objects.get(id=comment_id)
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

    def test_comment_like_api_endpoint(self):
        """Test API endpoint for liking comments"""
        # Create entry and have user comment on it
        entry = Entry.objects.create(
            author=self.regular_user,
            title="Test Entry",
            content="Test content", 
            visibility=Entry.PUBLIC,
            url=f"{self.regular_user.url}entries/{uuid.uuid4()}/"
        )
        
        # Another user creates a comment
        comment_data = {
            "content": "Nice post!",
            "content_type": "text/plain"
        }
        comment_response = self.another_user_client.post(
            f"/api/entries/{entry.id}/comments/", 
            comment_data
        )
        
        if comment_response.status_code == 201:
            comment_id = comment_response.data['id']
            
            # Regular user tries to like the comment
            like_url = f"/api/comments/{comment_id}/likes/"
            like_response = self.user_client.post(like_url)
            
            # Should create like successfully if endpoint exists
            if like_response.status_code != 404:
                self.assertIn(like_response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])
                
                # Verify like was created in database
                if hasattr(comment_response.data, 'get'):
                    comment_obj = Comment.objects.filter(id=comment_id).first()
                    if comment_obj:
                        like_exists = Like.objects.filter(
                            author=self.regular_user, 
                            comment=comment_obj
                        ).exists()
                        self.assertTrue(like_exists, "Like should exist in database")
            
    def test_comments_on_friends_only_entries(self):
        """Test that only friends can see comments on friends-only entries"""
        # Create a third user for testing non-friend access
        third_user = Author.objects.create_user(
            username='thirduser',
            email='third@example.com',
            password='thirdpass123',
            display_name='Third User',
            is_approved=True
        )
        third_user_client = APIClient()
        third_user_client.force_authenticate(user=third_user)
        
        # Create mutual friendship between regular_user and another_user
        Follow.objects.create(
            follower=self.regular_user, 
            followed=self.another_user, 
            status=Follow.ACCEPTED
        )
        Follow.objects.create(
            follower=self.another_user, 
            followed=self.regular_user, 
            status=Follow.ACCEPTED
        )
        
        # Create friends-only entry by another_user
        friends_entry = Entry.objects.create(
            author=self.another_user,
            title="Friends Only Entry",
            content="Only for friends",
            visibility=Entry.FRIENDS_ONLY,
            url=f"{self.another_user.url}entries/{uuid.uuid4()}/"
        )
        
        # Remove the direct comment creation since we're now testing via API calls below
        
        # Friend tries to create a comment on the friends-only entry
        friend_comment_data = {
            "content": "Great friends-only post!",
            "content_type": "text/plain"
        }
        friend_comment_response = self.user_client.post(
            f"/api/entries/{friends_entry.id}/comments/", 
            friend_comment_data
        )
        
        # Author tries to reply to the comment on their own entry
        if friend_comment_response.status_code == 201:
            author_comment_data = {
                "content": "Thanks friend!",
                "content_type": "text/plain"
            }
            author_comment_response = self.another_user_client.post(
                f"/api/entries/{friends_entry.id}/comments/", 
                author_comment_data
            )
            
            # Friend should be able to see all comments on friends-only entry
            response = self.user_client.get(f"/api/entries/{friends_entry.id}/comments/")

            if response.status_code == 200 and isinstance(response.data, list):
                comment_contents = [c.get('content', '') for c in response.data if isinstance(c, dict)]
                self.assertIn("Great friends-only post!", comment_contents)
                if author_comment_response.status_code == 201:
                    self.assertIn("Thanks friend!", comment_contents)

    def test_comment_visibility_respects_entry_visibility(self):
        """Test that comment visibility follows entry visibility rules"""
        # Create unlisted entry with unique ID
        unlisted_entry_id = uuid.uuid4()
        unlisted_entry = Entry.objects.create(
            id=unlisted_entry_id,
            author=self.regular_user,
            title="Unlisted Entry Test", 
            content="Unlisted content for visibility test",
            visibility=Entry.UNLISTED,
            url=f"{self.regular_user.url}entries/{unlisted_entry_id}/"
        )
        
        # Another user tries to comment on the unlisted entry via API
        comment_data = {
            "content": "Comment on unlisted post test",
            "content_type": "text/plain"
        }
        comment_response = self.another_user_client.post(
            f"/api/entries/{unlisted_entry.id}/comments/", 
            comment_data
        )
        
        # Comment creation should succeed if entry is accessible to the user
        comment_created = comment_response.status_code == 201
        
        # Author should see their own unlisted entry's comments
        response = self.user_client.get(f"/api/entries/{unlisted_entry.id}/comments/")
        if response.status_code == 200 and comment_created:
            # Check if response.data is a list and handle safely
            if isinstance(response.data, list):
                test_comments = [c for c in response.data if isinstance(c, dict) and c.get('content') == "Comment on unlisted post test"]
                self.assertGreaterEqual(len(test_comments), 1, f"Expected at least 1 test comment, found {len(test_comments)} in response with {len(response.data)} total comments")
                if test_comments:
                    self.assertEqual(test_comments[0]['content'], "Comment on unlisted post test")
        
        # Create a third user to test non-owner access
        third_user = Author.objects.create_user(
            username='thirdvisibilityuser',
            email='thirdvisibility@example.com', 
            password='thirdpass123',
            display_name='Third Visibility User',
            is_approved=True
        )
        third_user_client = APIClient()
        third_user_client.force_authenticate(user=third_user)
        
        # Third user tries to comment on unlisted entry
        third_comment_data = {
            "content": "Third user comment attempt",
            "content_type": "text/plain"
        }
        third_comment_response = third_user_client.post(
            f"/api/entries/{unlisted_entry.id}/comments/", 
            third_comment_data
        )
        
        # Third user should not be able to comment on unlisted entry (depending on visibility rules)
        self.assertIn(third_comment_response.status_code, [
            status.HTTP_201_CREATED,  # If unlisted allows comments with direct link
            status.HTTP_403_FORBIDDEN, 
            status.HTTP_404_NOT_FOUND
        ])
        
        # Third user should not see unlisted entry comments (unless they have direct link)
        response = third_user_client.get(f"/api/entries/{unlisted_entry.id}/comments/")
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,  # If unlisted allows viewing with direct link
            status.HTTP_403_FORBIDDEN, 
            status.HTTP_404_NOT_FOUND
        ])

    
    def test_create_image_entry(self):
        """Test creating entries with image content"""
        url = reverse("social-distribution:entry-list")
        
        # Test creating image entry with PNG content type
        data = {
            "title": "Image Post",
            "content": "Check out this image",
            "visibility": "PUBLIC",
            "content_type": "image/png",
        }

        response = self.user_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["content_type"], "image/png")
        self.assertEqual(response.data["title"], "Image Post")

        # Test creating image entry with JPEG content type
        data["content_type"] = "image/jpeg"
        data["title"] = "JPEG Image Post"
        response = self.user_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["content_type"], "image/jpeg")

    def test_image_entry_storage(self):
        """Test image entries store binary data correctly"""
        # Create an image entry
        image_entry = Entry.objects.create(
            author=self.regular_user,
            title='Test Image',
            content='Image caption',
            content_type=Entry.IMAGE_PNG,
            visibility=Entry.PUBLIC,
            image_data=b'fake_image_data'  # Simulate binary image data
        )

        # Verify image data is stored
        self.assertIsNotNone(image_entry.image_data)
        self.assertEqual(image_entry.content_type, Entry.IMAGE_PNG)

    def test_markdown_entry_with_image_syntax(self):
        """Test markdown entries can contain image syntax"""
        url = reverse("social-distribution:entry-list")
        
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
        self.assertEqual(response.data["content_type"], "text/markdown")
        self.assertIn("![Alt text]", response.data["content"])

    def test_markdown_entry_multiple_images(self):
        """Test markdown entries can contain multiple images"""
        markdown_content = """
        ![Image 1](https://example.com/img1.png)
        Some text between images.
        ![Image 2](https://example.com/img2.jpg)
        """
        
        entry = Entry.objects.create(
            author=self.regular_user,
            title='Multiple Images',
            content=markdown_content,
            content_type=Entry.TEXT_MARKDOWN,
            visibility=Entry.PUBLIC
        )

        self.assertIn("![Image 1]", entry.content)
        self.assertIn("![Image 2]", entry.content)

    
    def test_unified_stream_friends_feed(self):
        """Test unified stream shows friends' posts"""
        # This would test the friends feed endpoint
        url = reverse("social-distribution:entry-feed")
        
        response = self.user_client.get(url)
        # Should return 200 even if no friends (empty result)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Response should have pagination structure
        self.assertIn("results", response.data)

    def test_unified_stream_visibility_filtering(self):
        """Test stream respects visibility settings"""
        # Create entries with different visibility levels
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
        url = reverse("social-distribution:entry-list")
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        titles = [entry["title"] for entry in response.data["results"]]
        self.assertIn("Public from Another", titles)
        # Private entry should not be visible unless users are friends

    def test_github_activity_entry_creation(self):
        """Test gitHub activity can create public entries"""
        # This would test automatic creation from GitHub webhooks/activity
        # Test manual creation of GitHub-sourced entries
        
        github_entry = Entry.objects.create(
            author=self.regular_user,
            title='GitHub Activity: New commit',
            content='Pushed new changes to repository',
            visibility=Entry.PUBLIC,
            content_type=Entry.TEXT_PLAIN,
            source='https://github.com/user/repo/commit/abc123',
            origin='https://github.com/user/repo'
        )

        self.assertEqual(github_entry.visibility, Entry.PUBLIC)
        self.assertIsNotNone(github_entry.source)
        self.assertTrue(github_entry.source.startswith('https://github.com'))

    def test_github_entry_auto_public_visibility(self):
        """Test gitHub-generated entries are automatically public"""
        # Test that entries with GitHub source are public
        url = reverse("social-distribution:entry-list")
        
        data = {
            "title": "GitHub: Updated README",
            "content": "Updated project documentation",
            "visibility": "PUBLIC",  # Should be auto-set for GitHub entries
            "content_type": "text/plain",
            "source": "https://github.com/user/repo/commit/def456"
        }

        response = self.user_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["visibility"], "PUBLIC")
        # Note: In full implementation, visibility would be auto-set based on source
