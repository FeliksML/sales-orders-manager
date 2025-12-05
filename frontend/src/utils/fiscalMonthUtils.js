/**
 * Fiscal Month Utilities
 *
 * Fiscal month runs from 28th 6pm of previous month to 28th 6pm of current month.
 * Example: "November 2025" fiscal month = Oct 28 6pm to Nov 28 6pm
 */

/**
 * Get the current fiscal month label in YYYY-MM format.
 * @returns {string} Current fiscal month (e.g., "2025-12")
 */
export function getCurrentFiscalMonth() {
  const now = new Date()
  const day = now.getDate()
  const hour = now.getHours()

  // Before 28th 6pm, we're in the current calendar month's fiscal
  // After 28th 6pm, we're in the next month's fiscal
  if (day > 28 || (day === 28 && hour >= 18)) {
    // Move to next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return formatYearMonth(nextMonth.getFullYear(), nextMonth.getMonth() + 1)
  }
  return formatYearMonth(now.getFullYear(), now.getMonth() + 1)
}

/**
 * Format year and month to YYYY-MM string.
 * @param {number} year - The year
 * @param {number} month - The month (1-12)
 * @returns {string} Formatted string (e.g., "2025-11")
 */
export function formatYearMonth(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * Parse YYYY-MM string to year and month numbers.
 * @param {string} yearMonth - String in YYYY-MM format
 * @returns {{year: number, month: number}} Parsed year and month
 */
export function parseYearMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number)
  return { year, month }
}

/**
 * Convert YYYY-MM to display label (e.g., "November 2025").
 * @param {string} yearMonth - String in YYYY-MM format
 * @returns {string} Formatted display label
 */
export function formatFiscalMonthLabel(yearMonth) {
  const { year, month } = parseYearMonth(yearMonth)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Get fiscal month date range for display.
 * @param {string} yearMonth - String in YYYY-MM format
 * @returns {{start: string, end: string}} Start and end date strings
 */
export function getFiscalMonthRange(yearMonth) {
  const { year, month } = parseYearMonth(yearMonth)

  // Previous month's 28th
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const startDate = new Date(prevYear, prevMonth - 1, 28)
  const endDate = new Date(year, month - 1, 28)

  const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return {
    start: `${formatDate(startDate)}, 6pm`,
    end: `${formatDate(endDate)}, 6pm`
  }
}

/**
 * Check if a YYYY-MM is in the future (after current fiscal month).
 * @param {string} yearMonth - String in YYYY-MM format
 * @returns {boolean} True if the month is in the future
 */
export function isFutureFiscalMonth(yearMonth) {
  const current = getCurrentFiscalMonth()
  return yearMonth > current
}

/**
 * Get the previous fiscal month label.
 * @param {string} yearMonth - String in YYYY-MM format
 * @returns {string} Previous fiscal month in YYYY-MM format
 */
export function getPreviousFiscalMonth(yearMonth) {
  const { year, month } = parseYearMonth(yearMonth)
  if (month === 1) {
    return formatYearMonth(year - 1, 12)
  }
  return formatYearMonth(year, month - 1)
}

/**
 * Get the next fiscal month label.
 * @param {string} yearMonth - String in YYYY-MM format
 * @returns {string} Next fiscal month in YYYY-MM format
 */
export function getNextFiscalMonth(yearMonth) {
  const { year, month } = parseYearMonth(yearMonth)
  if (month === 12) {
    return formatYearMonth(year + 1, 1)
  }
  return formatYearMonth(year, month + 1)
}

/**
 * Get array of months for a given year.
 * @param {number} year - The year
 * @returns {Array<{value: string, label: string, disabled: boolean}>} Array of month objects
 */
export function getMonthsForYear(year) {
  const currentFiscal = getCurrentFiscalMonth()
  const months = []

  for (let month = 1; month <= 12; month++) {
    const value = formatYearMonth(year, month)
    const date = new Date(year, month - 1, 1)
    const label = date.toLocaleDateString('en-US', { month: 'short' })
    const disabled = value > currentFiscal

    months.push({ value, label, disabled })
  }

  return months
}

/**
 * Get array of available years for the picker.
 * Goes back 5 years from current year.
 * @returns {number[]} Array of years
 */
export function getAvailableYears() {
  const currentYear = new Date().getFullYear()
  const years = []

  // Go back 5 years
  for (let i = 0; i <= 5; i++) {
    years.push(currentYear - i)
  }

  return years
}
