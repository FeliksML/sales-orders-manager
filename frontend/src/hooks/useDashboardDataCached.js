import { useEffect, useRef, useCallback } from 'react'
import { useDashboardDataContext } from '../contexts/DashboardDataContext'

/**
 * Adapter hook that uses the shared DashboardDataContext
 * Provides the same API as useDashboardData but with caching
 *
 * Uses Stale-While-Revalidate pattern:
 * - Returns cached data immediately (no loading spinner on tab switch)
 * - Triggers background refresh if data is stale
 */
export function useDashboardDataCached(filters = {}) {
  const {
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
    loading,
    ordersLoading,
    statsLoading,
    performanceInsightsLoading,
    aiStatusLoading,
    error,
    refresh,
    invalidate,
    isStale,
    filtersChanged
  } = useDashboardDataContext()

  const isInitialMount = useRef(true)
  const prevFiltersRef = useRef(filters)
  const hasToken = useRef(!!localStorage.getItem('token'))

  // Initial data fetch on mount (only if stale or no data)
  useEffect(() => {
    if (!hasToken.current) return

    // Check if we need to fetch any data
    const needsOrders = isStale('orders') || orders.length === 0
    const needsStats = isStale('stats') || stats === null
    const needsEarnings = isStale('earnings') || earnings === null
    const needsGoals = isStale('goals') || goalProgress === null
    const needsFollowups = isStale('followups')
    const needsPerformanceInsights = isStale('performanceInsights') || performanceInsights === null
    const needsAiStatus = isStale('aiStatus') || aiStatus === null

    if (needsOrders || needsStats || needsEarnings || needsGoals || needsFollowups || needsPerformanceInsights || needsAiStatus) {
      // Selective refresh based on what's stale
      refresh({
        orders: needsOrders,
        stats: needsStats,
        earnings: needsEarnings,
        goals: needsGoals,
        followups: needsFollowups,
        performanceInsights: needsPerformanceInsights,
        aiStatus: needsAiStatus
      }, filters)
    }
  }, []) // Only on mount

  // Handle filter changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (!hasToken.current) return

    const filtersStr = JSON.stringify(filters)
    const prevFiltersStr = JSON.stringify(prevFiltersRef.current)

    if (filtersStr !== prevFiltersStr) {
      prevFiltersRef.current = filters
      // Filter change - refresh orders only
      refresh({ orders: true }, filters)
    }
  }, [JSON.stringify(filters), refresh])

  // Wrapper for refresh that passes through filters
  const refreshWithFilters = useCallback(async (options = { all: true }) => {
    return refresh(options, prevFiltersRef.current)
  }, [refresh])

  // Return the same shape as useDashboardData
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
    performanceInsights,
    aiStatus,

    // Loading states
    loading,
    ordersLoading,
    statsLoading,
    performanceInsightsLoading,
    aiStatusLoading,

    // Error state
    error,

    // Actions
    refresh: refreshWithFilters,
    invalidate
  }
}

export default useDashboardDataCached
