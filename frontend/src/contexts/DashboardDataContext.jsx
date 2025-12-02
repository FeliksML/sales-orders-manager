import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { orderService } from '../services/orderService'
import { commissionService } from '../services/commissionService'
import { goalService } from '../services/goalService'
import followupService from '../services/followupService'

// Cache TTL configuration (in milliseconds)
const CACHE_TTL = {
  orders: 30000,      // 30 seconds
  stats: 60000,       // 1 minute
  earnings: 60000,    // 1 minute
  goals: 60000,       // 1 minute
  followups: 30000,   // 30 seconds
  performanceInsights: 120000,  // 2 minutes (heavy endpoint)
  aiStatus: 300000              // 5 minutes (rarely changes)
}

// Module-level cache (survives re-renders and component unmounts)
let dataCache = {
  orders: { data: [], timestamp: 0, filters: null },
  allOrders: { data: [], timestamp: 0 },
  stats: { data: null, timestamp: 0 },
  earnings: { data: null, timestamp: 0 },
  goals: { data: null, timestamp: 0 },
  followups: { data: [], overdueCount: 0, timestamp: 0 },
  performanceInsights: { data: null, timestamp: 0 },
  aiStatus: { data: null, timestamp: 0 }
}

const DashboardDataContext = createContext(null)

export const useDashboardDataContext = () => {
  const context = useContext(DashboardDataContext)
  if (!context) {
    throw new Error('useDashboardDataContext must be used within a DashboardDataProvider')
  }
  return context
}

// Optional context hook - returns null if outside provider (for components that can work standalone)
export const useOptionalDashboardDataContext = () => {
  return useContext(DashboardDataContext)
}

