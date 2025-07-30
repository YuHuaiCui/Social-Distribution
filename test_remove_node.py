#!/usr/bin/env python3
"""
Remove test node to test re-adding it
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from app.models import Node, Author

# Find and remove the test node
test_host = "http://192.168.1.72:8000"

try:
    node = Node.objects.filter(host=test_host).first()
    if node:
        # First remove all authors from this node
        remote_authors = Author.objects.filter(node=node)
        count = remote_authors.count()
        remote_authors.delete()
        print(f"Deleted {count} remote authors from node {test_host}")
        
        # Then remove the node
        node.delete()
        print(f"Deleted node: {test_host}")
    else:
        print(f"Node not found: {test_host}")
        
except Exception as e:
    print(f"Error: {e}")