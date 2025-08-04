/**
 * Author-related types
 */

import type { Node, TimestampedModel } from '../common';

export interface Author {
  type: "author"; // Object type for federation
  id: string; // Full URL as per spec
  host: string; // API host URL for this author's node
  displayName: string; // How the user wants their name displayed
  github: string; // Full GitHub URL or empty string
  profileImage: string; // URL of profile image or empty string
  web: string; // Frontend URL where profile can be viewed
  
  // Backwards compatibility fields (may be removed in future)
  url?: string;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string; // snake_case version
  github_username?: string;
  profile_image?: string; // snake_case version
  bio?: string;
  location?: string;
  website?: string;
  node?: Node | null;
  is_approved?: boolean;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Frontend computed fields
  is_local?: boolean;
  is_remote?: boolean;
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
  is_current_user?: boolean;
}

export interface AuthorUpdateData {
  displayName?: string;
  github_username?: string;
  bio?: string;
  location?: string;
  profileImage?: string;
  email?: string;
}

export interface AuthorSearchParams {
  is_approved?: boolean;
  is_active?: boolean;
  type?: 'local' | 'remote';
  search?: string;
  page?: number;
  page_size?: number;
}

export interface CurrentUser extends Author {
  is_current_user: true;
}