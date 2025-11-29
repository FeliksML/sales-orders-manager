import { useState, useEffect, useCallback, useRef } from 'react'
import { orderService } from '../services/orderService'
import { commissionService } from '../services/commissionService'
import { goalService } from '../services/goalService'
import followupService from '../services/followupService'

/**
 * Centralized hook for all Dashboard data fetching
 * Solves race conditions by:
 * 1. Deduplicating rapid refresh calls with cancellation
 * 2. Batching all data fetches into a single coordinated call
 * 3. Supporting selective refresh for specific data types
 */
export function useDashboardData(filters = {}) {
  // Consolidated state for all dashboard data
  const [orders, setOrders] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [earnings, setEarnings] = useState(null)
  const [goalProgress, setGoalProgress] = useState(null)
  const [todaysFollowups, setTodaysFollowups] = useState([])
  const [overdueCount, setOverdueCount] = useState(0)

  // Loading states
  const [loading, setLoading] = useState({
    orders: true,
    stats: true,
    earnings: true,
    goals: true,
    followups: true
  })
  const [error, setError] = useState(null)

  // Ref to track pending refresh for cancellation
  const pendingRefresh = useRef(null)
  const filtersRef = useRef(filters)

  // Keep filters ref updated
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  /**
   * Unified refresh function with deduplication and selective refresh
   * @param {Object} options - Which data to refresh
   * @param {boolean} options.all - Refresh everything (default: true)
   * @param {boolean} options.orders - Refresh orders
   * @param {boolean} options.stats - Refresh stats
   * @param {boolean} options.earnings - Refresh earnings
   * @param {boolean} options.goals - Refresh goal progress
   * @param {boolean} options.followups - Refresh followups
   */
  const refresh = useCallback(async (options = { all: true }) => {
    // Cancel any pending refresh to prevent race conditions
    if (pendingRefresh.current) {
      pendingRefresh.current.cancelled = true
    }

    const thisRefresh = { cancelled: false }
    pendingRefresh.current = thisRefresh

    // Small debounce to batch rapid successive calls
    await new Promise(resolve => setTimeout(resolve, 50))

    // If this refresh was cancelled by a newer one, abort
    if (thisRefresh.cancelled) return

    const shouldRefresh = {
      orders: options.all || options.orders,
      stats: options.all || options.stats,
      earnings: options.all || options.earnings,
      goals: options.all || options.goals,
      followups: options.all || options.followups
    }

    // Set loading states for what we're refreshing
    setLoading(prev => ({
      ...prev,
      ...(shouldRefresh.orders && { orders: true }),
      ...(shouldRefresh.stats && { stats: true }),
      ...(shouldRefresh.earnings && { earnings: true }),
      ...(shouldRefresh.goals && { goals: true }),
      ...(shouldRefresh.followups && { followups: true })
    }))

    try {
      // Build promise array based on what needs refreshing
      const promises = []
      const promiseKeys = []

      if (shouldRefresh.orders) {
        promises.push(orderService.getOrders(0, 100, filtersRef.current))
        promiseKeys.push('filteredOrders')
        promises.push(orderService.getOrders(0, 100, {}))
        promiseKeys.push('allOrders')
      }

      if (shouldRefresh.stats) {
        promises.push(orderService.getStats())
        promiseKeys.push('stats')
      }

      if (shouldRefresh.earnings) {
        promises.push(commissionService.getEarnings())
        promiseKeys.push('earnings')
      }

      if (shouldRefresh.goals) {
        promises.push(goalService.getProgress())
        promiseKeys.push('goals')
      }

      if (shouldRefresh.followups) {
        promises.push(followupService.getToday())
        promiseKeys.push('followups')
      }

      // Execute all promises in parallel
      const results = await Promise.all(promises)

      // If cancelled during fetch, don't update state
      if (thisRefresh.cancelled) return

      // Map results to state updates
      const resultMap = {}
      promiseKeys.forEach((key, index) => {
        resultMap[key] = results[index]
      })

      // Update states based on results
      if (resultMap.filteredOrders !== undefined) {
        const ordersResponse = resultMap.filteredOrders
        // Handle paginated response format
        if (ordersResponse.data && ordersResponse.meta) {
          setOrders(ordersResponse.data)
        } else {
          setOrders(ordersResponse)
        }
      }

      if (resultMap.allOrders !== undefined) {
        const allOrdersResponse = resultMap.allOrders
        if (allOrdersResponse.data && allOrdersResponse.meta) {
          setAllOrders(allOrdersResponse.data)
        } else {
          setAllOrders(allOrdersResponse)
        }
      }

      if (resultMap.stats !== undefined) {
        setStats(resultMap.stats)
      }

      if (resultMap.earnings !== undefined) {
        setEarnings(resultMap.earnings)
      }

      if (resultMap.goals !== undefined) {
        setGoalProgress(resultMap.goals)
      }

      if (resultMap.followups !== undefined) {
        const followupsData = resultMap.followups
        setTodaysFollowups(followupsData.followups || [])
        setOverdueCount(followupsData.overdue_count || 0)
      }

      setError(null)
    } catch (err) {
      if (!thisRefresh.cancelled) {
        console.error('Dashboard data fetch error:', err)
        setError(err.message || 'Failed to fetch dashboard data')
      }
    } finally {
      if (!thisRefresh.cancelled) {
        setLoading({
          orders: false,
          stats: false,
          earnings: false,
          goals: false,
          followups: false
        })
      }
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      refresh()
    } else {
      setLoading({
        orders: false,
        stats: false,
        earnings: false,
        goals: false,
        followups: false
      })
    }
  }, [refresh])

  // Refetch when filters change
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      refresh({ orders: true })
    }
  }, [JSON.stringify(filters), refresh])

  // Setup followup polling (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      refresh({ followups: true })
    }, 60000)

    return () => clearInterval(interval)
  }, [refresh])

  // Extract internet count from earnings for tier calculations
  const currentInternetCount = earnings?.breakdown?.find(b => b.product === 'Internet')?.count || 0

  // Computed loading states
  const isLoadingOrders = loading.orders
  const isLoadingStats = loading.stats
  const isLoadingAny = Object.values(loading).some(Boolean)

  return {
    // Data
    orders,
    allOrders,
    stats,
    earnings,
    goalProgress,
    todaysFollowups,
    overdueCount,
    currentInternetCount,

    // Loading states
    loading: isLoadingAny,
    ordersLoading: isLoadingOrders,
    statsLoading: isLoadingStats,

    // Error state
    error,

    // Unified refresh function
    refresh
  }
}

export default useDashboardData
