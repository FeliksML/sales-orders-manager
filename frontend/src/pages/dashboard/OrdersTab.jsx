import { useState, useCallback, lazy, Suspense } from 'react'
import { Download, CalendarDays, List, Plus, WifiOff } from 'lucide-react'
import DashboardHeader from '../../components/DashboardHeader'
import OrdersTable from '../../components/ui/OrdersTable'
import FilterBar from '../../components/ui/FilterBar'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import BulkActionsToolbar from '../../components/ui/BulkActionsToolbar'
import PullToRefresh from '../../components/ui/PullToRefresh'
import TodaysFollowUps from '../../components/TodaysFollowUps'
import { useDashboardData } from '../../hooks/useDashboardData'
import { useCommissionSettings } from '../../hooks/useCommission'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useToast } from '../../contexts/ToastContext'
import { orderService } from '../../services/orderService'
import { ERROR_TYPES } from '../../services/api'
import followupService from '../../services/followupService'

// Lazy load heavy components
const OrderInputModal = lazy(() => import('../../components/OrderInputModal'))
const OrderDetailsModal = lazy(() => import('../../components/OrderDetailsModal'))
const ExportModal = lazy(() => import('../../components/ExportModal'))
const ScheduledReportsModal = lazy(() => import('../../components/ScheduledReportsModal'))
const CalendarView = lazy(() => import('../../components/CalendarView'))
const BulkRescheduleModal = lazy(() => import('../../components/BulkRescheduleModal'))
const BulkDeleteModal = lazy(() => import('../../components/BulkDeleteModal'))
const BulkExportModal = lazy(() => import('../../components/BulkExportModal'))

