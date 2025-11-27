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
  },

  // Bulk operations
  bulkMarkInstalled: async (orderIds) => {
    const response = await apiClient.post('/api/orders/bulk/mark-installed', {
      order_ids: orderIds
    })
    return response.data
  },

  bulkReschedule: async (orderIds, newDate) => {
    const response = await apiClient.post('/api/orders/bulk/reschedule', {
      order_ids: orderIds,
      new_date: newDate
    })
    return response.data
  },

  bulkDelete: async (orderIds) => {
    const response = await apiClient.delete('/api/orders/bulk/delete', {
      data: { order_ids: orderIds }
    })
    return response.data
  },

  bulkExport: async (orderIds, fileFormat = 'excel') => {
    const orderIdsStr = orderIds.join(',')
    const response = await apiClient.get('/api/orders/bulk/export', {
      params: {
        order_ids: orderIdsStr,
        file_format: fileFormat
      },
      responseType: 'blob'
    })

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    const extension = fileFormat === 'excel' ? 'xlsx' : 'csv'
    link.setAttribute('download', `orders_bulk_export_${new Date().getTime()}.${extension}`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

    return response.data
  },

  // Delta sync - get only orders updated since last sync
  getDeltaSync: async (lastSyncTimestamp) => {
    const response = await apiClient.get('/api/orders/delta', {
      params: {
        last_sync: lastSyncTimestamp
      }
    })
    return response.data
  },

  // Get performance insights with comparisons and trends
  getPerformanceInsights: async () => {
    const response = await apiClient.get('/api/orders/performance-insights')
    return response.data
  },

  // Generate AI-powered insights (max 3/day)
  generateAIInsights: async () => {
    const response = await apiClient.post('/api/orders/performance-insights/generate-ai')
    return response.data
  }
}
