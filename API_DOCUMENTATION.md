# Authors API Documentation

## Overview
The `/api/authors/` endpoint provides CRUD operations for managing author users in the social distribution network.

## Base URL
```
http://localhost:8000/api/authors/
```

## Authentication
- **Read operations (GET)**: Requires authentication (any logged-in user)
- **Write operations (POST, PUT, PATCH, DELETE)**: Requires admin privileges (`is_staff=True`)
- **Password Requirement**: All users MUST authenticate using passwords.
## Endpoints

### 1. List Authors
**GET** `/api/authors/`

Lists all authors with pagination.

**Query Parameters:**
- `is_approved` - Filter by approval status (`true`/`false`)
- `is_active` - Filter by active status (`true`/`false`)
- `type` - Filter by author type (`local`/`remote`)
- `search` - Search by username, display_name, or email

**Example:**
```bash
curl -X GET "http://localhost:8000/api/authors/?is_approved=true" \
  -u admin:password
```

**Response:**
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "uuid-here",
      "url": "http://localhost:8000/api/authors/uuid-here",
      "username": "testuser",
      "email": "test@example.com",
      "display_name": "Test User",
      "github_username": "testuser",
      "profile_image": "",
      "is_approved": true,
      "is_active": true,
      "created_at": "2025-01-10T06:42:00Z"
    }
  ]
}
```

### 2. Create Author (Admin Only)
**POST** `/api/authors/`

Creates a new author user.

**Required Fields:**
- `username` - Unique username
- `email` - Email address
- `password` - Password
- `password_confirm` - Password confirmation (must match exactly)

**Optional Fields:**
- `first_name` - First name
- `last_name` - Last name
- `display_name` - Display name
- `github_username` - GitHub username
- `profile_image` - Profile image URL
- `bio` - Biography
- `is_approved` - Approval status (default: false)
- `is_active` - Active status (default: true)
- `is_staff` - Staff status (default: false)
- `is_superuser` - Superuser status (default: false)

**Example:**
```bash
curl -X POST "http://localhost:8000/api/authors/" \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "securepassword123",
    "password_confirm": "securepassword123",
    "display_name": "New User",
    "is_approved": true
  }'
```

**Response:**
```json
{
  "message": "Author created successfully",
  "author": {
    "id": "new-uuid-here",
    "url": "http://localhost:8000/api/authors/new-uuid-here",
    "username": "newuser",
    "email": "newuser@example.com",
    "display_name": "New User",
    "is_approved": true,
    "is_active": true,
    "created_at": "2025-01-10T06:45:00Z"
  }
}
```

### 3. Get Specific Author
**GET** `/api/authors/{id}/`

Retrieves details of a specific author.

**Example:**
```bash
curl -X GET "http://localhost:8000/api/authors/uuid-here/" \
  -u admin:password
```

### 4. Update Author (Admin Only)
**PUT/PATCH** `/api/authors/{id}/`

Updates an existing author.

**Example:**
```bash
curl -X PATCH "http://localhost:8000/api/authors/uuid-here/" \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Updated Name",
    "is_approved": true
  }'
```

### 5. Delete Author (Admin Only)
**DELETE** `/api/authors/{id}/`

Deletes an author.

**Example:**
```bash
curl -X DELETE "http://localhost:8000/api/authors/uuid-here/" \
  -u admin:password
```

## Custom Actions

### Approve Author
**POST** `/api/authors/{id}/approve/`

Approves an author (sets `is_approved=True`).

**Example:**
```bash
curl -X POST "http://localhost:8000/api/authors/uuid-here/approve/" \
  -u admin:password
```

### Activate/Deactivate Author
**POST** `/api/authors/{id}/activate/`
**POST** `/api/authors/{id}/deactivate/`

Activates or deactivates an author.

**Example:**
```bash
curl -X POST "http://localhost:8000/api/authors/uuid-here/deactivate/" \
  -u admin:password
