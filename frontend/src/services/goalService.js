import apiClient from './api'

export const goalService = {
  // Get current month's goal
  getGoal: async () => {
    const response = await apiClient.get('/api/goals')
    return response.data
  },

  // Update current month's goal
  updateGoal: async (goalData) => {
    const response = await apiClient.put('/api/goals', goalData)
    return response.data
  },

  // Get goal progress with pace calculations
  getProgress: async () => {
    const response = await apiClient.get('/api/goals/progress')
    return response.data
  },

  // Get historical goal achievement
  getHistory: async (months = 6) => {
    const response = await apiClient.get(`/api/goals/history?months=${months}`)
    return response.data
  },

  // Clear current month's goal
  clearGoal: async () => {
    const response = await apiClient.delete('/api/goals')
    return response.data
  }
}

export default goalService

