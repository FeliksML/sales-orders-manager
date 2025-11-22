import { useState } from 'react'
import {
  Hash, User, Briefcase, Package, Calendar,
  Wifi, Tv, Smartphone, Phone, Radio, Settings2,
  ChevronDown, CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import Card from './Card'

function OrdersTable({ orders = [], onOrderClick }) {
  const [sortField, setSortField] = useState('install_date')
  const [sortDirection, setSortDirection] = useState('desc')
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    spectrum_reference: true,
    account_number: true,
    customer_name: true,
    business_name: true,
    products: true,
    install_date: true
  })

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }))
  }

  const sortedOrders = [...orders].sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]

    if (sortField === 'install_date') {
      // Parse dates as LOCAL time for proper sorting
      const [aYear, aMonth, aDay] = aVal.split('-').map(Number)
      const [bYear, bMonth, bDay] = bVal.split('-').map(Number)
      aVal = new Date(aYear, aMonth - 1, aDay)
      bVal = new Date(bYear, bMonth - 1, bDay)
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const formatDate = (dateString) => {
    // Parse as LOCAL time, not UTC
    const [year, month, day] = dateString.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)

    return localDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getInstallStatus = (dateString) => {
    // Parse as LOCAL time, not UTC
    const [year, month, day] = dateString.split('-').map(Number)
    const installDate = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (installDate < today) return 'installed'
    if (installDate.getTime() === today.getTime()) return 'today'
    return 'pending'
  }

  const ProductBadge = ({ icon: Icon, label, count, color }) => {
    const colorClasses = {
      blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      green: 'bg-green-500/20 text-green-300 border-green-500/30',
      orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      pink: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${colorClasses[color]}`}>
        <Icon className="w-3 h-3" />
        {count > 1 && <span>{count}</span>}
      </span>
    )
  }

  const renderProducts = (order) => {
    const products = []
    if (order.has_internet) products.push(<ProductBadge key="internet" icon={Wifi} label="Internet" color="blue" />)
    if (order.has_tv) products.push(<ProductBadge key="tv" icon={Tv} label="TV" color="purple" />)
    if (order.has_wib) products.push(<ProductBadge key="wib" icon={Radio} label="WIB" color="green" />)
    if (order.has_voice > 0) products.push(<ProductBadge key="voice" icon={Phone} count={order.has_voice} color="orange" />)
    if (order.has_mobile > 0) products.push(<ProductBadge key="mobile" icon={Smartphone} count={order.has_mobile} color="indigo" />)
    if (order.has_sbc > 0) products.push(<ProductBadge key="sbc" icon={Package} count={order.has_sbc} color="pink" />)

    return products.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {products}
      </div>
    ) : (
      <span className="text-gray-500 text-xs italic">No products</span>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
          <p className="text-gray-400 text-lg font-medium">No orders found</p>
          <p className="text-gray-500 text-sm mt-2">Create your first order to get started</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Header with Column Settings */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-400" />
          <span className="text-white font-semibold">Orders ({orders.length})</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors text-sm"
          >
            <Settings2 className="w-4 h-4" />
            Columns
            <ChevronDown className={`w-4 h-4 transition-transform ${showColumnSettings ? 'rotate-180' : ''}`} />
          </button>

          {showColumnSettings && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-10">
              <div className="p-2">
                <p className="text-xs text-gray-500 font-semibold uppercase px-2 py-1 mb-1">Visible Columns</p>
                {[
                  { key: 'spectrum_reference', label: 'Spectrum Reference', icon: Hash },
                  { key: 'account_number', label: 'Account Number', icon: Hash },
                  { key: 'customer_name', label: 'Customer Name', icon: User },
                  { key: 'business_name', label: 'Business Name', icon: Briefcase },
                  { key: 'products', label: 'Products', icon: Package },
                  { key: 'install_date', label: 'Install Date', icon: Calendar }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => toggleColumn(key)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors text-left"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      visibleColumns[key] ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
                    }`}>
                      {visibleColumns[key] && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {visibleColumns.spectrum_reference && (
                <th
                  className="text-left p-4 text-gray-400 font-semibold cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('spectrum_reference')}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Spectrum Ref
                    {sortField === 'spectrum_reference' && (
                      <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.account_number && (
                <th
                  className="text-left p-4 text-gray-400 font-semibold cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('customer_account_number')}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Account #
                    {sortField === 'customer_account_number' && (
                      <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.customer_name && (
                <th
                  className="text-left p-4 text-gray-400 font-semibold cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('customer_name')}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer
                    {sortField === 'customer_name' && (
                      <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.business_name && (
                <th
                  className="text-left p-4 text-gray-400 font-semibold cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('business_name')}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Business
                    {sortField === 'business_name' && (
                      <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.products && (
                <th className="text-left p-4 text-gray-400 font-semibold">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Products
                  </div>
                </th>
              )}
              {visibleColumns.install_date && (
                <th
                  className="text-left p-4 text-gray-400 font-semibold cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('install_date')}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Installation
                    {sortField === 'install_date' && (
                      <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => {
              const status = getInstallStatus(order.install_date)
              return (
                <tr
                  key={order.orderid}
                  onClick={() => onOrderClick?.(order)}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  {visibleColumns.spectrum_reference && (
                    <td className="p-4">
                      <span className="text-white font-medium group-hover:text-blue-400 transition-colors">
                        {order.spectrum_reference}
                      </span>
                    </td>
                  )}
                  {visibleColumns.account_number && (
                    <td className="p-4">
                      <span className="text-gray-300 font-mono text-sm">
                        {order.customer_account_number}
                      </span>
                    </td>
                  )}
                  {visibleColumns.customer_name && (
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-gray-300">{order.customer_name}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.business_name && (
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="text-gray-300">{order.business_name}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.products && (
                    <td className="p-4">
                      {renderProducts(order)}
                    </td>
                  )}
                  {visibleColumns.install_date && (
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {status === 'installed' && (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                          {status === 'today' && (
                            <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
                          )}
                          {status === 'pending' && (
                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                          )}
                          <span className={`font-medium ${
                            status === 'installed' ? 'text-green-300' :
                            status === 'today' ? 'text-blue-300' :
                            'text-yellow-300'
                          }`}>
                            {formatDate(order.install_date)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 ml-6">{order.install_time}</span>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default OrdersTable
