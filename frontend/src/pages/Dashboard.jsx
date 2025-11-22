import { useState } from 'react'
import { Package, TrendingUp, Calendar, Wifi, Tv, Smartphone, Phone, Download, FileBarChart, Clock, CalendarDays, List, Plus } from 'lucide-react'
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
import BulkActionsToolbar from '../components/ui/BulkActionsToolbar'
import BulkRescheduleModal from '../components/BulkRescheduleModal'
import BulkDeleteModal from '../components/BulkDeleteModal'
import BulkExportModal from '../components/BulkExportModal'
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

  // Bulk operations state
  const [selectedOrders, setSelectedOrders] = useState([])
  const [isBulkRescheduleModalOpen, setIsBulkRescheduleModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isBulkExportModalOpen, setIsBulkExportModalOpen] = useState(false)

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

  // Bulk operations handlers
  const handleBulkMarkInstalled = async () => {
    try {
      await orderService.bulkMarkInstalled(selectedOrders)
      await Promise.all([refetch(), refetchStats()])
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
      await Promise.all([refetch(), refetchStats()])
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
      await Promise.all([refetch(), refetchStats()])
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
            <div className="flex items-center gap-2 w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
              <button
                onClick={() => setIsScheduledReportsModalOpen(true)}
                className="flex items-center justify-center gap-2 h-11 px-5 text-white font-medium rounded-lg transition-all backdrop-blur-md hover:scale-105 transform duration-200 flex-1 text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.7), rgba(220, 38, 38, 0.7))',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(251, 146, 60, 0.4)',
                  boxShadow: '0 4px 16px rgba(234, 88, 12, 0.3), inset 0 0 40px rgba(251, 146, 60, 0.1)'
                }}
              >
                <Clock size={16} />
                <span className="whitespace-nowrap">Reports</span>
              </button>
              <button
                onClick={handleExportStats}
                className="flex items-center justify-center gap-2 h-11 px-5 text-white font-medium rounded-lg transition-all backdrop-blur-md hover:scale-105 transform duration-200 flex-1 text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.7), rgba(16, 185, 129, 0.7))',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  boxShadow: '0 4px 16px rgba(22, 163, 74, 0.3), inset 0 0 40px rgba(34, 197, 94, 0.1)'
                }}
              >
                <FileBarChart size={16} />
                <span className="whitespace-nowrap">Export</span>
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
              <div className="flex items-center gap-2 rounded-lg p-1 backdrop-blur-md" style={{
                backgroundColor: 'rgba(0, 15, 33, 0.3)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 200, 255, 0.3)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center justify-center gap-2 h-9 px-4 rounded-md transition-all font-medium ${
                    viewMode === 'table'
                      ? 'text-white'
                      : 'text-white/70 hover:text-white'
                  }`}
                  style={viewMode === 'table' ? {
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.8), rgba(59, 130, 246, 0.8))',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
                  } : {}}
                >
                  <List size={18} />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center justify-center gap-2 h-9 px-4 rounded-md transition-all font-medium ${
                    viewMode === 'calendar'
                      ? 'text-white'
                      : 'text-white/70 hover:text-white'
                  }`}
                  style={viewMode === 'calendar' ? {
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.8), rgba(59, 130, 246, 0.8))',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
                  } : {}}
                >
                  <CalendarDays size={18} />
                  Calendar
                </button>
              </div>

              <button
                onClick={handleExportOrders}
                className="flex items-center justify-center gap-2 h-11 px-4 text-white font-medium rounded-lg transition-all backdrop-blur-md hover:scale-105 transform duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.7), rgba(99, 102, 241, 0.7))',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  boxShadow: '0 4px 16px rgba(147, 51, 234, 0.3), inset 0 0 40px rgba(168, 85, 247, 0.1)'
                }}
              >
                <Download size={18} />
                Export
              </button>
              <button
                onClick={() => {
                  setPrefilledDate(null)
                  setIsOrderModalOpen(true)
                }}
                className="flex items-center justify-center gap-2 h-11 px-4 text-white font-medium rounded-lg transition-all backdrop-blur-md hover:scale-105 transform duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.7), rgba(59, 130, 246, 0.7))',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3), inset 0 0 40px rgba(59, 130, 246, 0.1)'
                }}
              >
                <Plus size={18} />
                New Order
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
                      <OrdersTable
                        orders={orders}
                        onOrderClick={handleOrderClick}
                        selectedOrders={selectedOrders}
                        onSelectionChange={setSelectedOrders}
                      />
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
        <BulkRescheduleModal
          isOpen={isBulkRescheduleModalOpen}
          onClose={() => setIsBulkRescheduleModalOpen(false)}
          onConfirm={handleBulkReschedule}
          selectedCount={selectedOrders.length}
        />

        {/* Bulk Delete Modal */}
        <BulkDeleteModal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          onConfirm={handleBulkDelete}
          selectedCount={selectedOrders.length}
        />

        {/* Bulk Export Modal */}
        <BulkExportModal
          isOpen={isBulkExportModalOpen}
          onClose={() => setIsBulkExportModalOpen(false)}
          onExport={handleBulkExport}
          selectedCount={selectedOrders.length}
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
