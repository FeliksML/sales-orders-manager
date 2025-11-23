import { CheckCircle, Calendar, Trash2, Download, X } from 'lucide-react'

// CSS to hide scrollbar
const scrollbarHideStyle = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`

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
    <>
      <style>{scrollbarHideStyle}</style>
      <div
        className="fixed left-1/2 transform -translate-x-1/2 z-[60] animate-slideUp px-2 sm:px-0 w-full sm:w-auto max-w-[calc(100vw-1rem)] sm:max-w-none"
        style={{
          bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))'
        }}
        role="toolbar"
        aria-label="Bulk actions toolbar"
      >
      <div className="bg-gradient-to-r from-blue-900/95 to-indigo-900/95 backdrop-blur-md border border-blue-500/30 rounded-xl shadow-2xl px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-center gap-1.5 sm:gap-3">
          {/* Selection Count Badge */}
          <div className="flex items-center gap-0 flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-bold text-xs sm:text-sm">{selectedCount}</span>
            </div>
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <button
              onClick={onMarkInstalled}
              className="flex items-center justify-center gap-1.5 sm:gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transform duration-200 whitespace-nowrap"
              title="Mark as installed"
              aria-label={`Mark ${selectedCount} ${selectedCount === 1 ? 'order' : 'orders'} as installed`}
            >
              <CheckCircle size={16} className="flex-shrink-0" />
              <span className="hidden md:inline">Mark Installed</span>
            </button>

            <button
              onClick={onReschedule}
              className="flex items-center justify-center gap-1.5 sm:gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transform duration-200 whitespace-nowrap"
              title="Reschedule orders"
              aria-label={`Reschedule ${selectedCount} ${selectedCount === 1 ? 'order' : 'orders'}`}
            >
              <Calendar size={16} className="flex-shrink-0" />
              <span className="hidden md:inline">Reschedule</span>
            </button>

            <button
              onClick={onExport}
              className="flex items-center justify-center gap-1.5 sm:gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transform duration-200 whitespace-nowrap"
              title="Export selected orders"
              aria-label={`Export ${selectedCount} ${selectedCount === 1 ? 'order' : 'orders'}`}
            >
              <Download size={16} className="flex-shrink-0" />
              <span className="hidden md:inline">Export</span>
            </button>

            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 sm:gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transform duration-200 whitespace-nowrap"
              title="Delete selected orders"
              aria-label={`Delete ${selectedCount} ${selectedCount === 1 ? 'order' : 'orders'}`}
            >
              <Trash2 size={16} className="flex-shrink-0" />
              <span className="hidden md:inline">Delete</span>
            </button>
          </div>

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            className="p-2 w-9 h-9 sm:w-9 sm:h-9 hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>
      </div>
    </>
  )
}

export default BulkActionsToolbar
