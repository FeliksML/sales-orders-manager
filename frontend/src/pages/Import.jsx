import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, CheckCircle, X, ArrowLeft, Loader2, Package, Calendar, User, DollarSign } from 'lucide-react'
import DashboardHeader from '../components/DashboardHeader'
import Card from '../components/ui/Card'
import { orderService } from '../services/orderService'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Import() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [extractedData, setExtractedData] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handlePdfUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Please select a PDF file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    setUploadError('')
    setExtractedData(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/orders/extract-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to extract PDF')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        setExtractedData(result.data)
      }
    } catch (error) {
      console.error('PDF upload error:', error)
      setUploadError(error.message || 'Failed to extract PDF data')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handlePdfUpload(files[0])
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files.length > 0) {
      handlePdfUpload(files[0])
    }
  }

  const handleCreateOrder = async () => {
    if (!extractedData) return

    setIsSubmitting(true)
    try {
      // Prepare order data
      const orderData = {
        spectrum_reference: extractedData.spectrum_reference || '',
        customer_account_number: extractedData.customer_account_number || '',
        customer_security_code: extractedData.customer_security_code || '',
        job_number: extractedData.job_number || '',
        business_name: extractedData.business_name || '',
        customer_name: extractedData.customer_name || '',
        customer_email: extractedData.customer_email || '',
        customer_address: extractedData.customer_address || '',
        customer_phone: extractedData.customer_phone || '',
        install_date: extractedData.install_date || new Date().toISOString().split('T')[0],
        install_time: extractedData.install_time || '9:00 AM - 11:00 AM',
        has_internet: extractedData.has_internet || false,
        has_voice: extractedData.has_voice || 0,
        has_tv: extractedData.has_tv || false,
        has_sbc: extractedData.has_sbc || 0,
        has_mobile: extractedData.has_mobile || 0,
        mobile_activated: extractedData.mobile_activated || 0,
        has_wib: extractedData.has_wib || false,
        internet_tier: extractedData.internet_tier || '',
        monthly_total: extractedData.monthly_total || null,
        initial_payment: extractedData.initial_payment || null,
        notes: extractedData.notes || ''
      }

      console.log('📋 Creating order with data:', orderData)
      const result = await orderService.createOrder(orderData)
      console.log('✅ Order created successfully:', result)
      console.log('🔑 Token still in localStorage:', !!localStorage.getItem('token'))
      
      setSubmitSuccess(true)
      setTimeout(() => {
        console.log('🔄 Navigating to dashboard...')
        console.log('🔑 Token before navigation:', !!localStorage.getItem('token'))
        navigate('/dashboard')
      }, 1500)
    } catch (error) {
      console.error('❌ Failed to create order:', error)
      console.error('❌ Error response:', error.response)
      console.error('❌ Error status:', error.response?.status)
      setUploadError('Failed to create order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setExtractedData(null)
    setUploadError('')
    setSubmitSuccess(false)
  }

  const totalProducts = extractedData ? (
    (extractedData.has_internet ? 1 : 0) +
    (extractedData.has_tv ? 1 : 0) +
    (extractedData.has_voice || 0) +
    (extractedData.has_mobile || 0) +
    (extractedData.has_wib ? 1 : 0)
  ) : 0

  return (
    <div
      className="min-h-screen p-4 sm:p-8"
      style={{
        background: `
          radial-gradient(circle at 25% 25%, rgba(30, 58, 138, 0.3), transparent 25%),
          radial-gradient(circle at 75% 75%, rgba(20, 125, 190, 0.2), transparent 30%),
          radial-gradient(circle at 75% 25%, rgba(5, 150, 105, 0.2), transparent 25%),
          radial-gradient(circle at 25% 75%, rgba(5, 150, 105, 0.18), transparent 30%),
          radial-gradient(ellipse 1200px 800px at 50% 50%, rgba(20, 125, 190, 0.08), transparent 50%),
          linear-gradient(142deg, #1e40af, #0d4f8b 30%, #067a5b 70%, #059669)
        `
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Import from PDF</h1>
            <p className="text-gray-400 text-sm mt-1">Upload a Spectrum Business PDF to auto-create an order</p>
          </div>
        </div>

        {submitSuccess ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Order Created Successfully!</h3>
              <p className="text-gray-400">Redirecting to dashboard...</p>
            </div>
          </Card>
        ) : !extractedData ? (
          /* Upload Zone */
          <Card>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-12 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10'
                  : uploadError
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center text-center">
                {isUploading ? (
                  <>
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                    <span className="text-blue-400 text-lg font-medium">Extracting PDF data...</span>
                    <span className="text-gray-500 text-sm mt-2">This may take a few seconds</span>
                  </>
                ) : uploadError ? (
                  <>
                    <X className="w-12 h-12 text-red-400 mb-4" />
                    <span className="text-red-400 text-lg font-medium">{uploadError}</span>
                    <span className="text-gray-500 text-sm mt-2">Click to try again</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-12 h-12 text-gray-400 mb-4" />
                    <span className="text-white text-lg font-medium mb-2">
                      Drag & drop your Spectrum PDF here
                    </span>
                    <span className="text-gray-400 text-sm">
                      or <span className="text-blue-400 hover:underline">browse</span> to select a file
                    </span>
                    <span className="text-gray-500 text-xs mt-4">PDF files only, max 10MB</span>
                  </>
                )}
              </div>
            </div>
          </Card>
        ) : (
          /* Extracted Data Preview */
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Extracted Order Data</h2>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-sm transition-colors"
                >
                  Upload Different PDF
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-3">
                    <User className="w-5 h-5" />
                    <span className="font-semibold">Customer Information</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Business Name:</span>
                      <span className="text-white font-medium">{extractedData.business_name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Customer Name:</span>
                      <span className="text-white font-medium">{extractedData.customer_name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white font-medium">{extractedData.customer_email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white font-medium">{extractedData.customer_phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Address:</span>
                      <span className="text-white font-medium text-right max-w-[200px]">{extractedData.customer_address || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Order Reference */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400 mb-3">
                    <Package className="w-5 h-5" />
                    <span className="font-semibold">Order Reference</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Spectrum Ref:</span>
                      <span className="text-white font-medium">{extractedData.spectrum_reference || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account #:</span>
                      <span className="text-white font-medium">{extractedData.customer_account_number || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Job #:</span>
                      <span className="text-white font-medium">{extractedData.job_number || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Installation */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-3">
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold">Installation</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-white font-medium">
                        {extractedData.install_date 
                          ? new Date(extractedData.install_date + 'T00:00:00').toLocaleDateString()
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time:</span>
                      <span className="text-white font-medium">{extractedData.install_time || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-yellow-400 mb-3">
                    <DollarSign className="w-5 h-5" />
                    <span className="font-semibold">Pricing</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Internet Tier:</span>
                      <span className="text-white font-medium">{extractedData.internet_tier || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monthly Total:</span>
                      <span className="text-white font-medium">
                        {extractedData.monthly_total ? `$${extractedData.monthly_total.toFixed(2)}` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Initial Payment:</span>
                      <span className="text-white font-medium">
                        {extractedData.initial_payment ? `$${extractedData.initial_payment.toFixed(2)}` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-white font-semibold mb-3">Products ({totalProducts})</h3>
                <div className="flex flex-wrap gap-2">
                  {extractedData.has_internet && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">Internet</span>
                  )}
                  {extractedData.has_tv && (
                    <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm">TV</span>
                  )}
                  {extractedData.has_voice > 0 && (
                    <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                      Voice ({extractedData.has_voice})
                    </span>
                  )}
                  {extractedData.has_mobile > 0 && (
                    <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-sm">
                      Mobile ({extractedData.has_mobile})
                    </span>
                  )}
                  {extractedData.has_wib && (
                    <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm">WIB</span>
                  )}
                  {totalProducts === 0 && (
                    <span className="text-gray-500 text-sm">No products detected</span>
                  )}
                </div>
              </div>

              {/* Notes */}
              {extractedData.notes && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h3 className="text-white font-semibold mb-2">Notes</h3>
                  <p className="text-gray-400 text-sm">{extractedData.notes}</p>
                </div>
              )}
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Create Order
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Import

