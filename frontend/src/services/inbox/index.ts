/**
 * Inbox Service
 * Handles inbox and notification-related API calls
 */

import { BaseApiService } from '../base';
import type { 
  InboxItem,
  InboxFilterParams,
  MarkAsReadData,
  InboxStats,
  PaginatedResponse 
} from '../../types';

export class InboxService extends BaseApiService {
  /**
   * Get inbox items with optional filtering
   */
  async getInbox(params?: InboxFilterParams): Promise<PaginatedResponse<InboxItem>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<InboxItem>>(`/api/inbox/${queryString}`);
  }

  /**
   * Get a specific inbox item
   */
  async getInboxItem(id: string): Promise<InboxItem> {
    return this.request<InboxItem>(`/api/inbox/${id}/`);
  }

  /**
   * Mark inbox items as read
   */
  async markAsRead(ids: string[]): Promise<{ success: boolean; updated: number }> {
    return this.request<{ success: boolean; updated: number }>('/api/inbox/mark-read/', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  /**
   * Mark a single inbox item as read
   */
  async markItemAsRead(id: string): Promise<InboxItem> {
    return this.request<InboxItem>(`/api/inbox/${id}/read/`, {
      method: 'POST',
    });
  }

  /**
   * Mark inbox items as processed
   */
  async markAsProcessed(ids: string[]): Promise<{ success: boolean; updated: number }> {
    return this.request<{ success: boolean; updated: number }>('/api/inbox/mark-processed/', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  /**
   * Delete inbox items
   */
  async deleteItems(ids: string[]): Promise<{ success: boolean; deleted: number }> {
    return this.request<{ success: boolean; deleted: number }>('/api/inbox/delete/', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  /**
   * Delete a single inbox item
   */
  async deleteItem(id: string): Promise<void> {
    await this.request(`/api/inbox/${id}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Clear all inbox items
   */
  async clearInbox(): Promise<{ success: boolean; deleted: number }> {
    return this.request<{ success: boolean; deleted: number }>('/api/inbox/clear/', {
      method: 'POST',
    });
  }

  /**
   * Get inbox statistics
   */
  async getInboxStats(): Promise<InboxStats> {
    return this.request<InboxStats>('/api/inbox/stats/');
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/api/inbox/unread-count/');
  }

  /**
   * Send an item to another author's inbox
   */
  async sendToInbox(authorId: string, data: {
    content_type: 'entry' | 'comment' | 'like' | 'follow' | 'entry_link';
    content_id: string;
    content_data?: any;
  }): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/authors/${authorId}/inbox/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get filtered inbox items by type
   */
  async getFollowRequests(params?: Omit<InboxFilterParams, 'content_type'>): Promise<PaginatedResponse<InboxItem>> {
    return this.getInbox({ ...params, content_type: 'follow' });
  }

  async getLikes(params?: Omit<InboxFilterParams, 'content_type'>): Promise<PaginatedResponse<InboxItem>> {
    return this.getInbox({ ...params, content_type: 'like' });
  }

  async getComments(params?: Omit<InboxFilterParams, 'content_type'>): Promise<PaginatedResponse<InboxItem>> {
    return this.getInbox({ ...params, content_type: 'comment' });
  }

  async getShares(params?: Omit<InboxFilterParams, 'content_type'>): Promise<PaginatedResponse<InboxItem>> {
    return this.getInbox({ ...params, content_type: 'entry_link' });
  }

  /**
   * Accept a follow request from inbox
   */
  async acceptFollowRequest(inboxItemId: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/inbox/${inboxItemId}/accept-follow/`, {
      method: 'POST',
    });
  }

  /**
   * Reject a follow request from inbox
   */
  async rejectFollowRequest(inboxItemId: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/api/inbox/${inboxItemId}/reject-follow/`, {
      method: 'POST',
    });
  }

  /**
   * Subscribe to real-time inbox updates (WebSocket)
   */
  subscribeToUpdates(onUpdate: (item: InboxItem) => void): () => void {
    // This would typically set up a WebSocket connection
    // For now, return a no-op unsubscribe function
    console.warn('Real-time inbox updates not yet implemented');
    return () => {};
  }
}

// Export singleton instance
export const inboxService = new InboxService();

export default InboxService;