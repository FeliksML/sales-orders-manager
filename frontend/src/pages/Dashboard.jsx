import { useState } from 'react'
import { Package, TrendingUp, Calendar, Wifi, Tv, Smartphone, Phone } from 'lucide-react'
import DashboardHeader from '../components/DashboardHeader'
import StatCard from '../components/ui/StatCard'
import OrdersTable from '../components/ui/OrdersTable'
import OrderCharts from '../components/ui/OrderCharts'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import OrderInputModal from '../components/OrderInputModal'
import OrderDetailsModal from '../components/OrderDetailsModal'
import { useOrders, useOrderStats } from '../hooks/useOrders'
import { orderService } from '../services/orderService'

function Dashboard() {
  const { orders, loading: ordersLoading, error: ordersError, refetch } = useOrders()
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useOrderStats()
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

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
          <div className="mb-6 p-4 rounded-lg bg-green-500/20 border border-green-500 animate-slideDown">
            <p className="text-green-300 font-medium">
              ✓ Order created successfully!
            </p>
          </div>
        )}

        {/* Statistics Section */}
        <section className="mb-8">
          <h2 className="text-white text-2xl font-bold mb-4">Overview</h2>
          {statsLoading ? (
            <LoadingSpinner />
          ) : statsError ? (
            <div className="text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              {statsError}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Recent Orders Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-2xl font-bold">Recent Orders</h2>
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl hover:scale-105 transform duration-200"
            >
              + New Order
            </button>
          </div>

          {ordersLoading ? (
            <LoadingSpinner />
          ) : ordersError ? (
            <div className="text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              {ordersError}
            </div>
          ) : (
            <OrdersTable orders={orders} onOrderClick={handleOrderClick} />
          )}
        </section>

        {/* Order Input Modal */}
        <OrderInputModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          onSubmit={handleOrderSubmit}
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
