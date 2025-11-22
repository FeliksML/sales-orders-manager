import { useState, useEffect } from 'react'
import { orderService } from '../services/orderService'

export const useOrders = (filters = {}) => {
  const [orders, setOrders] = useState([])
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
      const data = await orderService.getOrders(0, 100, filterParams)
      setOrders(data)
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

  const refetch = (filterParams) => {
    fetchOrders(filterParams || filters)
  }

  return { orders, loading, error, refetch }
}

export const useOrderStats = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = async () => {
    // Check if token exists before fetching
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await orderService.getStats()
      setStats(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch statistics')
      console.error('Stats fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const refetch = () => {
    fetchStats()
  }

  return { stats, loading, error, refetch }
}
