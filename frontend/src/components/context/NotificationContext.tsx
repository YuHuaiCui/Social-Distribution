import React, { createContext, useContext, useState, useCallback } from 'react';
import { socialService } from '../../services/social';

interface LikeNotification {
  id: string;
  type: 'like';
  author: {
    id: string;
    displayName?: string;
    display_name?: string;
    username: string;
    profileImage?: string;
    profile_image?: string;
  };
  entry: {
    id: string;
    title: string;
    url?: string;
  };
  created_at: string;
  is_read?: boolean;
}

interface FollowNotification {
  id: string;
  type: 'follow';
  status: 'requesting' | 'accepted' | 'rejected';
  follower: {
    id: string;
    displayName?: string;
    display_name?: string;
    username?: string;
    profileImage?: string;
    profile_image?: string;
  } | any;
  followed: {
    id: string;
    displayName?: string;
    display_name?: string;
    username?: string;
  } | any;
  created_at: string;
  is_read?: boolean;
  isIncomingRequest?: boolean;
}

type NotificationItem = LikeNotification | FollowNotification;

interface NotificationContextType {
  unreadCount: number;
  pendingFollows: number;
  notifications: NotificationItem[];
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingFollows, setPendingFollows] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      // Handle likes and follows separately to handle individual failures
      let likeNotifications: LikeNotification[] = [];
      let followNotifications: FollowNotification[] = [];

      // Try to get received likes
      try {
        const likesResponse = await socialService.getReceivedLikes();
        likeNotifications = (likesResponse.items || []).map(like => ({
          id: `like-${like.id}`,
          type: 'like' as const,
          author: like.author,
          entry: like.entry,
          created_at: like.created_at,
          is_read: false
        }));
      } catch (likesError) {
        console.warn('Failed to fetch likes:', likesError);
      }

      // Try to get follow requests
      try {
        const followRequestsResponse = await socialService.getAllFollowRequests();
        console.log('Follow requests response:', followRequestsResponse);
        
        followNotifications = followRequestsResponse.map(follow => {
          console.log('Processing follow notification:', follow);
          // These are follow requests TO the current user (incoming requests)
          // So the 'actor' or 'follower' is the person wanting to follow the current user
          return {
            id: `follow-${follow.id}`,
            type: 'follow' as const,
            status: follow.status,
            follower: follow.actor || follow.follower || { 
              id: 'unknown', 
              displayName: follow.summary?.split(' wants to follow ')[0] || 'Someone',
              username: follow.summary?.split(' wants to follow ')[0] || 'Someone'
            },
            followed: follow.object || follow.followed || { 
              id: 'unknown', 
              displayName: 'You',
              username: 'You'
            },
            created_at: follow.created_at || follow.published || new Date().toISOString(),
            is_read: false,
            // Add context to distinguish notification type
            isIncomingRequest: true
          };
        });
      } catch (followError) {
        console.error('Failed to fetch follow requests:', followError);
      }

      const allNotifications = [...likeNotifications, ...followNotifications]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('All notifications:', allNotifications);
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.length);
      setPendingFollows(followNotifications.filter(f => f.status === 'requesting').length);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (ids: string[]) => {
    setNotifications(prev => 
      prev.map(notif => 
        ids.includes(notif.id) ? { ...notif, is_read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - ids.length));
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const value: NotificationContextType = {
    unreadCount,
    pendingFollows,
    notifications,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Export a no-op function for backward compatibility
export const triggerNotificationUpdate = () => {
  // No-op - inbox functionality removed
};