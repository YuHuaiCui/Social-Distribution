# Backend API Documentation

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
9. [CORS Configuration](#cors-configuration)
10. [Database Schema](#database-schema)
11. [API Versioning](#api-versioning)
12. [Rate Limiting](#rate-limiting)
13. [Testing the API](#testing-the-api)
14. [Deployment Considerations](#deployment-considerations)

## API Overview

The Social Distribution Backend API is a RESTful API built with Django and Django REST Framework. It provides endpoints for a social media platform that supports user authentication, posting content, following users, commenting, liking posts, and managing notifications through an inbox system.

### Key Features
- Session-based authentication with CSRF protection
- RESTful resource endpoints
- JSON request/response format
- Pagination support for list endpoints
- Comprehensive error handling
- CORS support for frontend integration
- Image upload capabilities
- Real-time notifications via inbox system

## Tech Stack

- **Framework**: Django 5.2.1
- **API Framework**: Django REST Framework
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: Django built-in authentication with session management
- **File Storage**: Local file storage (development), Cloud storage (production)
- **Python Version**: 3.8+

### Key Dependencies
```
Django==5.2.1
djangorestframework==3.14.0
django-cors-headers==4.3.1
django-allauth==0.57.0
Pillow==10.2.0
python-dotenv==1.0.0
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

1. **Login**
   ```
   POST /api/auth/login/
   ```
   Creates a session and returns user data

2. **Check Authentication Status**
   ```
   GET /api/auth/status/
   ```
   Returns current authentication status and user info

3. **Logout**
   ```
   POST /accounts/logout/
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

Creates a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123",
  "display_name": "John Doe",
  "github_username": "johndoe",
  "bio": "Software developer",
  "location": "San Francisco, CA",
  "website": "https://johndoe.com"
}
```

**Required Fields:**
- `username`: Unique username
- `email`: Valid email address
- `password`: Password (must meet validation requirements)
- `display_name`: Display name for the user

**Response (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "http://localhost:8000/api/authors/550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "email": "john@example.com",
    "display_name": "John Doe",
    "github_username": "johndoe",
    "profile_image": null,
    "bio": "Software developer",
    "location": "San Francisco, CA",
    "website": "https://johndoe.com",
    "is_approved": true,
    "is_active": true,
    "created_at": "2025-01-15T12:00:00Z"
  },
  "message": "Account created successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Username/email already exists, password validation failed

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
    "email": "john@example.com",
    "display_name": "John Doe",
    "profile_image": null,
    "is_approved": true,
    "is_active": true
  },
  "message": "Login successful"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials

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
    "email": "john@example.com",
    "display_name": "John Doe"
  }
}
```

#### 4. Logout
**POST** `/accounts/logout/`

Logs out the current user.

**Response (200 OK):**
```json
{
  "success": true
}
```

#### 5. Get/Update Current User
**GET/PATCH** `/api/author/me/`

Gets or updates the current authenticated user's profile.

**PATCH Request Body:**
```json
{
  "display_name": "John Updated",
  "bio": "Updated bio",
  "profile_image": "http://example.com/image.jpg"
}
```

**Response (200 OK):**
Returns the updated user object.

### Author Endpoints

#### 1. List Authors
**GET** `/api/authors/`

Lists all authors with pagination and filtering.

**Query Parameters:**
- `is_approved`: Filter by approval status (true/false)
- `is_active`: Filter by active status (true/false)
- `type`: Filter by author type (local/remote)
- `search`: Search by username, display_name, or email
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
      "email": "john@example.com",
      "display_name": "John Doe",
      "github_username": "johndoe",
      "profile_image": "",
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

#### 3. Update Author (Admin Only)
**PUT/PATCH** `/api/authors/{id}/`

Updates an author's profile (admin only).

**Request Body:**
```json
{
  "display_name": "Updated Name",
  "is_approved": true,
  "bio": "Updated bio"
}
```

#### 4. Get Author's Followers
**GET** `/api/authors/{id}/followers/`

Gets all followers of an author.

**Response (200 OK):**
```json
[
  {
    "id": "follower-uuid",
    "username": "follower1",
    "display_name": "Follower One",
    "profile_image": null
  }
]
```

#### 5. Get Author's Following
**GET** `/api/authors/{id}/following/`

Gets all authors that this author is following.

#### 6. Get Author's Friends
**GET** `/api/authors/{id}/friends/`

Gets all friends (mutual follows) of an author.

#### 7. Follow/Unfollow Author
**POST/DELETE** `/api/authors/{id}/follow/`

Follow or unfollow an author.

**POST Response (201 Created):**
```json
{
  "id": "follow-request-uuid",
  "follower": "http://localhost:8000/api/authors/follower-uuid",
  "followed": "http://localhost:8000/api/authors/followed-uuid",
  "status": "pending"
}
```

### Entry (Post) Endpoints

#### 1. List Entries
**GET** `/api/entries/`

Lists entries visible to the authenticated user.

**Query Parameters:**
- `author`: Filter by author UUID
- `visibility`: Filter by visibility (public, unlisted, friends)
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
        "display_name": "John Doe"
      },
      "title": "My First Post",
      "content": "This is the content of my post",
      "content_type": "text/plain",
      "visibility": "public",
      "created_at": "2025-01-15T12:00:00Z",
      "updated_at": "2025-01-15T12:00:00Z",
      "like_count": 5,
      "comment_count": 3,
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
  "visibility": "public",
  "categories": ["technology", "programming"]
}
```

**Request Body (multipart/form-data for image posts):**
- `title`: Post title
- `content`: Caption for the image (optional)
- `content_type`: "image/png" or "image/jpeg"
- `visibility`: One of: public, unlisted, friends
- `categories`: JSON stringified array of category tags
- `image`: The image file to upload

**Required Fields:**
- `title`: Post title
- `content`: Post content (or caption for images)
- `content_type`: One of: text/plain, text/markdown, image/png, image/jpeg
- `visibility`: One of: public, unlisted, friends

**Note:** Images are stored as binary data (blobs) in the database. The API returns base64-encoded data URLs for images in the `image` field.

**Response (201 Created):**
Returns the created entry object with the `image` field containing a data URL for image posts.

#### 3. Get Specific Entry
**GET** `/api/entries/{id}/`

Gets a specific entry if visible to the user.

#### 4. Update Entry
**PUT/PATCH** `/api/entries/{id}/`

Updates an entry (author only).

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "visibility": "friends"
}
```

#### 5. Delete Entry
**DELETE** `/api/entries/{id}/`

Soft deletes an entry (sets visibility to "deleted").

#### 6. Get Liked Entries
**GET** `/api/entries/liked/`

Gets entries that the current user has liked.

**Response (200 OK):**
Returns paginated list of liked entries.

#### 7. Get Friends Feed
**GET** `/api/entries/feed/`

Gets entries from users who are friends (mutual follows) with the current user. This endpoint returns all posts from friends regardless of visibility settings.

**Response (200 OK):**
Returns paginated list of entries from friends.

#### 8. Get Saved Entries
**GET** `/api/entries/saved/`

Gets the current user's saved/bookmarked entries.

#### 9. Save/Unsave Entry
**POST/DELETE** `/api/entries/{id}/save/`

Save or unsave an entry.

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
      "display_name": "Commenter Name"
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

#### 3. Update Comment
**PATCH** `/api/entries/{entry_id}/comments/{comment_id}/`

Updates a comment (author only).

#### 4. Delete Comment
**DELETE** `/api/entries/{entry_id}/comments/{comment_id}/`

Deletes a comment (author only).

### Like Endpoints

#### 1. Get Like Status
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
  "id": "follow-uuid",
  "follower": "http://localhost:8000/api/authors/follower-uuid",
  "followed": "http://localhost:8000/api/authors/followed-uuid",
  "status": "pending",
  "created_at": "2025-01-15T15:00:00Z"
}
```

#### 2. List Follow Requests
**GET** `/api/follows/`

Lists incoming follow requests for the authenticated user.

**Response (200 OK):**
```json
[
  {
    "id": "follow-uuid",
    "follower": {
      "id": "follower-uuid",
      "username": "follower",
      "display_name": "Follower Name"
    },
    "status": "pending",
    "created_at": "2025-01-15T15:00:00Z"
  }
]
```

#### 3. Accept Follow Request
**POST** `/api/follows/{id}/accept/`

Accepts a follow request.

**Response (200 OK):**
```json
{
  "status": "accepted"
}
```

#### 4. Reject Follow Request
**POST** `/api/follows/{id}/reject/`

Rejects a follow request.

**Response (200 OK):**
```json
{
  "status": "rejected"
}
```

#### 5. Unfollow
**DELETE** `/api/follows/{id}/`

Unfollows an author (deletes the follow relationship).

#### 6. Check Follow Status
**GET** `/api/follows/status/`

Checks follow status between two authors.

**Query Parameters:**
- `follower`: Follower's author URL
- `followed`: Followed author's URL

**Response (200 OK):**
```json
{
  "is_following": true,
  "is_followed_by": false,
  "is_friends": false,
  "follow_status": "accepted"
}
```

### Inbox Endpoints

#### 1. List Inbox Items
**GET** `/api/inbox/`

Lists inbox items for the authenticated user.

**Query Parameters:**
- `content_type`: Filter by type (follow, like, comment, entry)
- `read`: Filter by read status (true/false)
- `page`: Page number
- `page_size`: Items per page (max 100)

**Response (200 OK):**
```json
{
  "results": [
    {
      "id": "inbox-item-uuid",
      "item_type": "follow",
      "is_read": false,
      "created_at": "2025-01-15T16:00:00Z",
      "follow": {
        "id": "follow-uuid",
        "follower": {
          "id": "follower-uuid",
          "username": "newfollower",
          "display_name": "New Follower"
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

#### 2. Mark Items as Read
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

#### 3. Mark Single Item as Read
**POST** `/api/inbox/{id}/read/`

Marks a single inbox item as read.

#### 4. Get Inbox Stats
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

#### 5. Get Unread Count
**GET** `/api/inbox/unread-count/`

Gets count of unread notifications.

**Response (200 OK):**
```json
{
  "count": 5
}
```

#### 6. Accept Follow from Inbox
**POST** `/api/inbox/{id}/accept-follow/`

Accepts a follow request directly from inbox.

#### 7. Reject Follow from Inbox
**POST** `/api/inbox/{id}/reject-follow/`

Rejects a follow request directly from inbox.

#### 8. Clear Inbox
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
- Fields: id (UUID), username, email, display_name, profile_image, bio, github_username, location, website, is_approved, is_active
- Relationships: entries, comments, likes, followers, following

#### Entry (Post)
- Fields: id (UUID), url, title, content, content_type, visibility, created_at, updated_at
- Relationships: author, comments, likes

#### Comment
- Fields: id (UUID), content, content_type, created_at, updated_at
- Relationships: author, entry

#### Like
- Fields: id (UUID), created_at
- Relationships: author, entry

#### Follow
- Fields: id (UUID), status (pending/accepted/rejected), created_at
- Relationships: follower (Author), followed (Author)

#### Inbox
- Fields: id (UUID), item_type, is_read, created_at, raw_data
- Relationships: recipient (Author), follow, like, comment, entry

#### Friendship
- Represents mutual follow relationships
- Fields: id, created_at
- Relationships: author1, author2

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
  -d '{"title": "Test Post", "content": "Test content", "content_type": "text/plain", "visibility": "public"}' \
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
        'visibility': 'public'
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