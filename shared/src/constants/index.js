/**
 * Shared constants across web and mobile apps
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 0
}

// Sync Configuration
export const SYNC_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
  SYNC_INTERVAL: 30000, // 30 seconds
  BATCH_SIZE: 10
}

// Cache Configuration
export const CACHE_CONFIG = {
  ORDERS_TTL: 300000, // 5 minutes
  NOTIFICATIONS_TTL: 60000, // 1 minute
  USER_TTL: 3600000, // 1 hour
  STATIC_TTL: 86400000 // 24 hours
}

// Service Types
export const SERVICES = {
  INTERNET: 'internet',
  TV: 'tv',
  MOBILE: 'mobile',
  VOICE: 'voice',
  WIB: 'wib',
  SBC: 'sbc'
}

export const SERVICE_LABELS = {
  [SERVICES.INTERNET]: 'Internet',
  [SERVICES.TV]: 'TV',
  [SERVICES.MOBILE]: 'Mobile',
  [SERVICES.VOICE]: 'Voice',
  [SERVICES.WIB]: 'WIB',
  [SERVICES.SBC]: 'SBC'
}

export const SERVICE_COLORS = {
  [SERVICES.INTERNET]: 'blue',
  [SERVICES.TV]: 'purple',
  [SERVICES.MOBILE]: 'green',
  [SERVICES.VOICE]: 'orange',
  [SERVICES.WIB]: 'indigo',
  [SERVICES.SBC]: 'pink'
}

// Install Status
export const INSTALL_STATUS = {
  INSTALLED: 'installed',
  PENDING: 'pending',
  TODAY: 'today'
}

export const INSTALL_STATUS_LABELS = {
  [INSTALL_STATUS.INSTALLED]: 'Installed',
  [INSTALL_STATUS.PENDING]: 'Pending',
  [INSTALL_STATUS.TODAY]: 'Today'
}

export const INSTALL_STATUS_COLORS = {
  [INSTALL_STATUS.INSTALLED]: 'green',
  [INSTALL_STATUS.PENDING]: 'blue',
  [INSTALL_STATUS.TODAY]: 'yellow'
}

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
}

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\d\s\-\+\(\)]+$/,
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  MAX_NOTES_LENGTH: 1000
}

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM d, yyyy',
  DISPLAY_WITH_TIME: 'MMM d, yyyy h:mm a',
  ISO: 'yyyy-MM-dd',
  ISO_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss",
  TIME: 'h:mm a',
  RELATIVE: 'relative' // Special flag for relative time
}

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  THEME: 'theme',
  FILTER_PRESETS: 'filter_presets',
  LAST_SYNC: 'last_sync',
  OFFLINE_MODE: 'offline_mode'
}

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  OFFLINE: 'You are offline. Changes will sync when connection is restored.',
  SYNC_FAILED: 'Sync failed. Will retry automatically.',
  UNKNOWN_ERROR: 'An unexpected error occurred.'
}

// Success Messages
export const SUCCESS_MESSAGES = {
  ORDER_CREATED: 'Order created successfully',
  ORDER_UPDATED: 'Order updated successfully',
  ORDER_DELETED: 'Order deleted successfully',
  SYNC_COMPLETE: 'All changes synced',
  EMAIL_SENT: 'Email sent successfully',
  EXPORT_COMPLETE: 'Export completed successfully'
}

// Feature Flags
export const FEATURES = {
  OFFLINE_MODE: true,
  PUSH_NOTIFICATIONS: true,
  BIOMETRIC_AUTH: true,
  CAMERA_INTEGRATION: true,
  LOCATION_TRACKING: true,
  DARK_MODE: true,
  ANALYTICS: false
}