```

### Author Statistics
**GET** `/api/authors/stats/`

Gets statistics about authors.

**Example:**
```bash
curl -X GET "http://localhost:8000/api/authors/stats/" \
  -u admin:password
```

**Response:**
```json
{
  "total_authors": 5,
  "approved_authors": 3,
  "active_authors": 4,
  "local_authors": 4,
  "remote_authors": 1
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 400 Bad Request
```json
{
  "username": ["This field is required."],
  "password_confirm": ["Password fields must match."]
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

## Django Admin Interface

The Author model is also available in the Django admin interface at:
```
http://localhost:8000/admin/
```

Admin features include:
- Bulk approve authors
- Bulk deactivate authors
- Search and filter capabilities
- Detailed view of all author fields

Or use the Django REST Framework browsable API:
```
http://localhost:8000/api/authors/

``` 
# Entries API Documentation

## Overview
The /api/entries/ endpoint provides CRUD operations for managing entries (posts) in the social distribution network.
Each entry represents a post authored by a local user. Entries can have different visibility levels (*public*, *friends*, *unlisted*, *private*, *deleted*) and support markdown-formatted content, media attachments, likes, and comments.

### Base URL
http://localhost:8000/api/entries/

## Authentication

- **Read operations (GET)**: Requires authentication (any logged-in user)
- **Write operations (POST, PATCH, PUT, DELETE)**: Only the author of the entry can modify/delete
- **Admin Access**: Staff can view and modify all entries

## Supported Visibility Types
| Value      | Description                                   | Who can view                           |
| ---------- | --------------------------------------------- | -------------------------------------- |
| `public`   | Visible to everyone                           | All authenticated users                |
| `friends`  | Visible to friends of the author              | Only friends of the author             |
| `unlisted` | Only visible via direct URL                   | Anyone with the link                   |
| `private`  | Only the author and node admins can view      | Restricted access                      |
| `deleted`  | Soft-deleted entry, not shown in API/UI lists | Only visible to node admins internally |

## Pagination 
- All list endpoints are paginated.

## Entry Fields (Request & Response)
| Field          | Type     | Example                        | Purpose                                                        |
| -------------- | -------- | ------------------------------ | -------------------------------------------------------------- |
| `id`           | UUID     | `"6fa1f72a-8b3e-4a7c-a892..."` | Unique ID of the entry                                         |
| `title`        | string   | `"My First Post"`              | Title of the entry                                             |
| `content`      | string   | `"Hello, **world**!"`          | Body text, supports Markdown                                   |
| `content_type` | string   | `"text/markdown"`              | Type of content. (`text/plain` also supported)                 |
| `visibility`   | string   | `"public"`                     | Access level for the entry                                     |
| `unlisted`     | boolean  | `false`                        | If true, the post is not shown in feeds but accessible via URL |
| `image`        | file/url | `"http://.../images/cat.png"`  | Optional image URL or upload                                   |
| `created_at`   | datetime | `"2025-06-17T10:00:00Z"`       | Timestamp of creation                                          |
| `author`       | UUID/url | `"http://.../authors/{uuid}"`  | The author of the post                                         |

## Endpoints

### 1. List Entries 
**GET** /api/entries/
Lists entries visible to the authenticated user. Supports pagination and optional filters.

**When:**
Used to view entries you have access to: your own, friends-only, or public.
**Why**
Returns only visible entries. Deleted, private, and friend-only posts are filtered based on permissions.

**Query Parameters**:
*author* - Filter entries by author ID
*visibility* - Filter by visibility (public, friends)
*search* - Search by content or title

**Example:**

curl -X GET "http://localhost:8000/api/entries/?visibility=public" \
  -u testuser:testpass123
**Response**
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "entry-uuid",
      "title": "My Entry",
      "content": "This is a test post.",
      "visibility": "public",
      "content_type": "text/plain",
      "author": {
        "username": "testuser",
        "url": "http://localhost:8000/api/authors/author-uuid/"
      },
      "url": "http://localhost:8000/api/authors/author-uuid/entries/entry-uuid/",
      "created_at": "2025-06-17T06:33:54Z",
      "updated_at": "2025-06-17T06:48:52Z"
    }
  ]
}

### 2. Create Entry

**POST** /api/entries/{id}/
Retrieves a specific entry if it is public or belongs to the authenticated user.

**When:**
When a user wants to publish a new blog-style post.
**Why:**
Adds the entry to your author's timeline and makes it visible depending on the visibility setting.

**Example:**
curl -X POST http://localhost:8000/api/entries/ \
  -u testuser:testpass123 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Entry",
    "content": "Markdown **test**",
    "visibility": "public"
  }'

**Response**
{
  "id": "b7cb86de-e0fe-4fc0-a012-...",
  "title": "My Entry",
  "visibility": "public",
  "created_at": "2025-06-17T13:00:00Z",
  "author": "http://localhost:8000/api/authors/..."
}


### 3. Retrieve Entry
**GET** /api/entries/{id}/
Retrieves a specific entry if it is public or belongs to the authenticated user.

**When:**
To load a full view of a single post, such as when viewing its detail page.
**Why:**
Entry must be public, friends, unlisted, or owned by the requester.

**Example:**
curl -X GET "http://localhost:8000/api/entries/{entry_id}/" \
 -u testuser:testpass123

### 4. Update Entry
**PATCH** /api/entries/{id}/
Updates an existing entry (partial or full update). Only the author can update their own entries.

**When:**
Used by the entry’s owner to make changes.
**Why:**
Allows authors to modify their post title, content, visibility, or other metadata.

**Example:**
curl -X PATCH "http://localhost:8000/api/entries/{entry_id}/" \
  -u testuser:testpass123 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title"
  }'

### 5. Delete Entry (Soft Delete)
**PATCH** /api/entries/{id}/
Marks an entry as deleted by setting its visibility to "deleted". The entry remains in the database but is hidden from lists and public view.

**When:**
Authors want to delete a post but retain it in the system for audit/history.
**Why:**
Prevents permanent deletion.
Entry is hidden from feeds but retained in DB for admin access.

**Example:**
curl -X PATCH "http://localhost:8000/api/entries/uuid-here/" \
  -u testuser:testpass123 \
  -H "Content-Type: application/json" \
  -d '{"visibility": "deleted"}'

**Response**
{
  "id": "uuid-here",
  "title": "My Post",
  "visibility": "deleted"
}

### 6.Like an Entry
**POST** /api/entries/{entry_id}/likes/
Adds a like to an entry by the authenticated user

**When:**
A user likes an entry to show support.

**Example:**
curl -X POST "http://localhost:8000/api/entries/entry-uuid/likes/" \
  -u testuser:testpass123

**Response**
{
  "id": "like-uuid",
  "author": "http://localhost:8000/api/authors/testuser/",
  "entry": "http://localhost:8000/api/entries/entry-uuid/",
  "created_at": "2025-06-18T21:30:00Z"
}

### 7.Unlike an Entry
**DELETE** /api/entries/{entry_id}/likes/
Removes the user’s like.

**When:**
A user wants to remove their like from a post.

**Example:**
curl -X DELETE "http://localhost:8000/api/entries/entry-uuid/likes/" \
  -u testuser:testpass123

**Response**
204 No Content – Successfully unliked

## Error Responses

### 401 Unauthorized
{
  "detail": "Authentication credentials were not provided."
}

### 403 Forbidden
{
  "detail": "You do not have permission to perform this action."
}

### 404 Not Found
{
  "detail": "No Entry matches the given query."
}

### 400 Bad Request
{
  "title": "This field may not be blank."
}

### 405 Bad Request
{
  "title: : "Method not allowed on this endpoint"
}

















