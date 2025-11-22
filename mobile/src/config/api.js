/**
 * API Configuration
 */
import { API_CONFIG } from '@sales-order-manager/shared'

// For development, update this to match your local backend
export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'  // Use 10.0.2.2 for Android emulator
  : API_CONFIG.BASE_URL

export const API_TIMEOUT = API_CONFIG.TIMEOUT
