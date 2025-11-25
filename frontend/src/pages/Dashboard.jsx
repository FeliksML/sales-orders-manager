import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Package, TrendingUp, Calendar, Wifi, Tv, Smartphone, Phone, Download, FileBarChart, Clock, CalendarDays, List, Plus } from 'lucide-react'
import DashboardHeader from '../components/DashboardHeader'
import StatCard from '../components/ui/StatCard'
import OrdersTable from '../components/ui/OrdersTable'
import FilterBar from '../components/ui/FilterBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import BulkActionsToolbar from '../components/ui/BulkActionsToolbar'
import PullToRefresh from '../components/ui/PullToRefresh'
import { useOrders, useOrderStats } from '../hooks/useOrders'
import { orderService } from '../services/orderService'

// Lazy load heavy components for better performance
const OrderCharts = lazy(() => import('../components/ui/OrderCharts'))
const OrderInputModal = lazy(() => import('../components/OrderInputModal'))
const OrderDetailsModal = lazy(() => import('../components/OrderDetailsModal'))
const ExportModal = lazy(() => import('../components/ExportModal'))
const ScheduledReportsModal = lazy(() => import('../components/ScheduledReportsModal'))
const CalendarView = lazy(() => import('../components/CalendarView'))
const BulkRescheduleModal = lazy(() => import('../components/BulkRescheduleModal'))
const BulkDeleteModal = lazy(() => import('../components/BulkDeleteModal'))
const BulkExportModal = lazy(() => import('../components/BulkExportModal'))

