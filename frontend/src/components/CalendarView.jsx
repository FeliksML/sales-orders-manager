import { useState, useMemo, useCallback, useEffect } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import enUS from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { ChevronLeft, ChevronRight, Plus, Wifi, Tv, Smartphone, Phone } from 'lucide-react'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})
const DragAndDropCalendar = withDragAndDrop(Calendar)

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

// Mobile Calendar Component
const MobileCalendarView = ({ orders, selectedDate, setSelectedDate, currentMonth, setCurrentMonth, onOrderClick, onDateClick, productColors }) => {
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  
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
      {/* Compact Navigation Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={handleToday}
          className="px-3 py-1.5 text-sm font-medium text-white/90 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          Today
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-white font-semibold text-lg min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="w-[52px]" /> {/* Spacer for balance */}
      </div>

      {/* Compact Month Grid */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden mb-3">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-blue-900/30">
          {dayNames.map((day, i) => (
            <div key={i} className="py-2 text-center text-white/70 text-sm font-semibold">
              {day}
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
                  relative py-2 min-h-[52px] flex flex-col items-center justify-start gap-1
                  transition-colors border-t border-white/5
                  ${isCurrentMonth ? 'text-white' : 'text-white/30'}
                  ${isSelected ? 'bg-blue-500/30' : 'hover:bg-white/5'}
                  ${isToday && !isSelected ? 'bg-green-500/10' : ''}
                `}
              >
                <span className={`
                  text-sm font-medium
                  ${isToday ? 'text-green-400 font-bold' : ''}
                  ${isSelected ? 'text-white font-bold' : ''}
                `}>
                  {format(day, 'd')}
                </span>
                
                {/* Event Dots */}
                {productTypes.length > 0 && (
                  <div className="flex gap-0.5">
                    {productTypes.map((type, j) => (
                      <div
                        key={j}
                        className="w-1.5 h-1.5 rounded-full"
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
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-white font-semibold">
          {format(selectedDate, 'EEEE, MMM d')}
        </h3>
        <span className="text-white/60 text-sm">
          {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[150px] max-h-[300px]">
        {selectedDateEvents.length === 0 ? (
          <div className="text-center py-8 text-white/50">
            <p>No orders scheduled</p>
            <p className="text-sm mt-1">Tap + to add an order</p>
          </div>
        ) : (
          selectedDateEvents.map(order => {
            const productType = getPrimaryProductType(order)
            const colors = productColors[productType]
            const products = getProductsList(order)

            return (
              <button
                key={order.orderid}
                onClick={() => onOrderClick(order)}
                className="w-full p-3 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: `${colors.bg}20`,
                  borderLeft: `4px solid ${colors.bg}`
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {order.customer_name}
                    </p>
                    <p className="text-white/70 text-sm truncate">
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
          })
        )}
      </div>

      {/* Quick Add Button */}
      <button
        onClick={() => onDateClick(selectedDate)}
        className="mt-3 w-full py-3 flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-white font-medium transition-colors"
      >
        <Plus size={18} />
        Add Order for {format(selectedDate, 'MMM d')}
      </button>
    </div>
  )
}

const CalendarView = ({ orders, onOrderClick, onDateClick, onEventDrop }) => {
  const [view, setView] = useState('month')
  const [date, setDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false)

  // Mobile detection with resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Transform orders into calendar events
  const events = useMemo(() => {
    return orders.map(order => {
      const productType = getPrimaryProductType(order)
      const colors = productColors[productType]
      const products = getProductsList(order)

      // Parse date as LOCAL time, not UTC
      const [year, month, day] = order.install_date.split('-').map(Number)
      const localDate = new Date(year, month - 1, day)

      return {
        id: order.orderid,
        title: `${order.customer_name} - ${products.join(', ')}`,
        start: localDate,
        end: localDate,
        resource: {
          order,
          productType,
          colors
        }
      }
    })
  }, [orders])

  // Custom event style getter for color coding
  const eventStyleGetter = useCallback((event) => {
    const colors = event.resource.colors
    return {
      style: {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: '6px',
        padding: '2px 6px',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }
    }
  }, [])

  // Handle event click
  const handleSelectEvent = useCallback((event) => {
    onOrderClick(event.resource.order)
  }, [onOrderClick])

  // Handle slot selection (clicking on empty date)
  const handleSelectSlot = useCallback((slotInfo) => {
    onDateClick(slotInfo.start)
  }, [onDateClick])

  // Handle event drop for rescheduling
  const handleEventDrop = useCallback(({ event, start }) => {
    onEventDrop(event.resource.order.orderid, start)
  }, [onEventDrop])

  // Handle navigation
  const handleNavigate = useCallback((newDate) => {
    setDate(newDate)
  }, [])

  // Mobile View
  if (isMobile) {
    return (
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-2xl">
        {/* Compact Legend - Collapsible */}
        <details className="mb-3">
          <summary className="text-white/70 text-sm cursor-pointer hover:text-white transition-colors">
            Product Colors
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(productColors).filter(([key]) => key !== 'default').map(([type, colors]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors.bg }}
                />
                <span className="text-white/70 text-xs capitalize">{type}</span>
              </div>
            ))}
          </div>
        </details>

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

  // Desktop View (existing implementation)
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-2xl">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <span className="text-white font-semibold mr-2">Product Types:</span>
        {Object.entries(productColors).filter(([key]) => key !== 'default').map(([type, colors]) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colors.bg, borderColor: colors.border, borderWidth: '2px' }}
            />
            <span className="text-white/90 text-sm capitalize">{type}</span>
          </div>
        ))}
      </div>

      <style>{`
        /* Calendar container styling */
        .rbc-calendar {
          font-family: inherit;
        }

        /* Toolbar styling */
        .rbc-toolbar {
          padding: 15px;
          margin-bottom: 15px;
          background: rgba(30, 58, 138, 0.2);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .rbc-toolbar button {
          color: #e0e7ff;
          background: rgba(59, 130, 246, 0.3);
          border: 1px solid rgba(59, 130, 246, 0.5);
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .rbc-toolbar button:hover {
          background: rgba(59, 130, 246, 0.5);
          border-color: rgba(59, 130, 246, 0.7);
          color: white;
        }

        .rbc-toolbar button:active,
        .rbc-toolbar button.rbc-active {
          background: rgba(59, 130, 246, 0.7);
          border-color: rgba(59, 130, 246, 0.9);
          color: white;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }

        .rbc-toolbar-label {
          color: white;
          font-weight: 600;
          font-size: 1.1rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        /* Month view styling */
        .rbc-month-view {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .rbc-header {
          background: rgba(30, 58, 138, 0.3);
          color: white;
          padding: 12px 8px;
          font-weight: 600;
          border-bottom: 2px solid rgba(59, 130, 246, 0.5);
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 0.5px;
        }

        .rbc-header + .rbc-header {
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .rbc-month-row {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .rbc-day-bg {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.1);
          transition: background 0.2s;
        }

        .rbc-day-bg:hover {
          background: rgba(59, 130, 246, 0.1);
          cursor: pointer;
        }

        .rbc-off-range-bg {
          background: rgba(0, 0, 0, 0.1);
        }

        .rbc-today {
          background: rgba(34, 197, 94, 0.15);
        }

        .rbc-date-cell {
          padding: 8px;
          text-align: right;
        }

        .rbc-date-cell a {
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
        }

        .rbc-off-range .rbc-date-cell a {
          color: rgba(255, 255, 255, 0.3);
        }

        .rbc-now .rbc-date-cell a {
          color: #22c55e;
          font-weight: 700;
        }

        /* Week and Day view styling */
        .rbc-time-view {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .rbc-time-header {
          background: rgba(30, 58, 138, 0.2);
        }

        .rbc-time-content {
          border-top: 2px solid rgba(59, 130, 246, 0.5);
        }

        .rbc-time-slot {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
        }

        .rbc-current-time-indicator {
          background-color: #22c55e;
          height: 2px;
        }

        .rbc-timeslot-group {
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* Event styling enhancements */
        .rbc-event {
          border-radius: 4px;
          padding: 2px 5px;
          cursor: move !important;
        }

        .rbc-event:hover {
          filter: brightness(1.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }

        .rbc-event-label {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .rbc-event-content {
          font-size: 0.875rem;
          font-weight: 500;
        }

        /* Selected event */
        .rbc-selected {
          box-shadow: 0 0 0 2px white, 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        /* Drag and drop styling */
        .rbc-addons-dnd-dragging {
          opacity: 0.7;
          cursor: move !important;
        }

        .rbc-addons-dnd-over {
          background: rgba(59, 130, 246, 0.2) !important;
        }

        .rbc-addons-dnd .rbc-event {
          cursor: move !important;
        }

        .rbc-addons-dnd-resizable {
          cursor: move !important;
        }

        /* Popup/Show More styling */
        .rbc-overlay {
          background: rgba(30, 58, 138, 0.95);
          border: 1px solid rgba(59, 130, 246, 0.5);
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
        }

        .rbc-overlay-header {
          background: rgba(59, 130, 246, 0.3);
          color: white;
          padding: 10px;
          border-bottom: 1px solid rgba(59, 130, 246, 0.5);
          font-weight: 600;
        }

        /* Show more link */
        .rbc-show-more {
          background: rgba(59, 130, 246, 0.3);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
          margin: 2px;
          transition: all 0.2s;
        }

        .rbc-show-more:hover {
          background: rgba(59, 130, 246, 0.5);
          color: white;
        }

        /* Agenda view styling */
        .rbc-agenda-view {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .rbc-agenda-view table {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .rbc-agenda-date-cell,
        .rbc-agenda-time-cell {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(30, 58, 138, 0.2);
        }

        .rbc-agenda-event-cell {
          color: rgba(255, 255, 255, 0.9);
        }
      `}</style>

      {/* Calendar */}
      <div
        className="rounded-lg p-4 shadow-inner"
        style={{
          height: '700px',
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onView={setView}
          onNavigate={handleNavigate}
          views={['month', 'week', 'day']}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          selectable
          resizable={false}
          draggableAccessor={() => true}
          style={{ height: '100%' }}
          popup
        />
      </div>

      {/* Instructions */}
      <div className="mt-4 text-white/70 text-sm space-y-1">
        <p>• Click on an event to view order details</p>
        <p>• Click on an empty date to create a new order</p>
        <p>• Drag and drop events to reschedule installations</p>
        <p>• Switch between Month, Week, and Day views using the toolbar</p>
      </div>
    </div>
  )
}

export default CalendarView
