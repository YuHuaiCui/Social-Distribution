/**
 * Inbox and notification types
 */

import type { Author } from '../author';
import type { Entry, Comment } from '../entry';
import type { Like, Follow } from '../social';
import type { TimestampedModel } from '../common';

export type InboxContentType = 'entry' | 'comment' | 'like' | 'follow' | 'entry_link';

export interface InboxItem extends TimestampedModel {
  id: string;
  recipient: string; // Author URL
  item_type: InboxContentType;
  content_type: InboxContentType; // Same as item_type
  sender: Author | string | null; // Can be Author object, URL reference, or null
  content_data?: InboxContentData;
  raw_data?: any; // Raw JSON data
  is_read: boolean;
  read?: boolean; // Same as is_read
}

export type InboxContentData = 
  | { type: 'entry'; data: Entry }
  | { type: 'comment'; data: Comment }
  | { type: 'like'; data: Like }
  | { type: 'follow'; data: Follow }
  | { type: 'entry_link'; data: { url: string; title: string } };

export interface InboxFilterParams {
  content_type?: InboxContentType;
  processed?: boolean;
  read?: boolean;
  sender?: string;
  page?: number;
  page_size?: number;
}

export interface MarkAsReadData {
  ids: string[];
}

export interface InboxStats {
  unread_count: number;
  pending_follows: number;
  total_items: number;
}