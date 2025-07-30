/**
 * Social interaction types (likes, follows, friendships)
 */

import type { Author } from '../author';
import type { TimestampedModel } from '../common';

export interface Like extends TimestampedModel {
  id: string;
  author: Author | string; // Can be URL reference
  target_type: 'entry' | 'comment';
  target_id: string;
}

export interface Follow extends TimestampedModel {
  id: string;
  follower: Author | string; // Can be URL reference
  followed: Author | string; // Can be URL reference
  status: 'requesting' | 'accepted' | 'rejected';
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