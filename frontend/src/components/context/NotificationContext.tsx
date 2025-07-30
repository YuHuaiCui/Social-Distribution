import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { NotificationService } from '../../services/notification';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  pendingFollows: number;
  notifications: any[];
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  
  const notificationService = new NotificationService();

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const allNotifications = await notificationService.getAllNotifications();
      setNotifications(allNotifications);
      
      // Count unread (all are unread since we removed read tracking)
      setUnreadCount(allNotifications.length);
      
      // Count pending follows
      const pendingCount = allNotifications.filter(
        n => n.item_type === 'follow' && n.content_data?.data?.status === 'requesting'
      ).length;
      setPendingFollows(pendingCount);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Refresh notifications when user changes
  useEffect(() => {
    if (user) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setPendingFollows(0);
    }
  }, [user, refreshNotifications]);

  const markAsRead = useCallback(async (ids: string[]) => {
    // Since we don't track read status anymore, just decrease the count
    setUnreadCount(prev => Math.max(0, prev - ids.length));
  }, []);

  const markAllAsRead = useCallback(async () => {
    setUnreadCount(0);
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
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