# Frontend Service and Type Migration Guide

This guide helps you migrate from the old single-file structure to the new modular structure.

## Overview

We've restructured the frontend services and types to be more modular and scalable:

- **Old**: Single `api.ts` file with all API methods
- **New**: Separate service files for each domain (auth, author, entry, social, inbox)

- **Old**: Single `models.ts` file with all types
- **New**: Organized type files by domain in subdirectories

## Type Imports Migration

### Before:
```typescript
import { Author, Entry, Comment } from '../types/models';
```

### After:
```typescript
// Option 1: Import from main types index
import { Author, Entry, Comment } from '../types';

// Option 2: Import from specific type files (recommended)
import { Author } from '../types/author';
import { Entry, Comment } from '../types/entry';
```

## Service Imports Migration

### Before:
```typescript
import { api } from '../services/api';

// Usage
const authors = await api.getAuthors();
const user = await api.login(credentials);
```

### After:
```typescript
// Option 1: Import individual services (recommended)
import { authorService, authService } from '../services';

// Usage
const authors = await authorService.getAuthors();
const user = await authService.login(credentials);

// Option 2: Import specific service classes
import { AuthorService } from '../services/author';
import { AuthService } from '../services/auth';

// Create custom instances if needed
const authorApi = new AuthorService('https://custom-api.com');
const authApi = new AuthService();
```

## Service Method Mapping

### Authentication
- `api.login()` → `authService.login()`
- `api.logout()` → `authService.logout()`
- `api.signup()` → `authService.signup()`
- `api.getAuthStatus()` → `authService.getAuthStatus()`

### Authors
- `api.getAuthors()` → `authorService.getAuthors()`
- `api.getAuthor()` → `authorService.getAuthor()`
- `api.getCurrentAuthor()` → `authorService.getCurrentAuthor()`
- `api.updateCurrentAuthor()` → `authorService.updateCurrentAuthor()`
- `api.uploadProfileImage()` → `authorService.uploadProfileImage()`

### Entries (Posts)
- `api.getEntries()` → `entryService.getEntries()`
- `api.getEntry()` → `entryService.getEntry()`
- `api.createEntry()` → `entryService.createEntry()`
- `api.updateEntry()` → `entryService.updateEntry()`
- `api.deleteEntry()` → `entryService.deleteEntry()`

### Comments
- `api.getComments()` → `entryService.getComments()`
- `api.createComment()` → `entryService.createComment()`

### Social Interactions
- `api.likeEntry()` → `socialService.likeEntry()`
- `api.unlikeEntry()` → `socialService.unlikeEntry()`
- `api.followAuthor()` → `socialService.followAuthor()`
- `api.unfollowAuthor()` → `socialService.unfollowAuthor()`
- `api.getFollowers()` → `socialService.getFollowers()`
- `api.getFollowing()` → `socialService.getFollowing()`

### Inbox
- `api.getInbox()` → `inboxService.getInbox()`
- `api.markInboxItemRead()` → `inboxService.markItemAsRead()`
- `api.clearInbox()` → `inboxService.clearInbox()`

## New Features

The new structure adds many new methods not available in the old API:

### Author Service
- `searchAuthors()` - Search authors by query
- `getAuthorStats()` - Get author statistics
- `getGitHubActivity()` - Get GitHub activity data

### Entry Service
- `getEntriesByAuthor()` - Get entries by specific author
- `getHomeFeed()` - Get personalized home feed
- `getTrendingEntries()` - Get trending posts
- `searchEntries()` - Search posts
- `getCategories()` - Get available categories

### Social Service
- `likeComment()` / `unlikeComment()` - Like/unlike comments
- `getPendingFollowRequests()` - Get pending follow requests
- `acceptFollowRequest()` / `rejectFollowRequest()` - Handle follow requests
- `getFriends()` - Get mutual follows
- `savePost()` / `unsavePost()` - Save posts for later
- `getSavedPosts()` - Get saved posts

### Inbox Service
- `markAsRead()` - Mark multiple items as read
- `getInboxStats()` - Get inbox statistics
- `getUnreadCount()` - Get unread count
- `sendToInbox()` - Send items to another user's inbox
- Filtered getters: `getFollowRequests()`, `getLikes()`, `getComments()`, `getShares()`

## Type Changes

### Renamed Types
- `Inbox` → `InboxItem` (more descriptive)

### New Types
- `CreateEntryData` - Data for creating entries
- `UpdateEntryData` - Data for updating entries
- `AuthorUpdateData` - Data for updating author profiles
- `EntrySearchParams` - Parameters for searching entries
- `InboxFilterParams` - Parameters for filtering inbox
- `FriendshipStats` - Social statistics
- And many more...

## Backwards Compatibility

The old `api` object and `models.ts` are still available but deprecated. They will be removed in a future version.

```typescript
// This still works but is deprecated
import { api } from '../services/api';
import { Author } from '../types/models';

// Update to this
import { authorService } from '../services';
import { Author } from '../types';
```

## Benefits of the New Structure

1. **Better Organization**: Services and types are grouped by domain
2. **Type Safety**: More specific types for different operations
3. **Scalability**: Easy to add new services without bloating existing files
4. **Tree Shaking**: Import only what you need
5. **Testability**: Easier to mock individual services
6. **Custom Instances**: Create service instances with different configurations

## Example Migration

### Before:
```typescript
import { api } from '../../services/api';
import { Author, Entry } from '../../types/models';

const MyComponent = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [posts, setPosts] = useState<Entry[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const authorsResponse = await api.getAuthors();
      setAuthors(authorsResponse.results);
      
      const postsResponse = await api.getEntries();
      setPosts(postsResponse.results);
    };
    fetchData();
  }, []);
};
```

### After:
```typescript
import { authorService, entryService } from '../../services';
import { Author, Entry } from '../../types';

const MyComponent = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [posts, setPosts] = useState<Entry[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const authorsResponse = await authorService.getAuthors();
      setAuthors(authorsResponse.results);
      
      const postsResponse = await entryService.getEntries();
      setPosts(postsResponse.results);
    };
    fetchData();
  }, []);
};
```