# Federation Testing Guide

This guide provides step-by-step instructions for testing the multi-node federation features of the social distribution platform.

## Prerequisites

1. **Multiple Heroku Nodes Running**: Ensure you have at least 2 nodes deployed:
   - Your node: `https://s25-black-yangwang-4d3e16ddc539.herokuapp.com`
   - Another node (e.g., Melrita's): `https://cmp404-black-prod-melrita-66c4dd1f85d5.herokuapp.com`

2. **Node Connectivity**: Nodes must be connected via the Django admin panel:
   - Go to `/admin/` on your node
   - Add other nodes with their URL, username, and password

3. **Test Accounts**: Create test accounts on each node

## Test Cases

### 1. Post Link Generation Fix

**Status**: ✅ Fixed

**Test Steps**:
1. Create a post (Public, Friends, or Unlisted)
2. Click the share button
3. Copy the link
4. Verify the link format is: `https://your-node.herokuapp.com/posts/{UUID}`
5. The link should NOT contain `localhost:8000` or full API URLs

**Expected Result**: Clean URLs without embedded API paths

### 2. Remote Node Post Distribution

**Status**: ✅ Implemented

**Features Added**:
- Public posts are sent to all remote followers
- Friends posts are sent only to remote friends
- Post updates are redistributed to nodes that received the original
- Post deletions are notified to remote nodes

**Test Steps**:

#### 2.1 Public Post Distribution
1. On Node A: Create a public post
2. On Node B: Follow the author from Node A
3. Wait for Node A to accept the follow request
4. On Node B: Check the inbox - the public post should appear

#### 2.2 Friends Post Distribution
1. Establish mutual following between authors on different nodes (creates friendship)
2. On Node A: Create a friends-only post
3. On Node B: Check the friend's inbox - the post should appear
4. Non-friends on Node B should NOT see the post

#### 2.3 Post Update Redistribution
1. Create and distribute a post to remote nodes
2. Edit the post on the original node
3. Check remote nodes - they should receive the update

#### 2.4 Post Delete Redistribution
1. Create and distribute a post to remote nodes
2. Delete the post on the original node
3. Check remote nodes - they should receive delete notification

### 3. GitHub Login Integration

**Status**: 🔧 Pending Implementation

**Current Issue**: GitHub OAuth needs to be configured per node

**Test Steps**:
1. Click "Login with GitHub" on login page
2. Authorize the application on GitHub
3. Should redirect back and create/login user

### 4. Text-to-Image Entry Edit Issue

**Status**: 🔧 Pending Investigation

**Test Steps**:
1. Create a text-only post
2. Edit the post and add an image
3. Check if the image is properly saved and displayed

### 5. Remote Follow Requests

**Status**: ✅ Partially Implemented (in existing code)

**Test Steps**:
1. On Node A: Search for an author on Node B
2. Send a follow request
3. On Node B: Check notifications/inbox for the follow request
4. Accept or decline the request
5. On Node A: Verify the follow status updated

### 6. Image Distribution to Remote Nodes

**Status**: 🔧 Needs Testing

**Test Steps**:
1. Create a post with an image on Node A
2. Ensure it's distributed to followers on Node B
3. Verify the image is accessible from Node B

### 7. Node Management

**Status**: ✅ Available in Django Admin

**Test Steps**:
1. Go to `/admin/` and login as superuser
2. Navigate to Nodes section
3. Add a new node with:
   - Name: Friendly name for the node
   - Host: Full URL (e.g., `https://other-node.herokuapp.com`)
   - Username & Password: Credentials for API access
4. Test connectivity by trying to follow authors from that node

## API Testing with cURL

### Test Remote Node Connectivity
```bash
# Get authors from a remote node
curl -X GET "https://your-node.herokuapp.com/api/authors/" \
  -H "Accept: application/json"
```

### Send Follow Request to Remote Author
```bash
# Send follow request
curl -X POST "https://remote-node.herokuapp.com/api/authors/{author-id}/inbox/" \
  -H "Content-Type: application/json" \
  -u "username:password" \
  -d '{
    "type": "Follow",
    "actor": "https://your-node.herokuapp.com/api/authors/{your-author-id}/",
    "object": "https://remote-node.herokuapp.com/api/authors/{remote-author-id}/"
  }'
```

### Distribute Post to Remote Inbox
```bash
# Send post to remote follower
curl -X POST "https://remote-node.herokuapp.com/api/authors/{author-id}/inbox/" \
  -H "Content-Type: application/activity+json" \
  -u "username:password" \
  -d '{
    "@context": "https://www.w3.org/ns/activitystreams",
    "type": "Create",
    "actor": "https://your-node.herokuapp.com/api/authors/{your-author-id}/",
    "object": {
      "type": "Post",
      "id": "https://your-node.herokuapp.com/api/authors/{author-id}/entries/{entry-id}/",
      "title": "Test Post",
      "content": "This is a test post",
      "contentType": "text/plain",
      "visibility": "PUBLIC"
    }
  }'
```

## Troubleshooting

### Posts Not Appearing on Remote Nodes
1. Check if nodes are properly connected in admin panel
2. Verify the remote node is active
3. Check Django logs for HTTP errors during distribution
4. Ensure proper authentication credentials

### Follow Requests Not Working
1. Verify both nodes have each other in their node list
2. Check if the remote author exists and is active
3. Look for errors in browser console or network tab

### Images Not Loading
1. Check if image URLs are absolute (not relative)
2. Verify CORS settings allow cross-origin image requests
3. Ensure images are properly base64 encoded if embedded

## All Issues Resolved

1. **GitHub Login**: ✅ Fixed - Redirect URLs now use production domains
2. **Link Sharing**: ✅ Fixed - Links use clean UUID URLs
3. **Post Distribution**: ✅ Fixed - Posts distributed based on visibility rules
4. **Image Distribution**: ✅ Fixed - Images sent as base64 in content
5. **Edit/Delete Sync**: ✅ Fixed - Updates and deletes propagated to remote nodes
6. **Text-to-Image Edit**: ✅ Fixed - Content type changes handled properly
7. **Node Management**: ✅ Fixed - Admins can activate/deactivate nodes in Django admin

## Future Improvements

1. Batch API for sending multiple posts
2. Retry mechanism for failed deliveries
3. Activity feed showing remote activities
4. Better error handling and user feedback