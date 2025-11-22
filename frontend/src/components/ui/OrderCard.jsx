import { Calendar, MapPin, Phone, Mail, Package, Check } from 'lucide-react'
import { format } from 'date-fns'
import { getInstallStatus, isDateToday, isDatePast, formatDate, DATE_FORMATS } from '@sales-order-manager/shared'
import CustomCheckbox from './CustomCheckbox'

function OrderCard({ order, onOrderClick, isSelected, onSelectionChange }) {
  const status = getInstallStatus(order.install_date)
  const isPast = isDatePast(order.install_date)
  const isToday = isDateToday(order.install_date)

  const statusColor = status === 'installed' ? 'green' : status === 'today' ? 'yellow' : 'blue'
  const statusText = status === 'installed' ? 'Installed' : status === 'today' ? 'Today' : 'Pending'

  const products = []
  if (order.has_internet) products.push('Internet')
  if (order.has_tv) products.push('TV')
  if (order.has_mobile > 0) products.push(`Mobile (${order.has_mobile})`)
  if (order.has_voice > 0) products.push(`Voice (${order.has_voice})`)
  if (order.has_wib) products.push('WiB')
  if (order.has_sbc > 0) products.push(`SBC (${order.has_sbc})`)

  const productColors = {
    Internet: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    TV: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    Mobile: 'bg-green-500/20 text-green-300 border-green-500/30',
    Voice: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    WiB: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    SBC: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
  }

  const getProductColor = (product) => {
    const key = product.split(' ')[0]
    return productColors[key] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }

  const handleCheckboxChange = (e) => {
    e.stopPropagation()
    onSelectionChange?.(order.orderid)
  }

  return (
    <div
      onClick={() => onOrderClick(order)}
      className="p-4 rounded-lg backdrop-blur-md border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Header with checkbox and status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1" onClick={(e) => e.stopPropagation()}>
          <div className="pt-1">
            <CustomCheckbox
              checked={isSelected}
              onChange={handleCheckboxChange}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg truncate">
              {order.business_name || order.customer_name}
            </h3>
            {order.business_name && (
              <p className="text-white/60 text-sm truncate">{order.customer_name}</p>
            )}
          </div>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
            statusColor === 'green'
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : statusColor === 'yellow'
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          }`}
        >
          {statusText}
        </div>
      </div>

      {/* Install Date & Time */}
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={16} className="text-blue-400" />
        <span className="text-white/90 text-sm font-medium">
          {format(installDate, 'MMM dd, yyyy')} at {order.install_time}
        </span>
      </div>

      {/* Contact Info */}
      <div className="space-y-1.5 mb-3">
        {order.customer_address && (
          <div className="flex items-start gap-2">
            <MapPin size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
            <span className="text-white/70 text-xs line-clamp-2">{order.customer_address}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-orange-400 flex-shrink-0" />
          <span className="text-white/70 text-xs">{order.customer_phone}</span>
        </div>
        {order.customer_email && (
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-purple-400 flex-shrink-0" />
            <span className="text-white/70 text-xs truncate">{order.customer_email}</span>
          </div>
        )}
      </div>

      {/* Products */}
      {products.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <Package size={14} className="text-blue-400 flex-shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            {products.map((product, index) => (
              <span
                key={index}
                className={`px-2 py-0.5 rounded text-xs font-medium border ${getProductColor(product)}`}
              >
                {product}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reference Numbers */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
        <span className="text-white/50">Ref: {order.spectrum_reference}</span>
        <span className="text-white/50">Acct: {order.customer_account_number}</span>
      </div>
    </div>
  )
}

export default OrderCard
