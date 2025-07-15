/**
 * Author-related types
 */

import type { Node, TimestampedModel } from '../common';

export interface Author extends TimestampedModel {
  type: "author"; // Object type for federation
  id: string; // Full URL as per spec
  url: string;
  host: string; // API host URL for this author's node
  web: string; // Frontend URL where profile can be viewed
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name: string;
  github?: string; // Full GitHub URL (not just username)
  github_username?: string; // Kept for backwards compatibility
  profile_image?: string;
  bio?: string;
  location?: string;
  website?: string;
  node?: Node | null;
  is_approved: boolean;
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  // Frontend computed fields
  is_local?: boolean;
  is_remote?: boolean;
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
  is_current_user?: boolean;
}

export interface AuthorUpdateData {
  display_name?: string;
  github_username?: string;
  bio?: string;
  location?: string;
  website?: string;
  profile_image?: string;
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