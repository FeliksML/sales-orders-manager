import { useState, useEffect, lazy, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from '../../components/navigation/BottomNav'
import DashboardHeader from '../../components/DashboardHeader'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

// Lazy load the full dashboard for desktop
const Dashboard = lazy(() => import('../Dashboard'))

function DashboardLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Desktop: Render full Dashboard (unchanged behavior)
  if (!isMobile) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      }>
        <Dashboard />
      </Suspense>
    )
  }

  // Mobile: Render tab layout with bottom navigation
  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(circle at 25% 25%, rgba(30, 58, 138, 0.3), transparent 25%),
          radial-gradient(circle at 75% 75%, rgba(20, 125, 190, 0.2), transparent 30%),
          radial-gradient(circle at 75% 25%, rgba(5, 150, 105, 0.2), transparent 25%),
          radial-gradient(circle at 25% 75%, rgba(5, 150, 105, 0.18), transparent 30%),
          radial-gradient(ellipse 1200px 800px at 50% 50%, rgba(20, 125, 190, 0.08), transparent 50%),
          linear-gradient(142deg, #1e40af, #0d4f8b 30%, #067a5b 70%, #059669)
        `
      }}
    >
      {/* Main content with bottom padding for mobile nav */}
      <main className="pb-20">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinner />
          </div>
        }>
          <Outlet />
        </Suspense>
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}

export default DashboardLayout
