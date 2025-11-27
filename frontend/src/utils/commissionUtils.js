// Simple commission estimation for individual orders
// Note: This is an estimate - actual commission depends on monthly tier

// Base rates (mid-tier estimates for display purposes)
const BASE_RATES = {
  internet: 200,  // Mid-tier rate
  mobile: 150,
  voice: 150,
  video: 120,
  mrr: 0.5,
  wib: 100,
  gig_internet: 100,
  sbc: 50
}

/**
 * Estimate commission for a single order
 * This is a simplified estimate for display purposes
 * @param {Object} order - The order object
 * @returns {number} Estimated commission
 */
export function estimateOrderCommission(order) {
  let total = 0
  
  // Internet
  if (order.has_internet) {
    total += BASE_RATES.internet
  }
  
  // Mobile
  if (order.has_mobile > 0) {
    total += order.has_mobile * BASE_RATES.mobile
  }
  
  // Voice
  if (order.has_voice > 0) {
    total += order.has_voice * BASE_RATES.voice
  }
  
  // Video/TV
  if (order.has_tv) {
    total += BASE_RATES.video
  }
  
  // MRR (simplified)
  if (order.monthly_total > 0) {
    total += order.monthly_total * BASE_RATES.mrr
  }
  
  // WIB
  if (order.has_wib) {
    total += BASE_RATES.wib
  }
  
  // Gig Internet bonus
  if (order.internet_tier && order.internet_tier.toLowerCase().includes('gig')) {
    total += BASE_RATES.gig_internet
  }
  
  // SBC
  if (order.has_sbc > 0) {
    total += order.has_sbc * BASE_RATES.sbc
  }
  
  return Math.round(total)
}

/**
 * Format currency for display
 * @param {number} val - The value to format
 * @returns {string} Formatted currency string
 */
export function formatCommission(val) {
  if (val === 0) return '$0'
  return '$' + val.toLocaleString('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })
}

