import { useState, useEffect } from 'react'
import { X, Calendar, Clock, MessageSquare, Zap, CalendarDays, CheckCircle } from 'lucide-react'
import Card from './ui/Card'

// Suggested notes for quick selection
const SUGGESTED_NOTES = [
  'Ask about referral',
  'Check if service is working properly',
  'Verify TV channels are all working',
  'Follow up on mobile activation',
  'Confirm installation satisfaction',
  'Discuss upgrade options'
]

function FollowUpModal({ isOpen, onClose, onSubmit, order, loading = false }) {
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('09:00')
  const [note, setNote] = useState('')
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDueDate('')
      setDueTime('09:00')
      setNote('')
      setShowCustomDate(false)
      setSuccessMessage(null)
    }
  }, [isOpen])

  if (!isOpen || !order) return null

  // Calculate preset dates
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const inThreeDays = new Date(today)
  inThreeDays.setDate(inThreeDays.getDate() + 3)
  
  // One week after install date
  const installDate = order.install_date ? new Date(order.install_date + 'T00:00:00') : today
  const oneWeekAfterInstall = new Date(installDate)
  oneWeekAfterInstall.setDate(oneWeekAfterInstall.getDate() + 7)

  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleQuickSelect = async (date) => {
    const selectedDate = formatDate(date)
    // Create ISO datetime string
    const dateTimeString = `${selectedDate}T${dueTime}:00`
    
    try {
      await onSubmit(order.orderid, dateTimeString, note || null)
      setSuccessMessage('Follow-up scheduled!')
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Failed to create follow-up:', error)
    }
  }

  const handleCustomSubmit = async (e) => {
    e.preventDefault()
    if (!dueDate) return

    const dateTimeString = `${dueDate}T${dueTime}:00`
    
    try {
      await onSubmit(order.orderid, dateTimeString, note || null)
      setSuccessMessage('Follow-up scheduled!')
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Failed to create follow-up:', error)
    }
  }

  const handleSuggestedNote = (suggestedNote) => {
    setNote(suggestedNote)
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm pb-[72px] sm:pb-4">
      <Card className="w-full max-w-lg max-h-[calc(100vh-88px)] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Schedule Follow-Up</h2>
            <p className="text-gray-400 text-sm mt-1">
              {order.customer_name} - {order.business_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-300 font-medium">{successMessage}</p>
          </div>
        )}

        {!successMessage && (
          <>
            {/* Quick Select Buttons */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Quick Schedule
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleQuickSelect(tomorrow)}
                  disabled={loading}
                  className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 hover:border-blue-400/50 transition-all hover:scale-[1.02] text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium">Tomorrow</span>
                  </div>
                  <p className="text-blue-300 text-sm">{formatDisplayDate(tomorrow)}</p>
                </button>

                <button
                  onClick={() => handleQuickSelect(inThreeDays)}
                  disabled={loading}
                  className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 hover:border-purple-400/50 transition-all hover:scale-[1.02] text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-white font-medium">In 3 Days</span>
                  </div>
                  <p className="text-purple-300 text-sm">{formatDisplayDate(inThreeDays)}</p>
                </button>

                <button
                  onClick={() => handleQuickSelect(oneWeekAfterInstall)}
                  disabled={loading}
                  className="p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 hover:border-green-400/50 transition-all hover:scale-[1.02] text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="w-4 h-4 text-green-400" />
                    <span className="text-white font-medium">1 Week After Install</span>
                  </div>
                  <p className="text-green-300 text-sm">{formatDisplayDate(oneWeekAfterInstall)}</p>
                </button>
              </div>
            </div>

            {/* Custom Date Toggle */}
            <div className="mb-6">
              <button
                onClick={() => setShowCustomDate(!showCustomDate)}
                className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                {showCustomDate ? 'Hide custom date' : 'Choose custom date...'}
              </button>

              {showCustomDate && (
                <form onSubmit={handleCustomSubmit} className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        min={formatDate(today)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Time
                      </label>
                      <input
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!dueDate || loading}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        Schedule for {dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '...'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Note Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What should you follow up about?"
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
              
              {/* Suggested Notes */}
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTED_NOTES.map((suggestedNote) => (
                  <button
                    key={suggestedNote}
                    type="button"
                    onClick={() => handleSuggestedNote(suggestedNote)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      note === suggestedNote
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                    }`}
                  >
                    {suggestedNote}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selector for Quick Options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Reminder Time
              </label>
              <select
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="08:00" className="bg-gray-800">8:00 AM</option>
                <option value="09:00" className="bg-gray-800">9:00 AM</option>
                <option value="10:00" className="bg-gray-800">10:00 AM</option>
                <option value="11:00" className="bg-gray-800">11:00 AM</option>
                <option value="12:00" className="bg-gray-800">12:00 PM</option>
                <option value="13:00" className="bg-gray-800">1:00 PM</option>
                <option value="14:00" className="bg-gray-800">2:00 PM</option>
                <option value="15:00" className="bg-gray-800">3:00 PM</option>
                <option value="16:00" className="bg-gray-800">4:00 PM</option>
                <option value="17:00" className="bg-gray-800">5:00 PM</option>
              </select>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            {successMessage ? 'Close' : 'Cancel'}
          </button>
        </div>
      </Card>
    </div>
  )
}

export default FollowUpModal

