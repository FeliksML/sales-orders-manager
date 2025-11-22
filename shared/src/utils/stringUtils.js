/**
 * String utility functions
 */

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string}
 */
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string}
 */
export const truncate = (str, maxLength, suffix = '...') => {
  if (!str || str.length <= maxLength) return str
  return str.substring(0, maxLength - suffix.length) + suffix
}

/**
 * Convert string to slug (lowercase with hyphens)
 * @param {string} str - String to convert
 * @returns {string}
 */
export const toSlug = (str) => {
  if (!str) return ''
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Format phone number
 * @param {string} phone - Phone number to format
 * @returns {string}
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return ''

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')

  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`
  }

  return phone
}

/**
 * Extract initials from name
 * @param {string} name - Full name
 * @returns {string}
 */
export const getInitials = (name) => {
  if (!name) return ''

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Check if string contains query (case-insensitive)
 * @param {string} str - String to search in
 * @param {string} query - Search query
 * @returns {boolean}
 */
export const containsIgnoreCase = (str, query) => {
  if (!str || !query) return false
  return str.toLowerCase().includes(query.toLowerCase())
}

/**
 * Generate random ID
 * @param {number} length - Length of ID
 * @returns {string}
 */
export const generateId = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Clean and normalize email
 * @param {string} email - Email address
 * @returns {string}
 */
export const normalizeEmail = (email) => {
  if (!email) return ''
  return email.trim().toLowerCase()
}

/**
 * Mask email address (show first 3 chars and domain)
 * @param {string} email - Email to mask
 * @returns {string}
 */
export const maskEmail = (email) => {
  if (!email) return ''

  const parts = email.split('@')
  if (parts.length !== 2) return email

  const username = parts[0]
  const domain = parts[1]

  if (username.length <= 3) {
    return `${username}***@${domain}`
  }

  return `${username.substring(0, 3)}***@${domain}`
}

/**
 * Join array with commas and 'and' for last item
 * @param {string[]} items - Array of strings
 * @returns {string}
 */
export const joinWithAnd = (items) => {
  if (!items || items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

/**
 * Pluralize word based on count
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, defaults to singular + 's')
 * @returns {string}
 */
export const pluralize = (count, singular, plural = null) => {
  if (count === 1) return singular
  return plural || `${singular}s`
}
