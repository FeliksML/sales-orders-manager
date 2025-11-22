import { X, AlertTriangle } from 'lucide-react'

function BulkDeleteModal({ isOpen, onClose, onConfirm, selectedCount }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-red-500/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Confirm Bulk Delete</h2>
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
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-300 font-medium">
              Warning: This action cannot be undone!
            </p>
          </div>

          <p className="text-gray-300">
            Are you sure you want to delete{' '}
            <span className="font-bold text-red-400">{selectedCount}</span>{' '}
            {selectedCount === 1 ? 'order' : 'orders'}? This will permanently remove{' '}
            {selectedCount === 1 ? 'this order' : 'these orders'} from the database.
          </p>
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
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Delete {selectedCount} {selectedCount === 1 ? 'Order' : 'Orders'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkDeleteModal
