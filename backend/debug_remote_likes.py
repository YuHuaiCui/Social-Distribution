#!/usr/bin/env python3
"""
Debug script for remote like federation issues.

This script helps diagnose problems with remote likes by:
1. Checking if required authors and entries exist
2. Testing the inbox endpoint directly
3. Verifying node authentication
4. Simulating the federation process

Usage:
    python debug_remote_likes.py
"""

import os
import sys
import django
import json
import requests
from requests.auth import HTTPBasicAuth

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")
django.setup()

from app.models import Author, Entry, Node, Like
from app.utils.federation import FederationService
from django.conf import settings


def check_database_state():
    """Check the current database state for debugging."""
    print("=== DATABASE STATE ===")

    # Check local authors
    local_authors = Author.objects.filter(node__isnull=True, is_active=True)
    print(f"Local authors: {local_authors.count()}")
    for author in local_authors:
        print(f"  - {author.username} (ID: {author.id})")

    # Check remote authors
    remote_authors = Author.objects.filter(node__isnull=False)
    print(f"Remote authors: {remote_authors.count()}")
    for author in remote_authors[:5]:  # Show first 5
        print(
            f"  - {author.username} (ID: {author.id}, Node: {author.node.name if author.node else 'None'})"
        )

    # Check entries
    entries = Entry.objects.all()
    print(f"Total entries: {entries.count()}")
    for entry in entries[:5]:  # Show first 5
        print(f"  - {entry.title} by {entry.author.username} (ID: {entry.id})")

    # Check nodes
    nodes = Node.objects.filter(is_active=True)
    print(f"Active nodes: {nodes.count()}")
    for node in nodes:
        print(f"  - {node.name} ({node.host})")

    # Check likes
    likes = Like.objects.all()
    print(f"Total likes: {likes.count()}")
    for like in likes[:5]:  # Show first 5
        target = like.entry or like.comment
        print(f"  - {like.author.username} liked {target}")


def test_specific_entry_lookup(entry_id):
    """Test looking up a specific entry."""
    print(f"\n=== TESTING ENTRY LOOKUP: {entry_id} ===")

    try:
        # Try direct ID lookup
        entry = Entry.objects.get(id=entry_id)
        print(f"✅ Found entry by ID: {entry.title}")
        print(f"   Author: {entry.author.username}")
        print(f"   URL: {entry.url}")
        print(f"   Visibility: {entry.visibility}")
        return entry
    except Entry.DoesNotExist:
        print(f"❌ Entry not found by ID: {entry_id}")

        # Try URL lookup
        try:
            entry = Entry.objects.get(url__icontains=str(entry_id))
            print(f"✅ Found entry by URL contains: {entry.title}")
            return entry
        except Entry.DoesNotExist:
            print(f"❌ Entry not found by URL contains: {entry_id}")
        except Exception as e:
            print(f"❌ Error during URL lookup: {e}")
    except Exception as e:
        print(f"❌ Error during ID lookup: {e}")

    return None


def test_federation_processing(sample_like_data, recipient_author_id):
    """Test the federation processing directly."""
    print(f"\n=== TESTING FEDERATION PROCESSING ===")

    try:
        # Get recipient author
        recipient = Author.objects.get(id=recipient_author_id)
        print(f"✅ Found recipient: {recipient.username}")

        # Get a test node
        node = Node.objects.filter(is_active=True).first()
        if not node:
            print("❌ No active nodes found")
            return False
        print(f"✅ Using node: {node.name}")

        # Test the federation service directly
        print("Testing FederationService.process_inbox_item...")
        success = FederationService.process_inbox_item(
            recipient, sample_like_data, node
        )

        if success:
            print("✅ Federation processing succeeded")
            return True
        else:
            print("❌ Federation processing failed")
            return False

    except Exception as e:
        print(f"❌ Error during federation testing: {e}")
        import traceback

        print(f"Traceback: {traceback.format_exc()}")
        return False


def test_inbox_endpoint(sample_like_data, recipient_author_id):
    """Test the inbox endpoint directly."""
    print(f"\n=== TESTING INBOX ENDPOINT ===")

    # Get node credentials
    node = Node.objects.filter(is_active=True).first()
    if not node:
        print("❌ No active nodes found for authentication")
        return False

    # Prepare the request
    url = f"{settings.SITE_URL}/api/authors/{recipient_author_id}/inbox/"
    auth = HTTPBasicAuth(node.username, node.password)
    headers = {"Content-Type": "application/json"}

    print(f"Testing POST to: {url}")
    print(f"Auth: {node.username}:***")
    print(f"Data: {json.dumps(sample_like_data, indent=2)}")

    try:
        response = requests.post(
            url, json=sample_like_data, auth=auth, headers=headers, timeout=10
        )

        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")

        if response.status_code == 200:
            print("✅ Inbox endpoint succeeded")
            return True
        else:
            print(f"❌ Inbox endpoint failed: {response.status_code}")
            try:
                print(f"Response body: {response.text}")
            except:
                print("Could not decode response body")
            return False

    except Exception as e:
        print(f"❌ Error calling inbox endpoint: {e}")
        return False


def main():
    """Main diagnostic function."""
    print("🔍 REMOTE LIKE FEDERATION DIAGNOSTICS")
    print("=" * 50)

    # Check database state
    check_database_state()

    # Test specific entry (use the one from the logs)
    test_entry_id = "1641f509-ed40-4af6-91c2-449f0a664214"
    entry = test_specific_entry_lookup(test_entry_id)

    if not entry:
        print("\n❌ Cannot proceed with tests - entry not found")
        return

    # Test recipient author (use the one from the logs)
    recipient_author_id = "69dcb458-e8c5-488f-8f1f-469c86a53cca"

    # Create sample like data
    sample_like_data = {
        "type": "like",
        "author": {
            "type": "author",
            "id": "http://testnode.com/api/authors/test-user-id",
            "host": "http://testnode.com/api/",
            "displayName": "Test Remote User",
            "username": "testremoteuser",
            "github": "",
            "profileImage": "",
            "web": "http://testnode.com/authors/test-user-id",
        },
        "published": "2025-01-27T04:59:23.000Z",
        "id": "http://testnode.com/api/authors/test-user-id/liked/test-like-id",
        "object": entry.url,
    }

    # Test federation processing directly
    federation_success = test_federation_processing(
        sample_like_data, recipient_author_id
    )

    # Test inbox endpoint
    endpoint_success = test_inbox_endpoint(sample_like_data, recipient_author_id)

    # Summary
    print(f"\n=== DIAGNOSTIC SUMMARY ===")
    print(f"Entry lookup: {'✅' if entry else '❌'}")
    print(f"Federation processing: {'✅' if federation_success else '❌'}")
    print(f"Inbox endpoint: {'✅' if endpoint_success else '❌'}")

    if not federation_success and not endpoint_success:
        print(
            "\n🚨 ISSUE IDENTIFIED: Both federation processing and inbox endpoint failed"
        )
        print("Check the debug logs above for specific error details")
    elif federation_success and not endpoint_success:
        print("\n🚨 ISSUE IDENTIFIED: Federation logic works but inbox endpoint fails")
        print("This suggests an authentication or HTTP handling issue")
    elif not federation_success and endpoint_success:
        print("\n🚨 ISSUE IDENTIFIED: Inbox endpoint works but federation logic fails")
        print(
            "This suggests an issue in the FederationService.process_inbox_item method"
        )
    else:
        print("\n✅ ALL TESTS PASSED: The issue may be intermittent or resolved")


if __name__ == "__main__":
    main()
