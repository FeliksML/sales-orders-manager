import { useRef, useEffect, useState } from 'react'

function AddressAutocomplete({ value, onChange, error, placeholder = "Start typing address..." }) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [localValue, setLocalValue] = useState(value)
  const lastSavedValue = useRef(value)
  const placeChangedFired = useRef(false)

  useEffect(() => {
    setLocalValue(value)
    lastSavedValue.current = value
  }, [value])

  useEffect(() => {
    if (!inputRef.current) return

    // Check if Google Places API is loaded
    if (!window.google?.maps?.places) {
      console.warn('Google Places API not loaded')
      return
    }

    // Initialize autocomplete
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      fields: ['formatted_address', 'address_components']
    })

    // Handle place selection - this fires when user selects from dropdown
    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace()

      if (place?.formatted_address) {
        const address = place.formatted_address
        placeChangedFired.current = true
        setLocalValue(address)
        lastSavedValue.current = address
        onChange(address)

        // Reset flag after a delay
        setTimeout(() => {
          placeChangedFired.current = false
        }, 500)
      }
    })

    return () => {
      if (window.google?.maps?.event) {
        window.google.maps.event.removeListener(listener)
      }
    }
  }, [onChange])

  const handleInputChange = (e) => {
    // Update local value for immediate visual feedback
    setLocalValue(e.target.value)
  }

  const handleBlur = () => {
    // When user leaves the field, save the value if it changed and wasn't from autocomplete
    if (!placeChangedFired.current && localValue !== lastSavedValue.current) {
      lastSavedValue.current = localValue
      onChange(localValue)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Address
      </label>
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
          error ? 'border-red-500' : 'border-white/10'
        } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
        placeholder={placeholder}
      />
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
      {!window.google?.maps?.places && (
        <p className="text-yellow-400 text-xs mt-1">
          ⚠️ Address autocomplete requires Google API key
        </p>
      )}
    </div>
  )
}

export default AddressAutocomplete
