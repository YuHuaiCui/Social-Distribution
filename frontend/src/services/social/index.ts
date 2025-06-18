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
  PaginatedResponse,
  Entry,
} from "../../types";

export class SocialService extends BaseApiService {
  // Like-related methods

  /**
   * Like an entry
   */ async likeEntry(entryId: string): Promise<Like> {
    return this.request<Like>(`/entries/${entryId}/likes/`, {
      method: "POST",
    });
  }

  /**
   * Unlike an entry
   */
  async unlikeEntry(entryId: string): Promise<void> {
    await this.request(`/entries/${entryId}/likes/`, {
      method: "DELETE",
    });
  }

  /**
   * Like a comment
   */
  async likeComment(commentId: string): Promise<Like> {
    return this.request<Like>(`/comments/${commentId}/likes/`, {
      method: "POST",
    });
  }

  /**
   * Unlike a comment
   */
  async unlikeComment(commentId: string): Promise<void> {
    await this.request(`/comments/${commentId}/likes/`, {
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

  // Follow-related methods

  /**
   * Follow an author
   */
  async followAuthor(authorId: string): Promise<FollowResponse> {
    return this.request<FollowResponse>(`/api/authors/${authorId}/follow/`, {
      method: "POST",
    });
  }

  /**
   * Unfollow an author
   */
  async unfollowAuthor(authorId: string): Promise<void> {
    await this.request(`/api/authors/${authorId}/follow/`, {
      method: "DELETE",
    });
  }

  /**
   * Get followers of an author
   */
  async getFollowers(
    authorId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<Author>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Author>>(
      `/api/authors/${authorId}/followers/${queryString}`
    );
  }

  /**
   * Get authors that an author is following
   */
  async getFollowing(
    authorId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<Author>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Author>>(
      `/api/authors/${authorId}/following/${queryString}`
    );
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
  async getFriends(
    authorId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<Author>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Author>>(
      `/api/authors/${authorId}/friends/${queryString}`
    );
  }

  /**
   * Get friendship stats for an author
   */
  async getFriendshipStats(authorId: string): Promise<FriendshipStats> {
    return this.request<FriendshipStats>(
      `/api/authors/${authorId}/social-stats/`
    );
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
   */  async savePost(entryId: string): Promise<void> {
    // Try with direct endpoint first    try {
      await this.request(`/entries/${entryId}/save/`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error saving post with save endpoint:", error);
      // Fallback to liking the post as a save mechanism
      await this.likeEntry(entryId);
    }
  }
  /**
   * Unsave a post
   */
  async unsavePost(entryId: string): Promise<void> {
    try {
      await this.request(`/entries/${entryId}/save/`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error unsaving post with save endpoint:", error);
      // Fallback to unliking the post
      await this.unlikeEntry(entryId);
    }
  }

  /**
   * Get saved posts
   */
  async getSavedPosts(params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Entry>> {
    const queryString = this.buildQueryString(params || {});    try {
      return await this.request(`/entries/saved/${queryString}`);
    } catch (error) {
      console.error("Error fetching saved posts:", error);
      // Return empty result for now
      return {
        count: 0,
        next: null,
        previous: null,
        results: []
      };
    }
  }
}

// Export singleton instance
export const socialService = new SocialService();

export default SocialService;
