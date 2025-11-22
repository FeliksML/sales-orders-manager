import apiClient from './api'

export const orderService = {
  // Get all orders with optional filters
  getOrders: async (skip = 0, limit = 100, filters = {}) => {
    const params = { skip, limit }

    // Add search parameter
    if (filters.search) {
      params.search = filters.search
    }

    // Add date range parameters
    if (filters.dateFrom) {
      params.date_from = filters.dateFrom
    }
    if (filters.dateTo) {
      params.date_to = filters.dateTo
    }

    // Add product types parameter
    const activeProducts = Object.entries(filters.productTypes || {})
      .filter(([_, enabled]) => enabled)
      .map(([product, _]) => product)
    if (activeProducts.length > 0) {
      params.product_types = activeProducts.join(',')
    }

    // Add install status parameter
    const activeStatuses = Object.entries(filters.installStatus || {})
      .filter(([_, enabled]) => enabled)
      .map(([status, _]) => status)
    if (activeStatuses.length > 0) {
      params.install_status = activeStatuses.join(',')
    }

    const response = await apiClient.get('/api/orders/', { params })
    return response.data
  },

  // Get single order
  getOrder: async (orderId) => {
    const response = await apiClient.get(`/api/orders/${orderId}`)
    return response.data
  },

  // Create new order
  createOrder: async (orderData) => {
    const response = await apiClient.post('/api/orders/', orderData)
    return response.data
  },

  // Update order
  updateOrder: async (orderId, orderData) => {
    const response = await apiClient.put(`/api/orders/${orderId}`, orderData)
    return response.data
  },

  // Delete order
  deleteOrder: async (orderId) => {
    console.log('orderService: Deleting order', orderId)
    const response = await apiClient.delete(`/api/orders/${orderId}`)
    console.log('orderService: Delete response:', response)
    return response
  },

  // Get order statistics
  getStats: async () => {
    const response = await apiClient.get('/api/orders/stats')
    return response.data
  },

  // Send order details to email
  sendOrderToEmail: async (orderId) => {
    const response = await apiClient.post(`/api/orders/${orderId}/email`)
    return response.data
  }
}
