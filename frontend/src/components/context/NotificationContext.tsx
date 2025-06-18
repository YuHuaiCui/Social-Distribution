import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { inboxService } from '../../services/inbox';
import type { InboxItem, InboxStats } from '../../types';

interface NotificationContextType {
  unreadCount: number;
  pendingFollows: number;
  notifications: InboxItem[];
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingFollows, setPendingFollows] = useState(0);
  const [notifications, setNotifications] = useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications and stats
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      // Fetch inbox stats
      const stats = await inboxService.getInboxStats();
      setUnreadCount(stats.unread_count);
      setPendingFollows(stats.pending_follows);

      // Fetch recent unread notifications
      const response = await inboxService.getInbox({
        read: false,
        page_size: 10,
      });
      setNotifications(response.results);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Mark notifications as read
  const markAsRead = useCallback(async (ids: string[]) => {
    try {
      await inboxService.markAsRead(ids);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          ids.includes(notif.id) 
            ? { ...notif, is_read: true, read: true } 
            : notif
        )
      );
      
      // Update unread count
      const readCount = ids.filter(id => 
        notifications.find(n => n.id === id && !n.is_read)
      ).length;
      setUnreadCount(prev => Math.max(0, prev - readCount));
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  }, [notifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id);
    
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  }, [notifications, markAsRead]);

  // Clear a notification from the list
  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    if (isAuthenticated) {
      refreshNotifications();
      
      // Refresh every 30 seconds
      const interval = setInterval(refreshNotifications, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshNotifications]);

  // Listen for custom events that should trigger a refresh
  useEffect(() => {
    const handleNotificationEvent = () => {
      refreshNotifications();
    };

    window.addEventListener('notification-update', handleNotificationEvent);
    
    return () => {
      window.removeEventListener('notification-update', handleNotificationEvent);
    };
  }, [refreshNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        pendingFollows,
        notifications,
        isLoading,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        clearNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Helper function to trigger notification refresh from anywhere
export const triggerNotificationUpdate = () => {
  window.dispatchEvent(new Event('notification-update'));
};