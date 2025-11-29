/**
 * Centralized auth utilities - single source of truth for token handling
 *
 * This module consolidates token expiration logic that was previously
 * duplicated in AuthContext.jsx (60s buffer) and api.js (10s buffer).
 */

// Single buffer constant - 30 seconds balances security and UX
// - Long enough to handle slow API responses
// - Short enough to avoid premature logouts
export const TOKEN_EXPIRY_BUFFER_MS = 30000

/**
 * Check if a JWT token is expired (client-side check)
 * Note: Server is the source of truth, this is for UX optimization
 *
 * @param {string|null} token - JWT token to check
 * @returns {boolean} - true if token is expired or invalid
 */
export const isTokenExpired = (token) => {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now() + TOKEN_EXPIRY_BUFFER_MS
  } catch {
    return true
  }
}

/**
 * Clear all auth-related data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('rememberMe')
}

/**
 * Redirect to login page with reason
 * Prevents multiple redirects by checking current path
 *
 * @param {string} reason - Reason for redirect (used in query param)
 */
export const redirectToLogin = (reason = 'expired') => {
  if (!window.location.pathname.includes('/login')) {
    window.location.href = `/login?session=${reason}`
  }
}
