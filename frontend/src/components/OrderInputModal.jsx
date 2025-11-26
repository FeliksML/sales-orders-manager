import { useState, useEffect, useRef } from 'react'
import { X, User, MapPin, Calendar, Package, FileText, CheckCircle, ArrowRight, ArrowLeft, Mail, Phone, Upload, FileUp, Loader2 } from 'lucide-react'
import { validateEmail, validatePhone, validateName, validateRequired } from '@sales-order-manager/shared'
import Card from './ui/Card'
import AddressAutocomplete from './AddressAutocomplete'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Generate 24 one-hour time slots
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const startHour = i
  const endHour = (i + 1) % 24
  const formatHour = (h) => {
    const period = h < 12 ? 'AM' : 'PM'
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hour12}:00 ${period}`
  }
  const label = `${formatHour(startHour)} - ${formatHour(endHour)}`
  return { value: label, label }
})

const STEPS = {
  CUSTOMER: 0,
  INSTALLATION: 1,
  PRODUCTS: 2,
  NOTES: 3
}

function OrderInputModal({ isOpen, onClose, onSubmit, prefilledDate = null }) {
  const [currentStep, setCurrentStep] = useState(STEPS.CUSTOMER)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  
  // PDF upload state
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    spectrum_reference: '',
    customer_account_number: '',
    customer_security_code: '',
    job_number: '',
    business_name: '',
    customer_name: '',
    customer_email: '',
    customer_address: '',
    customer_phone: '',
    install_date: '',
    install_time: '',
    has_internet: false,
    has_voice: 0,
    has_tv: false,
    has_sbc: 0,
    has_mobile: 0,
    mobile_activated: 0,
    has_wib: false,
    internet_tier: '',
    monthly_total: '',
    initial_payment: '',
    notes: ''
  })

  // Update install_date when prefilledDate changes
  useEffect(() => {
    if (prefilledDate && isOpen) {
      setFormData(prev => ({ ...prev, install_date: prefilledDate }))
    }
  }, [prefilledDate, isOpen])

  // PDF upload handler
  const handlePdfUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Please select a PDF file')
      return
    }

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    setUploadError('')
    setUploadSuccess(false)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/orders/extract-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to extract PDF')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        // Populate form with extracted data
        const extracted = result.data
        setFormData(prev => ({
          ...prev,
          spectrum_reference: extracted.spectrum_reference || prev.spectrum_reference,
          customer_account_number: extracted.customer_account_number || prev.customer_account_number,
          customer_security_code: extracted.customer_security_code || prev.customer_security_code,
          job_number: extracted.job_number || prev.job_number,
          business_name: extracted.business_name || prev.business_name,
          customer_name: extracted.customer_name || prev.customer_name,
          customer_email: extracted.customer_email || prev.customer_email,
          customer_address: extracted.customer_address || prev.customer_address,
          customer_phone: extracted.customer_phone || prev.customer_phone,
          install_date: extracted.install_date || prev.install_date,
          install_time: extracted.install_time || prev.install_time,
          has_internet: extracted.has_internet ?? prev.has_internet,
          has_voice: extracted.has_voice ?? prev.has_voice,
          has_tv: extracted.has_tv ?? prev.has_tv,
          has_mobile: extracted.has_mobile ?? prev.has_mobile,
          has_wib: extracted.has_wib ?? prev.has_wib,
          internet_tier: extracted.internet_tier || prev.internet_tier,
          monthly_total: extracted.monthly_total || prev.monthly_total,
          initial_payment: extracted.initial_payment || prev.initial_payment,
          notes: extracted.notes || prev.notes
        }))
        setUploadSuccess(true)
        setTimeout(() => setUploadSuccess(false), 3000)
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

  const validateStep = (step) => {
    const newErrors = {}

    if (step === STEPS.CUSTOMER) {
      // Spectrum Reference
      const spectrumValidation = validateRequired(formData.spectrum_reference, 'Spectrum reference')
      if (!spectrumValidation.valid) newErrors.spectrum_reference = spectrumValidation.error

      // Account Number
      const accountValidation = validateRequired(formData.customer_account_number, 'Account number')
      if (!accountValidation.valid) newErrors.customer_account_number = accountValidation.error

      // Business Name
      const businessValidation = validateRequired(formData.business_name, 'Business name')
      if (!businessValidation.valid) newErrors.business_name = businessValidation.error

      // Customer Name
      const nameValidation = validateName(formData.customer_name)
      if (!nameValidation.valid) newErrors.customer_name = nameValidation.error

      // Email
      const emailValidation = validateEmail(formData.customer_email)
      if (!emailValidation.valid) newErrors.customer_email = emailValidation.error

      // Phone
      const phoneValidation = validatePhone(formData.customer_phone)
      if (!phoneValidation.valid) newErrors.customer_phone = phoneValidation.error
    }

    if (step === STEPS.INSTALLATION) {
      const dateValidation = validateRequired(formData.install_date, 'Install date')
      if (!dateValidation.valid) newErrors.install_date = dateValidation.error

      const timeValidation = validateRequired(formData.install_time, 'Install time')
      if (!timeValidation.valid) newErrors.install_time = timeValidation.error
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.NOTES))
    }
  }

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, STEPS.CUSTOMER))
    setErrors({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      // Reset form
      setFormData({
        spectrum_reference: '',
        customer_account_number: '',
        customer_security_code: '',
        job_number: '',
        business_name: '',
        customer_name: '',
        customer_email: '',
        customer_address: '',
        customer_phone: '',
        install_date: '',
        install_time: '',
        has_internet: false,
        has_voice: 0,
        has_tv: false,
        has_sbc: 0,
        has_mobile: 0,
        mobile_activated: 0,
        has_wib: false,
        internet_tier: '',
        monthly_total: '',
        initial_payment: '',
        notes: ''
      })
      setCurrentStep(STEPS.CUSTOMER)
      setErrors({})
    } catch (error) {
      console.error('Error submitting order:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  const stepConfig = [
    { id: STEPS.CUSTOMER, label: 'Customer', icon: User },
    { id: STEPS.INSTALLATION, label: 'Installation', icon: Calendar },
    { id: STEPS.PRODUCTS, label: 'Products', icon: Package },
    { id: STEPS.NOTES, label: 'Notes', icon: FileText }
  ]

  const totalProducts =
    (formData.has_internet ? 1 : 0) +
    (formData.has_tv ? 1 : 0) +
    formData.has_voice +
    formData.has_mobile +
    formData.has_sbc +
    (formData.has_wib ? 1 : 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <Card className="relative flex flex-col max-h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6 pb-4 border-b border-white/10 flex-shrink-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">New Order</h2>
              <p className="text-gray-400 text-sm mt-1">Fill in the order details</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* PDF Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-4 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : uploadSuccess
                ? 'border-green-500 bg-green-500/10'
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
            <div className="flex items-center justify-center gap-3">
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  <span className="text-blue-400 text-sm font-medium">Extracting PDF data...</span>
                </>
              ) : uploadSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">PDF data extracted successfully!</span>
                </>
              ) : uploadError ? (
                <>
                  <X className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 text-sm font-medium">{uploadError}</span>
                </>
              ) : (
                <>
                  <FileUp className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400 text-sm">
                    <span className="hidden sm:inline">Drag & drop a Spectrum PDF here, or </span>
                    <span className="text-blue-400 hover:underline">browse</span>
                    <span className="hidden sm:inline"> to auto-fill form</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-3 sm:mb-8 flex-shrink-0">
            {stepConfig.map((step, idx) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-green-500/20 border-2 border-green-500'
                          : isActive
                          ? 'bg-blue-500/20 border-2 border-blue-500 scale-110'
                          : 'bg-white/5 border-2 border-white/20'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Icon
                          className={`w-5 h-5 ${
                            isActive ? 'text-blue-400' : 'text-gray-500'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium hidden sm:block ${
                        isActive ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < stepConfig.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 mb-6 transition-colors duration-300 ${
                        currentStep > step.id ? 'bg-green-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-1 min-h-0">
            {/* Step 1: Customer Information */}
            {currentStep === STEPS.CUSTOMER && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Spectrum Reference <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.spectrum_reference}
                      onChange={(e) => handleChange('spectrum_reference', e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                        errors.spectrum_reference ? 'border-red-500' : 'border-white/10'
                      } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                      placeholder="e.g., SPEC123456"
                    />
                    {errors.spectrum_reference && (
                      <p className="text-red-400 text-xs mt-1">{errors.spectrum_reference}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Account Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customer_account_number}
                      onChange={(e) => handleChange('customer_account_number', e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                        errors.customer_account_number ? 'border-red-500' : 'border-white/10'
                      } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                      placeholder="Customer account number"
                    />
                    {errors.customer_account_number && (
                      <p className="text-red-400 text-xs mt-1">{errors.customer_account_number}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Security Code
                    </label>
                    <input
                      type="text"
                      value={formData.customer_security_code}
                      onChange={(e) => handleChange('customer_security_code', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Job Number
                    </label>
                    <input
                      type="text"
                      value={formData.job_number}
                      onChange={(e) => handleChange('job_number', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                      errors.business_name ? 'border-red-500' : 'border-white/10'
                    } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                    placeholder="Business name"
                  />
                  {errors.business_name && (
                    <p className="text-red-400 text-xs mt-1">{errors.business_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Customer Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => handleChange('customer_name', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                      errors.customer_name ? 'border-red-500' : 'border-white/10'
                    } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                    placeholder="Full name"
                  />
                  {errors.customer_name && (
                    <p className="text-red-400 text-xs mt-1">{errors.customer_name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => handleChange('customer_email', e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                        errors.customer_email ? 'border-red-500' : 'border-white/10'
                      } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                      placeholder="email@example.com"
                    />
                    {errors.customer_email && (
                      <p className="text-red-400 text-xs mt-1">{errors.customer_email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => handleChange('customer_phone', e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                        errors.customer_phone ? 'border-red-500' : 'border-white/10'
                      } text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                      placeholder="(555) 123-4567"
                    />
                    {errors.customer_phone && (
                      <p className="text-red-400 text-xs mt-1">{errors.customer_phone}</p>
                    )}
                  </div>
                </div>

                <AddressAutocomplete
                  value={formData.customer_address}
                  onChange={(value) => handleChange('customer_address', value)}
                  placeholder="Start typing address..."
                />
              </div>
            )}

            {/* Step 2: Installation Details */}
            {currentStep === STEPS.INSTALLATION && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Installation Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.install_date}
                      onChange={(e) => handleChange('install_date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                        errors.install_date ? 'border-red-500' : 'border-white/10'
                      } text-white focus:outline-none focus:border-blue-500 transition-colors`}
                    />
                    {errors.install_date && (
                      <p className="text-red-400 text-xs mt-1">{errors.install_date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Installation Time <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.install_time}
                      onChange={(e) => handleChange('install_time', e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                        errors.install_time ? 'border-red-500' : 'border-white/10'
                      } text-white focus:outline-none focus:border-blue-500 transition-colors`}
                    >
                      <option value="" className="bg-gray-800">Select time slot</option>
                      {TIME_SLOTS.map(slot => (
                        <option key={slot.value} value={slot.value} className="bg-gray-800">
                          {slot.label}
                        </option>
                      ))}
                    </select>
                    {errors.install_time && (
                      <p className="text-red-400 text-xs mt-1">{errors.install_time}</p>
                    )}
                  </div>
                </div>

                {formData.install_date && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-blue-300 text-sm">
                      📅 Installation scheduled for{' '}
                      <span className="font-semibold">
                        {new Date(formData.install_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      {formData.install_time && (
                        <span> at <span className="font-semibold">{formData.install_time}</span></span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Products */}
            {currentStep === STEPS.PRODUCTS && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Internet */}
                  <div
                    onClick={() => handleChange('has_internet', !formData.has_internet)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.has_internet
                        ? 'bg-blue-500/20 border-blue-500'
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold">Internet</h4>
                        <p className="text-gray-400 text-sm">High-speed broadband</p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          formData.has_internet
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-white/30'
                        }`}
                      >
                        {formData.has_internet && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* TV */}
                  <div
                    onClick={() => handleChange('has_tv', !formData.has_tv)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.has_tv
                        ? 'bg-blue-500/20 border-blue-500'
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold">TV Service</h4>
                        <p className="text-gray-400 text-sm">Cable television</p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          formData.has_tv
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-white/30'
                        }`}
                      >
                        {formData.has_tv && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* WIB */}
                  <div
                    onClick={() => handleChange('has_wib', !formData.has_wib)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.has_wib
                        ? 'bg-blue-500/20 border-blue-500'
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold">WIB</h4>
                        <p className="text-gray-400 text-sm">Wireless in Building</p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          formData.has_wib
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-white/30'
                        }`}
                      >
                        {formData.has_wib && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voice Lines */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold">Voice Lines</h4>
                      <p className="text-gray-400 text-sm">Number of phone lines</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange('has_voice', Math.max(0, formData.has_voice - 1))}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                      >
                        -
                      </button>
                      <span className="text-white font-bold text-xl w-8 text-center">
                        {formData.has_voice}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChange('has_voice', formData.has_voice + 1)}
                        className="w-8 h-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Lines */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold">Mobile Lines</h4>
                      <p className="text-gray-400 text-sm">Number of mobile lines</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange('has_mobile', Math.max(0, formData.has_mobile - 1))}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                      >
                        -
                      </button>
                      <span className="text-white font-bold text-xl w-8 text-center">
                        {formData.has_mobile}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChange('has_mobile', formData.has_mobile + 1)}
                        className="w-8 h-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Mobile Activated (only show if has_mobile > 0) */}
                  {formData.has_mobile > 0 && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                      <span className="text-gray-300 text-sm">Lines Activated</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleChange('mobile_activated', Math.max(0, formData.mobile_activated - 1))}
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                        >
                          -
                        </button>
                        <span className="text-white font-bold text-xl w-8 text-center">
                          {formData.mobile_activated}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleChange('mobile_activated', Math.min(formData.has_mobile, formData.mobile_activated + 1))}
                          className="w-8 h-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* SBC */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-semibold">SBC</h4>
                      <p className="text-gray-400 text-sm">Session Border Controller</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange('has_sbc', Math.max(0, formData.has_sbc - 1))}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                      >
                        -
                      </button>
                      <span className="text-white font-bold text-xl w-8 text-center">
                        {formData.has_sbc}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChange('has_sbc', formData.has_sbc + 1)}
                        className="w-8 h-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {totalProducts > 0 && (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-green-300 text-sm">
                      ✓ <span className="font-semibold">{totalProducts}</span> product
                      {totalProducts !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Notes */}
            {currentStep === STEPS.NOTES && (
              <div className="space-y-4 animate-fadeIn">
                {/* PDF-extracted fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Internet Tier
                    </label>
                    <input
                      type="text"
                      value={formData.internet_tier}
                      onChange={(e) => handleChange('internet_tier', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="e.g., Ultra (1000 Mbps)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Monthly Total
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.monthly_total}
                        onChange={(e) => handleChange('monthly_total', e.target.value)}
                        className="w-full pl-7 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Initial Payment
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.initial_payment}
                        onChange={(e) => handleChange('initial_payment', e.target.value)}
                        className="w-full pl-7 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    placeholder="Any special instructions or notes about this order..."
                  />
                </div>

                {/* Order Summary */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
                  <h4 className="text-white font-semibold mb-3">Order Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-400">Customer:</span>
                    <span className="text-white font-medium">{formData.customer_name}</span>

                    <span className="text-gray-400">Business:</span>
                    <span className="text-white font-medium">{formData.business_name}</span>

                    <span className="text-gray-400">Install Date:</span>
                    <span className="text-white font-medium">
                      {formData.install_date ? new Date(formData.install_date + 'T00:00:00').toLocaleDateString() : '-'}
                    </span>

                    <span className="text-gray-400">Products:</span>
                    <span className="text-white font-medium">{totalProducts}</span>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-4 sm:mt-6 pt-4 border-t border-white/10 flex-shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === STEPS.CUSTOMER}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm sm:text-base ${
                currentStep === STEPS.CUSTOMER
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Back</span>
            </button>

            <div className="flex items-center gap-2">
              {currentStep < STEPS.NOTES ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 sm:px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center gap-2 text-sm sm:text-base"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 sm:px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="hidden sm:inline">Submitting...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Submit Order</span>
                      <span className="sm:hidden">Submit</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default OrderInputModal
