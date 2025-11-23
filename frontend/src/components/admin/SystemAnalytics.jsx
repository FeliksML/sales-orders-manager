import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import Card from '../ui/Card'

function SystemAnalytics({ analytics }) {
  if (!analytics) return null

  // Product distribution data
  const productData = [
    { name: 'Internet', value: analytics.total_internet, color: '#3b82f6' },
    { name: 'TV', value: analytics.total_tv, color: '#a855f7' },
    { name: 'Mobile', value: analytics.total_mobile, color: '#10b981' },
    { name: 'Voice', value: analytics.total_voice, color: '#f59e0b' },
    { name: 'WIB', value: analytics.total_wib, color: '#6366f1' },
    { name: 'SBC', value: analytics.total_sbc, color: '#ec4899' }
  ].filter(item => item.value > 0)

  // User verification data
  const verificationData = [
    { name: 'Verified', value: analytics.verified_users, color: '#10b981' },
    { name: 'Unverified', value: analytics.unverified_users, color: '#f59e0b' }
  ]

  // Orders timeline (mock data - you could enhance this with real time-series data)
  const ordersTimelineData = [
    { name: 'This Week', orders: analytics.orders_this_week },
    { name: 'This Month', orders: analytics.orders_this_month },
    { name: 'Total', orders: analytics.total_orders }
  ]

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-lg" style={{
          backgroundColor: 'rgba(0, 15, 33, 0.95)',
          border: '1px solid rgba(0, 200, 255, 0.3)',
          backdropFilter: 'blur(20px)'
        }}>
          <p className="text-white font-medium">{payload[0].name}</p>
          <p className="text-cyan-400">{payload[0].value}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Product Distribution */}
      <Card>
        <h3 className="text-xl font-bold text-white mb-6">Product Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={productData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
        <div className="mt-4 grid grid-cols-2 gap-3">
          {productData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-300">
                {item.name}: <span className="text-white font-medium">{item.value}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* User Verification Status */}
      <Card>
        <h3 className="text-xl font-bold text-white mb-6">User Verification Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={verificationData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {verificationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {verificationData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-300">{item.name}</span>
              </div>
              <span className="text-white font-medium">{item.value} users</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Orders Overview */}
      <Card className="lg:col-span-2">
        <h3 className="text-xl font-bold text-white mb-6">Orders Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ordersTimelineData}>
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              style={{ fontSize: '14px' }}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '14px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="orders" fill="#00c8ff" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{
            backgroundColor: 'rgba(0, 200, 255, 0.1)',
            border: '1px solid rgba(0, 200, 255, 0.3)'
          }}>
            <div className="text-gray-400 text-sm">This Week</div>
            <div className="text-2xl font-bold text-white">{analytics.orders_this_week}</div>
          </div>
          <div className="p-4 rounded-lg" style={{
            backgroundColor: 'rgba(0, 200, 255, 0.1)',
            border: '1px solid rgba(0, 200, 255, 0.3)'
          }}>
            <div className="text-gray-400 text-sm">This Month</div>
            <div className="text-2xl font-bold text-white">{analytics.orders_this_month}</div>
          </div>
          <div className="p-4 rounded-lg" style={{
            backgroundColor: 'rgba(0, 200, 255, 0.1)',
            border: '1px solid rgba(0, 200, 255, 0.3)'
          }}>
            <div className="text-gray-400 text-sm">Pending Installs</div>
            <div className="text-2xl font-bold text-white">{analytics.pending_installs}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default SystemAnalytics
