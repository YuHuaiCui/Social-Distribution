/**
 * Entry (Post) related types
 */

import type { Author } from "../author";
import type { ContentType, Visibility, TimestampedModel } from "../common";

export interface Entry extends TimestampedModel {
  type: "entry"; // Object type for federation
  id: string; // Full URL as per spec
  url: string;
  web: string; // Frontend URL where entry can be viewed
  author: Author | string; // Can be URL reference
  title: string;
  description: string; // Brief description for preview
  content: string;
  content_type: ContentType;
  visibility: Visibility;
  source?: string;
  origin?: string;
  published: string; // ISO 8601 timestamp
  // Frontend computed fields
  likes_count?: number;
  comments_count?: number;
  categories?: string[];
  image?: string; // For backwards compatibility
  is_liked?: boolean;
  is_saved?: boolean;
}

export interface CreateEntryData {
  title: string;
  description?: string; // Optional brief description
  content: string;
  content_type: ContentType;
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

export interface Comment extends TimestampedModel {
  id: string;
  url: string;
  author: Author | string; // Can be URL reference
  entry: Entry | string; // Can be URL reference
  content: string;
  content_type: "text/plain" | "text/markdown";
  parent?: Comment | string; // Parent comment (for replies)
  // Frontend computed fields
  likes_count?: number;
  is_liked?: boolean;
}

export interface CreateCommentData {
  content: string;
  content_type?: "text/plain" | "text/markdown";
}
