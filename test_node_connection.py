#!/usr/bin/env python3
"""
Test script to verify node connection and author fetching
"""

import requests
from requests.auth import HTTPBasicAuth
import json

# Test node connection
node_host = "http://192.168.1.72:8000"
username = "dc"
password = "123"

print(f"Testing connection to node: {node_host}")
print(f"Using credentials: {username}/{password}")
print("-" * 50)

try:
    # Test 1: Basic connection
    print("Test 1: Testing basic API access...")
    response = requests.get(
        f"{node_host}/api/",
        auth=HTTPBasicAuth(username, password),
        timeout=5
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("[OK] Basic API access successful")
    else:
        print(f"[FAIL] Basic API access failed: {response.text[:200]}")
    print()

    # Test 2: Fetch authors
    print("Test 2: Fetching authors...")
    response = requests.get(
        f"{node_host}/api/authors/",
        auth=HTTPBasicAuth(username, password),
        params={"page": 1, "size": 10},
        timeout=5
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        if "authors" in data:
            authors = data["authors"]
            print(f"[OK] Found {len(authors)} authors")
            
            if authors:
                print("\nFirst author:")
                print(json.dumps(authors[0], indent=2))
        else:
            print("[FAIL] No 'authors' key in response")
            print(f"Response: {json.dumps(data, indent=2)[:500]}")
    else:
        print(f"[FAIL] Failed to fetch authors: {response.text[:200]}")
        
except requests.exceptions.ConnectionError:
    print("[FAIL] Connection error - Cannot reach the node")
except requests.exceptions.Timeout:
    print("[FAIL] Timeout - Node is not responding")
except Exception as e:
    print(f"[FAIL] Unexpected error: {type(e).__name__}: {str(e)}")