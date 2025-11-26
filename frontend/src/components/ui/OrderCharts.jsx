import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BarChart3 } from 'lucide-react'
import Card from './Card'

function OrderCharts({ orders = [], stats }) {
  // Prepare product distribution data
  const productData = [
    { name: 'Internet', value: stats?.total_internet || 0, color: '#3b82f6' },
    { name: 'TV', value: stats?.total_tv || 0, color: '#8b5cf6' },
    { name: 'Mobile', value: stats?.total_mobile || 0, color: '#ec4899' },
    { name: 'Voice', value: stats?.total_voice || 0, color: '#10b981' },
  ].filter(item => item.value > 0)

  // Prepare monthly trend data (last 6 months)
  const getMonthlyData = () => {
    const monthCounts = {}
    const today = new Date()

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      monthCounts[monthKey] = 0
    }

    // Count orders by month
    orders.forEach(order => {
      const orderDate = new Date(order.install_date)
      const monthKey = orderDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (monthCounts.hasOwnProperty(monthKey)) {
        monthCounts[monthKey]++
      }
    })

    return Object.entries(monthCounts).map(([month, count]) => ({
      month,
      orders: count
    }))
  }

  const monthlyData = getMonthlyData()

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-blue-400/30 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium">{payload[0].value}</p>
        </div>
      )
    }
    return null
  }

  if (productData.length === 0 && orders.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-white text-xl font-bold mb-2">No Analytics Data Yet</h3>
          <p className="text-gray-400 max-w-sm">
            Create your first order to see trends and product distribution charts here.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Trend Chart */}
      {orders.length > 0 && (
        <Card>
          <h3 className="text-white text-xl font-bold mb-4">Order Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="month"
                stroke="rgba(255,255,255,0.5)"
                tick={{ fill: 'rgba(255,255,255,0.7)' }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.5)"
                tick={{ fill: 'rgba(255,255,255,0.7)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="orders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Product Distribution Chart */}
      {productData.length > 0 && (
        <Card>
          <h3 className="text-white text-xl font-bold mb-4">Product Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={productData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {productData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {productData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-300 text-sm">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default OrderCharts
