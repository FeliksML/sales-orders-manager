/**
 * Order-related utility functions
 */
import { getInstallStatus } from './dateUtils.js'
import { SERVICES, SERVICE_LABELS } from '../constants/index.js'

/**
 * Get list of services for an order
 * @param {Object} order - Order object
 * @returns {string[]} Array of service names
 */
export const getOrderServices = (order) => {
  const services = []

  Object.values(SERVICES).forEach(service => {
    if (order[service]) {
      services.push(SERVICE_LABELS[service])
    }
  })

  return services
}

/**
 * Get count of services for an order
 * @param {Object} order - Order object
 * @returns {number}
 */
export const getServiceCount = (order) => {
  return getOrderServices(order).length
}

/**
 * Check if order has specific service
 * @param {Object} order - Order object
 * @param {string} service - Service type
 * @returns {boolean}
 */
export const hasService = (order, service) => {
  return !!order[service]
}

/**
 * Get order status based on install date
 * @param {Object} order - Order object
 * @returns {string} Status: 'installed', 'today', or 'pending'
 */
export const getOrderStatus = (order) => {
  return getInstallStatus(order.install_date)
}

/**
 * Check if order is installed
 * @param {Object} order - Order object
 * @returns {boolean}
 */
export const isOrderInstalled = (order) => {
  return getOrderStatus(order) === 'installed'
}

/**
 * Check if order is scheduled for today
 * @param {Object} order - Order object
 * @returns {boolean}
 */
export const isOrderToday = (order) => {
  return getOrderStatus(order) === 'today'
}

/**
 * Check if order is pending
 * @param {Object} order - Order object
 * @returns {boolean}
 */
export const isOrderPending = (order) => {
  return getOrderStatus(order) === 'pending'
}

/**
 * Filter orders by search query
 * @param {Object[]} orders - Array of orders
 * @param {string} query - Search query
 * @returns {Object[]} Filtered orders
 */
export const searchOrders = (orders, query) => {
  if (!query || !query.trim()) return orders

  const searchLower = query.toLowerCase().trim()

  return orders.filter(order => {
    return (
      order.customer_name?.toLowerCase().includes(searchLower) ||
      order.business_name?.toLowerCase().includes(searchLower) ||
      order.customer_email?.toLowerCase().includes(searchLower) ||
      order.customer_phone?.toLowerCase().includes(searchLower) ||
      order.spectrum_reference?.toLowerCase().includes(searchLower) ||
      order.customer_account_number?.toLowerCase().includes(searchLower) ||
      order.job_number?.toLowerCase().includes(searchLower) ||
      order.install_address?.toLowerCase().includes(searchLower)
    )
  })
}

/**
 * Filter orders by services
 * @param {Object[]} orders - Array of orders
 * @param {Object} serviceFilters - Service filter object (e.g., { internet: true, tv: true })
 * @returns {Object[]} Filtered orders
 */
export const filterOrdersByServices = (orders, serviceFilters) => {
  const activeFilters = Object.entries(serviceFilters)
    .filter(([_, enabled]) => enabled)
    .map(([service, _]) => service)

  if (activeFilters.length === 0) return orders

  return orders.filter(order => {
    return activeFilters.some(service => order[service])
  })
}

/**
 * Filter orders by install status
 * @param {Object[]} orders - Array of orders
 * @param {string[]} statuses - Array of status values
 * @returns {Object[]} Filtered orders
 */
export const filterOrdersByStatus = (orders, statuses) => {
  if (!statuses || statuses.length === 0) return orders

  return orders.filter(order => {
    const orderStatus = getOrderStatus(order)
    return statuses.includes(orderStatus)
  })
}

/**
 * Sort orders by field
 * @param {Object[]} orders - Array of orders
 * @param {string} field - Field to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Object[]} Sorted orders
 */
export const sortOrders = (orders, field, direction = 'asc') => {
  return [...orders].sort((a, b) => {
    let aVal = a[field]
    let bVal = b[field]

    // Handle dates
    if (field === 'install_date' || field === 'created_at' || field === 'updated_at') {
      aVal = new Date(aVal).getTime()
      bVal = new Date(bVal).getTime()
    }

    // Handle strings
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = bVal?.toLowerCase() || ''
    }

    // Compare
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Group orders by date
 * @param {Object[]} orders - Array of orders
 * @returns {Object} Object with date keys and order arrays
 */
export const groupOrdersByDate = (orders) => {
  const grouped = {}

  orders.forEach(order => {
    const date = order.install_date?.split('T')[0] || 'No date'

    if (!grouped[date]) {
      grouped[date] = []
    }

    grouped[date].push(order)
  })

  return grouped
}

/**
 * Calculate order statistics
 * @param {Object[]} orders - Array of orders
 * @returns {Object} Statistics object
 */
export const calculateOrderStats = (orders) => {
  const stats = {
    total: orders.length,
    installed: 0,
    pending: 0,
    today: 0,
    services: {
      internet: 0,
      tv: 0,
      mobile: 0,
      voice: 0,
      wib: 0,
      sbc: 0
    }
  }

  orders.forEach(order => {
    const status = getOrderStatus(order)
    stats[status]++

    Object.values(SERVICES).forEach(service => {
      if (order[service]) {
        stats.services[service]++
      }
    })
  })

  return stats
}
