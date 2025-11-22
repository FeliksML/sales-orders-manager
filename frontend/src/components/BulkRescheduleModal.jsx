import { useState } from 'react'
import { X, Calendar } from 'lucide-react'

function BulkRescheduleModal({ isOpen, onClose, onConfirm, selectedCount }) {
  const [newDate, setNewDate] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (newDate) {
      onConfirm(newDate)
      setNewDate('')
    }
  }

  const handleClose = () => {
    setNewDate('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Bulk Reschedule</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <p className="text-gray-300">
              Reschedule <span className="font-bold text-blue-400">{selectedCount}</span>{' '}
              {selectedCount === 1 ? 'order' : 'orders'} to a new installation date.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Installation Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 bg-white/5 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Reschedule Orders
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BulkRescheduleModal
