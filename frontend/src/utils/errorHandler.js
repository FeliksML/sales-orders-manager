/**
 * Formats API error messages for display
 * Handles various error response formats including Pydantic validation errors
 * @param {Error} error - The error object from axios
 * @param {string} fallbackMessage - Default message if error cannot be extracted
 * @returns {string} - Formatted error message
 */
export function formatErrorMessage(error, fallbackMessage = 'An error occurred') {
  // Check if error has a response (API error)
  if (!error.response?.data) {
    return fallbackMessage
  }

  const detail = error.response.data.detail

  // If detail is a string, return it directly
  if (typeof detail === 'string') {
    return detail
  }

  // If detail is an array (Pydantic validation errors)
  if (Array.isArray(detail)) {
    // Extract error messages from validation errors with field names
    const messages = detail
      .map(err => {
        if (typeof err === 'string') return err

        // Format: "field: message" for better clarity
        if (err.msg && err.loc) {
          const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : err.loc
          return `${field}: ${err.msg}`
        }

        if (err.msg) return err.msg
        return null
      })
      .filter(Boolean)

    if (messages.length > 0) {
      return messages.join('; ')
    }
  }

  // If detail is an object with a message property
  if (typeof detail === 'object' && detail.msg) {
    return detail.msg
  }

  // Fallback to the provided message
  return fallbackMessage
}
