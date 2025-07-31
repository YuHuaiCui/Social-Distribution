# Backend API Documentation (Updated)

## Table of Contents
1. [API Overview](#api-overview)
2. [Tech Stack](#tech-stack)
3. [Authentication](#authentication)
4. [API Base URL](#api-base-url)
5. [Request/Response Formats](#requestresponse-formats)
6. [Error Handling](#error-handling)
7. [Pagination](#pagination)
8. [API Endpoints](#api-endpoints)
   - [Authentication Endpoints](#authentication-endpoints)
   - [Author Endpoints](#author-endpoints)
   - [Entry (Post) Endpoints](#entry-post-endpoints)
   - [Comment Endpoints](#comment-endpoints)
   - [Like Endpoints](#like-endpoints)
   - [Follow Endpoints](#follow-endpoints)
   - [Inbox Endpoints](#inbox-endpoints)
   - [Image Upload Endpoints](#image-upload-endpoints)
   - [GitHub Integration Endpoints](#github-integration-endpoints]
   - [Node Management Endpoints](#node-management-endpoints)
9. [CORS Configuration](#cors-configuration)
10. [Database Schema](#database-schema)
11. [API Versioning](#api-versioning)
12. [Rate Limiting](#rate-limiting)
13. [Testing the API](#testing-the-api)
14. [Deployment Considerations](#deployment-considerations)

## API Overview

The Social Distribution Backend API is a RESTful API built with Django and Django REST Framework. It provides endpoints for a federated social media platform that supports user authentication, posting content, following users, commenting, liking posts, and managing notifications through an inbox system. The API is designed to be compatible with ActivityPub for federation with other social media platforms.

### Key Features
- Session-based authentication with CSRF protection
- RESTful resource endpoints with CMPUT 404 compliance
- JSON request/response format
- Pagination support for list endpoints
- Comprehensive error handling
- CORS support for frontend integration
- Image upload capabilities with binary storage
- Real-time notifications via inbox system
- GitHub integration for profile validation and activity tracking
- Federation support for cross-instance communication
- Node management for remote instance connections
- FQID (Fully Qualified ID) support for federation
- Remote entry fetching and caching

## Tech Stack

- **Framework**: Django 5.2.1
- **API Framework**: Django REST Framework
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: Django built-in authentication with session management
- **File Storage**: Binary data storage in database (images)
- **Python Version**: 3.8+
- **Federation**: ActivityPub-compatible endpoints

### Key Dependencies
```
Django==5.2.1
djangorestframework==3.14.0
django-cors-headers==4.3.1
django-allauth==0.57.0
Pillow==10.2.0
python-dotenv==1.0.0
drf-spectacular==0.27.0
```

## Authentication

### Authentication Methods

1. **Session-Based Authentication** (Primary)
   - Uses Django's session framework
   - CSRF token required for non-safe methods
   - Sessions expire after 2 weeks (with remember me) or 24 hours (without)

2. **Basic Authentication** (API Testing)
   - Supported for development and testing
   - Username and password sent with each request

### Authentication Flow

1. **Signup**
   ```
   POST /api/auth/signup/
   ```
   Creates a new user account and automatically logs them in

2. **Login**
   ```
   POST /api/auth/login/
   ```
   Authenticates user credentials and creates a session

3. **Check Authentication Status**
   ```
   GET /api/auth/status/
   ```
   Returns current authentication status and user info

4. **Logout**
   ```
   POST /api/auth/logout/
   ```
   Destroys the current session

### CSRF Protection
- CSRF token must be included in the `X-CSRFToken` header for all non-safe methods (POST, PUT, PATCH, DELETE)
- Token can be retrieved from the `csrftoken` cookie

## API Base URL

- **Development**: `http://localhost:8000`
- **Production**: Configured via environment variable

All API endpoints are prefixed with `/api/` except for authentication endpoints.

## Request/Response Formats

### Request Format
- **Content-Type**: `application/json` (for JSON payloads)
- **Content-Type**: `multipart/form-data` (for file uploads)

### Response Format
All responses are in JSON format:

```json
{
  "field1": "value1",
  "field2": "value2"
}
```

### Pagination Response Format
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/resource/?page=2",
  "previous": null,
  "results": [...]
}
```

## Error Handling

### Standard Error Response Format
```json
{
  "detail": "Error message",
  "field_name": ["Field-specific error message"]
}
```

### HTTP Status Codes
- `200 OK`: Successful GET, PUT, PATCH
- `201 Created`: Successful POST creating new resource
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Pagination

Default pagination settings:
- **Page Size**: 20 items per page
- **Pagination Class**: PageNumberPagination
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `page_size`: Items per page (custom endpoints may support this)

## API Endpoints

### Authentication Endpoints

#### 1. User Registration
**POST** `/api/auth/signup/`

Creates a new user account and automatically logs them in.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123",
  "displayName": "John Doe",
  "github_username": "johndoe"
}
```

**Required Fields:**
- `username`: Unique username
- `password`: Password (must meet validation requirements)
- `displayName`: Display name for the user

**Response (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "http://localhost:8000/api/authors/550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "displayName": "John Doe",
    "github_username": "johndoe",
    "profileImage": null,
    "is_approved": true,
    "is_active": true,
    "created_at": "2025-01-15T12:00:00Z"
  },
  "message": "Account created successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Username already exists, password validation failed

#### 2. User Login
**POST** `/api/auth/login/`

Authenticates a user and creates a session.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123",
  "remember_me": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "displayName": "John Doe",
    "profileImage": null,
    "is_approved": true,
    "is_active": true
  },
  "message": "Login successful"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account awaiting admin approval

#### 3. Authentication Status
**GET** `/api/auth/status/`

Checks if the user is authenticated and returns user info.

**Response (200 OK):**
```json
{
  "isAuthenticated": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "displayName": "John Doe"
  }
}
```

#### 4. Logout
**POST** `/api/auth/logout/`

Logs out the current user.

**Response (200 OK):**
```json
{
  "success": true
}
```

#### 5. Get/Update Current User
**GET/PATCH** `/api/authors/me/`

Gets or updates the current authenticated user's profile.

**PATCH Request Body:**
```json
{
  "displayName": "John Updated",
  "github_username": "johndoe_updated",
  "profileImage": "http://example.com/image.jpg"
}
```

**Response (200 OK):**
Returns the updated user object.

#### 6. GitHub OAuth Callback
**POST** `/api/auth/github/callback/`

Handles GitHub OAuth callback after successful authentication.

**Request Body:**
```json
{
  "code": "github_auth_code"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "displayName": "John Doe"
  }
}
```

### Author Endpoints

#### 1. List Authors
**GET** `/api/authors/`

Lists all authors with pagination and filtering.

**Query Parameters:**
- `is_approved`: Filter by approval status (true/false)
- `is_active`: Filter by active status (true/false)
- `type`: Filter by author type (local/remote)
- `search`: Search by username, displayName, github_username
- `page`: Page number for pagination

**Response (200 OK):**
```json
{
  "count": 50,
  "next": "http://localhost:8000/api/authors/?page=2",
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "url": "http://localhost:8000/api/authors/550e8400-e29b-41d4-a716-446655440000",
      "username": "johndoe",
      "displayName": "John Doe",
      "github_username": "johndoe",
      "profileImage": "",
      "is_approved": true,
      "is_active": true,
      "created_at": "2025-01-10T06:42:00Z"
    }
  ]
}
```

#### 2. Get Specific Author
**GET** `/api/authors/{id}/`

Gets details of a specific author.

**Response (200 OK):**
Returns the author object.

#### 3. Get Author by FQID
**GET** `/api/authors/{author_fqid}/`

Gets an author by their fully qualified ID (FQID).

#### 4. Update Author (Admin Only)
**PUT/PATCH** `/api/authors/{id}/`

Updates an author's profile (admin only).

**Request Body:**
```json
{
  "displayName": "Updated Name",
  "is_approved": true,
  "github_username": "updated_github"
}
```

#### 5. Create Author (Admin Only)
**POST** `/api/authors/`

Creates a new author (admin only).

#### 6. Author Management Actions (Admin Only)

##### Approve Author
**POST** `/api/authors/{id}/approve/`

Approves an author (admin only).

##### Activate/Deactivate Author
**POST** `/api/authors/{id}/activate/`
**POST** `/api/authors/{id}/deactivate/`

Activates or deactivates an author (admin only).

##### Promote to Admin
**POST** `/api/authors/{id}/promote_to_admin/`

Promotes an author to admin status (admin only).

#### 7. Author Statistics
**GET** `/api/authors/stats/`

Gets author statistics.

**Response (200 OK):**
```json
{
  "total_authors": 100,
  "approved_authors": 85,
  "active_authors": 90,
  "local_authors": 80,
  "remote_authors": 20
}
```

#### 8. Pending Authors (Admin Only)
**GET** `/api/authors/pending/`

Gets authors awaiting approval (admin only).

#### 9. Get Author's Followers
**GET** `/api/authors/{id}/followers/`

Gets all followers of an author.

**Response (200 OK):**
```json
{
  "type": "followers",
  "followers": [
    {
      "id": "follower-uuid",
      "username": "follower1",
      "displayName": "Follower One",
      "profileImage": null
    }
  ]
}
```

#### 10. Get Author's Following
**GET** `/api/authors/{id}/following/`

Gets all authors that this author is following.

**Response (200 OK):**
```json
{
  "type": "following",
  "following": [...]
}
```

#### 11. Get Author's Friends
**GET** `/api/authors/{id}/friends/`

Gets all friends (mutual follows) of an author.

**Response (200 OK):**
```json
{
  "type": "friends",
  "friends": [...]
}
```

#### 12. Follow/Unfollow Author
**POST/DELETE** `/api/authors/{id}/follow/`

Follow or unfollow an author.

**POST Response (201 Created):**
```json
{
  "success": true,
  "follow": {
    "id": "follow-request-uuid",
    "follower": "http://localhost:8000/api/authors/follower-uuid",
    "followed": "http://localhost:8000/api/authors/followed-uuid",
    "status": "pending"
  }
}
```

#### 13. Get Author's Entries
**GET** `/api/authors/{id}/entries/`

Gets entries by a specific author.

**Response (200 OK):**
```json
{
  "type": "entries",
  "page_number": 1,
  "size": 10,
  "count": 10,
  "src": [...]
}
```

#### 14. Create Entry for Author
**POST** `/api/authors/{id}/entries/`

Creates a new entry for the author (author must be current user).

#### 15. Post to Author's Inbox
**POST** `/api/authors/{id}/inbox/`

Posts an item to an author's inbox (ActivityPub compliance).

#### 16. Follow Remote Author
**POST** `/api/authors/follow-remote/`

Follow a remote author by creating/fetching their local record first.

**Request Body:**
```json
{
  "author_id": "uuid-of-remote-author",
  "author_url": "full-url-of-remote-author",
  "node_id": "uuid-of-node"
}
```

### Entry (Post) Endpoints

#### 1. List Entries
**GET** `/api/entries/`

Lists entries visible to the authenticated user.

**Query Parameters:**
- `author`: Filter by author UUID
- `visibility`: Filter by visibility (PUBLIC, UNLISTED, FRIENDS_ONLY)
- `search`: Search in title and content
- `page`: Page number

**Response (200 OK):**
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/entries/?page=2",
  "previous": null,
  "results": [
    {
      "id": "entry-uuid",
      "url": "http://localhost:8000/api/entries/entry-uuid",
      "author": {
        "id": "author-uuid",
        "username": "johndoe",
        "displayName": "John Doe"
      },
      "title": "My First Post",
      "content": "This is the content of my post",
      "content_type": "text/plain",
      "visibility": "PUBLIC",
      "created_at": "2025-01-15T12:00:00Z",
      "updated_at": "2025-01-15T12:00:00Z",
      "likes_count": 5,
      "comments_count": 3,
      "is_liked": false
    }
  ]
}
```

#### 2. Create Entry
**POST** `/api/entries/`

Creates a new entry/post. For image posts, use multipart/form-data to upload images.

**Request Body (JSON for text posts):**
```json
{
  "title": "My New Post",
  "content": "This is the content of my new post",
  "content_type": "text/markdown",
  "visibility": "PUBLIC",
  "categories": ["technology", "programming"]
}
```

**Request Body (multipart/form-data for image posts):**
- `title`: Post title
- `content`: Caption for the image (optional)
- `content_type`: "image/png" or "image/jpeg"
- `visibility`: One of: PUBLIC, UNLISTED, FRIENDS_ONLY
- `categories`: JSON stringified array of category tags
- `image`: The image file to upload

**Required Fields:**
- `title`: Post title
- `content`: Post content (or caption for images)
- `content_type`: One of: text/plain, text/markdown, image/png, image/jpeg
- `visibility`: One of: PUBLIC, UNLISTED, FRIENDS_ONLY

**Note:** Images are stored as binary data (blobs) in the database. The API returns base64-encoded data URLs for images in the `image` field.

**Response (201 Created):**
Returns the created entry object with the `image` field containing a data URL for image posts.

#### 3. Get Specific Entry
**GET** `/api/entries/{id}/`

Gets a specific entry if visible to the user.

#### 4. Get Entry by FQID
**GET** `/api/entries/{entry_fqid}/`

Gets an entry by its fully qualified ID (FQID).

#### 5. Update Entry
**PUT/PATCH** `/api/entries/{id}/`

Updates an entry (author only).

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "visibility": "FRIENDS_ONLY"
}
```

#### 6. Delete Entry
**DELETE** `/api/entries/{id}/`

Soft deletes an entry (sets visibility to "DELETED").

#### 7. Get Liked Entries
**GET** `/api/entries/liked/`

Gets entries that the current user has liked.

**Response (200 OK):**
Returns paginated list of liked entries.

#### 8. Get Friends Feed
**GET** `/api/entries/feed/`

Gets entries from users who are friends (mutual follows) with the current user. This endpoint returns all posts from friends regardless of visibility settings.

**Response (200 OK):**
Returns paginated list of entries from friends.

#### 9. Get Trending Entries
**GET** `/api/entries/trending/`

Gets trending entries based on like count and recent activity.

**Response (200 OK):**
Returns paginated list of trending entries.

#### 10. Get Categories
**GET** `/api/entries/categories/`

Gets all categories used in entries.

**Response (200 OK):**
```json
[
  {
    "name": "technology",
    "count": 25
  },
  {
    "name": "programming",
    "count": 15
  }
]
```

#### 11. Fetch Remote Entry
**GET** `/api/entries/fetch-remote/`

Fetches a remote entry from another node.

**Query Parameters:**
- `url`: The URL of the remote entry to fetch

**Response (200 OK):**
Returns the fetched entry object.

#### 12. Get Local Comments for Remote Entry
**GET** `/api/entries/local-comments-for-remote/`

Gets local comments for a remote entry.

**Query Parameters:**
- `entry_url`: The URL of the remote entry

**Response (200 OK):**
Returns comments for the remote entry.

#### 13. CMPUT 404 Compliant Endpoints

##### Get Entry by Author and Entry ID
**GET** `/api/authors/{author_id}/entries/{entry_id}/`

Gets a specific entry by author and entry ID.

##### Update Entry by Author and Entry ID
**PUT** `/api/authors/{author_id}/entries/{entry_id}/`

Updates an entry by author and entry ID.

##### Delete Entry by Author and Entry ID
**DELETE** `/api/authors/{author_id}/entries/{entry_id}/`

Deletes an entry by author and entry ID.

### Comment Endpoints

#### 1. List Comments
**GET** `/api/entries/{entry_id}/comments/`

Lists all comments for an entry.

**Response (200 OK):**
```json
[
  {
    "id": "comment-uuid",
    "author": {
      "id": "author-uuid",
      "username": "commenter",
      "displayName": "Commenter Name"
    },
    "content": "Great post!",
    "content_type": "text/plain",
    "created_at": "2025-01-15T13:00:00Z",
    "updated_at": "2025-01-15T13:00:00Z"
  }
]
```

#### 2. Create Comment
**POST** `/api/entries/{entry_id}/comments/`

Creates a new comment on an entry.

**Request Body:**
```json
{
  "content": "This is my comment",
  "content_type": "text/plain"
}
```

**Required Fields:**
- `content`: Comment text
- `content_type`: text/plain or text/markdown

**Response (201 Created):**
Returns the created comment object.

#### 3. Get Specific Comment
**GET** `/api/entries/{entry_id}/comments/{comment_id}/`

Gets a specific comment.

#### 4. Update Comment
**PATCH** `/api/entries/{entry_id}/comments/{comment_id}/`

Updates a comment (author only).

#### 5. Delete Comment
**DELETE** `/api/entries/{entry_id}/comments/{comment_id}/`

Deletes a comment (author only).

#### 6. CMPUT 404 Compliant Endpoints

##### Get Comments by Author and Entry
**GET** `/api/authors/{author_id}/entries/{entry_id}/comments/`

Gets comments for a specific entry by author.

##### Get Comment by FQID
**GET** `/api/entries/{entry_fqid}/comments/`

Gets comments for an entry by FQID.

##### Get Author's Comments
**GET** `/api/authors/{author_id}/commented/`

Gets all comments by a specific author.

##### Get Author's Comments by FQID
**GET** `/api/authors/{author_fqid}/commented/`

Gets all comments by a specific author using FQID.

### Like Endpoints

#### Entry Likes

#### 1. Get Entry Like Status
**GET** `/api/entries/{entry_id}/likes/`

Gets like count and current user's like status.

**Response (200 OK):**
```json
{
  "like_count": 10,
  "liked_by_current_user": true
}
```

#### 2. Like Entry
**POST** `/api/entries/{entry_id}/likes/`

Likes an entry.

**Response (201 Created):**
```json
{
  "id": "like-uuid",
  "author": "http://localhost:8000/api/authors/author-uuid",
  "entry": "http://localhost:8000/api/entries/entry-uuid",
  "created_at": "2025-01-15T14:00:00Z"
}
```

#### 3. Unlike Entry
**DELETE** `/api/entries/{entry_id}/likes/`

Unlikes an entry.

**Response (200 OK):**
```json
{
  "detail": "Unliked."
}
```

#### Comment Likes

#### 4. Get Comment Like Status
**GET** `/api/comments/{comment_id}/likes/`

Gets like count and current user's like status for a comment.

**Response (200 OK):**
```json
{
  "like_count": 5,
  "liked_by_current_user": false
}
```

#### 5. Like Comment
**POST** `/api/comments/{comment_id}/likes/`

Likes a comment.

**Response (201 Created):**
```json
{
  "id": "like-uuid",
  "author": "http://localhost:8000/api/authors/author-uuid",
  "comment": "http://localhost:8000/api/comments/comment-uuid",
  "created_at": "2025-01-15T14:00:00Z"
}
```

#### 6. Unlike Comment
**DELETE** `/api/comments/{comment_id}/likes/`

Unlikes a comment.

**Response (200 OK):**
```json
{
  "detail": "Unliked."
}
```

#### 7. CMPUT 404 Compliant Endpoints

##### Get Entry Likes by FQID
**GET** `/api/entries/{entry_fqid}/likes/`

Gets likes for an entry by FQID.

##### Get Author's Liked Entries
**GET** `/api/authors/{author_id}/liked/`

Gets all entries liked by a specific author.

##### Get Author's Liked Entries by FQID
**GET** `/api/authors/{author_fqid}/liked/`

Gets all entries liked by a specific author using FQID.

### Follow Endpoints

#### 1. Send Follow Request
**POST** `/api/follows/`

Sends a follow request to another author.

**Request Body:**
```json
{
  "followed": "http://localhost:8000/api/authors/author-to-follow-uuid"
}
```

**Response (201 Created):**
```json
{
  "message": "Follow request sent successfully"
}
```

#### 2. List Follow Requests
**GET** `/api/follows/`

Lists incoming follow requests for the authenticated user.

**Response (200 OK):**
```json
[
  {
    "type": "follow",
    "summary": "John wants to follow Jane",
    "actor": {
      "id": "follower-uuid",
      "username": "john",
      "displayName": "John Doe"
    },
    "object": {
      "id": "followed-uuid",
      "username": "jane",
      "displayName": "Jane Smith"
    },
    "status": "pending",
    "created_at": "2025-01-15T15:00:00Z"
  }
]
```

#### 3. Get Follow Requests (Paginated)
**GET** `/api/follows/requests/`

Gets pending follow requests for the current user with pagination.

**Response (200 OK):**
```json
[
  {
    "type": "follow",
    "summary": "John wants to follow Jane",
    "actor": {...},
    "object": {...},
    "status": "pending"
  }
]
```

#### 4. Accept Follow Request
**POST** `/api/follows/{id}/accept/`

Accepts a follow request.

**Response (200 OK):**
```json
{
  "message": "Follow request accepted"
}
```

#### 5. Reject Follow Request
**POST** `/api/follows/{id}/reject/`

Rejects a follow request.

**Response (200 OK):**
```json
{
  "message": "Follow request rejected"
}
```

#### 6. Unfollow
**DELETE** `/api/follows/{id}/`

Unfollows an author (deletes the follow relationship).

**Response (200 OK):**
```json
{
  "message": "Follow relationship deleted"
}
```

#### 7. Check Follow Status
**GET** `/api/follows/status/`

Checks follow status between two authors.

**Query Parameters:**
- `follower_url`: Follower's author URL
- `followed_url`: Followed author's URL

**Response (200 OK):**
```json
{
  "follower": "http://localhost:8000/api/authors/follower-uuid",
  "followed": "http://localhost:8000/api/authors/followed-uuid",
  "status": "accepted"
}
```

### Inbox Endpoints

The inbox system has been refactored to store activities directly as JSON data instead of foreign key references. This improves federation compatibility and simplifies the data model.

#### 1. List Inbox Items
**GET** `/api/inbox/`

Lists inbox items for the authenticated user.

**Query Parameters:**
- `activity_type`: Filter by type (entry, follow, like, comment)
- `is_read`: Filter by read status (true/false)
- `page`: Page number
- `page_size`: Items per page (max 100)

**Response (200 OK):**
```json
{
  "results": [
    {
      "id": "inbox-item-uuid",
      "activity_type": "follow",
      "is_read": false,
      "delivered_at": "2025-01-15T16:00:00Z",
      "object_data": {
        "id": "follow-uuid",
        "follower": {
          "id": "follower-uuid",
          "username": "newfollower",
          "displayName": "New Follower"
        },
        "status": "pending"
      }
    }
  ],
  "count": 25,
  "page": 1,
  "page_size": 20,
  "has_next": true,
  "has_previous": false
}
```

#### 2. Get Specific Inbox Item
**GET** `/api/inbox/{id}/`

Gets a specific inbox item.

#### 3. Mark Items as Read
**POST** `/api/inbox/mark-read/`

Marks multiple inbox items as read.

**Request Body:**
```json
{
  "ids": ["inbox-item-uuid-1", "inbox-item-uuid-2"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "updated": 2
}
```

#### 4. Mark Single Item as Read
**POST** `/api/inbox/{id}/read/`

Marks a single inbox item as read.

#### 5. Get Inbox Stats
**GET** `/api/inbox/stats/`

Gets inbox statistics.

**Response (200 OK):**
```json
{
  "unread_count": 5,
  "pending_follows": 2,
  "total_items": 50
}
```

#### 6. Get Unread Count
**GET** `/api/inbox/unread-count/`

Gets count of unread notifications.

**Response (200 OK):**
```json
{
  "unread_count": 5
}
```

#### 7. Accept Follow from Inbox
**POST** `/api/inbox/{id}/accept-follow/`

Accepts a follow request directly from inbox.

**Response (200 OK):**
```json
{
  "message": "Follow request accepted"
}
```

#### 8. Reject Follow from Inbox
**POST** `/api/inbox/{id}/reject-follow/`

Rejects a follow request directly from inbox.

**Response (200 OK):**
```json
{
  "message": "Follow request rejected"
}
```

#### 9. Clear Inbox
**POST** `/api/inbox/clear/`

Clears all inbox items for the user.

**Response (200 OK):**
```json
{
  "success": true,
  "deleted": 25
}
```

### Image Upload Endpoints

#### 1. Upload Image
**POST** `/api/upload-image/`

Uploads an image file.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData with 'image' field

**Example using FormData:**
```javascript
const formData = new FormData();
formData.append('image', file);
```

**Response (201 Created):**
```json
{
  "id": "image-uuid",
  "url": "http://localhost:8000/media/images/2025/01/15/image.jpg",
  "uploaded_at": "2025-01-15T17:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file type or size

#### 2. Upload Entry Image
**POST** `/api/authors/{author_id}/entries/{entry_id}/image/`

Uploads an image for a specific entry.

#### 3. Upload Entry Image by FQID
**POST** `/api/entries/{entry_fqid}/image/`

Uploads an image for an entry using FQID.

### GitHub Integration Endpoints

#### 1. Validate GitHub Username
**GET** `/api/github/validate/{username}/`

Validates if a GitHub username exists and fetches basic user information.

**Parameters:**
- `username`: GitHub username to validate

**Response (200 OK):**
```json
{
  "valid": true,
  "username": "johndoe",
  "name": "John Doe",
  "avatar_url": "https://avatars.githubusercontent.com/u/123456?v=4",
  "bio": "Software Developer",
  "public_repos": 25,
  "followers": 100,
  "following": 50,
  "created_at": "2020-01-15T10:00:00Z",
  "html_url": "https://github.com/johndoe"
}
```

**Response (404 Not Found):**
```json
{
  "valid": false,
  "error": "User not found"
}
```

#### 2. Get GitHub Activity
**GET** `/api/github/activity/{username}/`

Fetches GitHub activity data for a user including recent commits, pull requests, and issues.

**Parameters:**
- `username`: GitHub username

**Response (200 OK):**
```json
{
  "username": "johndoe",
  "activities": [
    {
      "id": "abc1234",
      "type": "commit",
      "title": "Fix bug in authentication",
      "repo": "johndoe/awesome-project",
      "date": "2025-01-15T10:00:00Z",
      "url": "https://github.com/johndoe/awesome-project/commit/abc1234"
    },
    {
      "id": "pr456",
      "type": "pull_request",
      "title": "Add new feature",
      "repo": "johndoe/another-project",
      "date": "2025-01-14T15:30:00Z",
      "url": "https://github.com/johndoe/another-project/pull/456"
    }
  ],
  "contributions": {
    "total": 15,
    "message": "Detailed contribution graph requires GitHub GraphQL API"
  }
}
```

**Notes:**
- These endpoints are cached to reduce GitHub API calls
- Rate limiting is handled automatically
- Authentication is optional (public endpoint)

### Node Management Endpoints

#### 1. Get All Nodes
**GET** `/api/nodes/`

Gets a list of all nodes with their authentication status.

**Response (200 OK):**
```json
{
  "nodes": [
    {
      "id": "node-uuid",
      "name": "Node A",
      "host": "http://nodea.com/api/",
      "username": "nodea_user",
      "is_authenticated": true,
      "is_active": true
    }
  ]
}
```

#### 2. Add Node
**POST** `/api/nodes/add/`

Adds a new node to the system.

**Request Body:**
```json
{
  "name": "New Node",
  "host": "http://newnode.com/api/",
  "username": "newnode_user",
  "password": "newnode_password",
  "isAuth": true
}
```

#### 3. Update Node
**POST** `/api/nodes/update/`

Updates an existing node's information.

**Request Body:**
```json
{
  "id": "node-uuid",
  "name": "Updated Node",
  "host": "http://updatednode.com/api/",
  "username": "updated_user",
  "password": "updated_password",
  "isAuth": true
}
```

#### 4. Delete Node
**POST** `/api/nodes/remove/`

Removes a node from the system.

**Request Body:**
```json
{
  "id": "node-uuid"
}
```

#### 5. Get Remote Followees
**GET** `/api/remote/followee/{local_serial}/{remote_fqid}/`

Gets remote followee information for federation.

#### 6. Get Remote Authors
**GET** `/api/remote/authors/`

Gets recommended remote authors from connected nodes.

**Response (200 OK):**
```json
{
  "recommended_authors": [
    {
      "id": "remote-author-uuid",
      "username": "remote_user",
      "displayName": "Remote User",
      "host": "http://remotenode.com/api/"
    }
  ]
}
```

## CORS Configuration

The API is configured to accept requests from specific origins:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite development server
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
```

## Database Schema

### Core Models

#### Author (User)
- Extends Django's AbstractUser
- Fields: id (UUID), url, username, displayName, profileImage, github_username, is_approved, is_active, type, host, web, node (ForeignKey to Node)
- Relationships: entries, comments, likes, followers, following
- Supports both local and remote authors for federation

#### Entry (Post)
- Fields: id (UUID), url, fqid, title, description, content, content_type, categories (JSONField), visibility, source, origin, type, web, published, image_data (BinaryField), created_at, updated_at
- Relationships: author, comments, likes
- Supports multiple content types: text/plain, text/markdown, image/png, image/jpeg
- Visibility levels: PUBLIC, UNLISTED, FRIENDS_ONLY, DELETED

#### Comment
- Fields: id (UUID), url, content, content_type, created_at, updated_at
- Relationships: author, entry
- Supports text/plain and text/markdown content types

#### Like
- Fields: id (UUID), created_at
- Relationships: author, entry, comment
- Generic relationship to both entries and comments

#### Follow
- Fields: id (UUID), status (pending/accepted/rejected), created_at, updated_at
- Relationships: follower (Author), followed (Author)
- Supports follow request workflow

#### Inbox (Refactored)
- Fields: id (UUID), activity_type, object_data (JSONField), is_read, delivered_at, raw_data (JSONField)
- Relationships: recipient (Author)
- Stores activities directly as JSON instead of foreign key references
- Activity types: entry, follow, like, comment

#### Friendship
- Represents mutual follow relationships
- Fields: id, created_at
- Relationships: author1, author2
- Automatically maintained by signals

#### Node
- Represents remote federated instances
- Fields: id (UUID), name, host, username, password, is_active
- Used for federation and remote author management

#### InboxDelivery
- Tracks delivery of entries to author inboxes for federation
- Fields: entry, recipient, delivered_at, success
- Helps prevent duplicate deliveries and provides audit trail

## API Versioning

Currently, the API does not implement versioning. All endpoints are served under the `/api/` prefix. Future versions may implement versioning strategies such as:
- URL versioning: `/api/v1/`, `/api/v2/`
- Header versioning: `Accept: application/vnd.api+json;version=1`

## Rate Limiting

Currently, no rate limiting is implemented. For production deployment, consider implementing:
- Django-ratelimit for view-level rate limiting
- Redis-based rate limiting for distributed systems
- Nginx-level rate limiting

## Testing the API

### Using Django REST Framework Browsable API
Navigate to any API endpoint in a browser while authenticated to use the interactive API interface:
```
http://localhost:8000/api/authors/
http://localhost:8000/api/entries/
```

### Using cURL
```bash
# Get auth status
curl -X GET http://localhost:8000/api/auth/status/ \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}' \
  --cookie-jar cookies.txt

# Create a post (with CSRF token)
curl -X POST http://localhost:8000/api/entries/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <csrf-token>" \
  -d '{"title": "Test Post", "content": "Test content", "content_type": "text/plain", "visibility": "PUBLIC"}' \
  --cookie cookies.txt
```

### Using Python Requests
```python
import requests

# Create session
session = requests.Session()

# Login
response = session.post('http://localhost:8000/api/auth/login/', json={
    'username': 'testuser',
    'password': 'testpass123'
})

# Get CSRF token
csrf_token = session.cookies.get('csrftoken')

# Create post
response = session.post('http://localhost:8000/api/entries/', 
    headers={'X-CSRFToken': csrf_token},
    json={
        'title': 'Test Post',
        'content': 'Test content',
        'content_type': 'text/plain',
        'visibility': 'PUBLIC'
    }
)
```

## Deployment Considerations

### Environment Variables
Set these in production:
- `SECRET_KEY`: Django secret key
- `DEBUG`: Set to False
- `ALLOWED_HOSTS`: Your domain names
- `DATABASE_URL`: PostgreSQL connection string
- `SITE_URL`: Your production URL
- `GITHUB_API_TOKEN`: GitHub API token for higher rate limits (optional)
- `AUTO_APPROVE_NEW_USERS`: Whether to auto-approve new user registrations

### Static and Media Files
- Configure cloud storage (AWS S3, Google Cloud Storage)
- Set up CDN for static file delivery
- Configure `MEDIA_URL` and `MEDIA_ROOT`

### Security Checklist
- [ ] Disable DEBUG mode
- [ ] Set strong SECRET_KEY
- [ ] Configure ALLOWED_HOSTS
- [ ] Enable HTTPS
- [ ] Set secure cookie settings
- [ ] Configure CORS properly
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Implement proper user permissions

### Performance Optimization
- Enable database query optimization
- Implement caching (Redis)
- Use database indexes effectively
- Enable gzip compression
- Optimize image uploads and storage
- Consider implementing GraphQL for complex queries

### Monitoring
- Set up error tracking (Sentry)
- Configure application performance monitoring
- Set up uptime monitoring
- Configure log aggregation

### Federation Considerations
- Configure node management for remote instances
- Set up proper authentication for cross-instance communication
- Implement ActivityPub compliance for interoperability
- Monitor federation performance and reliability 