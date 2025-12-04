import { useState, useEffect } from 'react'
import { X, Calendar, Clock, CalendarClock } from 'lucide-react'

// Generate 24 one-hour time slots (same as OrderDetailsModal)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const startHour = i
  const endHour = (i + 1) % 24
  const formatHour = (h) => {
    const period = h < 12 ? 'AM' : 'PM'
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hour12}:00 ${period}`
  }
  const label = `${formatHour(startHour)} - ${formatHour(endHour)}`
  return { value: label, label }
})

// Quick select options
const QUICK_OPTIONS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 Days', days: 3 },
  { label: 'Next Week', days: 7 },
]

function QuickRescheduleModal({ isOpen, onClose, onConfirm, order, loading }) {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [error, setError] = useState(null)
  const [activeQuickOption, setActiveQuickOption] = useState(null)

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  // Reset state when modal opens with order data
  useEffect(() => {
    if (isOpen && order) {
      setSelectedDate(order.install_date || '')
      setSelectedTime(order.install_time || '')
      setError(null)
      setActiveQuickOption(null)
    }
  }, [isOpen, order])

  if (!isOpen) return null

  const handleQuickSelect = (days) => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    const dateStr = futureDate.toISOString().split('T')[0]
    setSelectedDate(dateStr)
    setActiveQuickOption(days)
    setError(null)
  }

  const handleDateChange = (value) => {
    setSelectedDate(value)
    setActiveQuickOption(null)
    setError(null)
  }

  const handleConfirm = () => {
    if (!selectedDate) {
      setError('Please select a date')
      return
    }

    // Validate date is not in the past
    const selectedDateObj = new Date(selectedDate + 'T00:00:00')
    const todayObj = new Date()
    todayObj.setHours(0, 0, 0, 0)

    if (selectedDateObj < todayObj) {
      setError('Cannot reschedule to a past date')
      return
    }

    onConfirm(selectedDate, selectedTime)
  }

  const handleClose = () => {
    setError(null)
    setActiveQuickOption(null)
    onClose()
  }

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'Not selected'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-3 sm:p-4 pb-[72px] sm:pb-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <CalendarClock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Reschedule Installation</h2>
              {order?.business_name && (
                <p className="text-sm text-gray-400 mt-0.5">{order.business_name}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Quick Select Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Quick Select
            </label>
            <div className="flex gap-2">
              {QUICK_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  onClick={() => handleQuickSelect(option.days)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeQuickOption === option.days
                      ? 'bg-yellow-500/30 border-2 border-yellow-500 text-yellow-300'
                      : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Picker */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4" />
              Installation Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              min={today}
              className={`w-full px-4 py-2.5 bg-white/5 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors ${
                error ? 'border-red-500' : 'border-white/10'
              }`}
            />
            {selectedDate && (
              <p className="text-sm text-yellow-400 mt-2">
                {formatDateDisplay(selectedDate)}
              </p>
            )}
          </div>

          {/* Time Picker */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Clock className="w-4 h-4" />
              Installation Time
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors"
            >
              <option value="" className="bg-gray-800">Keep current time</option>
              {TIME_SLOTS.map(slot => (
                <option key={slot.value} value={slot.value} className="bg-gray-800">
                  {slot.label}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 bg-white/5 border-t border-white/10">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !selectedDate}
            className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Rescheduling...</span>
              </>
            ) : (
              <>
                <CalendarClock className="w-4 h-4" />
                <span>Reschedule</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuickRescheduleModal
