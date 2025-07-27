#!/usr/bin/env python3
"""
Quick script to check node configuration for debugging federation issues.
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")
django.setup()

from app.models import Node


def check_nodes():
    """Check all configured nodes."""
    print("=== NODE CONFIGURATION ===")

    nodes = Node.objects.all()
    print(f"Total nodes: {nodes.count()}")

    for node in nodes:
        print(f"\n--- Node: {node.name} ---")
        print(f"Host: {node.host}")
        print(f"Username: {node.username}")
        print(f"Has password: {'Yes' if node.password else 'No'}")
        print(f"Password length: {len(node.password) if node.password else 0}")
        print(f"Is active: {node.is_active}")
        print(f"Created: {node.created_at}")
        print(f"Updated: {node.updated_at}")


if __name__ == "__main__":
    check_nodes()
