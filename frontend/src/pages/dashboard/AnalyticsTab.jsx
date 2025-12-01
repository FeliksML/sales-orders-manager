import { useState, lazy, Suspense } from 'react'
import { Package, TrendingUp, Calendar, Wifi, Tv, Smartphone, Phone } from 'lucide-react'
import DashboardHeader from '../../components/DashboardHeader'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useDashboardData } from '../../hooks/useDashboardData'

// Lazy load heavy components
const OrderCharts = lazy(() => import('../../components/ui/OrderCharts'))
const PerformanceInsights = lazy(() => import('../../components/PerformanceInsights'))
const ExportModal = lazy(() => import('../../components/ExportModal'))
const ScheduledReportsModal = lazy(() => import('../../components/ScheduledReportsModal'))

function AnalyticsTab() {
  const {
    allOrders,
    stats,
    statsLoading,
    error: statsError
  } = useDashboardData({})

  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isScheduledReportsModalOpen, setIsScheduledReportsModalOpen] = useState(false)

  const handleExportStats = () => {
    setIsExportModalOpen(true)
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          onReportsClick={() => setIsScheduledReportsModalOpen(true)}
          onExportClick={handleExportStats}
        />

        {/* Statistics Section */}
        <section className="mb-8">
          <h2 className="text-white text-2xl font-bold mb-4">Overview</h2>
          <div style={{ minHeight: '120px' }}>
            {statsLoading ? (
              <div className="flex items-center justify-center" style={{ height: '120px' }}>
                <LoadingSpinner />
              </div>
            ) : statsError ? (
              <div className="text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                {statsError}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 transition-opacity duration-300">
                <StatCard
                  title="Total Orders"
                  value={stats?.total_orders || 0}
                  icon={Package}
                  subtitle="All time"
                />
                <StatCard
                  title="This Week"
                  value={stats?.this_week || 0}
                  icon={TrendingUp}
                  subtitle="Last 7 days"
                />
                <StatCard
                  title="This Month"
                  value={stats?.this_month || 0}
                  icon={Calendar}
                  subtitle="Current month"
                />
                <StatCard
                  title="Pending Installs"
                  value={stats?.pending_installs || 0}
                  icon={Calendar}
                  subtitle="Upcoming"
                />
              </div>
            )}
          </div>
        </section>

        {/* Product Statistics */}
        <section className="mb-8">
          <h2 className="text-white text-2xl font-bold mb-4">Products</h2>
          <div style={{ minHeight: '120px' }}>
            {statsLoading ? (
              <div className="flex items-center justify-center" style={{ height: '120px' }}>
                <LoadingSpinner />
              </div>
            ) : statsError ? (
              <div className="text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                {statsError}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 transition-opacity duration-300">
                <StatCard
                  title="Internet"
                  value={stats?.total_internet || 0}
                  icon={Wifi}
                />
                <StatCard
                  title="TV"
                  value={stats?.total_tv || 0}
                  icon={Tv}
                />
                <StatCard
                  title="Mobile"
                  value={stats?.total_mobile || 0}
                  icon={Smartphone}
                />
                <StatCard
                  title="Voice Lines"
                  value={stats?.total_voice || 0}
                  icon={Phone}
                />
              </div>
            )}
          </div>
        </section>

        {/* Performance Insights Section */}
        <section className="mb-8">
          <Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner />
            </div>
          }>
            <PerformanceInsights />
          </Suspense>
        </section>

        {/* Charts Section */}
        <section className="mb-8">
          <h2 className="text-white text-2xl font-bold mb-4">Trends</h2>
          <div style={{ minHeight: '300px' }}>
            {statsLoading ? (
              <div className="flex items-center justify-center" style={{ height: '300px' }}>
                <LoadingSpinner />
              </div>
            ) : statsError ? (
              <div className="text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                {statsError}
              </div>
            ) : (
              <Suspense fallback={
                <div className="flex items-center justify-center p-8">
                  <LoadingSpinner />
                </div>
              }>
                <OrderCharts orders={allOrders} stats={stats} statsLoading={statsLoading} />
              </Suspense>
            )}
          </div>
        </section>

        {/* Export Modal */}
        <Suspense fallback={null}>
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            filters={{}}
            exportType="stats"
          />
        </Suspense>

        {/* Scheduled Reports Modal */}
        <Suspense fallback={null}>
          <ScheduledReportsModal
            isOpen={isScheduledReportsModalOpen}
            onClose={() => setIsScheduledReportsModalOpen(false)}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default AnalyticsTab
