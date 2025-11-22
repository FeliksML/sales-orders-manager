import { useState, useEffect, useCallback } from 'react';
import notificationService from '../services/notificationService';

export const useNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await notificationService.getUnreadCount();
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }, []);

  // Load on mount and set up polling
  useEffect(() => {
    loadUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // Request browser notification permission
  const requestPermission = async () => {
    return await notificationService.requestBrowserPermission();
  };

  // Show browser notification
  const showNotification = (title, options) => {
    return notificationService.showBrowserNotification(title, options);
  };

  return {
    unreadCount,
    loading,
    loadUnreadCount,
    requestPermission,
    showNotification
  };
};

export default useNotifications;
