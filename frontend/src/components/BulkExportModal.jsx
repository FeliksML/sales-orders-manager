import { X, Download, FileSpreadsheet, FileText } from 'lucide-react'

function BulkExportModal({ isOpen, onClose, onExport, selectedCount }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Download className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Bulk Export</h2>
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
          <p className="text-gray-300">
            Export <span className="font-bold text-purple-400">{selectedCount}</span>{' '}
            {selectedCount === 1 ? 'order' : 'orders'} to a file.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => onExport('excel')}
              className="w-full flex items-center justify-between p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] transform duration-200"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={24} />
                <div className="text-left">
                  <div className="font-semibold">Export to Excel</div>
                  <div className="text-sm opacity-90">Download as .xlsx file</div>
                </div>
              </div>
              <Download size={20} />
            </button>

            <button
              onClick={() => onExport('csv')}
              className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] transform duration-200"
            >
              <div className="flex items-center gap-3">
                <FileText size={24} />
                <div className="text-left">
                  <div className="font-semibold">Export to CSV</div>
                  <div className="text-sm opacity-90">Download as .csv file</div>
                </div>
              </div>
              <Download size={20} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 bg-white/5 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkExportModal
