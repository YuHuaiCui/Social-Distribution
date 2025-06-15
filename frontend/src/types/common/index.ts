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

export type ContentType = 'text/plain' | 'text/markdown' | 'image/png' | 'image/jpeg';
export type Visibility = 'public' | 'unlisted' | 'friends' | 'deleted';