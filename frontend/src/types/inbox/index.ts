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
  owner: Author | string; // Can be URL reference
  content_type: InboxContentType;
  content_id: string;
  sender: Author | string; // Can be URL reference
  content_data?: InboxContentData;
  processed: boolean;
  read?: boolean; // Frontend field
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