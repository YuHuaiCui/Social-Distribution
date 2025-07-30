#!/bin/bash

# Test script to verify backend-to-backend communication uses correct URLs

echo "Testing backend-to-backend communication fix..."
echo ""

# Test 1: Get author by URL - this should use backend URL (port 8000) for API calls
echo "Test 1: Fetching author by URL (backend-to-backend communication)"
echo "This simulates one node fetching author data from another node"
echo ""

# The URL parameter should be the author's backend API URL (port 8000)
AUTHOR_URL="http://192.168.1.75:8000/api/authors/c53452d6-f3eb-4616-8338-49288a3da001/"
ENCODED_URL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$AUTHOR_URL', safe=''))")

echo "Fetching author with URL: $AUTHOR_URL"
echo "Encoded URL: $ENCODED_URL"
echo ""

curl -X GET \
  -u "dc:123" \
  -H "Accept: application/json" \
  "http://localhost:8000/api/authors/by-url/$ENCODED_URL/" \
  | python3 -m json.tool

echo ""
echo "Test 2: Get local author to verify web field uses frontend URL"
echo ""

# Get a local author to verify the web field points to frontend (port 5173)
curl -X GET \
  -u "dc:123" \
  -H "Accept: application/json" \
  "http://localhost:8000/api/authors/" \
  | python3 -m json.tool | head -50

echo ""
echo "Key points to verify:"
echo "1. The 'url' field should use backend URL (port 8000) for API access"
echo "2. The 'host' field should use backend URL (port 8000) for API base"
echo "3. The 'web' field should use frontend URL (port 5173) for UI access"
echo ""
echo "This ensures nodes communicate via backend APIs, not frontend URLs"