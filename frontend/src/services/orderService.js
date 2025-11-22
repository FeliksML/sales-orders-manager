import apiClient from './api'

export const orderService = {
  // Get all orders
  getOrders: async (skip = 0, limit = 100) => {
    const response = await apiClient.get('/api/orders/', {
      params: { skip, limit }
    })
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
  }
}
