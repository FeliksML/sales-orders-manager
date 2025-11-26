import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// AGGRESSIVE SERVICE WORKER REMOVAL
// This runs BEFORE React renders to ensure no SW intercepts requests
if ('serviceWorker' in navigator) {
  // Unregister ALL service workers immediately
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      console.log('🔥 Unregistering SW:', registration.scope)
      registration.unregister()
    })
  })
  
  // Clear ALL caches
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        console.log('🗑️ Deleting cache:', cacheName)
        caches.delete(cacheName)
      })
    })
  }
  
  // Set SW to null to prevent any interception
  navigator.serviceWorker.ready.then(registration => {
    registration.unregister()
  }).catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
