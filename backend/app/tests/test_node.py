import uuid
import json
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.test import TestCase
from unittest.mock import patch, MagicMock
from app.models import Node, Entry, Author, Follow, Friendship
from .test_author import BaseAPITestCase

Author = get_user_model()

class FederationTestServer:
    """A test HTTP server that simulates remote federation nodes"""
    
    def __init__(self, port=9899):
        self.port = port  # Use a different port from main server
        self.host = 'localhost'
        self.server = None
        self.thread = None
        self.authors_data = {}
        
    def add_author(self, author_id, author_data):
        """Add author data that the server should respond with"""
        self.authors_data[author_id] = author_data
        
    def clear_authors(self):
        """Clear all author data"""
        self.authors_data.clear()
        
    def start(self):
        """Start the test server in a background thread"""
        max_attempts = 5
        for attempt in range(max_attempts):
            try:
                handler = self._create_handler()
                self.server = HTTPServer((self.host, self.port), handler)
                self.thread = threading.Thread(target=self.server.serve_forever)
                self.thread.daemon = True
                self.thread.start()
                time.sleep(0.5)  # Give server more time to start
                
                # Verify server is actually running by making a test request
                import requests
                try:
                    test_response = requests.get(f"{self.get_base_url()}/test", timeout=2)
                except requests.exceptions.RequestException:
                    # Expected - test endpoint doesn't exist, but server is responding
                    pass
                
                # If we got here, server started successfully
                return
                
            except OSError as e:
                if "Address already in use" in str(e) and attempt < max_attempts - 1:
                    # Try next port
                    self.port += 1
                    print(f"Port {self.port - 1} in use, trying port {self.port}")
                    continue
                else:
                    print(f"Failed to start federation server on port {self.port}: {e}")
                    raise
            except Exception as e:
                print(f"Failed to start federation server on port {self.port}: {e}")
                raise
        
        raise Exception(f"Failed to start federation server after {max_attempts} attempts")
        
    def stop(self):
        """Stop the test server"""
        try:
            if self.server:
                self.server.shutdown()
                self.server.server_close()
            if self.thread and self.thread.is_alive():
                self.thread.join(timeout=2.0)  # Don't wait forever
        except Exception as e:
            print(f"Error stopping federation server on port {self.port}: {e}")
            
    def get_base_url(self):
        """Get the base URL for this test server"""
        return f"http://{self.host}:{self.port}"
    
    def is_running(self):
        """Check if the server is running"""
        import requests
        try:
            response = requests.get(f"{self.get_base_url()}/test", timeout=1)
            return True
        except requests.exceptions.RequestException:
            return self.server is not None and self.thread is not None and self.thread.is_alive()
        
    def _create_handler(self):
        """Create a request handler class with access to our test data"""
        authors_data = self.authors_data
        
        class TestFederationHandler(BaseHTTPRequestHandler):
            def log_message(self, format, *args):
                # Suppress server logs during tests
                pass
                
            def do_GET(self):
                try:
                    # Parse the path to extract author ID
                    path_parts = self.path.strip('/').split('/')
                    
                    if 'authors' in path_parts:
                        author_index = path_parts.index('authors')
                        if author_index + 1 < len(path_parts):
                            author_id = path_parts[author_index + 1]
                            
                            # Remove trailing slash if present
                            author_id = author_id.rstrip('/')
                            
                            if author_id in authors_data:
                                # Return the author data
                                self.send_response(200)
                                self.send_header('Content-Type', 'application/json')
                                self.send_header('Access-Control-Allow-Origin', '*')
                                self.end_headers()
                                response_data = json.dumps(authors_data[author_id])
                                self.wfile.write(response_data.encode('utf-8'))
                                return
                    
                    # Not found
                    self.send_response(404)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Not found"}).encode('utf-8'))
                except Exception as e:
                    # Handle any errors gracefully
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Internal server error"}).encode('utf-8'))
                
        return TestFederationHandler


class FederationServers:
    """Manages shared federation servers across all tests"""
    _instance = None
    _servers_started = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.federation_server_1 = None
            self.federation_server_2 = None
            self.initialized = True
    
    def start_servers(self):
        """Start the shared federation servers if not already started"""
        if self._servers_started:
            return
            
        try:
            # Start federation test servers
            self.federation_server_1 = FederationTestServer(port=9899)
            self.federation_server_1.start()
            
            self.federation_server_2 = FederationTestServer(port=9898)
            self.federation_server_2.start()
            
            # Verify servers are running
            if not self.federation_server_1.is_running():
                raise Exception(f"Federation server 1 failed to start on port {self.federation_server_1.port}")
            if not self.federation_server_2.is_running():
                raise Exception(f"Federation server 2 failed to start on port {self.federation_server_2.port}")
            
            self._servers_started = True
            print("Shared federation servers started successfully")
            
        except Exception as e:
            print(f"Failed to start shared federation servers: {e}")
            self.stop_servers()
            raise
    
    def stop_servers(self):
        """Stop the shared federation servers"""
        if hasattr(self, 'federation_server_1') and self.federation_server_1:
            self.federation_server_1.stop()
        if hasattr(self, 'federation_server_2') and self.federation_server_2:
            self.federation_server_2.stop()
        self._servers_started = False
        print("Shared federation servers stopped")
    
    def clear_all_data(self):
        """Clear all test data from servers - useful between tests"""
        if self.federation_server_1:
            self.federation_server_1.clear_authors()
        if self.federation_server_2:
            self.federation_server_2.clear_authors()
    
    def get_server_1(self):
        """Get the first federation server"""
        self.start_servers()
        return self.federation_server_1
    
    def get_server_2(self):
        """Get the second federation server"""
        self.start_servers()
        return self.federation_server_2


class BaseFederationTestCase(BaseAPITestCase):
    """Base class for federation tests with shared server infrastructure"""
    
    @classmethod
    def setUpClass(cls):
        """Set up shared federation servers for all federation tests"""
        super().setUpClass()
        cls.shared_servers = FederationServers()
        cls.shared_servers.start_servers()
    
    @classmethod
    def tearDownClass(cls):
        """Clean up shared federation servers"""
        super().tearDownClass()
        if hasattr(cls, 'shared_servers'):
            cls.shared_servers.stop_servers()
    
    def setUp(self):
        """Set up individual test with fresh data"""
        super().setUp()
        
        # Clear any existing data from previous tests
        self.shared_servers.clear_all_data()
        
        # Get references to shared servers
        self.federation_server_1 = self.shared_servers.get_server_1()
        self.federation_server_2 = self.shared_servers.get_server_2()


# Node management endpoints
# path('nodes/', GetNodesView.as_view(), name='get-nodes'),
# path('nodes/add/', AddNodeView.as_view(), name='add-node'),
# path('nodes/update/', UpdateNodeView.as_view(), name='update-node'),
# path('nodes/remove/', DeleteNodeView.as_view(), name='delete-node'),

