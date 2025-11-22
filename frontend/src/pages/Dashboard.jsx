import { useState } from 'react'
import { Package, TrendingUp, Calendar, Wifi, Tv, Smartphone, Phone, Download, FileBarChart, Clock, CalendarDays, List } from 'lucide-react'
import DashboardHeader from '../components/DashboardHeader'
import StatCard from '../components/ui/StatCard'
import OrdersTable from '../components/ui/OrdersTable'
import OrderCharts from '../components/ui/OrderCharts'
import FilterBar from '../components/ui/FilterBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import OrderInputModal from '../components/OrderInputModal'
import OrderDetailsModal from '../components/OrderDetailsModal'
import ExportModal from '../components/ExportModal'
import ScheduledReportsModal from '../components/ScheduledReportsModal'
import CalendarView from '../components/CalendarView'
import { useOrders, useOrderStats } from '../hooks/useOrders'
import { orderService } from '../services/orderService'

function Dashboard() {
  const [filters, setFilters] = useState({})
  const { orders, loading: ordersLoading, error: ordersError, refetch } = useOrders(filters)
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

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const handleOrderSubmit = async (orderData) => {
    try {
      await orderService.createOrder(orderData)
      setIsOrderModalOpen(false)
      setSubmitSuccess(true)

      // Refetch orders and stats
      refetch()
      refetchStats()

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

      // Refetch orders and stats
      refetch()
      refetchStats()

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

      // Refetch orders and stats
      refetch()
      refetchStats()

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
      await Promise.all([refetch(), refetchStats()])

      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to reschedule order:', error)
    }
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
        <DashboardHeader />

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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-white text-2xl font-bold">Overview</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsScheduledReportsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 transform duration-200"
              >
                <Clock size={18} />
                Scheduled Reports
              </button>
              <button
                onClick={handleExportStats}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 transform duration-200"
              >
                <FileBarChart size={18} />
                Export Report
              </button>
            </div>
          </div>
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
        {stats && (
          <section className="mb-8">
            <h2 className="text-white text-2xl font-bold mb-4">Products</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Internet"
                value={stats.total_internet}
                icon={Wifi}
              />
              <StatCard
                title="TV"
                value={stats.total_tv}
                icon={Tv}
              />
              <StatCard
                title="Mobile"
                value={stats.total_mobile}
                icon={Smartphone}
              />
              <StatCard
                title="Voice Lines"
                value={stats.total_voice}
                icon={Phone}
              />
            </div>
          </section>
        )}

        {/* Charts Section */}
        {!ordersLoading && !statsLoading && (
          <section className="mb-8">
            <h2 className="text-white text-2xl font-bold mb-4">Analytics</h2>
            <OrderCharts orders={orders} stats={stats} />
          </section>
        )}

        {/* Recent Orders Section */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-white text-2xl font-bold">Recent Orders</h2>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <List size={18} />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <CalendarDays size={18} />
                  Calendar
                </button>
              </div>

              <button
                onClick={handleExportOrders}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 transform duration-200"
              >
                <Download size={18} />
                Export
              </button>
              <button
                onClick={() => {
                  setPrefilledDate(null)
                  setIsOrderModalOpen(true)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl hover:scale-105 transform duration-200"
              >
                + New Order
              </button>
            </div>
          </div>

          {/* Filter Bar - Only show in table view */}
          {viewMode === 'table' && (
            <div className="mb-4">
              <FilterBar
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
            </div>
          )}

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
                      <OrdersTable orders={orders} onOrderClick={handleOrderClick} />
                    ) : (
                      <CalendarView
                        orders={orders}
                        onOrderClick={handleOrderClick}
                        onDateClick={handleCalendarDateClick}
                        onEventDrop={handleEventDrop}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Order Input Modal */}
        <OrderInputModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false)
            setPrefilledDate(null)
          }}
          onSubmit={handleOrderSubmit}
          prefilledDate={prefilledDate}
        />

        {/* Order Details Modal */}
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

        {/* Export Modal */}
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          filters={filters}
          exportType={exportType}
        />

        {/* Scheduled Reports Modal */}
        <ScheduledReportsModal
          isOpen={isScheduledReportsModalOpen}
          onClose={() => setIsScheduledReportsModalOpen(false)}
        />
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
      `}</style>
    </div>
  )
}

export default Dashboard
