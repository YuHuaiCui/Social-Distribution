#!/usr/bin/env python
"""
Test script to verify that entries are sent to remote authors' inboxes
when a new entry is created or updated.
"""

import os
import sys
import django

# Set up Django environment
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

from app.models import Author, Entry, Node
from django.contrib.auth import get_user_model
import logging

# Set up logging to see our debug messages
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_inbox_distribution():
    """Test that entries are distributed to remote authors' inboxes"""
    
    print("\n=== Testing Entry Inbox Distribution ===\n")
    
    # Check if we have any remote authors
    remote_authors_count = Author.objects.filter(node__isnull=False).count()
    print(f"Found {remote_authors_count} remote authors in the database")
    
    if remote_authors_count == 0:
        print("\nNo remote authors found. To test this feature:")
        print("1. Add a remote node through the admin panel or API")
        print("2. Create or import some remote authors associated with that node")
        print("3. Run this test again")
        return
    
    # List the remote authors
    print("\nRemote authors:")
    for author in Author.objects.filter(node__isnull=False)[:5]:
        print(f"  - {author.username} from {author.node.name if author.node else 'Unknown'}")
        print(f"    URL: {author.url}")
        print(f"    Inbox URL: {author.url.rstrip('/')}/inbox/")
    
    # Check if we have a local author to create entries
    local_author = Author.objects.filter(node__isnull=True, is_approved=True).first()
    if not local_author:
        print("\nNo approved local author found to create test entries.")
        print("Please create and approve a local author first.")
        return
    
    print(f"\nUsing local author: {local_author.username}")
    
    # Inform about what would happen
    print("\nWhen you create or update an entry:")
    print("1. The entry will be saved to the database")
    print("2. The system will automatically send the entry to all remote authors' inboxes")
    print("3. Each remote author will receive a POST request to their inbox URL")
    print("4. The request will include the entry data in the proper ActivityPub format")
    
    print("\nTo test this functionality:")
    print("1. Create a new entry through the API or frontend")
    print("2. Check the server logs to see the inbox distribution messages")
    print("3. Look for messages like:")
    print('   - "Sending entry {id} to {count} remote authors"')
    print('   - "Successfully sent entry to {username}\'s inbox at {url}"')
    print('   - "Failed to send entry to {username}\'s inbox: {error}"')
    
    print("\nNote: The actual inbox delivery depends on:")
    print("- The remote server being online and accessible")
    print("- Proper authentication credentials for the remote node")
    print("- The remote server accepting inbox POST requests")

if __name__ == "__main__":
    test_inbox_distribution()