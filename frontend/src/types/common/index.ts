/**
 * Common types used across the application
 */

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ErrorResponse {
  message?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export interface SuccessResponse {
  success: boolean;
  message?: string;
}

export interface TimestampedModel {
  created_at: string;
  updated_at?: string;
}

export interface Node {
  id: string;
  name: string;
  host: string;
  is_active: boolean;
  created_at: string;
}

// Updated to match the backend specification
export type ContentType = 
  | 'text/plain' 
  | 'text/markdown' 
  | 'image/png' 
  | 'image/jpeg'
  | 'image/png;base64'
  | 'image/jpeg;base64'
  | 'application/base64';

export type Visibility = 'PUBLIC' | 'UNLISTED' | 'FRIENDS' | 'DELETED';

// New types for nested API responses
export interface PaginatedComments {
  type: "comments";
  web: string;
  id: string;
  page_number: number;
  size: number;
  count: number;
  src: any[]; // Comment[] - avoiding circular import, will be properly typed in usage
}

export interface PaginatedLikes {
  type: "likes";
  web: string;
  id: string;
  page_number: number;
  size: number;
  count: number;
  src: any[]; // Like[] - avoiding circular import, will be properly typed in usage
}