// Commission estimation for individual orders based on current tier

// Rate tables matching backend exactly
export const REGULAR_RATE_TABLE = [
  { min: 0, max: 4, internet: 0, mobile: 0, voice: 0, video: 0, mrr: 0, label: '0-4' },
  { min: 5, max: 9, internet: 100, mobile: 75, voice: 75, video: 60, mrr: 0.25, label: '5-9' },
  { min: 10, max: 19, internet: 200, mobile: 150, voice: 150, video: 120, mrr: 0.5, label: '10-19' },
  { min: 20, max: 29, internet: 225, mobile: 175, voice: 175, video: 150, mrr: 0.55, label: '20-29' },
  { min: 30, max: 39, internet: 250, mobile: 200, voice: 200, video: 175, mrr: 0.6, label: '30-39' },
  { min: 40, max: Infinity, internet: 300, mobile: 225, voice: 225, video: 200, mrr: 0.75, label: '40+' },
]

// New hire rate table - different tier structure (no 0-4 tier with $0 rates)
export const NEW_HIRE_RATE_TABLE = [
  { min: 0, max: 9, internet: 100, mobile: 75, voice: 75, video: 60, mrr: 0.25, label: '0-9' },
  { min: 10, max: 19, internet: 200, mobile: 150, voice: 150, video: 120, mrr: 0.5, label: '10-19' },
  { min: 20, max: 29, internet: 225, mobile: 175, voice: 175, video: 150, mrr: 0.55, label: '20-29' },
  { min: 30, max: 39, internet: 250, mobile: 200, voice: 200, video: 175, mrr: 0.6, label: '30-39' },
  { min: 40, max: Infinity, internet: 300, mobile: 225, voice: 225, video: 200, mrr: 0.75, label: '40+' },
]

// New hire ramp - guaranteed minimum commission for first 4 months
export const RAMP_TABLE = {
  1: 1300,
  2: 1100,
  3: 1000,
  4: 750,
  5: 0,
  6: 0,
}

const ALACARTE_RATES = {
  wib: 100,
  gig_internet: 100,
  sbc: 50
}

/**
 * Get the index of the current tier
 */
export function getTierIndex(internetCount = 0) {
  for (let i = 0; i < REGULAR_RATE_TABLE.length; i++) {
    const tier = REGULAR_RATE_TABLE[i]
    if (internetCount >= tier.min && internetCount <= tier.max) {
      return i
    }
  }
  return 0
}

/**
 * Get next tier info - returns null if already at max tier
 * @param {number} currentInternetCount - Current internet count
 * @param {Object} currentTotals - Current product totals { internet, mobile, voice, video, mrr, wib, gig, sbc }
 * @returns {Object|null} Next tier info or null if at max
 */
