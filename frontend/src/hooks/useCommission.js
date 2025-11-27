import { useState, useEffect, useCallback } from 'react'
import { commissionService } from '../services/commissionService'

/**
 * Hook to fetch and manage commission earnings data
 */
export function useEarnings() {
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true)
      const data = await commissionService.getEarnings()
      setEarnings(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch earnings:', err)
      setError('Failed to load earnings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEarnings()
  }, [fetchEarnings])

  // Extract internet count from breakdown for tier calculations
  const currentInternetCount = earnings?.breakdown?.find(b => b.product === 'Internet')?.count || 0

  return {
    earnings,
    loading,
    error,
    refetch: fetchEarnings,
    currentInternetCount
  }
}

/**
 * Hook to fetch commission settings
 */
export function useCommissionSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const data = await commissionService.getSettings()
      setSettings(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch commission settings:', err)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSettings = useCallback(async (newSettings) => {
    try {
      const data = await commissionService.updateSettings(newSettings)
      setSettings(data)
      return data
    } catch (err) {
      console.error('Failed to update commission settings:', err)
      throw err
    }
  }, [])

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateSettings
  }
}