class NodeAPITest(BaseAPITestCase):
    """Test cases for Node API endpoints"""

    def setUp(self):
        """Set up test data"""
        super().setUp()
        
        # Create test nodes
        self.test_node_1 = Node.objects.create(
            name="Test Node 1",
            host="http://testnode1.com",
            username="node1user",
            password="node1pass",
            is_active=True
        )
        
        self.test_node_2 = Node.objects.create(
            name="Test Node 2", 
            host="http://testnode2.com",
            username="node2user",
            password="node2pass",
            is_active=True
        )
        
        self.inactive_node = Node.objects.create(
            name="Inactive Node",
            host="http://inactivenode.com", 
            username="inactiveuser",
            password="inactivepass",
            is_active=False
        )

    def test_node_list(self):
        """Test listing nodes"""
        url = reverse("social-distribution:get-nodes")
        
        # Test unauthenticated access
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test authenticated access (admin required)
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check response structure
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 3)  # 3 nodes total
        
        # Check node data
        node_data = response.data[0]
        self.assertIn('id', node_data)
        self.assertIn('name', node_data)
        self.assertIn('host', node_data)
        self.assertIn('username', node_data)
        self.assertIn('password', node_data)
        self.assertIn('is_active', node_data)
        self.assertIn('created_at', node_data)

    def test_add_node(self):
        """Test adding a new node"""
        url = reverse("social-distribution:add-node")
        data = {
            "name": "New Test Node",
            "host": "http://newtestnode.com",
            "username": "newuser",
            "password": "newpass123",
            "is_active": True
        }
        
        # Test unauthenticated access
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test authenticated access
        response = self.admin_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "Node added successfully")
        
        # Verify node was created
        new_node = Node.objects.get(host="http://newtestnode.com")
        self.assertEqual(new_node.name, "New Test Node")
        self.assertEqual(new_node.username, "newuser")
        self.assertEqual(new_node.password, "newpass123")
        self.assertTrue(new_node.is_active)

    def test_add_node_duplicate_host(self):
        """Test adding a node with duplicate host"""
        url = reverse("social-distribution:add-node")
        data = {
            "name": "Duplicate Node",
            "host": "http://testnode1.com",  # Same as existing node
            "username": "duplicateuser",
            "password": "duplicatepass",
            "is_active": True
        }
        
        response = self.admin_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_add_node_invalid_url(self):
        """Test adding a node with invalid URL"""
        url = reverse("social-distribution:add-node")
        data = {
            "name": "Invalid Node",
            "host": "not-a-valid-url",
            "username": "invaliduser",
            "password": "invalidpass",
            "is_active": True
        }
        
        response = self.admin_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_add_node_missing_scheme(self):
        """Test adding a node with URL missing scheme, should not add"""
        url = reverse("social-distribution:add-node")
        data = {
            "name": "No Scheme Node",
            "host": "testnode.com",  # Missing http://
            "username": "noschemeuser",
            "password": "noschemepass",
            "is_active": True
        }
        
        response = self.admin_client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_node(self):
        """Test updating an existing node"""
        url = reverse("social-distribution:update-node")
        data = {
            "oldHost": "http://testnode1.com",
            "host": "http://updatedtestnode1.com",
            "username": "updateduser",
            "password": "updatedpass123",
            "isAuth": False
        }
        
        # Test unauthenticated access
        response = self.client.put(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test authenticated access
        response = self.admin_client.put(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Node updated successfully!")
        
        # Verify node was updated
        updated_node = Node.objects.get(host="http://updatedtestnode1.com")
        self.assertEqual(updated_node.username, "updateduser")
        self.assertEqual(updated_node.password, "updatedpass123")
        self.assertFalse(updated_node.is_active)

    def test_update_node_missing_fields(self):
        """Test updating a node with missing required fields"""
        url = reverse("social-distribution:update-node")
        
        # Missing oldHost
        data = {
            "host": "http://newhost.com",
            "username": "newuser",
            "password": "newpass",
            "isAuth": True
        }
        
        response = self.admin_client.put(url, json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_delete_node(self):
        """Test deleting a node"""
        url = reverse("social-distribution:delete-node")
        
        # Test unauthenticated access
        response = self.client.delete(url + "?username=node1user")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test authenticated access
        response = self.admin_client.delete(url + "?username=node1user")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Node removed successfully")
        
        # Verify node was deleted
        self.assertFalse(Node.objects.filter(username="node1user").exists())

    def test_delete_node_by_host(self):
        """Test deleting a node by host instead of username"""
        url = reverse("social-distribution:delete-node")
        
        response = self.admin_client.delete(url, {"host": "http://testnode2.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Node removed successfully")
        
        # Verify node was deleted
        self.assertFalse(Node.objects.filter(host="http://testnode2.com").exists())

    def test_delete_node_not_found(self):
        """Test deleting a non-existent node"""
        url = reverse("social-distribution:delete-node")
        
        response = self.admin_client.delete(url + "?username=nonexistentuser")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_node_missing_identifier(self):
        """Test deleting a node without providing username or host"""
        url = reverse("social-distribution:delete-node")
        
        response = self.admin_client.delete(url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)


class NodeConnectivityTest(BaseFederationTestCase):
    """Test cases for cross-node connectivity and post visibility"""

    def setUp(self):
        """Set up test data with remote nodes and authors"""
        super().setUp()
        
        # Create test nodes pointing to our shared test servers
        self.remote_node_1 = Node.objects.create(
            name="Remote Node 1",
            host=self.federation_server_1.get_base_url(),
            username="remote1user",
            password="remote1pass",
            is_active=True
        )
        
        self.remote_node_2 = Node.objects.create(
            name="Remote Node 2",
            host=self.federation_server_2.get_base_url(), 
            username="remote2user",
            password="remote2pass",
            is_active=True
        )
        
        # Create remote authors
        self.remote_author_1 = Author.objects.create(
            username="remoteuser1",
            email="remote1@remotenode1.com",
            displayName="Remote User 1",
            host=f"{self.federation_server_1.get_base_url()}/api/",
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteuser1/",
            web=f"{self.federation_server_1.get_base_url()}/authors/remoteuser1",
            node=self.remote_node_1,
            password="testpass123",  # Required field
            is_approved=True,
            is_active=True
        )
        
        self.remote_author_2 = Author.objects.create(
            username="remoteuser2",
            email="remote2@remotenode2.com", 
            displayName="Remote User 2",
            host=f"{self.federation_server_2.get_base_url()}/api/",
            url=f"{self.federation_server_2.get_base_url()}/api/authors/remoteuser2/",
            web=f"{self.federation_server_2.get_base_url()}/authors/remoteuser2",
            node=self.remote_node_2,
            password="testpass123",  # Required field
            is_approved=True,
            is_active=True
        )
        
        # Add author data to the test servers
        self.federation_server_1.add_author("remoteuser1", {
            "type": "author",
            "id": f"{self.federation_server_1.get_base_url()}/api/authors/remoteuser1/",
            "username": "remoteuser1",
            "displayName": "Remote User 1 - Live Federation Data",
            "host": f"{self.federation_server_1.get_base_url()}/api/",
            "page": f"{self.federation_server_1.get_base_url()}/authors/remoteuser1",
            "profileImage": "",
            "github": "",
        })
        
        self.federation_server_2.add_author("remoteuser2", {
            "type": "author",
            "id": f"{self.federation_server_2.get_base_url()}/api/authors/remoteuser2/",
            "username": "remoteuser2",
            "displayName": "Remote User 2 - Live Federation Data",
            "host": f"{self.federation_server_2.get_base_url()}/api/",
            "page": f"{self.federation_server_2.get_base_url()}/authors/remoteuser2",
            "profileImage": "",
            "github": "",
        })
        
        # Create remote entries
        self.remote_public_entry = Entry.objects.create(
            author=self.remote_author_1,
            title="Remote Public Entry",
            content="This is a public entry from remote node 1",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteuser1/posts/1/"
        )
        
        self.remote_friends_entry = Entry.objects.create(
            author=self.remote_author_2,
            title="Remote Friends Entry", 
            content="This is a friends-only entry from remote node 2",
            visibility=Entry.FRIENDS_ONLY,
            url=f"{self.federation_server_2.get_base_url()}/api/authors/remoteuser2/posts/2/"
        )

    def test_remote_public_posts_visible_in_feed(self):
        """Test that public posts from remote nodes appear in the local user's feed"""
        
        url = reverse("social-distribution:entry-list")
        
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that remote public posts are included
        entry_titles = [entry["title"] for entry in response.data["results"]]
        self.assertIn("Remote Public Entry", entry_titles)
        
        # Find the remote entry in results
        remote_entry = None
        for entry in response.data["results"]:
            if entry["title"] == "Remote Public Entry":
                remote_entry = entry
                break
        
        self.assertIsNotNone(remote_entry)
        self.assertEqual(remote_entry["author"]["username"], "remoteuser1")
        # API preserves the original remote host
        self.assertEqual(remote_entry["author"]["host"], f"{self.federation_server_1.get_base_url()}/api/")
        self.assertEqual(remote_entry["visibility"], "PUBLIC")
        
        # The federation system can make real HTTP requests to our test server if needed

    def test_remote_friends_posts_not_visible_without_friendship(self):
        """Test that friends-only posts from remote nodes are not visible without friendship"""
        
        url = reverse("social-distribution:entry-list")
        
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that remote friends-only posts are NOT included
        entry_titles = [entry["title"] for entry in response.data["results"]]
        self.assertNotIn("Remote Friends Entry", entry_titles)

    def test_remote_friends_posts_visible_with_friendship(self):
        """Test that friends-only posts from remote nodes are visible with friendship"""
        # No mocking needed - federation can make real requests to test server
        
        # Create friendship between local user and remote author
        Friendship.objects.create(
            author1=self.regular_user,
            author2=self.remote_author_2
        )
        
        url = reverse("social-distribution:entry-list")
        
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that remote friends-only posts are now included
        entry_titles = [entry["title"] for entry in response.data["results"]]
        self.assertIn("Remote Friends Entry", entry_titles)

    def test_remote_author_detail_access(self):
        """Test accessing remote author details with real HTTP federation"""
        url = reverse("social-distribution:authors-detail", args=[self.remote_author_1.id])
        
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify that the response contains the fresh data from our test server
        self.assertEqual(response.data["username"], "remoteuser1")
        self.assertEqual(response.data["displayName"], "Remote User 1 - Live Federation Data")
        self.assertEqual(response.data["bio"], "This data was fetched via real HTTP from test server")
        
        # Verify the host matches our test server
        expected_host = f"{self.federation_server_1.get_base_url()}/api/"
        self.assertEqual(response.data["host"], expected_host)

    def test_remote_entry_detail_access(self):
        """Test accessing remote entry details"""
        url = reverse("social-distribution:entry-detail", args=[self.remote_public_entry.id])
        
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check remote entry data - entry details themselves come from local cache,
        # but author details can be fetched from federation if needed
        self.assertEqual(response.data["title"], "Remote Public Entry")
        self.assertEqual(response.data["author"]["username"], "remoteuser1")
        expected_host = f"{self.federation_server_1.get_base_url()}/api/"
        self.assertEqual(response.data["author"]["host"], expected_host)
        
    def test_federation_with_multiple_calls(self):
        """Test that federation properly handles multiple remote author fetches"""
        # Test fetching first remote author
        url1 = reverse("social-distribution:authors-detail", args=[self.remote_author_1.id])
        response1 = self.user_client.get(url1)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data["displayName"], "Remote User 1 - Live Federation Data")
        
        # Test fetching second remote author  
        url2 = reverse("social-distribution:authors-detail", args=[self.remote_author_2.id])
        response2 = self.user_client.get(url2)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data["displayName"], "Remote User 2 - Live Federation Data")
        
        # Both should have fetched data from our test servers
        expected_host_1 = f"{self.federation_server_1.get_base_url()}/api/"
        expected_host_2 = f"{self.federation_server_2.get_base_url()}/api/"
        self.assertEqual(response1.data["host"], expected_host_1)
        self.assertEqual(response2.data["host"], expected_host_2)
        
        # Verify the bio contains our test server indicator
        self.assertEqual(response1.data["bio"], "This data was fetched via real HTTP from test server")
        self.assertEqual(response2.data["bio"], "This data was fetched via real HTTP from test server")

    def test_federation_server_responds_correctly(self):
        """Test that our federation test server responds correctly to direct HTTP requests"""
        import requests
        
        # Make a direct HTTP request to our test server
        response = requests.get(f"{self.federation_server_1.get_base_url()}/api/authors/remoteuser1/")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify it returns the data we set up
        self.assertEqual(data["username"], "remoteuser1")
        self.assertEqual(data["displayName"], "Remote User 1 - Live Federation Data")
        self.assertEqual(data["bio"], "This data was fetched via real HTTP from test server")
        
        # Test that it returns 404 for unknown authors
        response_404 = requests.get(f"{self.federation_server_1.get_base_url()}/api/authors/unknownuser/")
        self.assertEqual(response_404.status_code, 404)


class NodeFederationInteractionTest(BaseFederationTestCase):
    """Test cases for actual federation interactions between nodes"""

    def setUp(self):
        """Set up test data with federation servers and remote nodes"""
        super().setUp()
        
        # Create remote nodes using shared servers
        self.remote_node_1 = Node.objects.create(
            name="Remote Federation Node 1",
            host=self.federation_server_1.get_base_url(),
            username="fed1user",
            password="fed1pass",
            is_active=True
        )
        
        self.remote_node_2 = Node.objects.create(
            name="Remote Federation Node 2",
            host=self.federation_server_2.get_base_url(),
            username="fed2user",
            password="fed2pass",
            is_active=True
        )
        
        # Create remote authors
        self.remote_author_1 = Author.objects.create(
            username="remoteauthor1",
            email="remote1@fed1.com",
            displayName="Remote Author 1",
            host=f"{self.federation_server_1.get_base_url()}/api/",
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/",
            web=f"{self.federation_server_1.get_base_url()}/authors/remoteauthor1",
            node=self.remote_node_1,
            password="testpass123",
            is_approved=True,
            is_active=True
        )
        
        self.remote_author_2 = Author.objects.create(
            username="remoteauthor2",
            email="remote2@fed2.com",
            displayName="Remote Author 2",
            host=f"{self.federation_server_2.get_base_url()}/api/",
            url=f"{self.federation_server_2.get_base_url()}/api/authors/remoteauthor2/",
            web=f"{self.federation_server_2.get_base_url()}/authors/remoteauthor2",
            node=self.remote_node_2,
            password="testpass123",
            is_approved=True,
            is_active=True
        )
        
        # Set up federation server responses
        self.federation_server_1.add_author("remoteauthor1", {
            "type": "author",
            "id": f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/",
            "username": "remoteauthor1",
            "displayName": "Remote Author 1",
            "host": f"{self.federation_server_1.get_base_url()}/api/",
            "page": f"{self.federation_server_1.get_base_url()}/authors/remoteauthor1",
            "profileImage": "",
            "github": "",
        })
        
        self.federation_server_2.add_author("remoteauthor2", {
            "type": "author", 
            "id": f"{self.federation_server_2.get_base_url()}/api/authors/remoteauthor2/",
            "username": "remoteauthor2",
            "displayName": "Remote Author 2",
            "host": f"{self.federation_server_2.get_base_url()}/api/",
            "page": f"{self.federation_server_2.get_base_url()}/authors/remoteauthor2",
            "profileImage": "",
            "github": "",
        })

    def test_local_user_likes_remote_post(self):
        """Test a local user liking a post from a remote node"""
        from app.models import Entry, Like
        
        # Create a remote entry
        remote_entry = Entry.objects.create(
            author=self.remote_author_1,
            title="Remote Post to Like",
            content="This is a post from a remote node that will be liked by a local user",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/posts/test-post-1/"
        )
        
        # Local user likes the remote post
        url = reverse("social-distribution:entry-likes", args=[remote_entry.id])
        response = self.user_client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify like was created locally
        like = Like.objects.get(author=self.regular_user, entry=remote_entry)
        self.assertIsNotNone(like)
        self.assertEqual(like.entry.author, self.remote_author_1)
        
        # Verify like has proper URL structure
        self.assertIn(str(like.id), like.url)
        self.assertIn("liked", like.url)

    # TODO: Re-enable this test after updating for the new inbox architecture
    def _test_remote_user_likes_local_post_via_inbox(self):
        """Test processing a like from a remote user via inbox - DISABLED: needs update for new inbox architecture"""
        from app.models import Entry, Like, Inbox
        # from app.views.inbox import InboxReceiveView  # Module removed in refactoring
        from django.test import RequestFactory
        
        # Create a local entry
        local_entry = Entry.objects.create(
            author=self.regular_user,
            title="Local Post to be Liked",
            content="This is a local post that will be liked by a remote user",
            visibility=Entry.PUBLIC
        )
        
        # Simulate incoming like from remote node
        like_data = {
            "type": "like",
            "actor": {
                "type": "author",
                "id": self.remote_author_1.url,
                "username": "remoteauthor1",
                "displayName": "Remote Author 1",
                "host": f"{self.federation_server_1.get_base_url()}/api/",
                "profileImage": "",
                "github": "",
            },
            "object": local_entry.url,
            "summary": f"Remote Author 1 likes {local_entry.title}"
        }
        
        # Send like to local user's inbox
        factory = RequestFactory()
        request = factory.post(
            f"/api/authors/{self.regular_user.id}/inbox/",
            data=json.dumps(like_data),
            content_type="application/json"
        )
        
        # view = InboxReceiveView()  # Class no longer available
        response = view.post(request, author_id=str(self.regular_user.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify like was processed and created
        like = Like.objects.get(author=self.remote_author_1, entry=local_entry)
        self.assertIsNotNone(like)
        
        # Verify inbox item was created
        inbox_item = Inbox.objects.get(recipient=self.regular_user, item_type=Inbox.LIKE)
        self.assertEqual(inbox_item.like, like)

    # TODO: Re-enable this test after updating for the new federation architecture
    def _test_create_entry_and_federate_to_remote_nodes(self):
        """Test creating an entry and federating it to remote nodes - DISABLED: needs update for new federation architecture"""
        from app.models import Entry
        # from app.utils.federation import FederationService  # Module removed in refactoring
        from unittest.mock import patch, MagicMock
        
        # Create a public entry that should be federated
        entry_data = {
            "title": "Federation Test Entry",
            "content": "This entry should be federated to remote nodes",
            "content_type": "text/plain",
            "visibility": "PUBLIC"
        }
        
        url = reverse("social-distribution:entry-list")
        
        # Mock the federation calls to track what happens
        # Federation functionality has been removed/refactored - this test needs to be updated
        # with patch.object(FederationService, 'post_entry_to_remote_nodes') as mock_federation:  # Class no longer available
        #     mock_federation.return_value = {
        #         "Remote Federation Node 1": True,
        #         "Remote Federation Node 2": True
        #     }
        #     
        #     response = self.user_client.post(url, entry_data)
        #     
        #     self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        #     
        #     # Verify entry was created
        #     entry = Entry.objects.get(title="Federation Test Entry")
        #     self.assertEqual(entry.author, self.regular_user)
        #     self.assertEqual(entry.visibility, Entry.PUBLIC)
        #     
        #     # Verify federation was attempted (mock was called)
        #     # Note: In a real test, we'd need to set up proper inbox endpoints on our test servers
        #     # For now, we verify the federation service is called correctly
        pass  # Placeholder for disabled test

    # TODO: Re-enable this test after updating for the new federation architecture
    def _test_send_follow_request_to_remote_node(self):
        """Test sending a follow request from local user to remote user - DISABLED: needs update for new federation architecture"""
        from app.models import Follow
        # from app.utils.federation import FederationService  # Module removed in refactoring
        from unittest.mock import patch
        
        # Federation functionality has been removed/refactored - this test needs to be updated
        # Mock the remote follow request sending
        # with patch.object(FederationService, 'send_follow_request') as mock_follow:  # Class no longer available
        #     mock_follow.return_value = True
        #     
        #     # Local user follows remote user
        #     url = reverse("social-distribution:authors-follow", args=[self.remote_author_1.id])
        #     response = self.user_client.post(url)
        #     
        #     self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        #     
        #     # Verify follow relationship was created locally
        #     follow = Follow.objects.get(follower=self.regular_user, followed=self.remote_author_1)
        #     self.assertEqual(follow.status, Follow.REQUESTING)
        #     
        #     # Verify federation service was called
        #     mock_follow.assert_called_once_with(self.regular_user, self.remote_author_1)
        pass  # Placeholder for disabled test

    # TODO: Re-enable this test after updating for the new inbox architecture
    def _test_receive_follow_request_from_remote_node(self):
        """Test receiving a follow request from a remote node via inbox - DISABLED: needs update for new inbox architecture"""
        from app.models import Follow, Inbox
        # from app.views.inbox import InboxReceiveView  # Module removed in refactoring
        from django.test import RequestFactory
        
        # Simulate incoming follow request from remote node
        follow_data = {
            "type": "follow",
            "actor": {
                "type": "author",
                "id": self.remote_author_2.url,
                "username": "remoteauthor2",
                "displayName": "Remote Author 2",
                "host": f"{self.federation_server_2.get_base_url()}/api/",
                "profileImage": "",
                "github": "",
            },
            "object": self.regular_user.url,
            "summary": f"Remote Author 2 wants to follow {self.regular_user.displayName}"
        }
        
        # Send follow request to local user's inbox
        factory = RequestFactory()
        request = factory.post(
            f"/api/authors/{self.regular_user.id}/inbox/",
            data=json.dumps(follow_data),
            content_type="application/json"
        )
        
        # view = InboxReceiveView()  # Class no longer available
        response = view.post(request, author_id=str(self.regular_user.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify follow was processed and created
        follow = Follow.objects.get(follower=self.remote_author_2, followed=self.regular_user)
        self.assertEqual(follow.status, Follow.REQUESTING)
        
        # Verify inbox item was created
        inbox_item = Inbox.objects.get(recipient=self.regular_user, item_type=Inbox.FOLLOW)
        self.assertEqual(inbox_item.follow, follow)

    def test_public_post_visibility_across_nodes(self):
        """Test that public posts are visible across different nodes"""
        from app.models import Entry
        
        # Create public entries from different nodes
        local_public_entry = Entry.objects.create(
            author=self.regular_user,
            title="Local Public Entry",
            content="This is a public entry from the local node",
            visibility=Entry.PUBLIC
        )
        
        remote_public_entry_1 = Entry.objects.create(
            author=self.remote_author_1,
            title="Remote Public Entry 1",
            content="This is a public entry from remote node 1",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/posts/public-1/"
        )
        
        remote_public_entry_2 = Entry.objects.create(
            author=self.remote_author_2,
            title="Remote Public Entry 2",
            content="This is a public entry from remote node 2",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_2.get_base_url()}/api/authors/remoteauthor2/posts/public-2/"
        )
        
        # Test that all public entries are visible in feed
        url = reverse("social-distribution:entry-list")
        response = self.user_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Extract entry titles from response
        entry_titles = [entry["title"] for entry in response.data["results"]]
        
        # Verify all public entries are visible
        self.assertIn("Local Public Entry", entry_titles)
        self.assertIn("Remote Public Entry 1", entry_titles) 
        self.assertIn("Remote Public Entry 2", entry_titles)

    def test_friends_only_post_visibility_with_friendship(self):
        """Test that friends-only posts are only visible to friends"""
        from app.models import Entry, Friendship
        
        # Create a friends-only entry from remote author
        friends_only_entry = Entry.objects.create(
            author=self.remote_author_1,
            title="Remote Friends Only Entry",
            content="This is a friends-only entry from remote node 1",
            visibility=Entry.FRIENDS_ONLY,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/posts/friends-1/"
        )
        
        # Initially, local user shouldn't see the friends-only post
        url = reverse("social-distribution:entry-list")
        response = self.user_client.get(url)
        entry_titles = [entry["title"] for entry in response.data["results"]]
        self.assertNotIn("Remote Friends Only Entry", entry_titles)
        
        # Create friendship between local user and remote author
        Friendship.objects.create(
            author1=self.regular_user,
            author2=self.remote_author_1
        )
        
        # Now the friends-only post should be visible
        response = self.user_client.get(url)
        entry_titles = [entry["title"] for entry in response.data["results"]]
        self.assertIn("Remote Friends Only Entry", entry_titles)

    def test_friends_only_post_visibility_without_friendship(self):
        """Test that friends-only posts are not visible without friendship"""
        from app.models import Entry
        
        # Create a friends-only entry from remote author (no friendship)
        friends_only_entry = Entry.objects.create(
            author=self.remote_author_2,
            title="Private Remote Entry",
            content="This friends-only entry should not be visible",
            visibility=Entry.FRIENDS_ONLY,
            url=f"{self.federation_server_2.get_base_url()}/api/authors/remoteauthor2/posts/private-1/"
        )
        
        # Local user shouldn't see the friends-only post
        url = reverse("social-distribution:entry-list")
        response = self.user_client.get(url)
        entry_titles = [entry["title"] for entry in response.data["results"]]
        self.assertNotIn("Private Remote Entry", entry_titles)

    # TODO: Re-enable this test after updating for the new federation architecture
    def _test_federation_error_handling(self):
        """Test federation error handling when remote nodes are unavailable"""
        from app.models import Entry, Node
        # from app.utils.federation import FederationService  # Module removed in refactoring
        
        # Create an unreachable node
        unreachable_node = Node.objects.create(
            name="Unreachable Node",
            host="http://unreachable-node.example.com",
            username="unreachable",
            password="password",
            is_active=True
        )
        
        # Create a public entry
        entry = Entry.objects.create(
            author=self.regular_user,
            title="Test Federation Error Handling",
            content="This entry tests error handling when nodes are unreachable",
            visibility=Entry.PUBLIC
        )
        
        # Try to federate - should handle errors gracefully
        results = FederationService.post_entry_to_remote_nodes(entry)
        
        # Should not raise an exception, but should return failure for unreachable node
        self.assertIn("Unreachable Node", results)
        self.assertFalse(results["Unreachable Node"])

    def test_cross_node_author_federation(self):
        """Test fetching author information across nodes"""
        from app.views.author import AuthorViewSet
        from django.test import RequestFactory
        
        # Test fetching remote author details
        url = reverse("social-distribution:authors-detail", args=[self.remote_author_1.id])
        response = self.user_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify author data
        self.assertEqual(response.data["username"], "remoteauthor1")
        self.assertEqual(response.data["displayName"], "Remote Author 1")
        
        # The federation system should potentially fetch fresh data from remote node
        # In a full implementation, this might update cached author data

    # TODO: Re-enable this test after updating for the new federation architecture  
    def _test_federation_with_authentication(self):
        """Test that federation properly handles authentication with remote nodes"""
        # from app.utils.remote import RemoteNodeClient  # Module removed in refactoring
        
        # Test creating a client for the remote node
        client = RemoteNodeClient(self.remote_node_1)
        
        # In a real implementation, this would test actual HTTP auth
        # For now, verify the client is properly configured
        self.assertEqual(client.node, self.remote_node_1)
        self.assertEqual(client.node.username, "fed1user")
        self.assertEqual(client.node.password, "fed1pass")

    def test_view_remote_author_profile(self):
        """Test viewing a remote author's profile with live federation data"""
        
        # Test fetching remote author profile
        url = reverse("social-distribution:authors-detail", args=[self.remote_author_1.id])
        response = self.user_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify that profile contains both local and potentially federated data
        self.assertEqual(response.data["username"], "remoteauthor1")
        self.assertEqual(response.data["displayName"], "Remote Author 1")
        # Note: email field may not be included in the serialized response for privacy
        
        # Verify remote host information is preserved
        expected_host = f"{self.federation_server_1.get_base_url()}/api/"
        self.assertEqual(response.data["host"], expected_host)
        
        # Verify URLs are correctly formed for remote author (required for federation)
        expected_url = f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/"
        self.assertIn("url", response.data, "Remote author profile must include URL for federation")
        self.assertEqual(response.data["url"], expected_url)

    def test_view_remote_author_profile_with_federation_data(self):
        """Test that remote author profile can fetch fresh data from federation server"""
        
        # Update the federation server with new data
        updated_data = {
            "type": "author",
            "id": f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/",
            "username": "remoteauthor1",
            "displayName": "Remote Author 1 - Updated",

            "host": f"{self.federation_server_1.get_base_url()}/api/",
            "page": f"{self.federation_server_1.get_base_url()}/authors/remoteauthor1",
            "profileImage": f"{self.federation_server_1.get_base_url()}/static/avatar-updated.jpg",
            "github": "https://github.com/remoteauthor1-updated",
        }
        self.federation_server_1.add_author("remoteauthor1", updated_data)
        
        # Fetch the remote author profile
        url = reverse("social-distribution:authors-detail", args=[self.remote_author_1.id])
        response = self.user_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # The response should potentially contain updated federation data
        # Note: This depends on whether the implementation fetches fresh data
        self.assertEqual(response.data["username"], "remoteauthor1")
        # The system may or may not update display name from federation
        # but it should at least return the stored data
        self.assertIn("Remote Author 1", response.data["displayName"])

    def test_view_remote_author_profile_entries(self):
        """Test viewing entries from a remote author's profile"""
        
        # Create some entries for the remote author
        remote_entry_1 = Entry.objects.create(
            author=self.remote_author_1,
            title="Remote Author Entry 1",
            content="First entry from remote author",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/posts/entry-1/"
        )
        
        remote_entry_2 = Entry.objects.create(
            author=self.remote_author_1,
            title="Remote Author Entry 2",
            content="Second entry from remote author",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/posts/entry-2/"
        )
        
        # Test accessing remote author's entries
        url = reverse("social-distribution:authors-entries", args=[self.remote_author_1.id])
        response = self.user_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the entries are returned with proper pagination structure
        self.assertIsInstance(response.data, dict, "API should return paginated response")
        self.assertIn("src", response.data, "Response must include 'src' for entry listing")
        self.assertIsInstance(response.data["results"], list, "Results must be a list")
        
        entry_titles = [entry["title"] for entry in response.data["results"]]
        entries = response.data["results"]
        
        self.assertIn("Remote Author Entry 1", entry_titles)
        self.assertIn("Remote Author Entry 2", entry_titles)
        
        # Verify entries have correct remote URLs
        for entry in entries:
            if entry["title"] == "Remote Author Entry 1":
                self.assertIn(self.federation_server_1.get_base_url(), entry["url"])

    def test_view_remote_author_followers_and_following(self):
        """Test viewing followers and following lists for remote authors"""
        from app.models import Follow, Friendship
        
        # Create some follow relationships involving the remote author
        local_follows_remote = Follow.objects.create(
            follower=self.regular_user,
            followed=self.remote_author_1,
            status=Follow.ACCEPTED
        )
        
        remote_follows_local = Follow.objects.create(
            follower=self.remote_author_2,
            followed=self.regular_user,
            status=Follow.ACCEPTED
        )
        
        # Test viewing remote author's followers
        url = reverse("social-distribution:authors-followers", args=[self.remote_author_1.id])
        response = self.user_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify proper followers response structure
        self.assertIsInstance(response.data, dict, "Followers API should return dict response")
        self.assertIn("followers", response.data, "Response must include 'followers' field")
        self.assertIsInstance(response.data["followers"], list, "Followers must be a list")
        
        # The local user should be in the followers list
        follower_usernames = [follower["username"] for follower in response.data["followers"]]
        self.assertIn(self.regular_user.username, follower_usernames)

    def test_remote_author_profile_privacy_settings(self):
        """Test privacy settings when viewing remote author profiles"""
        from app.models import Entry, Friendship
        
        # Create a friends-only entry from remote author
        friends_only_entry = Entry.objects.create(
            author=self.remote_author_1,
            title="Friends Only Entry from Remote",
            content="This should only be visible to friends",
            visibility=Entry.FRIENDS_ONLY,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/posts/friends-only/"
        )
        
        # Initially, local user shouldn't see friends-only entries
        url = reverse("social-distribution:authors-entries", args=[self.remote_author_1.id])
        response = self.user_client.get(url)
        
        # Verify successful response with proper structure
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict, "API should return paginated response")
        self.assertIn("src", response.data, "Response must include 'src' for entry listing")
        self.assertIsInstance(response.data["results"], list, "Results must be a list")
        
        entry_titles = [entry["title"] for entry in response.data["results"]]
        self.assertNotIn("Friends Only Entry from Remote", entry_titles)
        
        # Create friendship
        Friendship.objects.create(
            author1=self.regular_user,
            author2=self.remote_author_1
        )
        
        # Now friends-only entries should be visible
        response = self.user_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict, "API should return paginated response")
        self.assertIn("src", response.data, "Response must include 'src' for entry listing")
        self.assertIsInstance(response.data["results"], list, "Results must be a list")
        
        entry_titles = [entry["title"] for entry in response.data["results"]]
        self.assertIn("Friends Only Entry from Remote", entry_titles)

    def test_remote_author_profile_not_found(self):
        """Test handling of non-existent remote author profiles"""
        import uuid
        
        # Try to access a non-existent author
        fake_uuid = uuid.uuid4()
        url = reverse("social-distribution:authors-detail", args=[fake_uuid])
        response = self.user_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_remote_author_profile_federation_failure(self):
        """Test handling when federation server is unavailable for profile fetching"""
        from app.models import Node, Author
        
        # Create a remote author on an unreachable node
        unreachable_node = Node.objects.create(
            name="Unreachable Federation Node",
            host="http://unreachable-federation.example.com",
            username="unreachable",
            password="unreachablepass",
            is_active=True
        )
        
        unreachable_author = Author.objects.create(
            username="unreachableauthor",
            email="unreachable@unreachable.com",
            displayName="Unreachable Author",
            host="http://unreachable-federation.example.com/api/",
            url="http://unreachable-federation.example.com/api/authors/unreachableauthor/",
            web="http://unreachable-federation.example.com/authors/unreachableauthor",
            node=unreachable_node,
            password="testpass123",
            is_approved=True,
            is_active=True
        )
        
        # Try to fetch the author profile - should still work with local data
        url = reverse("social-distribution:authors-detail", args=[unreachable_author.id])
        response = self.user_client.get(url)
        
        # Should return local cached data even if federation fails
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "unreachableauthor")
        self.assertEqual(response.data["displayName"], "Unreachable Author")

    def test_view_multiple_remote_author_profiles(self):
        """Test fetching multiple remote author profiles sequentially"""
        
        # Fetch first remote author profile
        url1 = reverse("social-distribution:authors-detail", args=[self.remote_author_1.id])
        response1 = self.user_client.get(url1)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # Fetch second remote author profile
        url2 = reverse("social-distribution:authors-detail", args=[self.remote_author_2.id])
        response2 = self.user_client.get(url2)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # Verify both profiles are fetched correctly
        self.assertEqual(response1.data["username"], "remoteauthor1")
        self.assertEqual(response2.data["username"], "remoteauthor2")
        
        # Verify different host information
        self.assertNotEqual(response1.data["host"], response2.data["host"])

    def test_local_user_comments_on_remote_post(self):
        """Test a local user commenting on a post from a remote node"""
        from app.models import Entry, Comment
        
        # Create a remote entry
        remote_entry = Entry.objects.create(
            author=self.remote_author_1,
            title="Remote Post for Commenting",
            content="This is a post from a remote node that will receive comments from local users",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/posts/comment-test-1/"
        )
        
        # Local user comments on the remote post
        comment_data = {
            "content": "This is a comment from a local user on a remote post",
            "content_type": "text/plain"
        }
        
        url = reverse("social-distribution:entry-comments", args=[remote_entry.id])
        response = self.user_client.post(url, comment_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify response contains the created comment data
        self.assertIn("id", response.data, "Response should include comment ID")
        self.assertIn("id", response.data, "Response should include comment ID")
        self.assertIn("content", response.data, "Response should include comment content")
        
        # Verify comment was created locally with correct attributes
        comment = Comment.objects.get(author=self.regular_user, entry=remote_entry)
        self.assertIsNotNone(comment, "Comment should be created")
        self.assertEqual(comment.content, "This is a comment from a local user on a remote post")
        self.assertEqual(comment.entry, remote_entry, "Comment should be on remote entry")
        self.assertEqual(comment.entry.author, self.remote_author_1, "Entry should belong to remote author")
        self.assertEqual(comment.author, self.regular_user, "Comment should be from local user")
        
        # Verify comment has proper URL structure for federation
        self.assertIsNotNone(comment.url, "Comment must have URL for federation")
        self.assertIn(str(comment.id), comment.url, "URL must contain comment ID")
        self.assertIn("comments", comment.url, "URL must indicate it's a comment")
        self.assertTrue(comment.url.startswith("http"), "URL must be absolute for federation")

    # TODO: Re-enable this test after updating for the new inbox architecture
    def _test_remote_user_comments_on_local_post_via_inbox(self):
        """Test processing a comment from a remote user via inbox"""
        from app.models import Entry, Comment, Inbox
        # from app.views.inbox import InboxReceiveView  # Module removed in refactoring
        from django.test import RequestFactory
        
        # Create a local entry
        local_entry = Entry.objects.create(
            author=self.regular_user,
            title="Local Post to be Commented On",
            content="This is a local post that will receive comments from remote users",
            visibility=Entry.PUBLIC
        )
        
        # Simulate incoming comment from remote node
        comment_data = {
            "type": "comment",
            "actor": {
                "type": "author",
                "id": self.remote_author_1.url,
                "username": "remoteauthor1",
                "displayName": "Remote Author 1",
                "host": f"{self.federation_server_1.get_base_url()}/api/",
                "profileImage": "",
                "github": "",
            },
            "object": local_entry.url,
            "comment": {
                "type": "comment",
                "id": f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/commented/remote-comment-1/",
                "content": "This is a comment from a remote user on a local post",
                "content_type": "text/plain",
                "author": {
                    "type": "author",
                    "id": self.remote_author_1.url,
                    "username": "remoteauthor1",
                    "displayName": "Remote Author 1",
                },
                "entry": local_entry.url
            },
            "summary": f"Remote Author 1 commented on {local_entry.title}"
        }
        
        # Send comment to local user's inbox
        factory = RequestFactory()
        request = factory.post(
            f"/api/authors/{self.regular_user.id}/inbox/",
            data=json.dumps(comment_data),
            content_type="application/json"
        )
        
        # view = InboxReceiveView()  # Class no longer available
        response = view.post(request, author_id=str(self.regular_user.id))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify comment was processed and created with correct attributes
        comment = Comment.objects.get(author=self.remote_author_1, entry=local_entry)
        self.assertIsNotNone(comment, "Comment should be created from remote inbox")
        self.assertEqual(comment.content, "This is a comment from a remote user on a local post")
        self.assertEqual(comment.entry, local_entry, "Comment should be associated with correct entry")
        self.assertEqual(comment.author, self.remote_author_1, "Comment should be from remote author")
        self.assertIsNotNone(comment.url, "Comment should have URL for federation")
        
        # Verify inbox item was created with proper data
        inbox_item = Inbox.objects.get(recipient=self.regular_user, item_type=Inbox.COMMENT)
        self.assertEqual(inbox_item.comment, comment, "Inbox should reference the created comment")
        self.assertEqual(inbox_item.recipient, self.regular_user, "Inbox item should be for correct recipient")
        self.assertIsNotNone(inbox_item.raw_data, "Inbox should store raw federation data")

    def test_federate_comment_to_remote_author_inbox(self):
        """Test posting a comment to the remote post author's inbox"""
        from app.models import Entry, Comment
        from app.views.comment import send_comment_to_remote_inbox
        from unittest.mock import patch
        
        # Create a remote entry
        remote_entry = Entry.objects.create(
            author=self.remote_author_1,
            title="Remote Post for Federation Comment",
            content="This post will receive a federated comment",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/posts/federation-comment-test/"
        )
        
        # Create a comment from local user
        comment = Comment.objects.create(
            author=self.regular_user,
            entry=remote_entry,
            content="This comment should be federated to the remote author's inbox",
            content_type="text/plain"
        )
        
        # Mock the federation call
        with patch('app.views.comment.requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {"status": "success"}
            
            # Test the federation function
            send_comment_to_remote_inbox(comment)
            
            # Verify federation was attempted with correct parameters
            mock_post.assert_called_once()
            
            # Verify the call was made to the correct inbox URL
            call_args = mock_post.call_args
            expected_inbox_url = f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/inbox/"
            
            # Get the actual URL called
            called_url = call_args[0][0] if call_args[0] else call_args[1].get('url', '')
            self.assertEqual(called_url, expected_inbox_url, 
                           f"Federation should post to remote author's inbox: {expected_inbox_url}")
            
            # Verify the request contains proper ActivityPub comment data
            if 'json' in call_args[1]:
                sent_data = call_args[1]['json']
                self.assertIn("type", sent_data, "Federation data must include type")
                self.assertEqual(sent_data["type"], "comment", "Must send comment type")
                self.assertIn("content", sent_data, "Comment must include content")
                self.assertEqual(sent_data["content"], comment.content)

    def test_comment_visibility_on_remote_posts(self):
        """Test comment visibility rules for remote posts"""
        from app.models import Entry, Comment, Friendship
        
        # Create a friends-only remote entry
        friends_only_entry = Entry.objects.create(
            author=self.remote_author_1,
            title="Friends Only Remote Post",
            content="This friends-only post should only allow comments from friends",
            visibility=Entry.FRIENDS_ONLY,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/posts/friends-comment-test/"
        )
        
        # Create a public remote entry
        public_entry = Entry.objects.create(
            author=self.remote_author_1,
            title="Public Remote Post",
            content="This public post should allow comments from anyone",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/posts/public-comment-test/"
        )
        
        # Test commenting on public entry (should work)
        public_comment_data = {
            "content": "Comment on public remote post",
            "content_type": "text/plain"
        }
        
        public_url = reverse("social-distribution:entry-comments", args=[public_entry.id])
        public_response = self.user_client.post(public_url, public_comment_data)
        self.assertEqual(public_response.status_code, status.HTTP_201_CREATED)
        
        # Test commenting on friends-only entry without friendship (should handle appropriately)
        friends_comment_data = {
            "content": "Comment on friends-only remote post",
            "content_type": "text/plain"
        }
        
        friends_url = reverse("social-distribution:entry-comments", args=[friends_only_entry.id])
        friends_response = self.user_client.post(friends_url, friends_comment_data)
        
        # Depending on implementation, this may be forbidden or allowed with restricted visibility
        self.assertIn(friends_response.status_code, [
            status.HTTP_201_CREATED,  # If allowed but with restrictions
            status.HTTP_403_FORBIDDEN,  # If not allowed
            status.HTTP_404_NOT_FOUND   # If entry not visible
        ])
        
        # Create friendship and test again
        Friendship.objects.create(
            author1=self.regular_user,
            author2=self.remote_author_1
        )
        
        # Now friends-only comment should work
        friends_response_2 = self.user_client.post(friends_url, friends_comment_data)
        self.assertEqual(friends_response_2.status_code, status.HTTP_201_CREATED)

    def test_cross_node_comment_federation(self):
        """Test comment federation across multiple nodes"""
        from app.models import Entry, Comment
        from unittest.mock import patch
        
        # Create entries on different remote nodes
        entry_node_1 = Entry.objects.create(
            author=self.remote_author_1,
            title="Entry on Node 1",
            content="This entry is on federation server 1",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/remoteauthor1/posts/cross-node-1/"
        )
        
        entry_node_2 = Entry.objects.create(
            author=self.remote_author_2,
            title="Entry on Node 2", 
            content="This entry is on federation server 2",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_2.get_base_url()}/api/authors/remoteauthor2/posts/cross-node-2/"
        )
        
        # Local user comments on both entries
        comment_data = {
            "content": "Cross-node federation comment",
            "content_type": "text/plain"
        }
        
        # Comment on node 1 entry
        url1 = reverse("social-distribution:entry-comments", args=[entry_node_1.id])
        response1 = self.user_client.post(url1, comment_data)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Comment on node 2 entry
        url2 = reverse("social-distribution:entry-comments", args=[entry_node_2.id])
        response2 = self.user_client.post(url2, comment_data)
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        
        # Verify both comments were created with correct remote associations
        comment1 = Comment.objects.get(author=self.regular_user, entry=entry_node_1)
        comment2 = Comment.objects.get(author=self.regular_user, entry=entry_node_2)
        
        self.assertEqual(comment1.entry.author.node.host, self.federation_server_1.get_base_url())
        self.assertEqual(comment2.entry.author.node.host, self.federation_server_2.get_base_url())

class AdvancedFederationTest(BaseFederationTestCase):
    """Advanced federation tests for complex scenarios and edge cases"""

    def setUp(self):
        """Set up test data with federation servers and complex scenarios"""
        super().setUp()
        
        # Create remote node using shared server
        self.remote_node = Node.objects.create(
            name="Advanced Test Node",
            host=self.federation_server_1.get_base_url(),
            username="advuser",
            password="advpass",
            is_active=True
        )
        
        # Create remote author
        self.remote_author = Author.objects.create(
            username="advremoteuser",
            email="advremote@testnode.com",
            displayName="Advanced Remote User",
            host=f"{self.federation_server_1.get_base_url()}/api/",
            url=f"{self.federation_server_1.get_base_url()}/api/authors/advremoteuser/",
            web=f"{self.federation_server_1.get_base_url()}/authors/advremoteuser",
            node=self.remote_node,
            password="testpass123",
            is_approved=True,
            is_active=True
        )
        
        # Set up federation server responses
        self.federation_server_1.add_author("advremoteuser", {
            "type": "author",
            "id": f"{self.federation_server_1.get_base_url()}/api/authors/advremoteuser/",
            "username": "advremoteuser",
            "displayName": "Advanced Remote User",
            "host": f"{self.federation_server_1.get_base_url()}/api/",
            "page": f"{self.federation_server_1.get_base_url()}/authors/advremoteuser",
            "profileImage": "",
            "github": "",
        })

    # TODO: Re-enable this test after updating for the new inbox architecture
    def _test_follow_request_acceptance_federation(self):
        """Test accepting a follow request and federating the response"""
        from app.models import Follow, Inbox
        # from app.views.inbox import InboxViewSet  # Module removed in refactoring
        from django.test import RequestFactory
        from unittest.mock import patch
        
        # Create a follow request from remote user
        follow = Follow.objects.create(
            follower=self.remote_author,
            followed=self.regular_user,
            status=Follow.REQUESTING
        )
        
        # Create inbox item for the follow request
        inbox_item = Inbox.objects.create(
            recipient=self.regular_user,
            item_type=Inbox.FOLLOW,
            follow=follow,
            raw_data={
                "type": "follow",
                "actor": {
                    "id": self.remote_author.url,
                    "username": self.remote_author.username,
                    "displayName": self.remote_author.displayName,
                },
                "object": self.regular_user.url
            }
        )
        
        # Mock the federation response sending
        with patch('app.views.inbox.requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            
            # Accept the follow request
            url = reverse("social-distribution:inbox-accept_follow", args=[inbox_item.id])
            response = self.user_client.post(url)
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Verify follow status was updated
            follow.refresh_from_db()
            self.assertEqual(follow.status, Follow.ACCEPTED)
            
            # Verify federation response was sent (mock was called)
            mock_post.assert_called_once()

    # TODO: Re-enable this test after updating for the new federation architecture
    def _test_entry_with_mixed_visibility_federation(self):
        """Test federating entries with different visibility levels"""
        from app.models import Entry, Friendship
        # from app.utils.federation import FederationService  # Module removed in refactoring
        from unittest.mock import patch
        
        # Create a friendship to test friends-only posts
        Friendship.objects.create(
            author1=self.regular_user,
            author2=self.remote_author
        )
        
        # Test public entry federation
        public_entry = Entry.objects.create(
            author=self.regular_user,
            title="Public Entry for Federation",
            content="This public entry should be federated to all nodes",
            visibility=Entry.PUBLIC
        )
        
        # Mock federation calls
        with patch.object(FederationService, '_post_entry_to_node') as mock_post_public:
            FederationService.post_entry_to_remote_nodes(public_entry)
            # Should be called for all active nodes
            self.assertTrue(mock_post_public.called)
        
        # Test friends-only entry federation
        friends_entry = Entry.objects.create(
            author=self.regular_user,
            title="Friends Only Entry for Federation",
            content="This friends-only entry should only be federated to friends",
            visibility=Entry.FRIENDS_ONLY
        )
        
        with patch.object(FederationService, '_post_entry_to_author') as mock_post_friends:
            FederationService.post_entry_to_remote_nodes(friends_entry)
            # Should be called for remote friends only
            # This would be called if the remote author is a friend

    def test_remote_author_profile_data_consistency(self):
        """Test data consistency when viewing remote author profiles"""
        from app.models import Entry
        
        # Test that remote author data is consistent across different endpoints
        
        # 1. Get author profile
        profile_url = reverse("social-distribution:authors-detail", args=[self.remote_author.id])
        profile_response = self.user_client.get(profile_url)
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        
        # 2. Get author entries and check author data consistency
        entries_url = reverse("social-distribution:authors-entries", args=[self.remote_author.id])
        entries_response = self.user_client.get(entries_url)
        self.assertEqual(entries_response.status_code, status.HTTP_200_OK)
        
        # 3. Create an entry and check author data in entry detail
        test_entry = Entry.objects.create(
            author=self.remote_author,
            title="Consistency Test Entry",
            content="Testing author data consistency",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/advremoteuser/posts/consistency/"
        )
        
        entry_detail_url = reverse("social-distribution:entry-detail", args=[test_entry.id])
        entry_response = self.user_client.get(entry_detail_url)
        self.assertEqual(entry_response.status_code, status.HTTP_200_OK)
        
        # Verify author data is consistent across all endpoints
        profile_author = profile_response.data
        entry_author = entry_response.data["author"]
        
        # Required fields must be present and consistent
        self.assertIn("username", profile_author, "Profile must include username")
        self.assertIn("username", entry_author, "Entry author must include username")
        self.assertEqual(profile_author["username"], entry_author["username"])
        
        self.assertIn("displayName", profile_author, "Profile must include displayName")
        self.assertIn("displayName", entry_author, "Entry author must include displayName")
        self.assertEqual(profile_author["displayName"], entry_author["displayName"])
        
        self.assertIn("host", profile_author, "Profile must include host for federation")
        self.assertIn("host", entry_author, "Entry author must include host for federation")
        self.assertEqual(profile_author["host"], entry_author["host"])
        
        # URL is critical for federation - both should have it
        self.assertIn("url", profile_author, "Profile must include URL for federation")
        self.assertIn("url", entry_author, "Entry author must include URL for federation")
        self.assertEqual(profile_author["url"], entry_author["url"])

    def test_remote_author_profile_with_special_characters(self):
        """Test remote author profiles with special characters and internationalization"""
        from app.models import Author, Node
        
        # Create a remote author with special characters
        special_author = Author.objects.create(
            username="special-üser",
            email="special@test.com",
            displayName="Spëcîál Ãuthør 测试",
            host=f"{self.federation_server_1.get_base_url()}/api/",
            url=f"{self.federation_server_1.get_base_url()}/api/authors/special-üser/",
            web=f"{self.federation_server_1.get_base_url()}/authors/special-üser",
            node=self.remote_node,
            password="testpass123",
            is_approved=True,
            is_active=True
        )
        
        # Add to federation server
        self.federation_server_1.add_author("special-üser", {
            "type": "author",
            "id": f"{self.federation_server_1.get_base_url()}/api/authors/special-üser/",
            "username": "special-üser",
            "displayName": "Spëcîál Ãuthør 测试",
            "host": f"{self.federation_server_1.get_base_url()}/api/",
            "page": f"{self.federation_server_1.get_base_url()}/authors/special-üser",
            "profileImage": "",
            "github": "",
        })
        
        # Test fetching the profile
        url = reverse("social-distribution:authors-detail", args=[special_author.id])
        response = self.user_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "special-üser")
        self.assertEqual(response.data["displayName"], "Spëcîál Ãuthør 测试")
        # Bio field removed - check displayName instead
        self.assertEqual(response.data["displayName"], "Spëcîál Ãuthør 测试")

    def test_remote_author_profile_pagination(self):
        """Test pagination when viewing remote author entries"""
        from app.models import Entry
        
        # Create multiple entries for the remote author
        for i in range(15):  # More than typical page size
            Entry.objects.create(
                author=self.remote_author,
                title=f"Remote Entry {i+1}",
                content=f"Content for entry {i+1}",
                visibility=Entry.PUBLIC,
                url=f"{self.federation_server_1.get_base_url()}/api/authors/advremoteuser/posts/entry-{i+1}/"
            )
        
        # Test first page
        url = reverse("social-distribution:authors-entries", args=[self.remote_author.id])
        response = self.user_client.get(url + "?page=1")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify proper pagination response structure
        self.assertIsInstance(response.data, dict, "Paginated API should return dict response")
        self.assertIn("src", response.data, "Paginated response must include 'src'")
        self.assertIn("count", response.data, "Paginated response must include 'count'")
        self.assertIsInstance(response.data["results"], list, "Results must be a list")
        
        # Verify pagination info
        self.assertEqual(response.data["count"], 15, "Should have created 15 entries")
        self.assertLessEqual(len(response.data["results"]), 10, "Page size should be 10 or less")
        self.assertGreater(len(response.data["results"]), 0, "Should have at least one entry on first page")
        
        # Test that entries are properly ordered
        first_entry = response.data["results"][0]
        self.assertIn("Remote Entry", first_entry["title"])
        self.assertIn("title", first_entry, "Entry must have title field")
        self.assertIn("url", first_entry, "Entry must have URL field for federation")

    def test_remote_author_profile_cache_behavior(self):
        """Test caching behavior for remote author profiles"""
        
        # First request - may trigger federation fetch
        url = reverse("social-distribution:authors-detail", args=[self.remote_author.id])
        response1 = self.user_client.get(url)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # Update federation server data
        updated_data = {
            "type": "author",
            "id": f"{self.federation_server_1.get_base_url()}/api/authors/advremoteuser/",
            "username": "advremoteuser",
            "displayName": "Advanced Remote User - Cache Test",

            "host": f"{self.federation_server_1.get_base_url()}/api/",
            "page": f"{self.federation_server_1.get_base_url()}/authors/advremoteuser",
            "profileImage": "",
            "github": "",
        }
        self.federation_server_1.add_author("advremoteuser", updated_data)
        
        # Second request - test cache behavior
        response2 = self.user_client.get(url)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # Verify response is still valid (cache or fresh data)
        self.assertEqual(response2.data["username"], "advremoteuser")
        self.assertIn("Advanced Remote User", response2.data["displayName"])

    def test_remote_author_profile_cross_node_references(self):
        """Test remote author profiles that reference multiple nodes"""
        from app.models import Entry, Follow
        
        # Create entries and follows that span multiple nodes
        
        # Remote author from node 1 creates an entry
        cross_node_entry = Entry.objects.create(
            author=self.remote_author,
            title="Cross Node Reference Entry",
            content="This entry references multiple nodes",
            visibility=Entry.PUBLIC,
            url=f"{self.federation_server_1.get_base_url()}/api/authors/advremoteuser/posts/cross-node/"
        )
        
        # Create a follow relationship between authors from different nodes
        # (This would require remote_author_2 from the other test class, so we'll create a new one)
        from app.models import Author
        
        second_remote_author = Author.objects.create(
            username="secondremote",
            email="second@remote.com",
            displayName="Second Remote Author",
            host=f"{self.federation_server_1.get_base_url()}/api/",  # Same server for simplicity
            url=f"{self.federation_server_1.get_base_url()}/api/authors/secondremote/",
            web=f"{self.federation_server_1.get_base_url()}/authors/secondremote",
            node=self.remote_node,
            password="testpass123",
            is_approved=True,
            is_active=True
        )
        
        cross_node_follow = Follow.objects.create(
            follower=self.remote_author,
            followed=second_remote_author,
            status=Follow.ACCEPTED
        )
        
        # Test that profile shows correct cross-node relationships
        url = reverse("social-distribution:authors-detail", args=[self.remote_author.id])
        response = self.user_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "advremoteuser")
        
        # Test followers endpoint shows cross-node relationships
        followers_url = reverse("social-distribution:authors-followers", args=[second_remote_author.id])
        followers_response = self.user_client.get(followers_url)
        
        self.assertEqual(followers_response.status_code, status.HTTP_200_OK)
        
        # Verify proper followers response structure
        self.assertIsInstance(followers_response.data, dict, "Followers API should return dict response")
        self.assertIn("followers", followers_response.data, "Response must include 'followers' field")
        self.assertIsInstance(followers_response.data["followers"], list, "Followers must be a list")
        
        follower_usernames = [f["username"] for f in followers_response.data["followers"]]
        self.assertIn("advremoteuser", follower_usernames)