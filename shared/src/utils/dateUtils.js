/**
 * Date utility functions using date-fns
 */
import { format, parseISO, isToday, isPast, isFuture, formatDistanceToNow, addDays, subDays } from 'date-fns'
import { DATE_FORMATS } from '../constants/index.js'

/**
 * Format a date string or Date object
 * @param {string|Date} date - Date to format
 * @param {string} formatStr - Format string (use DATE_FORMATS constants)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatStr = DATE_FORMATS.DISPLAY) => {
  if (!date) return ''

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date

    if (formatStr === DATE_FORMATS.RELATIVE) {
      return formatDistanceToNow(dateObj, { addSuffix: true })
    }

    return format(dateObj, formatStr)
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

/**
 * Check if a date is today
 * @param {string|Date} date - Date to check
 * @returns {boolean}
 */
export const isDateToday = (date) => {
  if (!date) return false
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isToday(dateObj)
  } catch (error) {
    return false
  }
}

/**
 * Check if a date is in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean}
 */
export const isDatePast = (date) => {
  if (!date) return false
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isPast(dateObj) && !isToday(dateObj)
  } catch (error) {
    return false
  }
}

/**
 * Check if a date is in the future
 * @param {string|Date} date - Date to check
 * @returns {boolean}
 */
export const isDateFuture = (date) => {
  if (!date) return false
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isFuture(dateObj)
  } catch (error) {
    return false
  }
}

/**
 * Get install status based on date
 * @param {string|Date} installDate - Installation date
 * @returns {string} Status: 'installed', 'today', or 'pending'
 */
export const getInstallStatus = (installDate) => {
  if (!installDate) return 'pending'

  if (isDateToday(installDate)) return 'today'
  if (isDatePast(installDate)) return 'installed'
  return 'pending'
}

/**
 * Add days to a date
 * @param {string|Date} date - Starting date
 * @param {number} days - Number of days to add
 * @returns {Date}
 */
export const addDaysToDate = (date, days) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return addDays(dateObj, days)
}

/**
 * Subtract days from a date
 * @param {string|Date} date - Starting date
 * @param {number} days - Number of days to subtract
 * @returns {Date}
 */
export const subtractDaysFromDate = (date, days) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return subDays(dateObj, days)
}

/**
 * Get ISO date string (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string}
 */
export const toISODate = (date) => {
  return format(date, DATE_FORMATS.ISO)
}

/**
 * Parse ISO date string to Date object
 * @param {string} dateStr - ISO date string
 * @returns {Date}
 */
export const fromISODate = (dateStr) => {
  return parseISO(dateStr)
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param {string|Date} date - Date to format
 * @returns {string}
 */
export const getRelativeTime = (date) => {
  return formatDate(date, DATE_FORMATS.RELATIVE)
}

/**
 * Check if date is within a range
 * @param {string|Date} date - Date to check
 * @param {string|Date} startDate - Range start date
 * @param {string|Date} endDate - Range end date
 * @returns {boolean}
 */
export const isDateInRange = (date, startDate, endDate) => {
  if (!date) return false

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const start = startDate ? (typeof startDate === 'string' ? parseISO(startDate) : startDate) : null
    const end = endDate ? (typeof endDate === 'string' ? parseISO(endDate) : endDate) : null

    if (start && dateObj < start) return false
    if (end && dateObj > end) return false

    return true
  } catch (error) {
    return false
  }
}