function OrdersTab() {
  const [filters, setFilters] = useState({})
  const isOnline = useOnlineStatus()
  const { showToast } = useToast()

  const {
    orders,
    stats,
    todaysFollowups,
    overdueCount,
    currentInternetCount,
    ordersLoading,
    loading: followupsLoading,
    error: ordersError,
    refresh
  } = useDashboardData(filters)

  const { settings: commissionSettings } = useCommissionSettings()

  const userSettings = {
    isNewHire: commissionSettings?.is_new_hire || false,
    aeType: commissionSettings?.ae_type || 'Account Executive',
    newHireMonth: commissionSettings?.new_hire_month || null
  }

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportType, setExportType] = useState('orders')
  const [isScheduledReportsModalOpen, setIsScheduledReportsModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState('table')
  const [prefilledDate, setPrefilledDate] = useState(null)

  // Bulk operations state
  const [selectedOrders, setSelectedOrders] = useState([])
  const [isBulkRescheduleModalOpen, setIsBulkRescheduleModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isBulkExportModalOpen, setIsBulkExportModalOpen] = useState(false)

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
      await refresh()
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to create order:', error)
      if (error.type === ERROR_TYPES.TIMEOUT) {
        showToast('Request timed out. Please try again.', 'error')
      } else if (error.type === ERROR_TYPES.RATE_LIMIT) {
        showToast(error.message, 'warning', error.retryAfter ? error.retryAfter * 1000 : 5000)
      } else if (error.type === ERROR_TYPES.NETWORK) {
        showToast('Connection lost. Please check your internet.', 'error')
      } else {
        showToast(error.message || 'Failed to create order', 'error')
      }
      throw error
    }
  }

  const handleOrderClick = (order) => {
    setSelectedOrder(order)
    setIsDetailsModalOpen(true)
  }

  const handleOrderUpdate = async (orderId, orderData) => {
    try {
      await orderService.updateOrder(orderId, orderData)
      await refresh()
      setSelectedOrder(prev => ({ ...prev, ...orderData }))
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to update order:', error)
      if (error.type === ERROR_TYPES.TIMEOUT) {
        showToast('Request timed out. Please try again.', 'error')
      } else if (error.type === ERROR_TYPES.RATE_LIMIT) {
        showToast(error.message, 'warning', error.retryAfter ? error.retryAfter * 1000 : 5000)
      } else if (error.type === ERROR_TYPES.NETWORK) {
        showToast('Connection lost. Please check your internet.', 'error')
      } else {
        showToast(error.message || 'Failed to update order', 'error')
      }
      throw error
    }
  }

  const handleOrderDelete = async (orderId) => {
    try {
      await orderService.deleteOrder(orderId)
      await refresh()
      setIsDetailsModalOpen(false)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to delete order:', error)
      if (error.type === ERROR_TYPES.TIMEOUT) {
        showToast('Request timed out. Please try again.', 'error')
      } else if (error.type === ERROR_TYPES.RATE_LIMIT) {
        showToast(error.message, 'warning', error.retryAfter ? error.retryAfter * 1000 : 5000)
      } else if (error.type === ERROR_TYPES.NETWORK) {
        showToast('Connection lost. Please check your internet.', 'error')
      } else {
        showToast(error.message || 'Failed to delete order', 'error')
      }
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
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const formattedDate = `${year}-${month}-${day}`
    setPrefilledDate(formattedDate)
    setIsOrderModalOpen(true)
  }

  const handleEventDrop = async (orderId, newDate) => {
    try {
      const year = newDate.getFullYear()
      const month = String(newDate.getMonth() + 1).padStart(2, '0')
      const day = String(newDate.getDate()).padStart(2, '0')
      const formattedDate = `${year}-${month}-${day}`
      await orderService.updateOrder(orderId, { install_date: formattedDate })
      await refresh({ orders: true, stats: true })
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to reschedule order:', error)
      if (error.type === ERROR_TYPES.NETWORK) {
        showToast('Connection lost. Please check your internet.', 'error')
      } else {
        showToast(error.message || 'Failed to reschedule order', 'error')
      }
    }
  }

  // Bulk operations handlers
  const handleBulkMarkInstalled = async () => {
    try {
      await orderService.bulkMarkInstalled(selectedOrders)
      await refresh({ orders: true, stats: true })
      setSelectedOrders([])
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to mark orders as installed:', error)
      if (error.type === ERROR_TYPES.NETWORK) {
        showToast('Connection lost. Please check your internet.', 'error')
      } else {
        showToast(error.message || 'Failed to mark orders as installed', 'error')
      }
    }
  }

  const handleBulkReschedule = async (newDate) => {
    try {
      await orderService.bulkReschedule(selectedOrders, newDate)
      await refresh({ orders: true, stats: true })
      setSelectedOrders([])
      setIsBulkRescheduleModalOpen(false)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to reschedule orders:', error)
      if (error.type === ERROR_TYPES.NETWORK) {
        showToast('Connection lost. Please check your internet.', 'error')
      } else {
        showToast(error.message || 'Failed to reschedule orders', 'error')
      }
    }
  }

  const handleBulkDelete = async () => {
    try {
      await orderService.bulkDelete(selectedOrders)
      await refresh()
      setSelectedOrders([])
      setIsBulkDeleteModalOpen(false)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to delete orders:', error)
      if (error.type === ERROR_TYPES.NETWORK) {
        showToast('Connection lost. Please check your internet.', 'error')
      } else {
        showToast(error.message || 'Failed to delete orders', 'error')
      }
    }
  }

  const handleBulkExport = async (format) => {
    try {
      await orderService.bulkExport(selectedOrders, format)
      setIsBulkExportModalOpen(false)
    } catch (error) {
      console.error('Failed to export orders:', error)
      if (error.type === ERROR_TYPES.NETWORK) {
        showToast('Connection lost. Please check your internet.', 'error')
      } else {
        showToast(error.message || 'Failed to export orders', 'error')
      }
    }
  }

  const handleRefresh = async () => {
    await refresh()
  }

  // Follow-up handlers
  const handleFollowupComplete = async (followupId) => {
    await followupService.complete(followupId)
    await refresh({ followups: true })
  }

  const handleFollowupSnooze = async (followupId, days) => {
    await followupService.snooze(followupId, days)
    await refresh({ followups: true })
  }

  const handleFollowupOrderClick = (order) => {
    const fullOrder = orders.find(o => o.orderid === order.orderid) || order
    setSelectedOrder(fullOrder)
    setIsDetailsModalOpen(true)
  }

  return (
    <div className="p-4">
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

        {/* Offline Banner */}
        {!isOnline && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-sm">
            <p className="text-yellow-200 font-medium flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-yellow-400" />
              You appear to be offline. Some features may be unavailable.
            </p>
          </div>
        )}

        {/* Today's Follow-Ups Section */}
        {todaysFollowups.length > 0 && (
          <section className="mb-6">
            <TodaysFollowUps
              followups={todaysFollowups}
              overdueCount={overdueCount}
              onComplete={handleFollowupComplete}
              onSnooze={handleFollowupSnooze}
              onOrderClick={handleFollowupOrderClick}
              loading={followupsLoading}
            />
          </section>
        )}

        {/* Recent Orders Section */}
        <section>
          <div className="mb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
              <h2 className="text-white text-2xl font-bold flex-shrink-0">Orders</h2>

              <div className="flex items-center gap-2 flex-wrap ml-auto">
                {/* Export button */}
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
                  <span className="hidden min-[560px]:inline text-sm">Export</span>
                </button>

                {/* New Order button */}
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
                  <span className="hidden min-[440px]:inline text-sm">New Order</span>
                </button>

                {/* View Toggle */}
                <div className="flex items-center gap-1 rounded-lg p-1 backdrop-blur-md" style={{
                  backgroundColor: 'rgba(0, 15, 33, 0.3)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 200, 255, 0.3)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}>
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
                    <span className="hidden min-[340px]:inline">Table</span>
                  </button>

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
            <div style={{ minHeight: '400px', position: 'relative' }}>
              {ordersError ? (
                <div className="text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  {ordersError}
                </div>
              ) : (
                <>
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
                          currentInternetCount={currentInternetCount}
                          userSettings={userSettings}
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

        {/* Modals */}
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

        <Suspense fallback={null}>
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            filters={filters}
            exportType={exportType}
          />
        </Suspense>

        <Suspense fallback={null}>
          <ScheduledReportsModal
            isOpen={isScheduledReportsModalOpen}
            onClose={() => setIsScheduledReportsModalOpen(false)}
          />
        </Suspense>

        {/* Bulk Actions Toolbar - with bottom offset for mobile nav */}
        {viewMode === 'table' && (
          <BulkActionsToolbar
            selectedCount={selectedOrders.length}
            onMarkInstalled={handleBulkMarkInstalled}
            onReschedule={() => setIsBulkRescheduleModalOpen(true)}
            onDelete={() => setIsBulkDeleteModalOpen(true)}
            onExport={() => setIsBulkExportModalOpen(true)}
            onClearSelection={() => setSelectedOrders([])}
            bottomOffset={72}
          />
        )}

        <Suspense fallback={null}>
          <BulkRescheduleModal
            isOpen={isBulkRescheduleModalOpen}
            onClose={() => setIsBulkRescheduleModalOpen(false)}
            onConfirm={handleBulkReschedule}
            selectedCount={selectedOrders.length}
          />
        </Suspense>

        <Suspense fallback={null}>
          <BulkDeleteModal
            isOpen={isBulkDeleteModalOpen}
            onClose={() => setIsBulkDeleteModalOpen(false)}
            onConfirm={handleBulkDelete}
            selectedCount={selectedOrders.length}
          />
        </Suspense>

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
      `}</style>
    </div>
  )
}

export default OrdersTab
