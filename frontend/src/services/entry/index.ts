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
  EntriesResponse,
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
   * Get entries from a specific author
   */
  async getEntriesByAuthor(
    authorId: string,
    params?: Omit<EntrySearchParams, "author">
  ): Promise<EntriesResponse> {
    const queryString = this.buildQueryString(params || {});
    // Use the new author-based endpoint: /api/authors/{AUTHOR_SERIAL}/entries/
    return this.request<EntriesResponse>(
      `/api/authors/${authorId}/entries/${queryString}`
    );
  }

  /**
   * Get a specific entry by ID or URL
   */
  async getEntry(id: string): Promise<Entry> {
    // If this looks like a full URL, use the new FQID endpoint
    if (id.includes("http") || (id.includes("/") && id.split("/").length > 2)) {
      // Use the new /api/entries/{ENTRY_FQID}/ endpoint
      const encodedUrl = encodeURIComponent(id);
      return this.request<Entry>(`/api/entries/${encodedUrl}/`);
    }

    // For UUID-based lookups, try to extract the UUID and use author-based endpoint if possible
    const entryId = id.includes("/") ? id.split("/").filter(Boolean).pop() : id;
    return this.request<Entry>(`/api/entries/${entryId}/`);
  }

  /**
   * Get a specific entry by author and entry ID
   */
  async getAuthorEntry(authorId: string, entryId: string): Promise<Entry> {
    // Use the new endpoint: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/
    return this.request<Entry>(`/api/authors/${authorId}/entries/${entryId}/`);
  }

  /**
   * Create a new entry
   */
  async createEntry(data: CreateEntryData): Promise<Entry> {
    // Handle different content types including base64 images
    if (data.image || data.contentType?.includes("base64")) {
      return this.createImageEntry(data);
    }

    // Check if this is an image URL (content starts with http and contentType is image)
    if (data.contentType?.startsWith("image/") && data.content?.startsWith(("http://", "https://"))) {
      return this.createImageUrlEntry(data);
    }

    // Prepare data for API - convert to API format
    const apiData = {
      type: "entry",
      title: data.title,
      description: data.description || "",
      content: data.content,
      contentType: data.contentType || "text/plain",
      visibility: data.visibility,
      categories: data.categories || [],
      // published field will be set by the server if not provided
    };

    // Regular JSON request for text entries
    return this.request<Entry>("/api/entries/", {
      method: "POST",
      body: JSON.stringify(apiData),
    });
  }

  /**
   * Create an entry for a specific author (using author-based endpoint)
   */
  async createAuthorEntry(
    authorId: string,
    data: CreateEntryData
  ): Promise<Entry> {
    // Use the new endpoint: /api/authors/{AUTHOR_SERIAL}/entries/
    const apiData = {
      type: "entry",
      title: data.title,
      description: data.description || "",
      content: data.content,
      contentType: data.contentType || "text/plain",
      visibility: data.visibility,
      categories: data.categories || [],
      // published field will be set by the server if not provided
    };

    return this.request<Entry>(`/api/authors/${authorId}/entries/`, {
      method: "POST",
      body: JSON.stringify(apiData),
    });
  }

  /**
   * Handle image URL entry creation
   */
  private async createImageUrlEntry(data: CreateEntryData): Promise<Entry> {
    const apiData = {
      type: "entry",
      title: data.title,
      description: data.description || "",
      content: data.content, // This is the URL
      contentType: data.contentType, // e.g., "image/png;base64"
      visibility: data.visibility,
      categories: data.categories || [],
      // published field will be set by the server if not provided
    };

    return this.request<Entry>("/api/entries/", {
      method: "POST",
      body: JSON.stringify(apiData),
    });
  }

  /**
   * Handle image entry creation with base64 support
   */
  private async createImageEntry(data: CreateEntryData): Promise<Entry> {
    if (data.image) {
      // Convert image file to base64
      const base64Content = await this.fileToBase64(data.image);

      // Determine content type
      let contentType = data.contentType;
      if (!contentType) {
        // Map common image MIME types to base64 content types
        const mimeType = data.image.type;
        if (mimeType === "image/png") {
          contentType = "image/png;base64";
        } else if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
          contentType = "image/jpeg;base64";
        } else {
          // Use application/base64 for other types
          contentType = "application/base64";
        }
      }

      const apiData = {
        type: "entry",
        title: data.title,
        description: data.description || "",
        content: base64Content,
        contentType: contentType,
        visibility: data.visibility,
        categories: data.categories || [],
        // published field will be set by the server if not provided
      };

      return this.request<Entry>("/api/entries/", {
        method: "POST",
        body: JSON.stringify(apiData),
      });
    }

    // Fallback to regular creation
    return this.createEntry(data);
  }

  /**
   * Convert File to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Extract base64 data without the data:image/...;base64, prefix
        const base64Data = result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Update an existing entry
   */
  async updateEntry(
    id: string,
    data: Partial<CreateEntryData>
  ): Promise<Entry> {
    // Handle image updates with base64 support
    if (data.image || data.contentType?.includes("base64")) {
      return this.updateImageEntry(id, data);
    }

    // Prepare data for API
    const apiData: any = {};
    if (data.title !== undefined) apiData.title = data.title;
    if (data.description !== undefined) apiData.description = data.description;
    if (data.content !== undefined) apiData.content = data.content;
    if (data.contentType !== undefined) apiData.contentType = data.contentType;
    if (data.visibility !== undefined) apiData.visibility = data.visibility;
    if (data.categories !== undefined) apiData.categories = data.categories;

    // Regular JSON request
    return this.request<Entry>(`/api/entries/${id}/`, {
      method: "PUT",
      body: JSON.stringify(apiData),
    });
  }

  /**
   * Update an entry using author and entry ID
   */
  async updateAuthorEntry(
    authorId: string,
    entryId: string,
    data: Partial<CreateEntryData>
  ): Promise<Entry> {
    // Prepare data for API
    const apiData: any = {};
    if (data.title !== undefined) apiData.title = data.title;
    if (data.description !== undefined) apiData.description = data.description;
    if (data.content !== undefined) apiData.content = data.content;
    if (data.contentType !== undefined) apiData.contentType = data.contentType;
    if (data.visibility !== undefined) apiData.visibility = data.visibility;
    if (data.categories !== undefined) apiData.categories = data.categories;

    // Use the new endpoint: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/
    return this.request<Entry>(`/api/authors/${authorId}/entries/${entryId}/`, {
      method: "PUT",
      body: JSON.stringify(apiData),
    });
  }

  /**
   * Handle image entry updates with base64 support
   */
  private async updateImageEntry(
    id: string,
    data: Partial<CreateEntryData>
  ): Promise<Entry> {
    const apiData: any = {};

    // Handle non-image fields
    if (data.title !== undefined) apiData.title = data.title;
    if (data.description !== undefined) apiData.description = data.description;
    if (data.visibility !== undefined) apiData.visibility = data.visibility;
    if (data.categories !== undefined) apiData.categories = data.categories;

    // Handle image content
    if (data.image) {
      const base64Content = await this.fileToBase64(data.image);
      apiData.content = base64Content;

      // Determine content type
      let contentType = data.contentType;
      if (!contentType) {
        const mimeType = data.image.type;
        if (mimeType === "image/png") {
          contentType = "image/png;base64";
        } else if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
          contentType = "image/jpeg;base64";
        } else {
          contentType = "application/base64";
        }
      }
      apiData.contentType = contentType;
    } else if (data.content !== undefined) {
      apiData.content = data.content;
      if (data.contentType !== undefined)
        apiData.contentType = data.contentType;
    }

    return this.request<Entry>(`/api/entries/${id}/`, {
      method: "PUT",
      body: JSON.stringify(apiData),
    });
  }

  /**
   * Delete an entry
   */
  async deleteEntry(id: string): Promise<boolean> {
    try {
      // Extract ID from URL if full URL is passed
      const entryId = id.includes("/")
        ? id.split("/").filter(Boolean).pop()
        : id;
      await this.request(`/api/entries/${entryId}/`, {
        method: "DELETE",
      });
      return true;
    } catch (error) {
      console.error("Failed to delete post:", error);
      return false;
    }
  }

  /**
   * Delete an entry using author and entry ID
   */
  async deleteAuthorEntry(authorId: string, entryId: string): Promise<boolean> {
    try {
      // Use the new endpoint: /api/authors/{AUTHOR_SERIAL}/entries/{ENTRY_SERIAL}/
      await this.request(`/api/authors/${authorId}/entries/${entryId}/`, {
        method: "DELETE",
      });
      return true;
    } catch (error) {
      console.error("Failed to delete author entry:", error);
      return false;
    }
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
   * Get comments for an entry - now returns the nested comments from entry
   */
  async getComments(
    entryId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<Comment>> {
    const queryString = this.buildQueryString(params || {});
    const response = await this.request<{
      type: "comments";
      web: string;
      id: string;
      page_number: number;
      size: number;
      count: number;
      src: Comment[];
    }>(`/api/entries/${entryId}/comments/${queryString}`);

    // Convert the API response format to the expected PaginatedResponse format
    return {
      count: response.count,
      next: null, // The API doesn't provide next/previous URLs in this format
      previous: null,
      results: response.src,
    };
  }

  /**
   * Create a comment on an entry
   */
  async createComment(
    entryId: string,
    data: CreateCommentData
  ): Promise<Comment> {
    // Prepare data for API - use comment and contentType as per API spec
    const commentData = {
      comment: data.content,
      contentType: data.contentType || "text/plain",
    };

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
    const commentData: any = {};
    if (data.content !== undefined) commentData.comment = data.content;
    if (data.contentType !== undefined)
      commentData.contentType = data.contentType;

    return this.request<Comment>(
      `/api/entries/${entryId}/comments/${commentId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(commentData),
      }
    );
  }

  /**
   * Delete a comment
   */
  async deleteComment(entryId: string, commentId: string): Promise<void> {
    // Extract IDs from URLs if full URLs are passed
    const eId = entryId.includes("/")
      ? entryId.split("/").filter(Boolean).pop()
      : entryId;
    const cId = commentId.includes("/")
      ? commentId.split("/").filter(Boolean).pop()
      : commentId;
    await this.request(`/api/entries/${eId}/comments/${cId}/`, {
      method: "DELETE",
    });
  }

  /**
   * Get entry categories
   */
  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    return this.request("/api/entries/categories/");
  }

  /**
   * Fetch remote entry details from the remote node
   */
  async fetchRemoteEntry(entryUrl: string): Promise<Entry> {
    const encodedUrl = encodeURIComponent(entryUrl);
    return this.request<Entry>(`/api/entries/fetch-remote/?entry_url=${encodedUrl}`);
  }

  /**
   * Get local comments for a remote entry
   */
  async getLocalCommentsForRemoteEntry(entryUrl: string): Promise<{
    type: "comments";
    entry_url: string;
    count: number;
    items: Comment[];
  }> {
    const encodedUrl = encodeURIComponent(entryUrl);
    return this.request(`/api/entries/local-comments-for-remote/?entry_url=${encodedUrl}`);
  }

  /**
   * Create a comment on a remote entry using the FQID endpoint
   */
  async createCommentOnRemoteEntry(
    entryUrl: string,
    data: CreateCommentData
  ): Promise<Comment> {
    const encodedUrl = encodeURIComponent(entryUrl);
    const commentData = {
      comment: data.content,
      contentType: data.contentType || "text/plain",
    };

    return this.request<Comment>(`/api/entries/${encodedUrl}/comments/`, {
      method: "POST",
      body: JSON.stringify(commentData),
    });
  }
}

// Export singleton instance
export const entryService = new EntryService();

export default EntryService;
