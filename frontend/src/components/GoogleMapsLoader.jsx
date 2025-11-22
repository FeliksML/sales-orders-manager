import { useEffect, useState } from 'react'

let isLoaded = false
let isLoading = false
const callbacks = []

function GoogleMapsLoader({ children }) {
  const [loaded, setLoaded] = useState(isLoaded)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.warn('Google Maps API key not found. Address autocomplete will not work.')
      setLoaded(true) // Still render children
      return
    }

    if (isLoaded) {
      setLoaded(true)
      return
    }

    if (isLoading) {
      callbacks.push(() => setLoaded(true))
      return
    }

    isLoading = true

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      isLoaded = true
      isLoading = false
      setLoaded(true)
      callbacks.forEach(cb => cb())
      callbacks.length = 0
    }

    script.onerror = () => {
      console.error('Failed to load Google Maps API')
      isLoading = false
      setLoaded(true) // Still render children
      callbacks.forEach(cb => cb())
      callbacks.length = 0
    }

    document.head.appendChild(script)

    return () => {
      // Don't remove script on unmount as it's shared
    }
  }, [])

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return children
}

export default GoogleMapsLoader
