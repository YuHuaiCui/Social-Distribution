import React, { createContext, useContext, useState, useCallback } from 'react';

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

  // Stub implementation - inbox functionality removed
  const refreshNotifications = useCallback(async () => {
    // No-op - inbox functionality removed
  }, []);

  const markAsRead = useCallback(async (ids: string[]) => {
    // No-op - inbox functionality removed
  }, []);

  const markAllAsRead = useCallback(async () => {
    // No-op - inbox functionality removed
  }, []);

  const clearNotification = useCallback((id: string) => {
    // No-op - inbox functionality removed
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