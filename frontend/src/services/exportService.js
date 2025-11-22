import apiClient from './api'

export const exportService = {
  // Get available columns for export
  getAvailableColumns: async () => {
    const response = await apiClient.get('/api/orders/export/columns')
    return response.data
  },

  // Export orders to Excel
  exportToExcel: async (filters = {}, columns = null) => {
    const params = buildExportParams(filters, columns)

    const response = await apiClient.get('/api/orders/export/excel', {
      params,
      responseType: 'blob'
    })

    // Download the file
    const filename = getFilenameFromResponse(response) || `orders_export_${new Date().getTime()}.xlsx`
    downloadFile(response.data, filename)
  },

  // Export orders to CSV
  exportToCSV: async (filters = {}, columns = null) => {
    const params = buildExportParams(filters, columns)

    const response = await apiClient.get('/api/orders/export/csv', {
      params,
      responseType: 'blob'
    })

    // Download the file
    const filename = getFilenameFromResponse(response) || `orders_export_${new Date().getTime()}.csv`
    downloadFile(response.data, filename)
  },

  // Export statistics report
  exportStatsReport: async () => {
    const response = await apiClient.get('/api/orders/export/stats', {
      responseType: 'blob'
    })

    // Download the file
    const filename = getFilenameFromResponse(response) || `statistics_report_${new Date().getTime()}.xlsx`
    downloadFile(response.data, filename)
  },

  // Email export to user
  emailExport: async (format, filters = {}, columns = null, recaptchaToken) => {
    const params = buildExportParams(filters, columns)

    const response = await apiClient.post('/api/orders/export/email', {
      file_format: format,
      columns: params.columns || null,
      search: params.search || null,
      date_from: params.date_from || null,
      date_to: params.date_to || null,
      product_types: params.product_types || null,
      install_status: params.install_status || null,
      recaptcha_token: recaptchaToken
    })

    return response.data
  }
}

// Helper function to build export parameters
function buildExportParams(filters, columns) {
  const params = {}

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

  // Add columns parameter
  if (columns && columns.length > 0) {
    params.columns = columns.join(',')
  }

  return params
}

// Helper function to extract filename from response headers
function getFilenameFromResponse(response) {
  const contentDisposition = response.headers['content-disposition']
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
    if (filenameMatch && filenameMatch[1]) {
      return filenameMatch[1]
    }
  }
  return null
}

// Helper function to trigger file download
function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
