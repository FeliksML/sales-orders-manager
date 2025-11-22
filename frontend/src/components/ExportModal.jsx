import { useState, useEffect, useRef } from 'react'
import { X, Download, FileSpreadsheet, FileText, ChevronDown, ChevronUp, Mail, Send } from 'lucide-react'
import ReCAPTCHA from 'react-google-recaptcha'
import { exportService } from '../services/exportService'
import Toast from './Toast'

function ExportModal({ isOpen, onClose, filters, exportType = 'orders' }) {
  const [loading, setLoading] = useState(false)
  const [availableColumns, setAvailableColumns] = useState([])
  const [selectedColumns, setSelectedColumns] = useState([])
  const [showColumnSelection, setShowColumnSelection] = useState(false)
  const [selectAll, setSelectAll] = useState(true)
  const [showEmailCaptcha, setShowEmailCaptcha] = useState(false)
  const [emailFormat, setEmailFormat] = useState(null)
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [toast, setToast] = useState(null)
  const recaptchaRef = useRef(null)

  useEffect(() => {
    if (isOpen && exportType === 'orders') {
      loadAvailableColumns()
    }
  }, [isOpen, exportType])

  const loadAvailableColumns = async () => {
    try {
      const response = await exportService.getAvailableColumns()
      setAvailableColumns(response.columns)
      // Select all columns by default
      setSelectedColumns(response.columns.map(col => col.id))
      setSelectAll(true)
    } catch (error) {
      console.error('Failed to load columns:', error)
    }
  }

  const handleColumnToggle = (columnId) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnId)) {
        const newSelection = prev.filter(id => id !== columnId)
        setSelectAll(newSelection.length === availableColumns.length)
        return newSelection
      } else {
        const newSelection = [...prev, columnId]
        setSelectAll(newSelection.length === availableColumns.length)
        return newSelection
      }
    })
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedColumns([])
      setSelectAll(false)
    } else {
      setSelectedColumns(availableColumns.map(col => col.id))
      setSelectAll(true)
    }
  }

  const handleExport = async (format) => {
    setLoading(true)
    try {
      if (exportType === 'stats') {
        await exportService.exportStatsReport()
      } else {
        const columnsToExport = showColumnSelection && selectedColumns.length > 0
          ? selectedColumns
          : null

        if (format === 'excel') {
          await exportService.exportToExcel(filters, columnsToExport)
        } else {
          await exportService.exportToCSV(filters, columnsToExport)
        }
      }
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      setToast({
        message: 'Export failed. Please try again.',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEmailClick = (format) => {
    setEmailFormat(format)
    setShowEmailCaptcha(true)
  }

  const handleSendEmail = async () => {
    if (!recaptchaToken) {
      setToast({
        message: 'Please complete the CAPTCHA verification',
        type: 'error'
      })
      return
    }

    setSendingEmail(true)
    try {
      const columnsToExport = showColumnSelection && selectedColumns.length > 0
        ? selectedColumns
        : null

      await exportService.emailExport(emailFormat, filters, columnsToExport, recaptchaToken)

      setToast({
        message: `Export sent successfully to your email!`,
        type: 'success'
      })
      setShowEmailCaptcha(false)
      setRecaptchaToken('')
      setEmailFormat(null)
      if (recaptchaRef.current) {
        recaptchaRef.current.reset()
      }
      // Close modal after a brief delay
      setTimeout(() => onClose(), 1500)
    } catch (error) {
      console.error('Failed to send export email:', error)
      const errorMsg = error.response?.data?.detail || 'Failed to send export. Please try again.'
      setToast({
        message: errorMsg,
        type: 'error'
      })
      if (recaptchaRef.current) {
        recaptchaRef.current.reset()
      }
      setRecaptchaToken('')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleCancelEmail = () => {
    setShowEmailCaptcha(false)
    setEmailFormat(null)
    setRecaptchaToken('')
    if (recaptchaRef.current) {
      recaptchaRef.current.reset()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {exportType === 'stats' ? 'Export Statistics Report' : 'Export Orders'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {exportType === 'stats'
                ? 'Download a comprehensive statistics report'
                : 'Download your filtered orders data'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {exportType === 'orders' && (
            <>
              {/* Column Selection Toggle */}
              <div className="mb-6">
                <button
                  onClick={() => setShowColumnSelection(!showColumnSelection)}
                  className="flex items-center justify-between w-full p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <span className="text-white font-medium">Custom Column Selection</span>
                  {showColumnSelection ? (
                    <ChevronUp className="text-slate-400" size={20} />
                  ) : (
                    <ChevronDown className="text-slate-400" size={20} />
                  )}
                </button>

                {/* Column Selection Panel */}
                {showColumnSelection && (
                  <div className="mt-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-white font-medium">
                        Select Columns ({selectedColumns.length}/{availableColumns.length})
                      </span>
                      <button
                        onClick={handleSelectAll}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                      >
                        {selectAll ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      {availableColumns.map(column => (
                        <label
                          key={column.id}
                          className="flex items-center space-x-3 p-2 hover:bg-slate-600/30 rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedColumns.includes(column.id)}
                            onChange={() => handleColumnToggle(column.id)}
                            className="w-4 h-4 rounded border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                          />
                          <span className="text-slate-200 text-sm">{column.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Filters Info */}
              {Object.keys(filters).length > 0 && (
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm font-medium mb-2">Active Filters:</p>
                  <div className="flex flex-wrap gap-2">
                    {filters.search && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                        Search: {filters.search}
                      </span>
                    )}
                    {filters.dateFrom && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                        From: {filters.dateFrom}
                      </span>
                    )}
                    {filters.dateTo && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                        To: {filters.dateTo}
                      </span>
                    )}
                    {Object.entries(filters.productTypes || {}).filter(([_, v]) => v).length > 0 && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                        Products: {Object.entries(filters.productTypes || {}).filter(([_, v]) => v).map(([k]) => k).join(', ')}
                      </span>
                    )}
                    {Object.entries(filters.installStatus || {}).filter(([_, v]) => v).length > 0 && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                        Status: {Object.entries(filters.installStatus || {}).filter(([_, v]) => v).map(([k]) => k).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Email Option */}
          {exportType === 'orders' && !showEmailCaptcha && (
            <div className="mb-6">
              <p className="text-white font-medium mb-3 flex items-center gap-2">
                <Mail size={20} />
                Or Send to Email
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => handleEmailClick('excel')}
                  disabled={loading || (showColumnSelection && selectedColumns.length === 0)}
                  className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] transform duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Mail size={24} />
                    <div className="text-left">
                      <div className="font-semibold">Email Excel</div>
                      <div className="text-sm opacity-90">Send .xlsx to your email</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleEmailClick('csv')}
                  disabled={loading || (showColumnSelection && selectedColumns.length === 0)}
                  className="p-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] transform duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Mail size={24} />
                    <div className="text-left">
                      <div className="font-semibold">Email CSV</div>
                      <div className="text-sm opacity-90">Send .csv to your email</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Email CAPTCHA Panel */}
          {showEmailCaptcha && (
            <div className="mb-6">
              <p className="text-white font-medium mb-3 flex items-center gap-2">
                <Send size={20} />
                Email {emailFormat === 'excel' ? 'Excel' : 'CSV'} Export
              </p>
              <div className="p-6 bg-slate-700/50 border border-slate-600 rounded-lg">
                <p className="text-white mb-4 text-center">
                  Verify you're human to send the export to your email
                </p>

                <div className="flex justify-center mb-4">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                    onChange={(token) => setRecaptchaToken(token || "")}
                    onExpired={() => setRecaptchaToken("")}
                    theme="dark"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelEmail}
                    disabled={sendingEmail}
                    className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={!recaptchaToken || sendingEmail}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {sendingEmail ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Export Format Buttons */}
          {!showEmailCaptcha && (
            <div className="space-y-3">
              <p className="text-white font-medium mb-3">Download Export Files:</p>

            <button
              onClick={() => handleExport('excel')}
              disabled={loading || (showColumnSelection && selectedColumns.length === 0)}
              className="w-full flex items-center justify-between p-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] transform duration-200"
            >
              <div className="flex items-center space-x-3">
                <FileSpreadsheet size={24} />
                <div className="text-left">
                  <div className="font-semibold">Export to Excel</div>
                  <div className="text-sm opacity-90">Download as .xlsx file with formatting</div>
                </div>
              </div>
              <Download size={20} />
            </button>

            <button
              onClick={() => handleExport('csv')}
              disabled={loading || (showColumnSelection && selectedColumns.length === 0)}
              className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] transform duration-200"
            >
              <div className="flex items-center space-x-3">
                <FileText size={24} />
                <div className="text-left">
                  <div className="font-semibold">Export to CSV</div>
                  <div className="text-sm opacity-90">Download as .csv file for spreadsheets</div>
                </div>
              </div>
              <Download size={20} />
            </button>
            </div>
          )}

          {showColumnSelection && selectedColumns.length === 0 && (
            <p className="mt-4 text-yellow-400 text-sm text-center">
              Please select at least one column to export
            </p>
          )}

          {loading && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-slate-400 mt-2">Generating export...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default ExportModal
