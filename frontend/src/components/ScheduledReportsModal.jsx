import { useState, useEffect, useRef } from 'react'
import { X, Calendar, Mail, Trash2, Plus, Send } from 'lucide-react'
import ReCAPTCHA from 'react-google-recaptcha'
import apiClient from '../services/api'
import Toast from './Toast'

function ScheduledReportsModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState([])
  const [creating, setCreating] = useState(false)
  const [sendingNow, setSendingNow] = useState(false)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const recaptchaRef = useRef(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (isOpen) {
      loadReports()
    }
  }, [isOpen])

  const loadReports = async () => {
    try {
      const response = await apiClient.get('/api/scheduled-reports/')
      setReports(response.data.reports)
    } catch (error) {
      console.error('Failed to load scheduled reports:', error)
    }
  }

  const handleCreateReport = async (scheduleType) => {
    setCreating(true)
    try {
      await apiClient.post('/api/scheduled-reports/', {
        schedule_type: scheduleType
      })
      await loadReports()
      setToast({
        message: `${scheduleType.charAt(0).toUpperCase() + scheduleType.slice(1)} report scheduled successfully!`,
        type: 'success'
      })
    } catch (error) {
      console.error('Failed to create scheduled report:', error)
      setToast({
        message: 'Failed to schedule report. Please try again.',
        type: 'error'
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteReport = async (jobId) => {
    setLoading(true)
    try {
      await apiClient.delete(`/api/scheduled-reports/${jobId}`)
      await loadReports()
      setToast({
        message: 'Scheduled report deleted successfully!',
        type: 'success'
      })
    } catch (error) {
      console.error('Failed to delete scheduled report:', error)
      setToast({
        message: 'Failed to delete scheduled report. Please try again.',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendNowClick = () => {
    setShowCaptcha(true)
  }

  const handleSendNow = async () => {
    if (!recaptchaToken) {
      setToast({
        message: 'Please complete the CAPTCHA verification',
        type: 'error'
      })
      return
    }

    setSendingNow(true)
    try {
      const response = await apiClient.post('/api/scheduled-reports/send-now', {
        recaptcha_token: recaptchaToken
      })

      setToast({
        message: `Report sent successfully to ${response.data.email}!`,
        type: 'success'
      })
      setShowCaptcha(false)
      setRecaptchaToken('')
      if (recaptchaRef.current) {
        recaptchaRef.current.reset()
      }
    } catch (error) {
      console.error('Failed to send report:', error)
      const errorMsg = error.response?.data?.detail || 'Failed to send report. Please try again.'
      setToast({
        message: errorMsg,
        type: 'error'
      })
      if (recaptchaRef.current) {
        recaptchaRef.current.reset()
      }
      setRecaptchaToken('')
    } finally {
      setSendingNow(false)
    }
  }

  const handleCancelSendNow = () => {
    setShowCaptcha(false)
    setRecaptchaToken('')
    if (recaptchaRef.current) {
      recaptchaRef.current.reset()
    }
  }

  const hasWeekly = reports.some(r => r.schedule_type === 'weekly')
  const hasMonthly = reports.some(r => r.schedule_type === 'monthly')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Calendar size={28} />
              Scheduled Reports
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Receive automated sales reports via email
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
          {/* Add New Report Section */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Plus size={20} />
              Schedule New Report
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleCreateReport('weekly')}
                disabled={creating || hasWeekly}
                className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] transform duration-200 text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="flex-shrink-0" size={24} />
                  <div>
                    <div className="font-semibold">Weekly Report</div>
                    <div className="text-sm opacity-90">Every Monday at 9 AM</div>
                  </div>
                </div>
                {hasWeekly && (
                  <div className="text-xs mt-2 opacity-75">Already scheduled</div>
                )}
              </button>

              <button
                onClick={() => handleCreateReport('monthly')}
                disabled={creating || hasMonthly}
                className="p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] transform duration-200 text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="flex-shrink-0" size={24} />
                  <div>
                    <div className="font-semibold">Monthly Report</div>
                    <div className="text-sm opacity-90">1st of month at 9 AM</div>
                  </div>
                </div>
                {hasMonthly && (
                  <div className="text-xs mt-2 opacity-75">Already scheduled</div>
                )}
              </button>
            </div>
          </div>

          {/* Send Report Now Section */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Send size={20} />
              Send Report Now
            </h3>

            {!showCaptcha ? (
              <button
                onClick={handleSendNowClick}
                className="w-full p-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] transform duration-200 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="flex-shrink-0" size={24} />
                    <div>
                      <div className="font-semibold">Email Current Report</div>
                      <div className="text-sm opacity-90">Send statistics report to your email immediately</div>
                    </div>
                  </div>
                  <Send size={20} />
                </div>
              </button>
            ) : (
              <div className="p-6 bg-slate-700/50 border border-slate-600 rounded-lg">
                <p className="text-white mb-4 text-center">
                  Verify you're human to send the report
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
                    onClick={handleCancelSendNow}
                    disabled={sendingNow}
                    className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendNow}
                    disabled={!recaptchaToken || sendingNow}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {sendingNow ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Reports Section */}
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Mail size={20} />
              Active Scheduled Reports
            </h3>

            {reports.length === 0 ? (
              <div className="text-center py-12 bg-slate-700/30 rounded-lg border-2 border-dashed border-slate-600">
                <Calendar className="mx-auto mb-3 text-slate-500" size={48} />
                <p className="text-slate-400 mb-2">No scheduled reports yet</p>
                <p className="text-slate-500 text-sm">
                  Schedule weekly or monthly reports to receive them via email
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(report => (
                  <div
                    key={report.job_id}
                    className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg flex items-center justify-between hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        report.schedule_type === 'weekly'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {report.schedule_type.charAt(0).toUpperCase() + report.schedule_type.slice(1)} Report
                        </div>
                        <div className="text-slate-400 text-sm">
                          {report.schedule_type === 'weekly' ? 'Every Monday at 9 AM' : '1st of month at 9 AM'}
                        </div>
                        <div className="text-slate-500 text-xs mt-1">
                          Created: {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteReport(report.job_id)}
                      disabled={loading}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete scheduled report"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Note:</strong> Reports will be sent to your registered email address and include:
            </p>
            <ul className="text-blue-300 text-sm mt-2 ml-4 list-disc">
              <li>Order statistics and performance summary</li>
              <li>Product breakdown (Internet, TV, Mobile, Voice)</li>
              <li>Excel attachment with detailed order data</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Close
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

export default ScheduledReportsModal
