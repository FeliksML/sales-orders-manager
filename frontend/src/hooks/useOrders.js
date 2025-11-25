import { useState, useEffect } from 'react'
import { orderService } from '../services/orderService'

export const useOrders = (filters = {}) => {
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOrders = async (filterParams = filters) => {
    // Check if token exists before fetching
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await orderService.getOrders(0, 100, filterParams)
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
      setError(err.response?.data?.detail || 'Failed to fetch orders')
      console.error('Order fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(filters)
  }, [JSON.stringify(filters)])

  const refetch = async (filterParams) => {
    await fetchOrders(filterParams || filters)
  }

  return { orders, pagination, loading, error, refetch }
}

export const useOrderStats = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = async () => {
    console.log('📈 fetchStats() called')
    // Check if token exists before fetching
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('📈 No token, skipping stats fetch')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('📈 Calling orderService.getStats()...')
      const data = await orderService.getStats()
      console.log('📈 Stats received:', data)
      setStats(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch statistics')
      console.error('📈 Stats fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const refetch = async () => {
    await fetchStats()
  }

  return { stats, loading, error, refetch }
}
