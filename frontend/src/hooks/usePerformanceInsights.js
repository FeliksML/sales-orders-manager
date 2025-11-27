import { useState, useEffect, useCallback } from 'react'
import { orderService } from '../services/orderService'

/**
 * Hook to fetch performance insights data including:
 * - Month-over-month comparisons
 * - Week-over-week comparisons
 * - Monthly and weekly trends
 * - Personal records
 * - Streak information
 * - Smart insights
 */
export function usePerformanceInsights() {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInsights = useCallback(async () => {
    // Check if token exists before fetching
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await orderService.getPerformanceInsights()
      setInsights(data)
    } catch (err) {
      console.error('Failed to fetch performance insights:', err)
      setError('Failed to load performance insights')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  return {
    insights,
    loading,
    error,
    refetch: fetchInsights
  }
}

export default usePerformanceInsights

