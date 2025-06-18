import { useCallback } from 'react';
import { inboxService } from '../services/inbox';
import { useToast } from '../components/context/ToastContext';
import { triggerNotificationUpdate } from '../components/context/NotificationContext';

export const useNotificationSender = () => {
  const { showError } = useToast();

  const sendNotification = useCallback(async (
    recipientId: string,
    contentType: 'entry' | 'comment' | 'like' | 'follow' | 'entry_link',
    contentId: string,
    contentData?: any
  ) => {
    try {
      await inboxService.sendToInbox(recipientId, {
        content_type: contentType,
        content_id: contentId,
        content_data: contentData,
      });
      
      // Trigger update for the recipient if they're viewing the app
      triggerNotificationUpdate();
      
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      showError('Failed to send notification');
      return false;
    }
  }, [showError]);

  return { sendNotification };
};