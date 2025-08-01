/**
 * Social Service
 * Handles social interactions: likes, follows, friendships
 */

import { BaseApiService } from "../base";
import type {
  Like,
  Follow,
  Friendship,
  FollowRequest,
  FollowResponse,
  FriendshipStats,
  Author,
  Entry,
  PaginatedResponse,
} from "../../types";

export class SocialService extends BaseApiService {
  // Like-related methods

  /**
   * Like an entry
   */ async likeEntry(entryId: string): Promise<Like> {
    return this.request<Like>(`/api/entries/${entryId}/likes/`, {
      method: "POST",
    });
  }

  /**
   * Unlike an entry
   */
  async unlikeEntry(entryId: string): Promise<void> {
    await this.request(`/api/entries/${entryId}/likes/`, {
      method: "DELETE",
    });
  }

  /**
   * Like a comment
   */
  async likeComment(commentId: string): Promise<Like> {
    // Extract ID from URL if full URL is passed
    const id = commentId.includes("/")
      ? commentId.split("/").filter(Boolean).pop()
      : commentId;
    return this.request<Like>(`/api/comments/${id}/likes/`, {
      method: "POST",
    });
  }

  /**
   * Unlike a comment
   */
  async unlikeComment(commentId: string): Promise<void> {
    // Extract ID from URL if full URL is passed
    const id = commentId.includes("/")
      ? commentId.split("/").filter(Boolean).pop()
      : commentId;
    await this.request(`/api/comments/${id}/likes/`, {
      method: "DELETE",
    });
  }

  /**
   * Get likes for an entry
   */
  async getEntryLikes(
    entryId: string,
    params?: { page?: number; size?: number }
  ): Promise<{
    type: "likes";
    web: string;
    id: string;
    page_number: number;
    size: number;
    count: number;
    src: Like[];
  }> {
    const queryString = this.buildQueryString(params || {});
    return this.request<{
      type: "likes";
      web: string;
      id: string;
      page_number: number;
      size: number;
      count: number;
      src: Like[];
    }>(`/api/entries/${entryId}/likes/${queryString}`);
  }

  /**
   * Get like status for a comment
   */
  async getCommentLikeStatus(commentId: string): Promise<{
    like_count: number;
    liked_by_current_user: boolean;
  }> {
    // Extract ID from URL if full URL is passed
    const id = commentId.includes("/")
      ? commentId.split("/").filter(Boolean).pop()
      : commentId;
    return this.request(`/api/comments/${id}/likes/`);
  }

  // Follow-related methods

