import api from './api';

export const followupService = {
  /**
   * Create a new follow-up reminder for an order
   * @param {Object} data - { order_id, due_date, note? }
   */
  async create(data) {
    const response = await api.post('/api/followups', data);
    return response.data;
  },

  /**
   * Get all follow-ups with optional filtering
   * @param {Object} params - { skip?, limit?, status_filter?, include_completed? }
   */
  async getAll(params = {}) {
    const response = await api.get('/api/followups', { params });
    return response.data;
  },

  /**
   * Get today's due follow-ups for dashboard display
   */
  async getToday() {
    const response = await api.get('/api/followups/today');
    return response.data;
  },

  /**
   * Get a single follow-up by ID
   * @param {number} id 
   */
  async getById(id) {
    const response = await api.get(`/api/followups/${id}`);
    return response.data;
  },

  /**
   * Update a follow-up (note, date, or status)
   * @param {number} id 
   * @param {Object} data - { due_date?, note?, status? }
   */
  async update(id, data) {
    const response = await api.put(`/api/followups/${id}`, data);
    return response.data;
  },

  /**
   * Mark a follow-up as completed
   * @param {number} id 
   */
  async complete(id) {
    const response = await api.post(`/api/followups/${id}/complete`);
    return response.data;
  },

  /**
   * Snooze a follow-up by specified number of days
   * @param {number} id 
   * @param {number} days - Number of days to snooze (default 1)
   */
  async snooze(id, days = 1) {
    const response = await api.post(`/api/followups/${id}/snooze`, { days });
    return response.data;
  },

  /**
   * Delete a follow-up
   * @param {number} id 
   */
  async delete(id) {
    const response = await api.delete(`/api/followups/${id}`);
    return response.data;
  },

  /**
   * Get all follow-ups for a specific order
   * @param {number} orderId 
   */
  async getForOrder(orderId) {
    const response = await api.get(`/api/followups/order/${orderId}`);
    return response.data;
  }
};

export default followupService;

