/**
 * US State Tax Rates for 2024
 * These are top marginal income tax rates (simplified for commission calculation)
 * Note: Some states have no income tax, some have flat rates, some have graduated brackets
 */

export const US_STATES = [
  { code: 'AL', name: 'Alabama', rate: 0.05 },
  { code: 'AK', name: 'Alaska', rate: 0 },  // No state income tax
  { code: 'AZ', name: 'Arizona', rate: 0.025 },
  { code: 'AR', name: 'Arkansas', rate: 0.047 },
  { code: 'CA', name: 'California', rate: 0.093 },  // Top rate 12.3%, using 9.3% as common bracket
  { code: 'CO', name: 'Colorado', rate: 0.044 },
  { code: 'CT', name: 'Connecticut', rate: 0.0699 },
  { code: 'DE', name: 'Delaware', rate: 0.066 },
  { code: 'FL', name: 'Florida', rate: 0 },  // No state income tax
  { code: 'GA', name: 'Georgia', rate: 0.0549 },
  { code: 'HI', name: 'Hawaii', rate: 0.0825 },
  { code: 'ID', name: 'Idaho', rate: 0.058 },
  { code: 'IL', name: 'Illinois', rate: 0.0495 },
  { code: 'IN', name: 'Indiana', rate: 0.0305 },
  { code: 'IA', name: 'Iowa', rate: 0.057 },
  { code: 'KS', name: 'Kansas', rate: 0.057 },
  { code: 'KY', name: 'Kentucky', rate: 0.04 },
  { code: 'LA', name: 'Louisiana', rate: 0.0425 },
  { code: 'ME', name: 'Maine', rate: 0.0715 },
  { code: 'MD', name: 'Maryland', rate: 0.0575 },
  { code: 'MA', name: 'Massachusetts', rate: 0.05 },
  { code: 'MI', name: 'Michigan', rate: 0.0425 },
  { code: 'MN', name: 'Minnesota', rate: 0.0785 },
  { code: 'MS', name: 'Mississippi', rate: 0.05 },
  { code: 'MO', name: 'Missouri', rate: 0.048 },
  { code: 'MT', name: 'Montana', rate: 0.059 },
  { code: 'NE', name: 'Nebraska', rate: 0.0564 },
  { code: 'NV', name: 'Nevada', rate: 0 },  // No state income tax
  { code: 'NH', name: 'New Hampshire', rate: 0 },  // No wage income tax
  { code: 'NJ', name: 'New Jersey', rate: 0.0637 },
  { code: 'NM', name: 'New Mexico', rate: 0.049 },
  { code: 'NY', name: 'New York', rate: 0.0685 },
  { code: 'NC', name: 'North Carolina', rate: 0.0475 },
  { code: 'ND', name: 'North Dakota', rate: 0.0195 },
  { code: 'OH', name: 'Ohio', rate: 0.035 },
  { code: 'OK', name: 'Oklahoma', rate: 0.0475 },
  { code: 'OR', name: 'Oregon', rate: 0.099 },
  { code: 'PA', name: 'Pennsylvania', rate: 0.0307 },
  { code: 'RI', name: 'Rhode Island', rate: 0.0599 },
  { code: 'SC', name: 'South Carolina', rate: 0.064 },
  { code: 'SD', name: 'South Dakota', rate: 0 },  // No state income tax
  { code: 'TN', name: 'Tennessee', rate: 0 },  // No wage income tax
  { code: 'TX', name: 'Texas', rate: 0 },  // No state income tax
  { code: 'UT', name: 'Utah', rate: 0.0465 },
  { code: 'VT', name: 'Vermont', rate: 0.0875 },
  { code: 'VA', name: 'Virginia', rate: 0.0575 },
  { code: 'WA', name: 'Washington', rate: 0 },  // No state income tax
  { code: 'WV', name: 'West Virginia', rate: 0.055 },
  { code: 'WI', name: 'Wisconsin', rate: 0.0765 },
  { code: 'WY', name: 'Wyoming', rate: 0 },  // No state income tax
  { code: 'DC', name: 'District of Columbia', rate: 0.0895 },
]

// Federal tax brackets (2024 single filer, simplified top marginal rates)
export const FEDERAL_TAX_BRACKETS = [
  { rate: 0.10, label: '10%' },
  { rate: 0.12, label: '12%' },
  { rate: 0.22, label: '22%' },
  { rate: 0.24, label: '24%' },
  { rate: 0.32, label: '32%' },
  { rate: 0.35, label: '35%' },
  { rate: 0.37, label: '37%' },
]

// Fixed tax rates
export const FIXED_TAX_RATES = {
  socialSecurity: 0.062,  // 6.2%
  medicare: 0.0145,  // 1.45%
}

/**
 * Get state info by code
 */
export const getStateByCode = (code) => {
  return US_STATES.find(s => s.code === code)
}

/**
 * Calculate total effective tax rate
 */
export const calculateEffectiveTaxRate = (federalRate, stateCode) => {
  const state = getStateByCode(stateCode)
  const stateRate = state?.rate || 0
  return federalRate + stateRate + FIXED_TAX_RATES.socialSecurity + FIXED_TAX_RATES.medicare
}

/**
 * Format rate as percentage string
 */
export const formatTaxRate = (rate) => {
  return `${(rate * 100).toFixed(1)}%`
}

