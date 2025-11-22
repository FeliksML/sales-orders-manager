/**
 * Shared type definitions and interfaces
 * Using JSDoc for type documentation that works across JavaScript environments
 */

/**
 * @typedef {Object} Order
 * @property {string} orderid - Unique order identifier
 * @property {string} userid - User who created the order
 * @property {string} customer_name - Customer's full name
 * @property {string} [business_name] - Optional business name
 * @property {string} customer_email - Customer's email address
 * @property {string} customer_phone - Customer's phone number
 * @property {string} install_address - Installation address
 * @property {string} install_date - Installation date (ISO 8601)
 * @property {string} [spectrum_reference] - Spectrum reference number
 * @property {string} [customer_account_number] - Customer account number
 * @property {string} [job_number] - Job number
 * @property {boolean} internet - Internet service
 * @property {boolean} tv - TV service
 * @property {boolean} mobile - Mobile service
 * @property {boolean} voice - Voice service
 * @property {boolean} wib - WIB service
 * @property {boolean} sbc - SBC service
 * @property {string} [notes] - Additional notes
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Last update timestamp
 * @property {boolean} [synced] - Sync status for offline mode
 * @property {boolean} [deleted] - Soft delete flag
 */

/**
 * @typedef {Object} User
 * @property {string} userid - Unique user identifier
 * @property {string} email - User's email address
 * @property {string} name - User's full name
 * @property {string} created_at - Account creation timestamp
 * @property {boolean} [synced] - Sync status for offline mode
 */

/**
 * @typedef {Object} Notification
 * @property {string} notificationid - Unique notification identifier
 * @property {string} userid - User this notification belongs to
 * @property {string} message - Notification message
 * @property {string} type - Notification type (info, warning, error, success)
 * @property {boolean} read - Read status
 * @property {string} created_at - Creation timestamp
 * @property {boolean} [synced] - Sync status for offline mode
 */

/**
 * @typedef {Object} AuditLog
 * @property {string} auditid - Unique audit log identifier
 * @property {string} orderid - Order this audit log belongs to
 * @property {string} userid - User who made the change
 * @property {string} user_name - Name of user who made the change
 * @property {string} field_name - Field that was changed
 * @property {string} old_value - Previous value
 * @property {string} new_value - New value
 * @property {string} timestamp - When the change occurred
 */

/**
 * @typedef {Object} SyncQueueItem
 * @property {number} id - Auto-incremented ID
 * @property {string} operation - Operation type (CREATE, UPDATE, DELETE)
 * @property {string} entity - Entity type (order, notification, etc)
 * @property {string} [entityId] - Entity ID for UPDATE/DELETE operations
 * @property {Object} [data] - Data for CREATE/UPDATE operations
 * @property {string} timestamp - When queued
 * @property {boolean} synced - Whether synced to server
 * @property {number} retries - Number of retry attempts
 * @property {string} [lastError] - Last error message
 */

/**
 * @typedef {Object} FilterOptions
 * @property {string} [search] - Search query
 * @property {string} [install_date_from] - Start date filter
 * @property {string} [install_date_to] - End date filter
 * @property {boolean} [internet] - Filter by internet service
 * @property {boolean} [tv] - Filter by TV service
 * @property {boolean} [mobile] - Filter by mobile service
 * @property {boolean} [voice] - Filter by voice service
 * @property {boolean} [wib] - Filter by WIB service
 * @property {boolean} [sbc] - Filter by SBC service
 * @property {string} [install_status] - Filter by install status (installed, pending, today)
 */

export const OrderTypes = {
  ORDER: 'Order',
  USER: 'User',
  NOTIFICATION: 'Notification',
  AUDIT_LOG: 'AuditLog',
  SYNC_QUEUE_ITEM: 'SyncQueueItem'
}

export const NotificationTypes = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
}

export const SyncOperations = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
}

export const InstallStatus = {
  INSTALLED: 'installed',
  PENDING: 'pending',
  TODAY: 'today'
}
