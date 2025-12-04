import { X, CheckCircle } from 'lucide-react'

function BulkMarkInstalledModal({ isOpen, onClose, onConfirm, selectedCount }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60 p-3 sm:p-4 pb-[72px] sm:pb-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-green-500/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Mark as Installed</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-300 font-medium">
              This will mark the selected orders as completed.
            </p>
          </div>

          <p className="text-gray-300">
            Are you sure you want to mark{' '}
            <span className="font-bold text-green-400">{selectedCount}</span>{' '}
            {selectedCount === 1 ? 'order' : 'orders'} as installed? This will:
          </p>

          <ul className="text-gray-400 text-sm space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">•</span>
              <span>Set the install date to <strong className="text-white">today</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">•</span>
              <span>Set the install time to the <strong className="text-white">current time</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">•</span>
              <span>Mark the {selectedCount === 1 ? 'order' : 'orders'} as <strong className="text-white">completed</strong></span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 bg-white/5 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Mark {selectedCount} {selectedCount === 1 ? 'Order' : 'Orders'} Installed
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkMarkInstalledModal
