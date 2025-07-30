import { useCallback } from 'react';

export const useNotificationSender = () => {

  const sendNotification = useCallback(async (
    recipientId: string,
    contentType: 'entry' | 'comment' | 'like' | 'follow' | 'entry_link',
    contentId: string,
    contentData?: any
  ) => {
    // Inbox functionality removed - always return true as no-op
    return true;
  }, []);

  return { sendNotification };
};