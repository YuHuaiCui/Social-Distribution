/**
 * Entry (Post) Service
 * Handles post-related API calls including comments
 */

import { BaseApiService } from "../base";
import type {
  Entry,
  CreateEntryData,
  UpdateEntryData,
  EntrySearchParams,
  Comment,
  CreateCommentData,
  PaginatedResponse,
} from "../../types";

export class EntryService extends BaseApiService {
  /**
   * Get paginated list of entries
   */
  async getEntries(
    params?: EntrySearchParams
  ): Promise<PaginatedResponse<Entry>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Entry>>(
      `/api/entries/${queryString}`
    );
  }

  /**
   * Get a specific entry by ID
   */
  async getEntry(id: string): Promise<Entry> {
    return this.request<Entry>(`/api/entries/${id}/`);
  }

  /**
   * Create a new entry
   */ async createEntry(data: CreateEntryData): Promise<Entry> {
    if (data.image) {
      // Handle image upload
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("content", data.content);

      // Determine the correct content type based on the image file
      let imageContentType = data.content_type;
      if (data.content_type === "image" && data.image) {
        // Map common image MIME types
        const mimeType = data.image.type;
        if (mimeType === "image/png") {
          imageContentType = "image/png";
        } else if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
          imageContentType = "image/jpeg";
        } else {
          // Default to JPEG if we can't determine
          imageContentType = "image/jpeg";
        }
      }

      formData.append("content_type", imageContentType);
      formData.append("visibility", data.visibility);
      if (data.categories) {
        formData.append("categories", JSON.stringify(data.categories));
      }
      formData.append("image", data.image);

      return this.requestFormData<Entry>("/api/entries/", formData);
    }

    // Regular JSON request
    return this.request<Entry>("/api/entries/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an existing entry
   */
  async updateEntry(
    id: string,
    data: Partial<CreateEntryData>
  ): Promise<Entry> {
    if (data.image) {
      // Handle image upload
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === "categories" && Array.isArray(value)) {
          formData.append("categories", JSON.stringify(value));
        } else if (key !== "image" && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      if (data.image) {
        formData.append("image", data.image);
      }

      return this.requestFormData<Entry>(`/api/entries/${id}/`, formData, {
        method: "PATCH",
      });
    }

    // Regular JSON request
    return this.request<Entry>(`/api/entries/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete an entry
   */
  async deleteEntry(id: string): Promise<boolean> {
    try {
      await this.request(`/api/entries/${id}/`, {
        method: "DELETE",
      });
      return true;
    } catch (error) {
      console.error("Failed to delete post:", error);
      return false;
    }
  }

  /**
   * Get entries by author
   */
  async getEntriesByAuthor(
    authorId: string,
    params?: Omit<EntrySearchParams, "author">
  ): Promise<PaginatedResponse<Entry>> {
    return this.getEntries({ ...params, author: authorId });
  }

  /**
   * Get user's home feed
   */
  async getHomeFeed(params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Entry>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Entry>>(
      `/api/entries/feed/${queryString}`
    );
  }

  /**
   * Get trending entries
   */
  async getTrendingEntries(params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Entry>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Entry>>(
      `/api/entries/trending/${queryString}`
    );
  }

  /**
   * Search entries
   */
  async searchEntries(
    query: string,
    params?: Omit<EntrySearchParams, "search">
  ): Promise<PaginatedResponse<Entry>> {
    return this.getEntries({ ...params, search: query });
  }

  // Comment-related methods

  /**
   * Get comments for an entry
   */  async getComments(
    entryId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<Comment>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Comment>>(
      `/api/entries/${entryId}/comments/${queryString}`
    );
  }
  /**
   * Create a comment on an entry
   */  async createComment(
    entryId: string,
    data: CreateCommentData
  ): Promise<Comment> {
    // Ensure content_type is set if not provided
    const commentData = {
      ...data,
      content_type: data.content_type || "text/plain",
    };
    
    // Log the request for debugging
    console.log("Creating comment with data:", commentData);
    console.log("Request URL:", `/api/entries/${entryId}/comments/`);

    return this.request<Comment>(`/api/entries/${entryId}/comments/`, {
      method: "POST",
      body: JSON.stringify(commentData),
    });
  }

  /**
   * Update a comment
   */
  async updateComment(
    entryId: string,
    commentId: string,
    data: Partial<CreateCommentData>
  ): Promise<Comment> {
    return this.request<Comment>(
      `/api/entries/${entryId}/comments/${commentId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Delete a comment
   */
  async deleteComment(entryId: string, commentId: string): Promise<void> {
    await this.request(`/api/entries/${entryId}/comments/${commentId}/`, {
      method: "PATCH",
      body: JSON.stringify({ visibility: "deleted" }),
    });
  }

  /**
   * Get entry categories
   */
  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    return this.request("/api/entries/categories/");
  }
}

// Export singleton instance
export const entryService = new EntryService();

export default EntryService;