function Dashboard() {
  const [filters, setFilters] = useState({})
  const { orders, loading: ordersLoading, error: ordersError, refetch } = useOrders(filters)
  // Fetch all orders (unfiltered) for analytics
  const { orders: allOrders, refetch: refetchAllOrders } = useOrders({})
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useOrderStats()
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportType, setExportType] = useState('orders')
  const [isScheduledReportsModalOpen, setIsScheduledReportsModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'table' or 'calendar'
  const [prefilledDate, setPrefilledDate] = useState(null)

  // Bulk operations state
  const [selectedOrders, setSelectedOrders] = useState([])
  const [isBulkRescheduleModalOpen, setIsBulkRescheduleModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isBulkExportModalOpen, setIsBulkExportModalOpen] = useState(false)
  
  // Chart refresh key to force re-render on data changes
  const [chartsKey, setChartsKey] = useState(0)

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters)
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({})
  }, [])

  const handleOrderSubmit = async (orderData) => {
    try {
      await orderService.createOrder(orderData)
      setIsOrderModalOpen(false)
      setSubmitSuccess(true)

      // Refetch orders and stats - await all to ensure data is fresh
      console.log('📊 Starting data refresh after order creation...')
      try {
        const [ordersResult, allOrdersResult, statsResult] = await Promise.all([
          refetch().then(r => { console.log('✅ refetch() completed'); return r }),
          refetchAllOrders().then(r => { console.log('✅ refetchAllOrders() completed'); return r }),
          refetchStats().then(r => { console.log('✅ refetchStats() completed'); return r })
        ])
        console.log('📊 All refetches completed')
      } catch (refetchError) {
        console.error('❌ Refetch error:', refetchError)
      }
      
      // Force chart re-render
      setChartsKey(k => k + 1)

      // Hide success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to create order:', error)
      throw error
    }
  }

  const handleOrderClick = (order) => {
    setSelectedOrder(order)
    setIsDetailsModalOpen(true)
  }

  const handleOrderUpdate = async (orderId, orderData) => {
    try {
      console.log('Dashboard: Updating order', orderId, 'with data:', orderData)
      await orderService.updateOrder(orderId, orderData)
      console.log('Dashboard: Order updated successfully')

      // Refetch orders and stats - await all to ensure data is fresh
      await Promise.all([refetch(), refetchAllOrders(), refetchStats()])
      
      // Force chart re-render
      setChartsKey(k => k + 1)

      // Update selected order with new data
      console.log('Dashboard: Updating selectedOrder state')
      setSelectedOrder(prev => {
        const updated = { ...prev, ...orderData }
        console.log('Dashboard: Previous order:', prev)
        console.log('Dashboard: Updated order:', updated)
        return updated
      })

      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to update order:', error)
      throw error
    }
  }

  const handleOrderDelete = async (orderId) => {
    try {
      console.log('Dashboard: Deleting order', orderId)
      await orderService.deleteOrder(orderId)
      console.log('Dashboard: Order deleted successfully')

      // Refetch orders and stats - await all to ensure data is fresh
      await Promise.all([refetch(), refetchAllOrders(), refetchStats()])
      
      // Force chart re-render
      setChartsKey(k => k + 1)

      setIsDetailsModalOpen(false)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Dashboard: Failed to delete order:', error)
      throw error
    }
  }

  const handleExportOrders = () => {
    setExportType('orders')
    setIsExportModalOpen(true)
  }

  const handleExportStats = () => {
    setExportType('stats')
    setIsExportModalOpen(true)
  }

  const handleCalendarDateClick = (date) => {
    // Convert date to YYYY-MM-DD format using local timezone
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const formattedDate = `${year}-${month}-${day}`
    setPrefilledDate(formattedDate)
    setIsOrderModalOpen(true)
  }

  const handleEventDrop = async (orderId, newDate) => {
    try {
      // Format the date as YYYY-MM-DD using local timezone (not UTC)
      const year = newDate.getFullYear()
      const month = String(newDate.getMonth() + 1).padStart(2, '0')
      const day = String(newDate.getDate()).padStart(2, '0')
      const formattedDate = `${year}-${month}-${day}`

      // Update the order with the new install date
      await orderService.updateOrder(orderId, { install_date: formattedDate })

      // Refetch orders and stats to update both calendar and table views
      await Promise.all([refetch(), refetchAllOrders(), refetchStats()])
      
      // Force chart re-render
      setChartsKey(k => k + 1)

      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to reschedule order:', error)
    }
  }

  // Bulk operations handlers
  const handleBulkMarkInstalled = async () => {
    try {
      await orderService.bulkMarkInstalled(selectedOrders)
      await Promise.all([refetch(), refetchAllOrders(), refetchStats()])
      setChartsKey(k => k + 1)
      setSelectedOrders([])
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to mark orders as installed:', error)
    }
  }

  const handleBulkReschedule = async (newDate) => {
    try {
      await orderService.bulkReschedule(selectedOrders, newDate)
      await Promise.all([refetch(), refetchAllOrders(), refetchStats()])
      setChartsKey(k => k + 1)
      setSelectedOrders([])
      setIsBulkRescheduleModalOpen(false)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to reschedule orders:', error)
    }
  }

  const handleBulkDelete = async () => {
    try {
      await orderService.bulkDelete(selectedOrders)
      await Promise.all([refetch(), refetchAllOrders(), refetchStats()])
      setChartsKey(k => k + 1)
      setSelectedOrders([])
      setIsBulkDeleteModalOpen(false)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to delete orders:', error)
    }
  }

  const handleBulkExport = async (format) => {
    try {
      await orderService.bulkExport(selectedOrders, format)
      setIsBulkExportModalOpen(false)
    } catch (error) {
      console.error('Failed to export orders:', error)
    }
  }

  // Pull to refresh handler
  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchAllOrders(), refetchStats()])
  }

  return (
    <div
      className="min-h-screen p-4 sm:p-8"
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
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          onReportsClick={() => setIsScheduledReportsModalOpen(true)}
          onExportClick={handleExportStats}
        />

        {/* Success Message */}
        {submitSuccess && (
          <div className="fixed top-4 right-4 z-50 p-4 rounded-lg bg-green-500/90 border border-green-400 shadow-2xl animate-slideDown backdrop-blur-sm">
            <p className="text-white font-medium flex items-center gap-2">
              <span className="text-xl">✓</span>
              Order updated successfully!
            </p>
          </div>
        )}

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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-300">
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-300">
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

        {/* Charts Section */}
        <section className="mb-8">
          <h2 className="text-white text-2xl font-bold mb-4">Analytics</h2>
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
                <OrderCharts key={chartsKey} orders={allOrders} stats={stats} />
              </Suspense>
            )}
          </div>
        </section>

        {/* Recent Orders Section */}
        <section>
          <div className="mb-4">
            {/* Single-row header with title, actions, and view toggles */}
            <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
              {/* Left: Title */}
              <h2 className="text-white text-2xl font-bold flex-shrink-0">Recent Orders</h2>

              {/* Right: Actions + View Toggles */}
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                {/* Export button - Subtle toolbar style */}
                <button
                  onClick={handleExportOrders}
                  className="flex items-center justify-center gap-2 h-10 px-4 text-white rounded-lg transition-all hover:scale-105 transform duration-200"
                  style={{
                    backgroundColor: 'rgba(0, 15, 33, 0.3)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0, 200, 255, 0.3)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                  }}
                  title="Export Orders"
                >
                  <Download size={16} />
                  {/* Leftmost: Shows text only when all buttons can fit with text (560px+) */}
                  <span className="hidden min-[560px]:inline text-sm">Export</span>
                </button>

                {/* New Order button - Primary action (prominent) */}
                <button
                  onClick={() => {
                    setPrefilledDate(null)
                    setIsOrderModalOpen(true)
                  }}
                  className="flex items-center justify-center gap-2 h-10 px-4 text-white font-medium rounded-lg transition-all hover:scale-105 transform duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.7), rgba(59, 130, 246, 0.7))',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <Plus size={16} />
                  {/* Shows text when New Order + Table/Calendar can fit with text (440px+) */}
                  <span className="hidden min-[440px]:inline text-sm">New Order</span>
                </button>

                {/* View Toggle */}
                <div className="flex items-center gap-1 rounded-lg p-1 backdrop-blur-md" style={{
                  backgroundColor: 'rgba(0, 15, 33, 0.3)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 200, 255, 0.3)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}>
                  {/* Table view */}
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center justify-center gap-1.5 h-8 px-3 rounded-md transition-all text-sm font-medium ${
                      viewMode === 'table'
                        ? 'text-white'
                        : 'text-white/70 hover:text-white'
                    }`}
                    style={viewMode === 'table' ? {
                      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.8), rgba(59, 130, 246, 0.8))',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
                    } : {}}
                    title="Table View"
                  >
                    <List size={16} />
                    {/* Rightmost: Shows text when at least Table/Calendar can fit with text (340px+) */}
                    <span className="hidden min-[340px]:inline">Table</span>
                  </button>

                  {/* Calendar view */}
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`flex items-center justify-center gap-1.5 h-8 px-3 rounded-md transition-all text-sm font-medium ${
                      viewMode === 'calendar'
                        ? 'text-white'
                        : 'text-white/70 hover:text-white'
                    }`}
                    style={viewMode === 'calendar' ? {
                      background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.8), rgba(59, 130, 246, 0.8))',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
                    } : {}}
                    title="Calendar View"
                  >
                    <CalendarDays size={16} />
                    {/* Rightmost: Shows text when at least Table/Calendar can fit with text (340px+) */}
                    <span className="hidden min-[340px]:inline">Calendar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar - Only show in table view */}
          {viewMode === 'table' && (
            <div className="mb-4">
              <FilterBar
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                totalResults={stats?.total_orders || 0}
                filteredResults={orders?.length || 0}
              />
            </div>
          )}

          <PullToRefresh onRefresh={handleRefresh}>
            <div style={{ minHeight: '500px', position: 'relative' }}>
              {ordersError ? (
                <div className="text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  {ordersError}
                </div>
              ) : (
                <>
                  {/* Show loading overlay only on initial load (when no orders exist yet) */}
                  {ordersLoading && orders.length === 0 ? (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <div className="transition-opacity duration-300" style={{ opacity: ordersLoading ? 0.6 : 1 }}>
                      {viewMode === 'table' ? (
                        <OrdersTable
                          orders={orders}
                          onOrderClick={handleOrderClick}
                          selectedOrders={selectedOrders}
                          onSelectionChange={setSelectedOrders}
                        />
                      ) : (
                        <Suspense fallback={
                          <div className="flex items-center justify-center p-8">
                            <LoadingSpinner />
                          </div>
                        }>
                          <CalendarView
                            orders={orders}
                            onOrderClick={handleOrderClick}
                            onDateClick={handleCalendarDateClick}
                            onEventDrop={handleEventDrop}
                          />
                        </Suspense>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </PullToRefresh>
        </section>

        {/* Order Input Modal */}
        <Suspense fallback={null}>
          <OrderInputModal
            isOpen={isOrderModalOpen}
            onClose={() => {
              setIsOrderModalOpen(false)
              setPrefilledDate(null)
            }}
            onSubmit={handleOrderSubmit}
            prefilledDate={prefilledDate}
          />
        </Suspense>

        {/* Order Details Modal */}
        <Suspense fallback={null}>
          <OrderDetailsModal
            order={selectedOrder}
            isOpen={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false)
              setSelectedOrder(null)
            }}
            onUpdate={handleOrderUpdate}
            onDelete={handleOrderDelete}
          />
        </Suspense>

        {/* Export Modal */}
        <Suspense fallback={null}>
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            filters={filters}
            exportType={exportType}
          />
        </Suspense>

        {/* Scheduled Reports Modal */}
        <Suspense fallback={null}>
          <ScheduledReportsModal
            isOpen={isScheduledReportsModalOpen}
            onClose={() => setIsScheduledReportsModalOpen(false)}
          />
        </Suspense>

        {/* Bulk Actions Toolbar */}
        {viewMode === 'table' && (
          <BulkActionsToolbar
            selectedCount={selectedOrders.length}
            onMarkInstalled={handleBulkMarkInstalled}
            onReschedule={() => setIsBulkRescheduleModalOpen(true)}
            onDelete={() => setIsBulkDeleteModalOpen(true)}
            onExport={() => setIsBulkExportModalOpen(true)}
            onClearSelection={() => setSelectedOrders([])}
          />
        )}

        {/* Bulk Reschedule Modal */}
        <Suspense fallback={null}>
          <BulkRescheduleModal
            isOpen={isBulkRescheduleModalOpen}
            onClose={() => setIsBulkRescheduleModalOpen(false)}
            onConfirm={handleBulkReschedule}
            selectedCount={selectedOrders.length}
          />
        </Suspense>

        {/* Bulk Delete Modal */}
        <Suspense fallback={null}>
          <BulkDeleteModal
            isOpen={isBulkDeleteModalOpen}
            onClose={() => setIsBulkDeleteModalOpen(false)}
            onConfirm={handleBulkDelete}
            selectedCount={selectedOrders.length}
          />
        </Suspense>

        {/* Bulk Export Modal */}
        <Suspense fallback={null}>
          <BulkExportModal
            isOpen={isBulkExportModalOpen}
            onClose={() => setIsBulkExportModalOpen(false)}
            onExport={handleBulkExport}
            selectedCount={selectedOrders.length}
          />
        </Suspense>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default Dashboard
