import { useState, useMemo, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

// Color mapping for product types
const productColors = {
  internet: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' }, // Blue
  tv: { bg: '#a855f7', border: '#9333ea', text: '#ffffff' }, // Purple
  mobile: { bg: '#22c55e', border: '#16a34a', text: '#ffffff' }, // Green
  voice: { bg: '#f97316', border: '#ea580c', text: '#ffffff' }, // Orange
  wib: { bg: '#6366f1', border: '#4f46e5', text: '#ffffff' }, // Indigo
  sbc: { bg: '#ec4899', border: '#db2777', text: '#ffffff' }, // Pink
  default: { bg: '#6b7280', border: '#4b5563', text: '#ffffff' } // Gray
}

// Helper function to determine primary product type for color coding
const getPrimaryProductType = (order) => {
  if (order.has_internet) return 'internet'
  if (order.has_tv) return 'tv'
  if (order.has_mobile > 0) return 'mobile'
  if (order.has_voice > 0) return 'voice'
  if (order.has_wib) return 'wib'
  if (order.has_sbc > 0) return 'sbc'
  return 'default'
}

// Helper to get products list
const getProductsList = (order) => {
  const products = []
  if (order.has_internet) products.push('Internet')
  if (order.has_tv) products.push('TV')
  if (order.has_mobile > 0) products.push(`Mobile (${order.has_mobile})`)
  if (order.has_voice > 0) products.push(`Voice (${order.has_voice})`)
  if (order.has_wib) products.push('WiB')
  if (order.has_sbc > 0) products.push(`SBC (${order.has_sbc})`)
  return products
}

// iOS-Style Calendar Component (works for all screen sizes)
const MobileCalendarView = ({ orders, selectedDate, setSelectedDate, currentMonth, setCurrentMonth, onOrderClick, onDateClick, productColors }) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const shortDayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  
  // Get all days to display in the calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    
    // Add padding days from previous month
    const startDayOfWeek = start.getDay()
    const paddingDays = []
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(start)
      prevDate.setDate(prevDate.getDate() - (i + 1))
      paddingDays.push(prevDate)
    }
    
    // Add padding days for next month to complete the grid
    const endDayOfWeek = end.getDay()
    const trailingDays = []
    for (let i = 1; i < 7 - endDayOfWeek; i++) {
      const nextDate = new Date(end)
      nextDate.setDate(nextDate.getDate() + i)
      trailingDays.push(nextDate)
    }
    
    return [...paddingDays, ...days, ...trailingDays]
  }, [currentMonth])

  // Get events for a specific date
  const getEventsForDate = useCallback((date) => {
    return orders.filter(order => {
      const [year, month, day] = order.install_date.split('-').map(Number)
      const orderDate = new Date(year, month - 1, day)
      return isSameDay(orderDate, date)
    })
  }, [orders])

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    return getEventsForDate(selectedDate)
  }, [selectedDate, getEventsForDate])

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setSelectedDate(today)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
        <button
          onClick={handleToday}
          className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-white/90 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          Today
        </button>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
          <span className="text-white font-semibold text-lg sm:text-xl min-w-[140px] sm:min-w-[180px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="w-[52px] sm:w-[70px]" /> {/* Spacer for balance */}
      </div>

      {/* Month Grid */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden mb-3 sm:mb-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-blue-900/30">
          {dayNames.map((day, i) => (
            <div key={i} className="py-2 sm:py-3 text-center text-white/70 text-xs sm:text-sm font-semibold">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{shortDayNames[i]}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())
            const dayEvents = getEventsForDate(day)
            
            // Get unique product types for dots (max 3)
            const productTypes = [...new Set(dayEvents.map(e => getPrimaryProductType(e)))].slice(0, 3)

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative py-2 sm:py-3 min-h-[52px] sm:min-h-[70px] flex flex-col items-center justify-start gap-1 sm:gap-1.5
                  transition-colors border-t border-white/5
                  ${isCurrentMonth ? 'text-white' : 'text-white/30'}
                  ${isSelected ? 'bg-blue-500/30' : 'hover:bg-white/10'}
                  ${isToday && !isSelected ? 'bg-green-500/10' : ''}
                `}
              >
                <span className={`
                  text-sm sm:text-base font-medium
                  ${isToday ? 'text-green-400 font-bold' : ''}
                  ${isSelected ? 'text-white font-bold' : ''}
                `}>
                  {format(day, 'd')}
                </span>
                
                {/* Event Dots */}
                {productTypes.length > 0 && (
                  <div className="flex gap-0.5 sm:gap-1">
                    {productTypes.map((type, j) => (
                      <div
                        key={j}
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                        style={{ backgroundColor: productColors[type].bg }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Date Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 px-1">
        <h3 className="text-white font-semibold text-base sm:text-lg">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        <span className="text-white/60 text-sm">
          {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 min-h-[150px] max-h-[300px] sm:max-h-[400px]">
        {selectedDateEvents.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-white/50">
            <p className="text-base sm:text-lg">No orders scheduled</p>
            <p className="text-sm mt-1">Click + to add an order</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {selectedDateEvents.map(order => {
              const productType = getPrimaryProductType(order)
              const colors = productColors[productType]
              const products = getProductsList(order)

              return (
                <button
                  key={order.orderid}
                  onClick={() => onOrderClick(order)}
                  className="w-full p-3 sm:p-4 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: `${colors.bg}20`,
                    borderLeft: `4px solid ${colors.bg}`
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: colors.bg }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate text-sm sm:text-base">
                        {order.customer_name}
                      </p>
                      <p className="text-white/70 text-xs sm:text-sm truncate">
                        {products.join(', ')}
                      </p>
                      {order.address && (
                        <p className="text-white/50 text-xs truncate mt-1">
                          {order.address}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Add Button */}
      <button
        onClick={() => onDateClick(selectedDate)}
        className="mt-3 sm:mt-4 w-full sm:w-auto sm:px-8 py-3 flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-white font-medium transition-colors sm:mx-auto"
      >
        <Plus size={18} />
        Add Order for {format(selectedDate, 'MMMM d')}
      </button>
    </div>
  )
}

const CalendarView = ({ orders, onOrderClick, onDateClick, onEventDrop }) => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())

  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 sm:p-6 shadow-2xl">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-2 sm:gap-3 items-center">
        <span className="text-white font-semibold mr-2 text-sm sm:text-base">Product Types:</span>
        {Object.entries(productColors).filter(([key]) => key !== 'default').map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5 sm:gap-2">
            <div
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
              style={{ backgroundColor: colors.bg }}
            />
            <span className="text-white/80 text-xs sm:text-sm capitalize">{type}</span>
          </div>
        ))}
      </div>

      <MobileCalendarView
        orders={orders}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        onOrderClick={onOrderClick}
        onDateClick={onDateClick}
        productColors={productColors}
      />
    </div>
  )
}

export default CalendarView
