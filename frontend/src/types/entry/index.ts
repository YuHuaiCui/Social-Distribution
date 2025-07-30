/**
 * Entry (Post) related types
 */

import type { Author } from "../author";
import type { ContentType, Visibility, TimestampedModel, PaginatedComments, PaginatedLikes } from "../common";

export interface Entry {
  type: "entry"; // Object type for federation
  title: string;
  id: string; // Full URL as ID per spec
  web: string; // Frontend URL where entry can be viewed
  description: string; // Brief description for preview
  contentType: ContentType; // Always use camelCase as per API spec
  content: string;
  author: Author | string; // Can be URL reference
  comments: PaginatedComments; // Nested comments with pagination
  likes: PaginatedLikes; // Nested likes with pagination
  published: string; // ISO 8601 timestamp
  visibility: Visibility;
  
  // Additional fields for frontend compatibility
  url?: string; // For backwards compatibility
  source?: string;
  origin?: string;
  categories?: string[];
  image?: string; // For backwards compatibility
  
  // Computed fields for easy access
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

export interface CreateEntryData {
  title: string;
  description?: string; // Optional brief description
  content: string;
  contentType?: ContentType; // Always use camelCase as per API spec
  visibility: Visibility;
  categories?: string[];
  image?: File;
}

export interface UpdateEntryData extends Partial<CreateEntryData> {
  id: string;
}

export interface EntrySearchParams {
  author?: string;
  visibility?: Visibility;
  category?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// Updated Comment interface to match the new API specification
export interface Comment extends TimestampedModel {
  type: "comment";
  id: string; // Full URL as ID per spec (e.g. "http://nodeaaaa/api/authors/111/commented/130")
  author: Author | string; // Can be URL reference
  comment: string; // Content field renamed to comment per spec
  contentType: string; // Always use camelCase as per API spec
  published: string; // ISO 8601 timestamp
  entry: string; // Entry URL
  web: string; // Frontend URL
  likes: PaginatedLikes; // Nested likes with pagination
  
  // Additional fields for frontend compatibility
  url?: string;
  content?: string; // For backwards compatibility (alias for comment)
  parent?: Comment | string; // Parent comment (for replies)
  
  // Computed fields
  likes_count?: number;
  is_liked?: boolean;
}

export interface CreateCommentData {
  content: string;
  contentType?: "text/plain" | "text/markdown"; // Always use camelCase as per API spec
}

// Like interface for the nested likes data
export interface Like {
  type: "like";
  id: string; // Full URL as ID per spec (e.g. "http://nodeaaaa/api/authors/111/liked/166")
  author: Author; // Full author object
  published: string; // ISO 8601 timestamp
  object: string; // URL of the liked object (entry or comment)
}

// Response format for paginated entries as per API spec
export interface EntriesResponse {
  type: "entries";
  page_number: number;
  size: number;
  count: number;
  src: Entry[];
}
