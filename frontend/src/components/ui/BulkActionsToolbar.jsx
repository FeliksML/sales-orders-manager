import { CheckCircle, Calendar, Trash2, Download, X } from 'lucide-react'

function BulkActionsToolbar({
  selectedCount,
  onMarkInstalled,
  onReschedule,
  onDelete,
  onExport,
  onClearSelection
}) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slideUp">
      <div className="bg-gradient-to-r from-blue-900/95 to-indigo-900/95 backdrop-blur-md border border-blue-500/30 rounded-xl shadow-2xl px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Selection Count */}
          <div className="flex items-center gap-2 pr-4 border-r border-blue-400/30">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{selectedCount}</span>
            </div>
            <span className="text-white font-medium">
              {selectedCount === 1 ? '1 order selected' : `${selectedCount} orders selected`}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkInstalled}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 transform duration-200"
              title="Mark as installed"
            >
              <CheckCircle size={18} />
              Mark Installed
            </button>

            <button
              onClick={onReschedule}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 transform duration-200"
              title="Reschedule orders"
            >
              <Calendar size={18} />
              Reschedule
            </button>

            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 transform duration-200"
              title="Export selected orders"
            >
              <Download size={18} />
              Export
            </button>

            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 transform duration-200"
              title="Delete selected orders"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            className="ml-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Clear selection"
          >
            <X size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkActionsToolbar
