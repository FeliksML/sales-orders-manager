import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import { useOutletContext } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import OrdersTable from '../../components/ui/OrdersTable'
import FilterBar from '../../components/ui/FilterBar'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import BulkActionsToolbar from '../../components/ui/BulkActionsToolbar'
import PullToRefresh from '../../components/ui/PullToRefresh'
import TodaysFollowUps from '../../components/TodaysFollowUps'
import { useDashboardDataCached } from '../../hooks/useDashboardDataCached'
import { useCommissionSettings } from '../../hooks/useCommission'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useToast } from '../../contexts/ToastContext'
import { orderService } from '../../services/orderService'
import { ERROR_TYPES } from '../../services/api'
import followupService from '../../services/followupService'

// Lazy load heavy components
const OrderInputModal = lazy(() => import('../../components/OrderInputModal'))
const OrderDetailsModal = lazy(() => import('../../components/OrderDetailsModal'))
const CalendarView = lazy(() => import('../../components/CalendarView'))
const BulkRescheduleModal = lazy(() => import('../../components/BulkRescheduleModal'))
const BulkDeleteModal = lazy(() => import('../../components/BulkDeleteModal'))
const BulkExportModal = lazy(() => import('../../components/BulkExportModal'))
const BulkMarkInstalledModal = lazy(() => import('../../components/BulkMarkInstalledModal'))

function OrdersTab() {
  const [filters, setFilters] = useState({})
  const isOnline = useOnlineStatus()
  const { showToast } = useToast()

  // Get shared state from layout via outlet context
  const { ordersViewMode: viewMode, orderModalTrigger } = useOutletContext()

  const {
    orders,
    stats,
    todaysFollowups,
    overdueCount,
    currentInternetCount,
    ordersLoading,
    loading: followupsLoading,
    error: ordersError,
    refresh,
    invalidate
  } = useDashboardDataCached(filters)

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
  const [prefilledDate, setPrefilledDate] = useState(null)

  // Bulk operations state
  const [selectedOrders, setSelectedOrders] = useState([])
  const [isBulkRescheduleModalOpen, setIsBulkRescheduleModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isBulkExportModalOpen, setIsBulkExportModalOpen] = useState(false)
  const [isBulkMarkInstalledModalOpen, setIsBulkMarkInstalledModalOpen] = useState(false)

  // Track last processed trigger to prevent re-opening on tab switch
  const lastProcessedTrigger = useRef(0)

  // Open order modal when triggered from header (only for new triggers)
  useEffect(() => {
    if (orderModalTrigger > lastProcessedTrigger.current) {
      lastProcessedTrigger.current = orderModalTrigger
      setPrefilledDate(null)
      setIsOrderModalOpen(true)
    }
  }, [orderModalTrigger])

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
      invalidate(['performanceInsights'])  // Mark analytics cache as stale
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
      invalidate(['performanceInsights'])  // Mark analytics cache as stale
      await refresh()

      // Refetch the single order to get full updated data including completed_at
      // This ensures the modal shows the correct status after the update
      const updatedOrder = await orderService.getOrder(orderId)
      setSelectedOrder(updatedOrder)

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
      invalidate(['performanceInsights'])  // Mark analytics cache as stale
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
      invalidate(['performanceInsights'])  // Mark analytics cache as stale
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
      invalidate(['performanceInsights'])  // Mark analytics cache as stale
      await refresh({ orders: true, stats: true })
      setSelectedOrders([])
      setIsBulkMarkInstalledModalOpen(false)
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
      invalidate(['performanceInsights'])  // Mark analytics cache as stale
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
      invalidate(['performanceInsights'])  // Mark analytics cache as stale
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
    <div className="px-3 pt-3">
      <div className="max-w-7xl mx-auto">
        {/* Success Message */}
        {submitSuccess && (
          <div className="fixed top-16 right-4 z-50 p-4 rounded-lg bg-green-500/90 border border-green-400 shadow-2xl animate-slideDown backdrop-blur-sm">
            <p className="text-white font-medium flex items-center gap-2">
              <span className="text-xl">✓</span>
              Order updated successfully!
            </p>
          </div>
        )}

        {/* Offline Banner */}
        {!isOnline && (
          <div className="mb-3 p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-sm">
            <p className="text-yellow-200 font-medium flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-yellow-400" />
              You appear to be offline. Some features may be unavailable.
            </p>
          </div>
        )}

        {/* Today's Follow-Ups Section */}
        {todaysFollowups.length > 0 && (
          <section className="mb-4">
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

        {/* Filter Bar - Only show in table view */}
        {viewMode === 'table' && (
          <div className="mb-3">
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

        {/* Bulk Actions Toolbar - with bottom offset for mobile nav */}
        {viewMode === 'table' && (
          <BulkActionsToolbar
            selectedCount={selectedOrders.length}
            onMarkInstalled={() => setIsBulkMarkInstalledModalOpen(true)}
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

        <Suspense fallback={null}>
          <BulkMarkInstalledModal
            isOpen={isBulkMarkInstalledModalOpen}
            onClose={() => setIsBulkMarkInstalledModalOpen(false)}
            onConfirm={handleBulkMarkInstalled}
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