export const DashboardDataProvider = ({ children }) => {
  // State to trigger re-renders when cache updates
  const [orders, setOrders] = useState(dataCache.orders.data)
  const [allOrders, setAllOrders] = useState(dataCache.allOrders.data)
  const [stats, setStats] = useState(dataCache.stats.data)
  const [earnings, setEarnings] = useState(dataCache.earnings.data)
  const [goalProgress, setGoalProgress] = useState(dataCache.goals.data)
  const [todaysFollowups, setTodaysFollowups] = useState(dataCache.followups.data)
  const [overdueCount, setOverdueCount] = useState(dataCache.followups.overdueCount)
  const [performanceInsights, setPerformanceInsights] = useState(dataCache.performanceInsights.data)
  const [aiStatus, setAiStatus] = useState(dataCache.aiStatus.data)

  // Loading states
  const [loading, setLoading] = useState({
    orders: false,
    stats: false,
    earnings: false,
    goals: false,
    followups: false,
    performanceInsights: false,
    aiStatus: false
  })
  const [error, setError] = useState(null)

  // Track current filters for cache invalidation
  const currentFiltersRef = useRef(null)
  const pendingRefresh = useRef(null)

  /**
   * Check if a data type is stale (past TTL)
   */
  const isStale = useCallback((dataType) => {
    const now = Date.now()
    const cache = dataCache[dataType]
    if (!cache || !cache.timestamp) return true
    return (now - cache.timestamp) > CACHE_TTL[dataType]
  }, [])

  /**
   * Check if filters have changed (for orders cache)
   */
  const filtersChanged = useCallback((newFilters) => {
    const cached = dataCache.orders.filters
    return JSON.stringify(newFilters) !== JSON.stringify(cached)
  }, [])

  /**
   * Update cache and state together
   */
  const updateCache = useCallback((dataType, data, extra = {}) => {
    const now = Date.now()

    switch (dataType) {
      case 'orders':
        dataCache.orders = { data, timestamp: now, filters: extra.filters || null }
        setOrders(data)
        break
      case 'allOrders':
        dataCache.allOrders = { data, timestamp: now }
        setAllOrders(data)
        break
      case 'stats':
        dataCache.stats = { data, timestamp: now }
        setStats(data)
        break
      case 'earnings':
        dataCache.earnings = { data, timestamp: now }
        setEarnings(data)
        break
      case 'goals':
        dataCache.goals = { data, timestamp: now }
        setGoalProgress(data)
        break
      case 'followups':
        dataCache.followups = {
          data: data.followups || [],
          overdueCount: data.overdue_count || 0,
          timestamp: now
        }
        setTodaysFollowups(data.followups || [])
        setOverdueCount(data.overdue_count || 0)
        break
      case 'performanceInsights':
        dataCache.performanceInsights = { data, timestamp: now }
        setPerformanceInsights(data)
        break
      case 'aiStatus':
        dataCache.aiStatus = { data, timestamp: now }
        setAiStatus(data)
        break
    }
  }, [])

  /**
   * Invalidate specific cache entries (call after mutations)
   */
  const invalidate = useCallback((dataTypes) => {
    const types = Array.isArray(dataTypes) ? dataTypes : [dataTypes]
    types.forEach(type => {
      if (dataCache[type]) {
        dataCache[type].timestamp = 0
      }
    })
  }, [])

  /**
   * Unified refresh function with deduplication and selective refresh
   */
  const refresh = useCallback(async (options = { all: true }, filters = {}) => {
    const isFullRefresh = options.all === true

    // Cancel any pending refresh to prevent race conditions
    if (pendingRefresh.current) {
      if (pendingRefresh.current.isFullRefresh && !isFullRefresh) {
        return // Don't let partial refresh cancel full refresh
      }
      pendingRefresh.current.cancelled = true
    }

    const thisRefresh = { cancelled: false, isFullRefresh }
    pendingRefresh.current = thisRefresh

    // Small debounce to batch rapid successive calls
    await new Promise(resolve => setTimeout(resolve, 50))

    if (thisRefresh.cancelled) return

    const shouldRefresh = {
      orders: options.all || options.orders,
      stats: options.all || options.stats,
      earnings: options.all || options.earnings,
      goals: options.all || options.goals,
      followups: options.all || options.followups,
      performanceInsights: options.performanceInsights,  // Not included in 'all' - only fetch on Analytics tab
      aiStatus: options.aiStatus                          // Not included in 'all' - only fetch on Analytics tab
    }

    // Update filters ref
    if (shouldRefresh.orders && Object.keys(filters).length > 0) {
      currentFiltersRef.current = filters
    }

    // Set loading states
    setLoading(prev => ({
      ...prev,
      ...(shouldRefresh.orders && { orders: true }),
      ...(shouldRefresh.stats && { stats: true }),
      ...(shouldRefresh.earnings && { earnings: true }),
      ...(shouldRefresh.goals && { goals: true }),
      ...(shouldRefresh.followups && { followups: true }),
      ...(shouldRefresh.performanceInsights && { performanceInsights: true }),
      ...(shouldRefresh.aiStatus && { aiStatus: true })
    }))

    try {
      const promises = []
      const promiseKeys = []
      const effectiveFilters = currentFiltersRef.current || filters || {}

      if (shouldRefresh.orders) {
        promises.push(orderService.getOrders(0, 100, effectiveFilters))
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

      if (shouldRefresh.performanceInsights) {
        promises.push(orderService.getPerformanceInsights())
        promiseKeys.push('performanceInsights')
      }

      if (shouldRefresh.aiStatus) {
        promises.push(orderService.getAIInsightsStatus())
        promiseKeys.push('aiStatus')
      }

      const results = await Promise.all(promises)

      if (thisRefresh.cancelled) return

      // Map results and update cache
      const resultMap = {}
      promiseKeys.forEach((key, index) => {
        resultMap[key] = results[index]
      })

      if (resultMap.filteredOrders !== undefined) {
        const ordersResponse = resultMap.filteredOrders
        const ordersData = ordersResponse.data && ordersResponse.meta
          ? ordersResponse.data
          : ordersResponse
        updateCache('orders', ordersData, { filters: effectiveFilters })
      }

      if (resultMap.allOrders !== undefined) {
        const allOrdersResponse = resultMap.allOrders
        const allOrdersData = allOrdersResponse.data && allOrdersResponse.meta
          ? allOrdersResponse.data
          : allOrdersResponse
        updateCache('allOrders', allOrdersData)
      }

      if (resultMap.stats !== undefined) {
        updateCache('stats', resultMap.stats)
      }

      if (resultMap.earnings !== undefined) {
        updateCache('earnings', resultMap.earnings)
      }

      if (resultMap.goals !== undefined) {
        updateCache('goals', resultMap.goals)
      }

      if (resultMap.followups !== undefined) {
        updateCache('followups', resultMap.followups)
      }

      if (resultMap.performanceInsights !== undefined) {
        updateCache('performanceInsights', resultMap.performanceInsights)
      }

      if (resultMap.aiStatus !== undefined) {
        updateCache('aiStatus', resultMap.aiStatus)
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
          followups: false,
          performanceInsights: false,
          aiStatus: false
        })
      }
    }
  }, [updateCache])

  // Setup followup polling (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isStale('followups')) {
        refresh({ followups: true })
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [refresh, isStale])

  // Compute derived values
  const currentInternetCount = earnings?.breakdown?.find(b => b.product === 'Internet')?.count || 0
  const isLoadingOrders = loading.orders
  const isLoadingStats = loading.stats
  const isLoadingAny = Object.values(loading).some(Boolean)

  const value = {
    // Data
    orders,
    allOrders,
    stats,
    earnings,
    goalProgress,
    todaysFollowups,
    overdueCount,
    currentInternetCount,
    performanceInsights,
    aiStatus,

    // Loading states
    loading: isLoadingAny,
    ordersLoading: isLoadingOrders,
    statsLoading: isLoadingStats,
    performanceInsightsLoading: loading.performanceInsights,
    aiStatusLoading: loading.aiStatus,

    // Error state
    error,

    // Actions
    refresh,
    invalidate,
    isStale,
    filtersChanged
  }

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  )
}

export default DashboardDataContext
