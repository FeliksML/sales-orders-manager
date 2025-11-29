/**
 * Validation functions for forms and data
 */
import { VALIDATION } from '../constants/index.js'

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export const validateEmail = (email) => {
  if (!email) {
    return { valid: false, error: 'Email is required' }
  }

  if (email.length > VALIDATION.MAX_EMAIL_LENGTH) {
    return { valid: false, error: `Email must be less than ${VALIDATION.MAX_EMAIL_LENGTH} characters` }
  }

  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }

  return { valid: true, error: null }
}

/**
 * Validate phone number
 * @param {string} phone - Phone to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' }
  }

  if (!VALIDATION.PHONE_REGEX.test(phone)) {
    return { valid: false, error: 'Invalid phone number format' }
  }

  // Remove non-numeric characters and check length
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 10 || cleaned.length > 11) {
    return { valid: false, error: 'Phone number must be 10-11 digits' }
  }

  return { valid: true, error: null }
}

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, error: 'Password is required' }
  }

  if (password.length < VALIDATION.MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters` }
  }

  return { valid: true, error: null }
}

/**
 * Validate name
 * @param {string} name - Name to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export const validateName = (name) => {
  if (!name) {
    return { valid: false, error: 'Name is required' }
  }

  if (name.trim().length === 0) {
    return { valid: false, error: 'Name cannot be empty' }
  }

  if (name.length > VALIDATION.MAX_NAME_LENGTH) {
    return { valid: false, error: `Name must be less than ${VALIDATION.MAX_NAME_LENGTH} characters` }
  }

  return { valid: true, error: null }
}

/**
 * Validate address
 * @param {string} address - Address to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export const validateAddress = (address) => {
  if (!address) {
    return { valid: false, error: 'Address is required' }
  }

  if (address.trim().length < 5) {
    return { valid: false, error: 'Address must be at least 5 characters' }
  }

  return { valid: true, error: null }
}

/**
 * Validate date
 * @param {string} date - Date to validate (ISO format)
 * @returns {{valid: boolean, error: string|null}}
 */
export const validateDate = (date) => {
  if (!date) {
    return { valid: false, error: 'Date is required' }
  }

  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Invalid date format' }
  }

  return { valid: true, error: null }
}

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {{valid: boolean, error: string|null}}
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName} is required` }
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` }
  }

  return { valid: true, error: null }
}

/**
 * Validate order data
 * @param {Object} order - Order object to validate
 * @returns {{valid: boolean, errors: Object}}
 */
export const validateOrder = (order) => {
  const errors = {}

  // Customer name
  const nameValidation = validateName(order.customer_name)
  if (!nameValidation.valid) {
    errors.customer_name = nameValidation.error
  }

  // Email
  const emailValidation = validateEmail(order.customer_email)
  if (!emailValidation.valid) {
    errors.customer_email = emailValidation.error
  }

  // Phone
  const phoneValidation = validatePhone(order.customer_phone)
  if (!phoneValidation.valid) {
    errors.customer_phone = phoneValidation.error
  }

  // Address
  const addressValidation = validateAddress(order.install_address)
  if (!addressValidation.valid) {
    errors.install_address = addressValidation.error
  }

  // Install date
  const dateValidation = validateDate(order.install_date)
  if (!dateValidation.valid) {
    errors.install_date = dateValidation.error
  }

  // At least one service must be selected
  const hasService = order.internet || order.tv || order.mobile ||
                     order.voice || order.wib || order.sbc
  if (!hasService) {
    errors.services = 'At least one service must be selected'
  }

  // Notes length
  if (order.notes && order.notes.length > VALIDATION.MAX_NOTES_LENGTH) {
    errors.notes = `Notes must be less than ${VALIDATION.MAX_NOTES_LENGTH} characters`
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate bulk of values
 * @param {Object} values - Object with field names as keys
 * @param {Object} rules - Validation rules object
 * @returns {{valid: boolean, errors: Object}}
 */
export const validateForm = (values, rules) => {
  const errors = {}

  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(values[field])
    if (!result.valid) {
      errors[field] = result.error
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate install date is not in the past
 * @param {string} date - Date in ISO format (YYYY-MM-DD)
 * @param {boolean} allowToday - Whether today is valid (default: true)
 * @returns {{valid: boolean, error: string|null}}
 */
export const validateInstallDate = (date, allowToday = true) => {
  if (!date) {
    return { valid: false, error: 'Install date is required' }
  }

  const dateObj = new Date(date + 'T00:00:00')
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Invalid date format' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (allowToday) {
    if (dateObj < today) {
      return { valid: false, error: 'Install date cannot be in the past' }
    }
  } else {
    if (dateObj <= today) {
      return { valid: false, error: 'Install date must be in the future' }
    }
  }

  return { valid: true, error: null }
}

/**
 * Validate product quantity within reasonable limits
 * @param {number} value - Quantity value
 * @param {string} fieldName - Field name for error message
 * @param {number} max - Maximum allowed (default: 250)
 * @returns {{valid: boolean, error: string|null}}
 */
export const validateQuantity = (value, fieldName = 'Quantity', max = 250) => {
  if (value === null || value === undefined || value === '') {
    return { valid: true, error: null } // Optional field
  }

  const num = Number(value)
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, error: `${fieldName} must be a whole number` }
  }

  if (num < 0) {
    return { valid: false, error: `${fieldName} cannot be negative` }
  }

  if (num > max) {
    return { valid: false, error: `${fieldName} cannot exceed ${max}` }
  }

  return { valid: true, error: null }
}