  /**
   * Follow an author
   */
  async followAuthor(authorId: string): Promise<FollowResponse> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    return this.request<FollowResponse>(`/api/authors/${id}/follow/`, {
      method: "POST",
    });
  }

  /**
   * Unfollow an author
   */
  async unfollowAuthor(authorId: string): Promise<void> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    await this.request(`/api/authors/${id}/follow/`, {
      method: "DELETE",
    });
  }

  /**
   * Get followers of an author
   */
  async getFollowers(authorId: string): Promise<Author[]> {
    // For remote authors (full URLs), encode the URL for the API call
    // For local authors (UUIDs), use as-is
    const id = authorId.includes("/") ? encodeURIComponent(authorId) : authorId;
    const response = await this.request<{
      type: "followers";
      followers: Author[];
    }>(`/api/authors/${id}/followers/`);
    return response.followers;
  }

  /**
   * Get authors that an author is following
   */
  async getFollowing(authorId: string): Promise<Author[]> {
    // For remote authors (full URLs), encode the URL for the API call
    // For local authors (UUIDs), use as-is
    const id = authorId.includes("/") ? encodeURIComponent(authorId) : authorId;
    const response = await this.request<{
      type: "following";
      following: Author[];
    }>(`/api/authors/${id}/following/`);
    return response.following;
  }

  /**
   * Get requesting follow requests for current user
   */
  async getRequestingFollowRequests(params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Follow>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Follow>>(
      `/api/follows/requests/${queryString}`
    );
  }

  /**
   * Get all follow requests for current user (all statuses)
   */
  async getAllFollowRequests(params?: {
    page?: number;
    page_size?: number;
  }): Promise<Follow[]> {
    const queryParams = { ...params, all_statuses: true };
    const queryString = this.buildQueryString(queryParams);
    return this.request<Follow[]>(
      `/api/follows/requests/${queryString}`
    );
  }

  /**
   * Accept a follow request
   */
  async acceptFollowRequest(followId: string): Promise<Follow> {
    return this.request<Follow>(`/api/follows/${followId}/accept/`, {
      method: "POST",
    });
  }

  /**
   * Reject a follow request
   */
  async rejectFollowRequest(followId: string): Promise<void> {
    await this.request(`/api/follows/${followId}/reject/`, {
      method: "POST",
    });
  }

  // Friendship-related methods

  /**
   * Get friends of an author (mutual follows)
   */
  async getFriends(authorId: string): Promise<Author[]> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    const response = await this.request<{ type: "friends"; friends: Author[] }>(
      `/api/authors/${id}/friends/`
    );
    return response.friends;
  }

  /**
   * Get friendship stats for an author
   */
  async getFriendshipStats(authorId: string): Promise<FriendshipStats> {
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    return this.request<FriendshipStats>(`/api/authors/${id}/social-stats/`);
  }

  /**
   * Check follow status between two authors
   */
  async checkFollowStatus(
    followerIdOrUrl: string,
    followedIdOrUrl: string
  ): Promise<{
    is_following: boolean;
    is_followed_by: boolean;
    is_friends: boolean;
    follow_status?: "requesting" | "accepted" | "rejected" | "none";
  }> {
    // Convert IDs to proper author URLs using their host field
    let followerUrl = followerIdOrUrl;
    let followedUrl = followedIdOrUrl;
    
    // If we have IDs instead of URLs, we need to construct proper URLs
    // For local authors, we need to use the backend host, not frontend host
    if (!followerIdOrUrl.includes('http')) {
      // This is a local author ID, construct URL with backend host
      followerUrl = `${window.location.protocol}//${window.location.hostname}:8000/api/authors/${followerIdOrUrl}`;
    }
    
    if (!followedIdOrUrl.includes('http')) {
      // This is a local author ID, construct URL with backend host
      followedUrl = `${window.location.protocol}//${window.location.hostname}:8000/api/authors/${followedIdOrUrl}`;
    }
    
    // Properly encode URLs for query parameters
    const encodedFollowerUrl = encodeURIComponent(followerUrl);
    const encodedFollowedUrl = encodeURIComponent(followedUrl);
    
    const response = await this.request<{
      follower: string;
      followed: string;
      status: string;
      created_at?: string;
    }>(
      `/api/follows/status/?follower_url=${encodedFollowerUrl}&followed_url=${encodedFollowedUrl}`
    );

    // Map backend response to frontend expected format
    const isFollowing = response.status === "accepted";
    const followStatus = response.status === "not_following" ? "none" : response.status;

    return {
      is_following: isFollowing,
      is_followed_by: false, // This endpoint doesn't return this info
      is_friends: false, // This endpoint doesn't return this info
      follow_status: followStatus as "requesting" | "accepted" | "rejected" | "none",
    };
  }

  /**
   * Get suggested authors to follow
   */
  async getSuggestedAuthors(params?: { limit?: number }): Promise<Author[]> {
    const queryString = this.buildQueryString(params || {});
    return this.request<Author[]>(`/api/authors/suggestions/${queryString}`);
  }


  /**
   * Get likes received on current user's entries
   */
  async getReceivedLikes(): Promise<{
    type: string;
    items: Like[];
  }> {
    return this.request('/api/likes/received/');
  }

  /**
   * Get comments received on current user's entries
   */
  async getReceivedComments(): Promise<{
    type: string;
    comments: Array<{
      id: string;
      author: {
        id: string;
        displayName: string;
        username: string;
        profileImage?: string;
      };
      entry: {
        id: string;
        title: string;
        url: string;
      };
      content: string;
      created_at: string;
    }>;
  }> {
    return this.request('/api/comments/received/');
  }
}

// Export singleton instance
export const socialService = new SocialService();

export default SocialService;
