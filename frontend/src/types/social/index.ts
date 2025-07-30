/**
 * Social interaction types (likes, follows, friendships)
 */

import type { Author } from '../author';
import type { TimestampedModel } from '../common';

// Re-export Like from entry types for backward compatibility
export type { Like } from '../entry';

export interface Follow extends TimestampedModel {
  id: string;
  type: string;
  summary: string;
  status: 'requesting' | 'accepted' | 'rejected';
  actor: {
    type: string;
    id: string;
    host: string;
    displayName: string;
    github?: string;
    profileImage?: string;
    web?: string;
  };
  object: {
    type: string;
    id: string;
    host: string;
    displayName: string;
    github?: string;
    profileImage?: string;
    web?: string;
  };
  // Legacy fields for backward compatibility
  follower?: Author | string; 
  followed?: Author | string;
}

export interface Friendship extends TimestampedModel {
  id: string;
  author1: Author | string; // Can be URL reference
  author2: Author | string; // Can be URL reference
}

export interface FollowRequest {
  author_id: string;
}

export interface FollowResponse {
  success: boolean;
  follow: Follow;
}

export interface FriendshipStats {
  followers_count: number;
  following_count: number;
  friends_count: number;
  requesting_requests_count: number;
}