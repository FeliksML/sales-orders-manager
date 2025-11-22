/**
 * Order Service for managing order data
 */
import api from './api'

export const orderService = {
  /**
   * Get all orders
   * @param {Object} filters - Filter options
   * @returns {Promise}
   */
  async getOrders(filters = {}) {
    const params = new URLSearchParams()

    if (filters.search) params.append('search', filters.search)
    if (filters.install_date_from) params.append('install_date_from', filters.install_date_from)
    if (filters.install_date_to) params.append('install_date_to', filters.install_date_to)

    const queryString = params.toString()
    const url = queryString ? `/api/orders?${queryString}` : '/api/orders'

    return api.get(url)
  },

  /**
   * Get single order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise}
   */
  async getOrder(orderId) {
    return api.get(`/api/orders/${orderId}`)
  },

  /**
   * Create new order
   * @param {Object} orderData - Order data
   * @returns {Promise}
   */
  async createOrder(orderData) {
    return api.post('/api/orders', orderData)
  },

  /**
   * Update existing order
   * @param {string} orderId - Order ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise}
   */
  async updateOrder(orderId, updates) {
    return api.put(`/api/orders/${orderId}`, updates)
  },

  /**
   * Delete order
   * @param {string} orderId - Order ID
   * @returns {Promise}
   */
  async deleteOrder(orderId) {
    return api.delete(`/api/orders/${orderId}`)
  },
}
