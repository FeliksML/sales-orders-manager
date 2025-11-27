import { useState, useEffect, useCallback } from 'react'
import { goalService } from '../services/goalService'

/**
 * Hook to fetch and manage goal progress data
 */
export function useGoalProgress() {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true)
      const data = await goalService.getProgress()
      setProgress(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch goal progress:', err)
      setError('Failed to load goal progress')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return {
    progress,
    loading,
    error,
    refetch: fetchProgress
  }
}

/**
 * Hook to fetch and manage the current month's goal
 */
export function useGoal() {
  const [goal, setGoal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchGoal = useCallback(async () => {
    try {
      setLoading(true)
      const data = await goalService.getGoal()
      setGoal(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch goal:', err)
      setError('Failed to load goal')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoal()
  }, [fetchGoal])

  const updateGoal = useCallback(async (goalData) => {
    try {
      const data = await goalService.updateGoal(goalData)
      setGoal(data)
      return data
    } catch (err) {
      console.error('Failed to update goal:', err)
      throw err
    }
  }, [])

  const clearGoal = useCallback(async () => {
    try {
      await goalService.clearGoal()
      // Reset goal targets locally
      setGoal(prev => prev ? {
        ...prev,
        target_psu: null,
        target_revenue: null,
        target_internet: null,
        target_mobile: null,
        target_tv: null,
        target_voice: null,
        target_sbc: null,
        target_wib: null
      } : null)
    } catch (err) {
      console.error('Failed to clear goal:', err)
      throw err
    }
  }, [])

  return {
    goal,
    loading,
    error,
    refetch: fetchGoal,
    updateGoal,
    clearGoal
  }
}

/**
 * Hook to fetch goal history
 */
export function useGoalHistory(months = 6) {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      const data = await goalService.getHistory(months)
      setHistory(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch goal history:', err)
      setError('Failed to load goal history')
    } finally {
      setLoading(false)
    }
  }, [months])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    history,
    loading,
    error,
    refetch: fetchHistory
  }
}

