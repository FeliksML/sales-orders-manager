import { useState, useEffect, lazy, Suspense } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from '../../components/navigation/BottomNav'
import MobileHeader from '../../components/navigation/MobileHeader'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Plus, Download, Clock, FileUp, Settings, List, CalendarDays } from 'lucide-react'

// Lazy load the full dashboard for desktop
const Dashboard = lazy(() => import('../Dashboard'))

// Lazy load modals
const ExportModal = lazy(() => import('../../components/ExportModal'))
const ScheduledReportsModal = lazy(() => import('../../components/ScheduledReportsModal'))

function DashboardLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const location = useLocation()
  const navigate = useNavigate()

  // Shared modal states (lifted from tabs)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isScheduledReportsModalOpen, setIsScheduledReportsModalOpen] = useState(false)
  const [exportType, setExportType] = useState('stats')

  // OrdersTab specific state (lifted for header actions)
  const [ordersViewMode, setOrdersViewMode] = useState('table')
  const [orderModalTrigger, setOrderModalTrigger] = useState(0) // Increment to trigger modal in OrdersTab

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Reset order modal trigger when navigating away from orders tab
  useEffect(() => {
    if (!location.pathname.includes('/orders')) {
      setOrderModalTrigger(0)
    }
  }, [location.pathname])

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

  // Get current tab info for mobile header
  const getTabInfo = () => {
    const path = location.pathname
    if (path.includes('/orders')) {
      return {
        title: 'Orders',
        actions: [
          {
            icon: Plus,
            label: 'New',
            showLabel: true,
            primary: true,
            onClick: () => setOrderModalTrigger(prev => prev + 1)
          },
          {
            icon: ordersViewMode === 'table' ? CalendarDays : List,
            label: ordersViewMode === 'table' ? 'Calendar' : 'Table',
            onClick: () => setOrdersViewMode(prev => prev === 'table' ? 'calendar' : 'table')
          },
        ],
        moreActions: [
          { icon: Download, label: 'Export Orders', onClick: () => { setExportType('orders'); setIsExportModalOpen(true) } },
          { icon: Clock, label: 'Scheduled Reports', onClick: () => setIsScheduledReportsModalOpen(true) },
          { icon: FileUp, label: 'Import PDF', onClick: () => navigate('/import'), variant: 'success' },
        ]
      }
    }
    if (path.includes('/earnings')) {
      return {
        title: 'Earnings',
        actions: [],
        moreActions: [
          { icon: Download, label: 'Export Stats', onClick: () => { setExportType('stats'); setIsExportModalOpen(true) } },
          { icon: Clock, label: 'Scheduled Reports', onClick: () => setIsScheduledReportsModalOpen(true) },
        ]
      }
    }
    if (path.includes('/analytics')) {
      return {
        title: 'Analytics',
        actions: [],
        moreActions: [
          { icon: Download, label: 'Export Stats', onClick: () => { setExportType('stats'); setIsExportModalOpen(true) } },
          { icon: Clock, label: 'Scheduled Reports', onClick: () => setIsScheduledReportsModalOpen(true) },
        ]
      }
    }
    if (path.includes('/notifications')) {
      return {
        title: 'Notifications',
        actions: [
          { icon: Settings, label: 'Settings', onClick: () => navigate('/notification-settings') }
        ],
        moreActions: []
      }
    }
    return { title: 'Dashboard', actions: [], moreActions: [] }
  }

  const tabInfo = getTabInfo()

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
      {/* Compact Mobile Header */}
      <MobileHeader
        title={tabInfo.title}
        actions={tabInfo.actions}
        moreActions={tabInfo.moreActions}
      />

      {/* Main content with bottom padding for mobile nav */}
      <main className="pb-20">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinner />
          </div>
        }>
          <Outlet context={{
            // Pass shared state/handlers to tabs
            isExportModalOpen,
            setIsExportModalOpen,
            exportType,
            setExportType,
            isScheduledReportsModalOpen,
            setIsScheduledReportsModalOpen,
            // Orders-specific
            ordersViewMode,
            setOrdersViewMode,
            orderModalTrigger,
          }} />
        </Suspense>
      </main>

      {/* Bottom navigation */}
      <BottomNav />

      {/* Shared Modals - lifted from tabs */}
      <Suspense fallback={null}>
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          filters={{}}
          exportType={exportType}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ScheduledReportsModal
          isOpen={isScheduledReportsModalOpen}
          onClose={() => setIsScheduledReportsModalOpen(false)}
        />
      </Suspense>
    </div>
  )
}

export default DashboardLayout
