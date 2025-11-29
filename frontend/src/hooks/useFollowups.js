import { useState, useEffect, useCallback, useRef } from 'react';
import followupService from '../services/followupService';

/**
 * Hook for managing today's follow-ups (dashboard use)
 */
export const useTodaysFollowups = () => {
  const [todaysFollowups, setTodaysFollowups] = useState([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const fetchTodaysFollowups = useCallback(async () => {
    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }
      const data = await followupService.getToday();

      // Only update state if still mounted
      if (!isMounted.current) return;

      setTodaysFollowups(data.followups || []);
      setOverdueCount(data.overdue_count || 0);
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Failed to fetch today\'s follow-ups:', err);
      setError('Failed to load follow-ups');
      setTodaysFollowups([]);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchTodaysFollowups();

    // Poll for updates every minute
    const interval = setInterval(fetchTodaysFollowups, 60000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchTodaysFollowups]);

  const completeFollowup = useCallback(async (id) => {
    try {
      await followupService.complete(id);
      // Refresh the list
      await fetchTodaysFollowups();
      return true;
    } catch (err) {
      console.error('Failed to complete follow-up:', err);
      throw err;
    }
  }, [fetchTodaysFollowups]);

  const snoozeFollowup = useCallback(async (id, days = 1) => {
    try {
      await followupService.snooze(id, days);
      // Refresh the list
      await fetchTodaysFollowups();
      return true;
    } catch (err) {
      console.error('Failed to snooze follow-up:', err);
      throw err;
    }
  }, [fetchTodaysFollowups]);

  return {
    todaysFollowups,
    overdueCount,
    totalCount: todaysFollowups.length,
    loading,
    error,
    refetch: fetchTodaysFollowups,
    completeFollowup,
    snoozeFollowup
  };
};

/**
 * Hook for managing follow-ups for a specific order
 */
export const useOrderFollowups = (orderId) => {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const fetchFollowups = useCallback(async () => {
    if (!orderId) return;

    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }
      const data = await followupService.getForOrder(orderId);

      // Only update state if still mounted
      if (!isMounted.current) return;

      setFollowups(data || []);
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Failed to fetch order follow-ups:', err);
      setError('Failed to load follow-ups');
      setFollowups([]);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [orderId]);

  useEffect(() => {
    isMounted.current = true;
    fetchFollowups();

    return () => {
      isMounted.current = false;
    };
  }, [fetchFollowups]);

  const createFollowup = useCallback(async (dueDate, note = null) => {
    try {
      const data = {
        order_id: orderId,
        due_date: dueDate,
        note: note
      };
      const result = await followupService.create(data);
      await fetchFollowups();
      return result;
    } catch (err) {
      console.error('Failed to create follow-up:', err);
      throw err;
    }
  }, [orderId, fetchFollowups]);

  return {
    followups,
    loading,
    error,
    refetch: fetchFollowups,
    createFollowup
  };
};

/**
 * Hook for creating a follow-up (standalone use)
 */
export const useCreateFollowup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const createFollowup = useCallback(async (orderId, dueDate, note = null) => {
    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }
      const data = {
        order_id: orderId,
        due_date: dueDate,
        note: note
      };
      const result = await followupService.create(data);
      return result;
    } catch (err) {
      if (!isMounted.current) throw err;
      console.error('Failed to create follow-up:', err);
      setError('Failed to create follow-up');
      throw err;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  return {
    createFollowup,
    loading,
    error
  };
};

export default useTodaysFollowups;
