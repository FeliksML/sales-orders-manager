// Commission estimation for individual orders based on current tier

// Rate tables matching backend exactly
const REGULAR_RATE_TABLE = [
  { min: 0, max: 4, internet: 0, mobile: 0, voice: 0, video: 0, mrr: 0 },
  { min: 5, max: 9, internet: 100, mobile: 75, voice: 75, video: 60, mrr: 0.25 },
  { min: 10, max: 19, internet: 200, mobile: 150, voice: 150, video: 120, mrr: 0.5 },
  { min: 20, max: 29, internet: 225, mobile: 175, voice: 175, video: 150, mrr: 0.55 },
  { min: 30, max: 39, internet: 250, mobile: 200, voice: 200, video: 175, mrr: 0.6 },
  { min: 40, max: Infinity, internet: 300, mobile: 225, voice: 225, video: 200, mrr: 0.75 },
]

const ALACARTE_RATES = {
  wib: 100,
  gig_internet: 100,
  sbc: 50
}

/**
 * Get rate tier based on current internet count
 * @param {number} internetCount - Total internet sales this fiscal month
 * @returns {Object} Rate tier with rates for each product
 */
export function getRateTier(internetCount = 0) {
  for (const tier of REGULAR_RATE_TABLE) {
    if (internetCount >= tier.min && internetCount <= tier.max) {
      return tier
    }
  }
  return REGULAR_RATE_TABLE[0]
}

/**
 * Get tier label string
 * @param {number} internetCount - Total internet sales this fiscal month
 * @returns {string} Tier label like "5-9" or "40+"
 */
export function getTierLabel(internetCount = 0) {
  const tier = getRateTier(internetCount)
  if (tier.max === Infinity) {
    return `${tier.min}+`
  }
  return `${tier.min}-${tier.max}`
}

/**
 * Estimate commission for a single order based on current tier
 * @param {Object} order - The order object
 * @param {number} currentInternetCount - User's current internet count for the fiscal month
 * @returns {number} Estimated commission
 */
export function estimateOrderCommission(order, currentInternetCount = 10) {
  const rates = getRateTier(currentInternetCount)
  const alacarteEligible = currentInternetCount > 4
  
  let total = 0
  
  // Internet (HSD)
  if (order.has_internet) {
    total += rates.internet
  }
  
  // Mobile - only paid if internet > 4 (for regular reps)
  if (order.has_mobile > 0 && currentInternetCount > 4) {
    total += order.has_mobile * rates.mobile
  }
  
  // Voice - only paid if internet > 4 (for regular reps)
  if (order.has_voice > 0 && currentInternetCount > 4) {
    total += order.has_voice * rates.voice
  }
  
  // Video/TV - only paid if internet > 4 (for regular reps)
  if (order.has_tv && currentInternetCount > 4) {
    total += rates.video
  }
  
  // MRR - only paid if internet > 4
  if (order.monthly_total > 0 && currentInternetCount > 4) {
    total += order.monthly_total * rates.mrr
  }
  
  // A-la-carte items (require >4 internet)
  if (alacarteEligible) {
    // WIB
    if (order.has_wib) {
      total += ALACARTE_RATES.wib
    }
    
    // Gig Internet bonus
    if (order.has_gig) {
      total += ALACARTE_RATES.gig_internet
    }
    
    // SBC
    if (order.has_sbc > 0) {
      total += order.has_sbc * ALACARTE_RATES.sbc
    }
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

