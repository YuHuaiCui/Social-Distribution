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
    return this.request<Like>(`/api/comments/${commentId}/likes/`, {
      method: "POST",
    });
  }

  /**
   * Unlike a comment
   */
  async unlikeComment(commentId: string): Promise<void> {
    await this.request(`/api/comments/${commentId}/likes/`, {
      method: "DELETE",
    });
  }

  /**
   * Get likes for an entry
   */
  async getEntryLikes(
    entryId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<Like>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Like>>(
      `/api/entries/${entryId}/likes/${queryString}`
    );
  }

  /**
   * Get like status for a comment
   */
  async getCommentLikeStatus(commentId: string): Promise<{
    like_count: number;
    liked_by_current_user: boolean;
  }> {
    return this.request(`/api/comments/${commentId}/likes/`);
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
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
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
    // Extract ID from URL if full URL is passed
    const id = authorId.includes("/")
      ? authorId.split("/").filter(Boolean).pop()
      : authorId;
    const response = await this.request<{
      type: "following";
      following: Author[];
    }>(`/api/authors/${id}/following/`);
    return response.following;
  }

  /**
   * Get pending follow requests for current user
   */
  async getPendingFollowRequests(params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Follow>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Follow>>(
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
    followerId: string,
    followedId: string
  ): Promise<{
    is_following: boolean;
    is_followed_by: boolean;
    is_friends: boolean;
    follow_status?: "pending" | "accepted" | "rejected";
  }> {
    return this.request(
      `/api/follows/status/?follower=${followerId}&followed=${followedId}`
    );
  }

  /**
   * Get suggested authors to follow
   */
  async getSuggestedAuthors(params?: { limit?: number }): Promise<Author[]> {
    const queryString = this.buildQueryString(params || {});
    return this.request<Author[]>(`/api/authors/suggestions/${queryString}`);
  }

  // Saved posts methods

  /**
   * Save a post
   */
  async savePost(entryId: string): Promise<void> {
    await this.request(`/api/entries/${entryId}/save/`, {
      method: "POST",
    });
  }

  /**
   * Unsave a post
   */
  async unsavePost(entryId: string): Promise<void> {
    await this.request(`/api/entries/${entryId}/save/`, {
      method: "DELETE",
    });
  }

  /**
   * Get saved posts
   */
  async getSavedPosts(params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Entry>> {
    const queryString = this.buildQueryString(params || {});
    return this.request(`/api/entries/saved/${queryString}`);
  }
}

// Export singleton instance
export const socialService = new SocialService();

export default SocialService;
