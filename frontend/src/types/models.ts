// Types that match the backend Django models

export interface Node {
  id: string;
  name: string;
  host: string;
  is_active: boolean;
  created_at: string;
}

export interface Author {
  id: string;
  url: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name: string;
  github_username?: string;
  profile_image?: string;
  bio?: string;
  node?: Node | null;
  is_approved: boolean;
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  created_at: string;
  updated_at: string;
  // Frontend computed fields
  is_local?: boolean;
  is_remote?: boolean;
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
  is_current_user?: boolean;
}

export interface Entry {
  id: string;
  url: string;
  author: Author | string; // Can be URL reference
  title: string;
  content: string;
  content_type: 'text/plain' | 'text/markdown' | 'image/png' | 'image/jpeg';
  visibility: 'public' | 'unlisted' | 'friends' | 'deleted';
  source?: string;
  origin?: string;
  created_at: string;
  updated_at: string;
  // Frontend computed fields
  likes_count?: number;
  comments_count?: number;
  categories?: string[];
  image?: string; // For backwards compatibility
}

export interface Comment {
  id: string;
  url: string;
  author: Author | string; // Can be URL reference
  entry: Entry | string; // Can be URL reference
  content: string;
  content_type: 'text/plain' | 'text/markdown';
  created_at: string;
  updated_at: string;
  // Frontend computed fields
  likes_count?: number;
}

export interface Like {
  id: string;
  author: Author | string; // Can be URL reference
  target_type: 'entry' | 'comment';
  target_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower: Author | string; // Can be URL reference
  followed: Author | string; // Can be URL reference
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  author1: Author | string; // Can be URL reference
  author2: Author | string; // Can be URL reference
  created_at: string;
}

export interface Inbox {
  id: string;
  owner: Author | string; // Can be URL reference
  content_type: 'entry' | 'comment' | 'like' | 'follow' | 'entry_link';
  content_id: string;
  sender: Author | string; // Can be URL reference
  content_data?: any; // JSON field for content
  processed: boolean;
  created_at: string;
}

// API Response types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Authentication types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  display_name?: string;
  github_username?: string;
}

export interface AuthResponse {
  user: Author;
  token?: string;
  isAuthenticated: boolean;
}

// Current user context
export interface CurrentUser extends Author {
  is_current_user: true;
}