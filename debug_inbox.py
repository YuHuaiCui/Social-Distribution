#!/usr/bin/env python3
"""
Debug script for inbox functionality
Run this to test the inbox processing and identify issues
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from app.models import Author, Node, Entry, Like, Inbox
from app.utils.federation import FederationService
from django.conf import settings

def test_inbox_processing():
    """Test inbox processing with sample data"""
    print("=== Testing Inbox Processing ===")
    
    # Get a local author
    try:
        local_author = Author.objects.filter(node__isnull=True, is_active=True).first()
        if not local_author:
            print("❌ No local authors found")
            return
        print(f"✅ Found local author: {local_author.username}")
    except Exception as e:
        print(f"❌ Error finding local author: {e}")
        return
    
    # Get a remote node
    try:
        remote_node = Node.objects.filter(is_active=True).first()
        if not remote_node:
            print("❌ No remote nodes found")
            return
        print(f"✅ Found remote node: {remote_node.name}")
    except Exception as e:
        print(f"❌ Error finding remote node: {e}")
        return
    
    # Test like processing
    print("\n=== Testing Like Processing ===")
    like_data = {
        "type": "like",
        "actor": {
            "id": f"{remote_node.host}api/authors/test-remote-author",
            "username": "test-remote-author",
            "displayName": "Test Remote Author"
        },
        "object": f"{settings.SITE_URL}/api/authors/{local_author.id}/entries/test-entry"
    }
    
    try:
        success = FederationService.process_inbox_item(local_author, like_data, remote_node)
        print(f"✅ Like processing result: {success}")
    except Exception as e:
        print(f"❌ Error processing like: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

def test_like_creation():
    """Test like creation functionality"""
    print("\n=== Testing Like Creation ===")
    
    # Get a local author and entry
    try:
        local_author = Author.objects.filter(node__isnull=True, is_active=True).first()
        entry = Entry.objects.filter(author=local_author).first()
        
        if not local_author or not entry:
            print("❌ No local author or entry found")
            return
        
        print(f"✅ Testing with author: {local_author.username}")
        print(f"✅ Testing with entry: {entry.title}")
        
        # Create a like
        like = Like.objects.create(
            author=local_author,
            entry=entry
        )
        print(f"✅ Like created successfully: {like.id}")
        print(f"✅ Like URL: {like.url}")
        
    except Exception as e:
        print(f"❌ Error creating like: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

def test_inbox_creation():
    """Test inbox item creation"""
    print("\n=== Testing Inbox Creation ===")
    
    try:
        local_author = Author.objects.filter(node__isnull=True, is_active=True).first()
        like = Like.objects.first()
        
        if not local_author or not like:
            print("❌ No local author or like found")
            return
        
        # Create inbox item
        inbox_item = Inbox.objects.create(
            recipient=local_author,
            item_type=Inbox.LIKE,
            like=like.url,
            raw_data={"type": "like", "test": "data"}
        )
        print(f"✅ Inbox item created successfully: {inbox_item.id}")
        
    except Exception as e:
        print(f"❌ Error creating inbox item: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    print("🔍 Starting inbox debugging...")
    test_inbox_processing()
    test_like_creation()
    test_inbox_creation()
    print("\n✅ Debugging complete!") 