export function getNextTierInfo(currentInternetCount, currentTotals) {
  const currentTierIndex = getTierIndex(currentInternetCount)
  
  // If at max tier, return null
  if (currentTierIndex >= REGULAR_RATE_TABLE.length - 1) {
    return null
  }
  
  const currentTier = REGULAR_RATE_TABLE[currentTierIndex]
  const nextTier = REGULAR_RATE_TABLE[currentTierIndex + 1]
  
  // How many more internet needed to reach next tier
  const internetNeeded = nextTier.min - currentInternetCount
  
  // Calculate current earnings with current tier rates
  const currentRates = currentTier
  const currentPSU = (
    (currentTotals.internet || 0) * currentRates.internet +
    (currentTotals.mobile || 0) * currentRates.mobile +
    (currentTotals.voice || 0) * currentRates.voice +
    (currentTotals.video || 0) * currentRates.video
  )
  
  // Get raw MRR (divide current MRR payout by current rate to get raw value)
  const rawMrr = currentRates.mrr > 0 ? (currentTotals.mrr || 0) / currentRates.mrr : (currentTotals.mrr || 0)
  const currentMrrPayout = currentRates.mrr > 0 ? rawMrr * currentRates.mrr : 0
  
  // A-la-carte stays the same
  const currentAlacarte = currentTotals.alacarte || 0
  
  const currentTotal = currentPSU + currentMrrPayout + currentAlacarte
  
  // Calculate projected earnings at next tier
  // When reaching next tier, assume we add the internetNeeded to our count
  const projectedInternet = (currentTotals.internet || 0) + internetNeeded
  const nextRates = nextTier
  
  const projectedPSU = (
    projectedInternet * nextRates.internet +
    (currentTotals.mobile || 0) * nextRates.mobile +
    (currentTotals.voice || 0) * nextRates.voice +
    (currentTotals.video || 0) * nextRates.video
  )
  
  const projectedMrrPayout = rawMrr * nextRates.mrr
  
  // A-la-carte stays the same (but now eligible if wasn't before)
  const projectedAlacarte = nextTier.min > 4 ? currentAlacarte : 0
  
  const projectedTotal = projectedPSU + projectedMrrPayout + projectedAlacarte
  
  const increase = projectedTotal - currentTotal
  const percentIncrease = currentTotal > 0 ? ((projectedTotal - currentTotal) / currentTotal) * 100 : 0
  
  return {
    internetNeeded,
    currentTierLabel: currentTier.label,
    nextTierLabel: nextTier.label,
    nextTierMin: nextTier.min,
    currentTotal: Math.round(currentTotal),
    projectedTotal: Math.round(projectedTotal),
    increase: Math.round(increase),
    percentIncrease: Math.round(percentIncrease),
    // Breakdown of the increase
    breakdown: {
      internetIncrease: projectedInternet * nextRates.internet - (currentTotals.internet || 0) * currentRates.internet,
      mobileIncrease: (currentTotals.mobile || 0) * (nextRates.mobile - currentRates.mobile),
      voiceIncrease: (currentTotals.voice || 0) * (nextRates.voice - currentRates.voice),
      videoIncrease: (currentTotals.video || 0) * (nextRates.video - currentRates.video),
      mrrIncrease: rawMrr * (nextRates.mrr - currentRates.mrr),
    }
  }
}

/**
 * Get rate tier based on current internet count and user type
 * @param {number} internetCount - Total internet sales this fiscal month
 * @param {boolean} isNewHire - Whether user is a new hire (different rate table)
 * @returns {Object} Rate tier with rates for each product
 */
export function getRateTier(internetCount = 0, isNewHire = false) {
  const table = isNewHire ? NEW_HIRE_RATE_TABLE : REGULAR_RATE_TABLE
  for (const tier of table) {
    if (internetCount >= tier.min && internetCount <= tier.max) {
      return tier
    }
  }
  return table[0]
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
 * Estimate commission for a single order based on current tier and user settings
 * @param {Object} order - The order object
 * @param {number} currentInternetCount - User's current internet count for the fiscal month
 * @param {Object} userSettings - { isNewHire, aeType, newHireMonth }
 * @returns {number} Estimated commission
 */
export function estimateOrderCommission(order, currentInternetCount = 10, userSettings = {}) {
  const { isNewHire = false } = userSettings

  const rates = getRateTier(currentInternetCount, isNewHire)

  // For new hires, mobile/voice/video are ALWAYS eligible (no >4 requirement)
  // For regular reps, need internet > 4
  const productsEligible = isNewHire || currentInternetCount > 4
  const alacarteEligible = currentInternetCount > 4

  let total = 0

  // Internet (HSD)
  if (order.has_internet) {
    total += rates.internet
  }

  // Mobile - only paid if eligible
  if (order.has_mobile > 0 && productsEligible) {
    total += order.has_mobile * rates.mobile
  }

  // Voice - only paid if eligible
  if (order.has_voice > 0 && productsEligible) {
    total += order.has_voice * rates.voice
  }

  // Video/TV - only paid if eligible
  if (order.has_tv && productsEligible) {
    total += rates.video
  }

  // MRR - only paid if eligible
  if (order.monthly_total > 0 && productsEligible) {
    total += order.monthly_total * rates.mrr
  }

  // A-la-carte items (always require >4 internet, even for new hires)
  if (alacarteEligible) {
    if (order.has_wib) {
      total += ALACARTE_RATES.wib
    }
    if (order.has_gig) {
      total += ALACARTE_RATES.gig_internet
    }
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

