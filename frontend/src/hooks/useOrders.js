import { useState, useEffect, useRef, useCallback } from 'react'
import { orderService } from '../services/orderService'

export const useOrders = (filters = {}) => {
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isMounted = useRef(true)

  const fetchOrders = useCallback(async (filterParams) => {
    // Check if token exists before fetching
    const token = localStorage.getItem('token')
    if (!token) {
      if (isMounted.current) {
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }
      const response = await orderService.getOrders(0, 100, filterParams)

      // Only update state if still mounted
      if (!isMounted.current) return

      // Handle paginated response format
      if (response.data && response.meta) {
        setOrders(response.data)
        setPagination(response.meta)
      } else {
        // Fallback for non-paginated response (backward compatibility)
        setOrders(response)
        setPagination(null)
      }
    } catch (err) {
      if (!isMounted.current) return
      setError(err.response?.data?.detail || 'Failed to fetch orders')
      console.error('Order fetch error:', err)
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    fetchOrders(filters)

    return () => {
      isMounted.current = false
    }
  }, [JSON.stringify(filters), fetchOrders])

  const refetch = useCallback(async (filterParams) => {
    await fetchOrders(filterParams || filters)
  }, [fetchOrders, filters])

  return { orders, pagination, loading, error, refetch }
}

export const useOrderStats = (refreshTrigger = 0) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isMounted = useRef(true)

  const fetchStats = useCallback(async () => {
    // Check if token exists before fetching
    const token = localStorage.getItem('token')
    if (!token) {
      if (isMounted.current) {
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }
      const data = await orderService.getStats()

      // Only update state if still mounted
      if (!isMounted.current) return

      setStats(data)
    } catch (err) {
      if (!isMounted.current) return
      setError(err.response?.data?.detail || 'Failed to fetch statistics')
      console.error('Stats fetch error:', err)
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    fetchStats()

    return () => {
      isMounted.current = false
    }
  }, [refreshTrigger, fetchStats])

  const refetch = useCallback(async () => {
    await fetchStats()
  }, [fetchStats])

  return { stats, loading, error, refetch }
}
