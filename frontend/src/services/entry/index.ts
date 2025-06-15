/**
 * Entry (Post) Service
 * Handles post-related API calls including comments
 */

import { BaseApiService } from '../base';
import type { 
  Entry,
  CreateEntryData,
  UpdateEntryData,
  EntrySearchParams,
  Comment,
  CreateCommentData,
  PaginatedResponse 
} from '../../types';

export class EntryService extends BaseApiService {
  /**
   * Get paginated list of entries
   */
  async getEntries(params?: EntrySearchParams): Promise<PaginatedResponse<Entry>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Entry>>(`/api/entries/${queryString}`);
  }

  /**
   * Get a specific entry by ID
   */
  async getEntry(id: string): Promise<Entry> {
    return this.request<Entry>(`/api/entries/${id}/`);
  }

  /**
   * Create a new entry
   */
  async createEntry(data: CreateEntryData): Promise<Entry> {
    if (data.image) {
      // Handle image upload
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('content_type', data.content_type);
      formData.append('visibility', data.visibility);
      if (data.categories) {
        data.categories.forEach(cat => formData.append('categories', cat));
      }
      formData.append('image', data.image);

      return this.requestFormData<Entry>('/api/entries/', {
        method: 'POST',
        body: formData,
      });
    }

    // Regular JSON request
    return this.request<Entry>('/api/entries/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an existing entry
   */
  async updateEntry(id: string, data: Partial<CreateEntryData>): Promise<Entry> {
    if (data.image) {
      // Handle image upload
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'categories' && Array.isArray(value)) {
          value.forEach(cat => formData.append('categories', cat));
        } else if (key !== 'image' && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      if (data.image) {
        formData.append('image', data.image);
      }

      return this.requestFormData<Entry>(`/api/entries/${id}/`, {
        method: 'PATCH',
        body: formData,
      });
    }

    // Regular JSON request
    return this.request<Entry>(`/api/entries/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete an entry
   */
  async deleteEntry(id: string): Promise<void> {
    await this.request(`/api/entries/${id}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Get entries by author
   */
  async getEntriesByAuthor(authorId: string, params?: Omit<EntrySearchParams, 'author'>): Promise<PaginatedResponse<Entry>> {
    return this.getEntries({ ...params, author: authorId });
  }

  /**
   * Get user's home feed
   */
  async getHomeFeed(params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<Entry>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Entry>>(`/api/entries/feed/${queryString}`);
  }

  /**
   * Get trending entries
   */
  async getTrendingEntries(params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<Entry>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Entry>>(`/api/entries/trending/${queryString}`);
  }

  /**
   * Search entries
   */
  async searchEntries(query: string, params?: Omit<EntrySearchParams, 'search'>): Promise<PaginatedResponse<Entry>> {
    return this.getEntries({ ...params, search: query });
  }

  // Comment-related methods

  /**
   * Get comments for an entry
   */
  async getComments(entryId: string, params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<Comment>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Comment>>(`/api/entries/${entryId}/comments/${queryString}`);
  }

  /**
   * Create a comment on an entry
   */
  async createComment(entryId: string, data: CreateCommentData): Promise<Comment> {
    return this.request<Comment>(`/api/entries/${entryId}/comments/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a comment
   */
  async updateComment(entryId: string, commentId: string, data: Partial<CreateCommentData>): Promise<Comment> {
    return this.request<Comment>(`/api/entries/${entryId}/comments/${commentId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a comment
   */
  async deleteComment(entryId: string, commentId: string): Promise<void> {
    await this.request(`/api/entries/${entryId}/comments/${commentId}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Get entry categories
   */
  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    return this.request('/api/entries/categories/');
  }
}

// Export singleton instance
export const entryService = new EntryService();

export default EntryService;