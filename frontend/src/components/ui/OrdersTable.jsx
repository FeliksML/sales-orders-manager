import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Hash, User, Briefcase, Package, Calendar,
  Wifi, Tv, Smartphone, Phone, Radio, Settings2,
  ChevronDown, CheckCircle, Clock, AlertCircle, DollarSign
} from 'lucide-react'
import Card from './Card'
import CustomCheckbox from './CustomCheckbox'
import OrderCard from './OrderCard'
import { estimateOrderCommission, formatCommission, getTierLabel } from '../../utils/commissionUtils'
import { getInstallStatus } from '@sales-order-manager/shared'

function OrdersTable({ orders = [], onOrderClick, selectedOrders = [], onSelectionChange, currentInternetCount = 0, userSettings = {} }) {
  const [isMobile, setIsMobile] = useState(false)
  const [sortField, setSortField] = useState('install_date')
  const [sortDirection, setSortDirection] = useState('desc')
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    spectrum_reference: true,
    account_number: true,
    customer_name: true,
    business_name: true,
    products: true,
    install_date: true,
    commission: true
  })
  const columnSettingsRef = useRef(null)
  const columnButtonRef = useRef(null)
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0 })

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

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      // Deselect all
      onSelectionChange?.([])
    } else {
      // Select all
      onSelectionChange?.(orders.map(order => order.orderid))
    }
  }

  const handleSelectOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      // Deselect
      onSelectionChange?.(selectedOrders.filter(id => id !== orderId))
    } else {
      // Select
      onSelectionChange?.([...selectedOrders, orderId])
    }
  }

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close column settings when clicking outside, update position on scroll
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        columnSettingsRef.current &&
        !columnSettingsRef.current.contains(event.target) &&
        columnButtonRef.current &&
        !columnButtonRef.current.contains(event.target)
      ) {
        setShowColumnSettings(false)
      }
    }

    const updatePosition = () => {
      if (columnButtonRef.current) {
        const rect = columnButtonRef.current.getBoundingClientRect()
        setButtonPosition({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        })
      }
    }

    if (showColumnSettings) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [showColumnSettings])

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

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <span className="text-white font-semibold">Orders ({orders.length})</span>
          </div>
          <div className="flex items-center gap-3">
            {selectedOrders.length > 0 && (
              <span className="text-sm text-blue-400">
                {selectedOrders.length} selected
              </span>
            )}
            {/* Select All Button */}
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg transition-colors text-xs font-semibold"
              title={orders.length > 0 && selectedOrders.length === orders.length ? "Deselect all" : "Select all"}
            >
              <CustomCheckbox
                checked={orders.length > 0 && selectedOrders.length === orders.length}
                onChange={handleSelectAll}
              />
              <span>ALL</span>
            </button>
          </div>
        </div>

        {/* Card List */}
        <div className="space-y-3">
          {sortedOrders.map(order => (
            <OrderCard
              key={order.orderid}
              order={order}
              onOrderClick={onOrderClick}
              isSelected={selectedOrders.includes(order.orderid)}
              onSelectionChange={handleSelectOrder}
              currentInternetCount={currentInternetCount}
              userSettings={userSettings}
            />
          ))}
        </div>
      </div>
    )
  }

  // Desktop table view
  return (
    <Card className="overflow-hidden">
      {/* Header with Column Settings */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-400" />
          <span className="text-white font-semibold">Orders ({orders.length})</span>
        </div>

        <div className="relative">
          <button
            ref={columnButtonRef}
            onClick={() => {
              if (!showColumnSettings && columnButtonRef.current) {
                const rect = columnButtonRef.current.getBoundingClientRect()
                setButtonPosition({
                  top: rect.bottom,
                  left: rect.left,
                  width: rect.width
                })
              }
              setShowColumnSettings(!showColumnSettings)
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors text-sm"
          >
            <Settings2 className="w-4 h-4" />
            Columns
            <ChevronDown className={`w-4 h-4 transition-transform ${showColumnSettings ? 'rotate-180' : ''}`} />
          </button>

          {showColumnSettings && createPortal(
            <div
              ref={columnSettingsRef}
              className="w-56 bg-gray-900 border border-white/20 rounded-lg shadow-2xl z-[9999]"
              style={{
                position: 'fixed',
                top: `${buttonPosition.top + 8}px`,
                left: `${buttonPosition.left + buttonPosition.width - 224}px`
              }}
            >
              <p className="text-xs text-gray-500 font-semibold uppercase px-4 py-2 border-b border-white/10 bg-gray-900 rounded-t-lg">
                Visible Columns
              </p>
              <div className="p-2 max-h-80 overflow-y-auto">
                {[
                  { key: 'spectrum_reference', label: 'Spectrum Reference', icon: Hash },
                  { key: 'account_number', label: 'Account Number', icon: Hash },
                  { key: 'customer_name', label: 'Customer Name', icon: User },
                  { key: 'business_name', label: 'Business Name', icon: Briefcase },
                  { key: 'products', label: 'Products', icon: Package },
                  { key: 'install_date', label: 'Install Date', icon: Calendar },
                  { key: 'commission', label: 'Commission', icon: DollarSign }
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
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-t-lg">
        <table className="w-full rounded-t-lg">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {/* Select All Checkbox */}
              <th className="p-4 first:rounded-tl-lg">
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-gray-400 text-xs font-semibold uppercase">All</span>
                  <CustomCheckbox
                    checked={orders.length > 0 && selectedOrders.length === orders.length}
                    onChange={handleSelectAll}
                  />
                </div>
              </th>
              {visibleColumns.spectrum_reference && (
                <th
                  className="text-left p-4 text-gray-400 font-semibold cursor-pointer hover:text-white transition-colors last:rounded-tr-lg"
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
                  className="text-left p-4 text-gray-400 font-semibold cursor-pointer hover:text-white transition-colors last:rounded-tr-lg"
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
                  className="text-left p-4 text-gray-400 font-semibold cursor-pointer hover:text-white transition-colors last:rounded-tr-lg"
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
                  className="text-left p-4 text-gray-400 font-semibold cursor-pointer hover:text-white transition-colors last:rounded-tr-lg"
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
                <th className="text-left p-4 text-gray-400 font-semibold last:rounded-tr-lg">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Products
                  </div>
                </th>
              )}
              {visibleColumns.install_date && (
                <th
                  className="text-left p-4 text-gray-400 font-semibold cursor-pointer hover:text-white transition-colors last:rounded-tr-lg"
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
              {visibleColumns.commission && (
                <th className="text-left p-4 text-gray-400 font-semibold last:rounded-tr-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Est. Commission</span>
                    {currentInternetCount > 0 && (
                      <span className="text-xs text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                        Tier {getTierLabel(currentInternetCount)}
                      </span>
                    )}
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => {
              const status = getInstallStatus(order.install_date, order.completed_at)
              const isSelected = selectedOrders.includes(order.orderid)
              return (
                <tr
                  key={order.orderid}
                  className={`border-b border-white/5 hover:bg-white/5 transition-colors group ${
                    isSelected ? 'bg-blue-500/10' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <td className="p-4">
                    <div className="flex items-center justify-center">
                      <CustomCheckbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleSelectOrder(order.orderid)
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </td>
                  {visibleColumns.spectrum_reference && (
                    <td className="p-4 cursor-pointer" onClick={() => onOrderClick?.(order)}>
                      <span
                        className="text-white font-medium group-hover:text-blue-400 transition-colors block truncate max-w-[150px]"
                        title={order.spectrum_reference}
                      >
                        {order.spectrum_reference}
                      </span>
                    </td>
                  )}
                  {visibleColumns.account_number && (
                    <td className="p-4 cursor-pointer" onClick={() => onOrderClick?.(order)}>
                      <span
                        className="text-gray-300 font-mono text-sm block truncate max-w-[120px]"
                        title={order.customer_account_number}
                      >
                        {order.customer_account_number}
                      </span>
                    </td>
                  )}
                  {visibleColumns.customer_name && (
                    <td className="p-4 cursor-pointer max-w-[200px]" onClick={() => onOrderClick?.(order)}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                        <span
                          className="text-gray-300 truncate"
                          title={order.customer_name}
                        >
                          {order.customer_name}
                        </span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.business_name && (
                    <td className="p-4 cursor-pointer max-w-[200px]" onClick={() => onOrderClick?.(order)}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-4 h-4 text-purple-400" />
                        </div>
                        <span
                          className="text-gray-300 truncate"
                          title={order.business_name}
                        >
                          {order.business_name}
                        </span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.products && (
                    <td className="p-4 cursor-pointer" onClick={() => onOrderClick?.(order)}>
                      {renderProducts(order)}
                    </td>
                  )}
                  {visibleColumns.install_date && (
                    <td className="p-4 cursor-pointer" onClick={() => onOrderClick?.(order)}>
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
                  {visibleColumns.commission && (
                    <td className="p-4 cursor-pointer" onClick={() => onOrderClick?.(order)}>
                      {(() => {
                        const commission = estimateOrderCommission(order, currentInternetCount, userSettings)
                        return commission > 0 ? (
                          <div 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25"
                            title={`Estimated commission at Tier ${getTierLabel(currentInternetCount)} (${currentInternetCount} internet)`}
                          >
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                            <span 
                              className="text-emerald-300 font-semibold text-sm"
                              style={{ fontFamily: "'Space Mono', monospace" }}
                            >
                              {formatCommission(commission)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">$0</span>
                        )
                      })()}
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
