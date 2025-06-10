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