import { useState, useEffect, useRef } from 'react'
import {
  X, Edit2, Save, Calendar, User, MapPin, Phone, Briefcase, Package,
  CheckCircle, Clock, AlertCircle, Mail, Hash, Shield, FileText,
  Wifi, Tv, Smartphone, PhoneCall, Radio, Check, CalendarClock, Copy, Send, Trash2, DollarSign, Bell
} from 'lucide-react'
import { validateEmail, validatePhone, getInstallStatus } from '@sales-order-manager/shared'
import Card from './ui/Card'
import AddressAutocomplete from './AddressAutocomplete'
import AuditLog from './AuditLog'
import FollowUpModal from './FollowUpModal'
import { orderService } from '../services/orderService'
import { useCreateFollowup } from '../hooks/useFollowups'
import { formatErrorMessage } from '../utils/errorHandler'

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

function OrderDetailsModal({ order, isOpen, onClose, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailMessage, setEmailMessage] = useState(null)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const { createFollowup, loading: followupLoading } = useCreateFollowup()

  // Refs for tracking original data and preventing double-save
  const originalFormDataRef = useRef(null)
  const isSavingRef = useRef(false)

  // Lock body scroll when modal is open (iOS Safari compatible)
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      const originalPosition = document.body.style.position
      const originalTop = document.body.style.top
      const originalWidth = document.body.style.width
      const scrollY = window.scrollY

      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'

      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.position = originalPosition
        document.body.style.top = originalTop
        document.body.style.width = originalWidth
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (order) {
      console.log('OrderDetailsModal: Updating formData from order:', order)
      const initialData = {
        spectrum_reference: order.spectrum_reference || '',
        customer_account_number: order.customer_account_number || '',
        customer_security_code: order.customer_security_code || '',
        job_number: order.job_number || '',
        business_name: order.business_name || '',
        customer_name: order.customer_name || '',
        customer_email: order.customer_email || '',
        customer_address: order.customer_address || '',
        customer_phone: order.customer_phone || '',
        install_date: order.install_date || '',
        install_time: order.install_time || '',
        has_internet: order.has_internet || false,
        has_voice: order.has_voice || 0,
        has_tv: order.has_tv || false,
        has_sbc: order.has_sbc || 0,
        has_mobile: order.has_mobile || 0,
        mobile_activated: order.mobile_activated || 0,
        has_wib: order.has_wib || false,
        has_gig: order.has_gig || false,
        internet_tier: order.internet_tier || '',
        monthly_total: order.monthly_total || '',
        initial_payment: order.initial_payment || '',
        notes: order.notes || ''
      }
      setFormData(initialData)
      originalFormDataRef.current = initialData
      setIsDirty(false)
    }
  }, [order])

  if (!isOpen || !order) return null

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      // Check if form is dirty by comparing to original
      const hasChanges = JSON.stringify(newData) !== JSON.stringify(originalFormDataRef.current)
      setIsDirty(hasChanges)
      return newData
    })
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Required fields
    if (!formData.spectrum_reference.trim()) newErrors.spectrum_reference = 'Required'
    if (!formData.customer_account_number.trim()) newErrors.customer_account_number = 'Required'
    if (!formData.business_name.trim()) newErrors.business_name = 'Required'
    if (!formData.customer_name.trim()) newErrors.customer_name = 'Required'

    // Email validation using shared library (consistent with OrderInputModal)
    const emailValidation = validateEmail(formData.customer_email)
    if (!emailValidation.valid) newErrors.customer_email = emailValidation.error

    // Phone validation using shared library (consistent with OrderInputModal)
    const phoneValidation = validatePhone(formData.customer_phone)
    if (!phoneValidation.valid) newErrors.customer_phone = phoneValidation.error

    // Install date - allow past dates for existing orders (already installed)
    if (!formData.install_date) newErrors.install_date = 'Required'
    if (!formData.install_time.trim()) newErrors.install_time = 'Required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    // Synchronous check prevents race condition from rapid clicks
    if (isSavingRef.current || isSubmitting) return

    if (!validateForm()) return

    isSavingRef.current = true
    setIsSubmitting(true)
    try {
      // Clean up form data - convert empty strings to null for numeric fields
      const cleanedData = {
        ...formData,
        monthly_total: formData.monthly_total === '' ? null : parseFloat(formData.monthly_total) || null,
        initial_payment: formData.initial_payment === '' ? null : parseFloat(formData.initial_payment) || null,
        internet_tier: formData.internet_tier === '' ? null : formData.internet_tier,
        customer_security_code: formData.customer_security_code === '' ? null : formData.customer_security_code,
        job_number: formData.job_number === '' ? null : formData.job_number,
        notes: formData.notes === '' ? null : formData.notes,
      }

      await onUpdate(order.orderid, cleanedData)
      // Update local state is already done via formData
      // Reset dirty state after successful save
      originalFormDataRef.current = formData
      setIsDirty(false)
      setIsEditing(false)
      setShowReschedule(false)
    } catch (error) {
      console.error('Failed to update order:', error)
    } finally {
      isSavingRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleMarkAsInstalled = async () => {
    const now = new Date()
    // Use today's date and current time (actual install moment)
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    const updatedData = {
      ...formData,
      install_date: today,
      install_time: currentTime,
      mark_as_installed: true,  // Triggers backend to set completed_at
      // Clean up numeric fields
      monthly_total: formData.monthly_total === '' ? null : parseFloat(formData.monthly_total) || null,
      initial_payment: formData.initial_payment === '' ? null : parseFloat(formData.initial_payment) || null,
      internet_tier: formData.internet_tier === '' ? null : formData.internet_tier,
      customer_security_code: formData.customer_security_code === '' ? null : formData.customer_security_code,
      job_number: formData.job_number === '' ? null : formData.job_number,
      notes: formData.notes === '' ? null : formData.notes,
    }

    setIsSubmitting(true)
    try {
      await onUpdate(order.orderid, updatedData)
      // Update local state to reflect the change immediately
      setFormData(updatedData)
    } catch (error) {
      console.error('Failed to mark as installed:', error)
      alert('Failed to mark as installed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = () => {
    console.log('Delete button clicked for order:', order.orderid)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    console.log('User confirmed deletion, calling onDelete...')
    setIsSubmitting(true)

    try {
      await onDelete(order.orderid)
      console.log('Order deleted successfully')
      setShowDeleteConfirm(false)
      onClose()
    } catch (error) {
      console.error('Failed to delete order:', error)
      alert(`Failed to delete order: ${error.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCancel = () => {
    console.log('Delete cancelled by user')
    setShowDeleteConfirm(false)
  }

  // Handlers for unsaved changes warning
  const handleCloseAttempt = () => {
    if (isDirty) {
      setPendingAction('close')
      setShowUnsavedWarning(true)
    } else {
      onClose()
    }
  }

  const handleCancelAttempt = () => {
    if (isDirty) {
      setPendingAction('cancel')
      setShowUnsavedWarning(true)
    } else {
      // Reset and close (existing behavior)
      if (order) {
        const initialData = {
          spectrum_reference: order.spectrum_reference || '',
          customer_account_number: order.customer_account_number || '',
          customer_security_code: order.customer_security_code || '',
          job_number: order.job_number || '',
          business_name: order.business_name || '',
          customer_name: order.customer_name || '',
          customer_email: order.customer_email || '',
          customer_address: order.customer_address || '',
          customer_phone: order.customer_phone || '',
          install_date: order.install_date || '',
          install_time: order.install_time || '',
          has_internet: order.has_internet || false,
          has_voice: order.has_voice || 0,
          has_tv: order.has_tv || false,
          has_sbc: order.has_sbc || 0,
          has_mobile: order.has_mobile || 0,
          mobile_activated: order.mobile_activated || 0,
          has_wib: order.has_wib || false,
          has_gig: order.has_gig || false,
          internet_tier: order.internet_tier || '',
          monthly_total: order.monthly_total || '',
          initial_payment: order.initial_payment || '',
          notes: order.notes || ''
        }
        setFormData(initialData)
      }
      setIsDirty(false)
      setIsEditing(false)
      setShowReschedule(false)
      setErrors({})
    }
  }

  const handleConfirmDiscard = () => {
    setShowUnsavedWarning(false)
    setIsDirty(false)
    setPendingAction(null)
    setIsEditing(false)
    setShowReschedule(false)
    setErrors({})
    onClose()
  }

  const handleCancelDiscard = () => {
    setShowUnsavedWarning(false)
    setPendingAction(null)
  }

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(label)
      console.log(`Copied ${label}: ${text}`)

      // Clear the copied state after 2 seconds
      setTimeout(() => {
        setCopiedField(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleSendToEmail = async () => {
    setSendingEmail(true)
    setEmailMessage(null)

    try {
      const response = await orderService.sendOrderToEmail(order.orderid)
      setEmailMessage({
        type: 'success',
        text: `Order details sent successfully to ${response.email}`
      })

      // Clear message after 5 seconds
      setTimeout(() => {
        setEmailMessage(null)
      }, 5000)
    } catch (error) {
      console.error('Failed to send order email:', error)
      setEmailMessage({
        type: 'error',
        text: formatErrorMessage(error, 'Failed to send email. Please try again.')
      })

      // Clear error message after 5 seconds
      setTimeout(() => {
        setEmailMessage(null)
      }, 5000)
    } finally {
      setSendingEmail(false)
    }
  }

  const formatPhoneNumber = (phone) => {
    // Return empty string if phone is undefined, null, or empty
    if (!phone) return ''

    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '')

    // Format as (XXX) XXX-XXXX if 10 digits
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    // Format as X-XXX-XXX-XXXX if 11 digits
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    // Return as-is if not a standard format
    return phone
  }

  // Format phone as user types
  const formatPhoneAsYouType = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length === 0) return ''
    if (digits.length <= 3) return `(${digits}`
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // Smart status calculation for the modal that considers user edits
  // If user has edited the date to a FUTURE date, ignore completed_at and show pending
  // This makes the UI responsive to form changes before saving
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const editedDate = formData.install_date ? new Date(formData.install_date + 'T00:00:00') : null
  const isDateInFuture = editedDate && editedDate > today

  // If date is in future, treat as pending regardless of completed_at
  // If date is in past, treat as installed regardless of completed_at
  const effectiveCompletedAt = isDateInFuture ? null : order?.completed_at
  const status = getInstallStatus(formData.install_date, effectiveCompletedAt)
  const isInstalled = status === 'installed'
  const isToday = status === 'today'
  const isPending = status === 'pending'

  const totalProducts =
    (formData.has_internet ? 1 : 0) +
    (formData.has_tv ? 1 : 0) +
    formData.has_voice +
    formData.has_mobile +
    formData.has_sbc +
    (formData.has_wib ? 1 : 0) +
    (formData.has_gig ? 1 : 0)

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto pb-[72px] sm:pb-4">
      <div className="w-full max-w-5xl my-auto flex flex-col max-h-[calc(100vh-88px)] sm:max-h-[90vh]">
        <Card className="relative flex flex-col max-h-full overflow-hidden">
          {/* Header */}
          <div className="mb-4 sm:mb-6 pb-4 border-b border-white/10 flex-shrink-0">
            {/* Mobile: Stacked Layout */}
            <div className="md:hidden">
              {/* Title and Close Button Row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-white">Order Details</h2>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1">Order #{order.orderid}</p>
                </div>
                <button
                  onClick={handleCloseAttempt}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white flex-shrink-0"
                  title="Close"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {isInstalled && (
                  <span className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500 text-green-300 text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
                    <CheckCircle className="w-4 h-4" />
                    <span>Installed</span>
                  </span>
                )}
                {isToday && (
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500 text-blue-300 text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
                    <Clock className="w-4 h-4" />
                    <span>Today</span>
                  </span>
                )}
                {isPending && (
                  <span className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500 text-yellow-300 text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
                    <AlertCircle className="w-4 h-4" />
                    <span>Pending Install</span>
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 sm:gap-3 flex-wrap">
                {!isEditing && !showReschedule && (
                  <>
                    {/* Schedule Follow-up Button - Only show for INSTALLED orders */}
                    {isInstalled && (
                      <button
                        onClick={() => setShowFollowUpModal(true)}
                        className="px-3 sm:px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 transition-all hover:scale-105 text-amber-300 hover:text-amber-200 text-sm font-medium flex items-center gap-2 shadow-sm"
                        title="Schedule follow-up reminder"
                      >
                        <Bell className="w-4 h-4" />
                        <span>Follow-Up</span>
                      </button>
                    )}
                    {isPending && (
                      <button
                        onClick={() => setShowReschedule(true)}
                        className="px-3 sm:px-4 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 transition-all hover:scale-105 text-yellow-300 hover:text-yellow-200 text-sm font-medium flex items-center gap-2 shadow-sm"
                        title="Reschedule installation"
                      >
                        <CalendarClock className="w-4 h-4" />
                        <span>Reschedule</span>
                      </button>
                    )}
                    {(isPending || isToday) && (
                      <button
                        onClick={handleMarkAsInstalled}
                        disabled={isSubmitting}
                        className="px-3 sm:px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 transition-all hover:scale-105 text-green-300 hover:text-green-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 shadow-sm"
                        title="Mark as installed"
                      >
                        <Check className="w-4 h-4" />
                        <span>Mark Done</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 sm:px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-all hover:scale-105 text-blue-400 hover:text-blue-300 border border-blue-500/30 flex items-center gap-2 text-sm font-medium shadow-sm"
                      title="Edit order"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </>
                )}
                {(isEditing || showReschedule) && (
                  <>
                    <button
                      onClick={handleCancelAttempt}
                      className="px-3 sm:px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white text-sm font-medium border border-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSubmitting}
                      className="px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Desktop: Horizontal Layout */}
            <div className="hidden md:flex items-center justify-between gap-4">
              {/* Left: Title with Inline Status Badge */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-white">Order Details</h2>
                  <p className="text-gray-400 text-sm mt-0.5">Order #{order.orderid}</p>
                </div>

                {/* Inline Status Badge */}
                {isInstalled && (
                  <span className="px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500 text-green-300 text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
                    <CheckCircle className="w-4 h-4" />
                    <span>Installed</span>
                  </span>
                )}
                {isToday && (
                  <span className="px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500 text-blue-300 text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
                    <Clock className="w-4 h-4" />
                    <span>Today</span>
                  </span>
                )}
                {isPending && (
                  <span className="px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500 text-yellow-300 text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
                    <AlertCircle className="w-4 h-4" />
                    <span>Pending Install</span>
                  </span>
                )}
              </div>

              {/* Right: Action Buttons + Close */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {!isEditing && !showReschedule && (
                  <>
                    {/* Schedule Follow-up Button - Only show for INSTALLED orders */}
                    {isInstalled && (
                      <button
                        onClick={() => setShowFollowUpModal(true)}
                        className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 transition-all hover:scale-105 text-amber-300 hover:text-amber-200 text-sm font-medium flex items-center gap-2 shadow-sm"
                        title="Schedule follow-up reminder"
                      >
                        <Bell className="w-4 h-4" />
                        <span>Follow-Up</span>
                      </button>
                    )}
                    {isPending && (
                      <button
                        onClick={() => setShowReschedule(true)}
                        className="px-4 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 transition-all hover:scale-105 text-yellow-300 hover:text-yellow-200 text-sm font-medium flex items-center gap-2 shadow-sm"
                        title="Reschedule installation"
                      >
                        <CalendarClock className="w-4 h-4" />
                        <span>Reschedule</span>
                      </button>
                    )}
                    {(isPending || isToday) && (
                      <button
                        onClick={handleMarkAsInstalled}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 transition-all hover:scale-105 text-green-300 hover:text-green-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 shadow-sm"
                        title="Mark as installed"
                      >
                        <Check className="w-4 h-4" />
                        <span>Mark Done</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-all hover:scale-105 text-blue-400 hover:text-blue-300 border border-blue-500/30 flex items-center gap-2 text-sm font-medium shadow-sm"
                      title="Edit order"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </>
                )}
                {(isEditing || showReschedule) && (
                  <>
                    <button
                      onClick={handleCancelAttempt}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white text-sm font-medium border border-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                  </>
                )}
                <button
                  onClick={handleCloseAttempt}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white flex-shrink-0"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Email Status Message */}
          {emailMessage && (
            <div className={`mb-4 p-3 rounded-lg border ${
              emailMessage.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {emailMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <p className="text-sm font-medium">{emailMessage.text}</p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-1 custom-scrollbar min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Customer & Installation */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer Information Card */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Customer Information</h3>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <EditField
                        icon={Hash}
                        label="Spectrum Reference"
                        value={formData.spectrum_reference}
                        onChange={(v) => handleChange('spectrum_reference', v)}
                        error={errors.spectrum_reference}
                        required
                      />
                      <EditField
                        icon={Hash}
                        label="Account Number"
                        value={formData.customer_account_number}
                        onChange={(v) => handleChange('customer_account_number', v)}
                        error={errors.customer_account_number}
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <EditField
                          icon={Shield}
                          label="Security Code"
                          value={formData.customer_security_code}
                          onChange={(v) => handleChange('customer_security_code', v)}
                        />
                        <EditField
                          icon={FileText}
                          label="Job Number"
                          value={formData.job_number}
                          onChange={(v) => handleChange('job_number', v)}
                        />
                      </div>
                      <EditField
                        icon={Briefcase}
                        label="Business Name"
                        value={formData.business_name}
                        onChange={(v) => handleChange('business_name', v)}
                        error={errors.business_name}
                        required
                      />
                      <EditField
                        icon={User}
                        label="Customer Name"
                        value={formData.customer_name}
                        onChange={(v) => handleChange('customer_name', v)}
                        error={errors.customer_name}
                        required
                      />
                      <EditField
                        icon={Mail}
                        label="Email Address"
                        value={formData.customer_email}
                        onChange={(v) => handleChange('customer_email', v)}
                        error={errors.customer_email}
                        type="email"
                        required
                      />
                      <EditField
                        icon={Phone}
                        label="Phone Number"
                        value={formData.customer_phone}
                        onChange={(v) => handleChange('customer_phone', formatPhoneAsYouType(v))}
                        error={errors.customer_phone}
                        required
                        type="tel"
                      />
                      <div className="pt-2">
                        <AddressAutocomplete
                          value={formData.customer_address}
                          onChange={(v) => handleChange('customer_address', v)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <InfoRow icon={Hash} label="Spectrum Ref" value={formData.spectrum_reference} highlight onCopy={copyToClipboard} isCopied={copiedField === 'Spectrum Ref'} />
                      <InfoRow icon={Hash} label="Account #" value={formData.customer_account_number} onCopy={copyToClipboard} isCopied={copiedField === 'Account #'} />
                      {formData.customer_security_code && (
                        <InfoRow icon={Shield} label="Security Code" value={formData.customer_security_code} onCopy={copyToClipboard} isCopied={copiedField === 'Security Code'} />
                      )}
                      {formData.job_number && (
                        <InfoRow icon={FileText} label="Job #" value={formData.job_number} onCopy={copyToClipboard} isCopied={copiedField === 'Job #'} />
                      )}
                      <InfoRow icon={Briefcase} label="Business" value={formData.business_name} highlight onCopy={copyToClipboard} isCopied={copiedField === 'Business'} />
                      <InfoRow icon={User} label="Customer" value={formData.customer_name} highlight onCopy={copyToClipboard} isCopied={copiedField === 'Customer'} />
                      <InfoRow icon={Mail} label="Email" value={formData.customer_email} onCopy={copyToClipboard} isCopied={copiedField === 'Email'} />
                      <InfoRow icon={Phone} label="Phone" value={formatPhoneNumber(formData.customer_phone)} onCopy={copyToClipboard} isCopied={copiedField === 'Phone'} />
                      {formData.customer_address && (
                        <InfoRow icon={MapPin} label="Address" value={formData.customer_address} onCopy={copyToClipboard} isCopied={copiedField === 'Address'} />
                      )}
                    </div>
                  )}
                </div>

                {/* Installation Card */}
                <div className={`p-5 rounded-xl border ${
                  isInstalled
                    ? 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20'
                    : isToday
                    ? 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20'
                    : 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-lg ${
                      isInstalled ? 'bg-green-500/20' : isToday ? 'bg-blue-500/20' : 'bg-yellow-500/20'
                    }`}>
                      <Calendar className={`w-5 h-5 ${
                        isInstalled ? 'text-green-400' : isToday ? 'text-blue-400' : 'text-yellow-400'
                      }`} />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Installation</h3>
                  </div>

                  {(isEditing || showReschedule) ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <EditField
                          icon={Calendar}
                          label="Date"
                          value={formData.install_date}
                          onChange={(v) => handleChange('install_date', v)}
                          error={errors.install_date}
                          type="date"
                          required
                        />
                        <EditField
                          icon={Clock}
                          label="Time"
                          value={formData.install_time}
                          onChange={(v) => handleChange('install_time', v)}
                          error={errors.install_time}
                          type="time"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <InfoRow
                        icon={Calendar}
                        label="Date"
                        value={new Date(formData.install_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        highlight
                      />
                      <InfoRow icon={Clock} label="Time" value={formData.install_time} highlight />

                      <div className={`mt-4 p-3 rounded-lg flex items-start gap-3 ${
                        isInstalled
                          ? 'bg-green-500/10 border border-green-500/30'
                          : isToday
                          ? 'bg-blue-500/10 border border-blue-500/30'
                          : 'bg-yellow-500/10 border border-yellow-500/30'
                      }`}>
                        {isInstalled ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-green-300 font-medium">Installation Completed</p>
                              <p className="text-green-400/70 text-sm mt-1">
                                Completed on {new Date(formData.install_date + 'T00:00:00').toLocaleDateString()}
                              </p>
                            </div>
                          </>
                        ) : isToday ? (
                          <>
                            <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
                            <div>
                              <p className="text-blue-300 font-medium">Installation Today</p>
                              <p className="text-blue-400/70 text-sm mt-1">
                                Scheduled for {formData.install_time}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-yellow-300 font-medium">Upcoming Installation</p>
                              <p className="text-yellow-400/70 text-sm mt-1">
                                Scheduled for {new Date(formData.install_date + 'T00:00:00').toLocaleDateString()}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes Card */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Notes</h3>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                      placeholder="Add any special notes or instructions..."
                    />
                  ) : (
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {formData.notes || <span className="text-gray-500 italic">No notes added</span>}
                    </p>
                  )}
                </div>

                {/* Pricing Card - Only show if any pricing data exists */}
                {(formData.internet_tier || formData.monthly_total || formData.initial_payment) && (
                  <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-emerald-500/20">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Pricing & Plan</h3>
                    </div>
                    <div className="space-y-3">
                      {formData.internet_tier && (
                        <InfoRow icon={Wifi} label="Internet Tier" value={formData.internet_tier} highlight />
                      )}
                      {formData.monthly_total && (
                        <InfoRow 
                          icon={DollarSign} 
                          label="Monthly Total" 
                          value={`$${parseFloat(formData.monthly_total).toFixed(2)}`} 
                          highlight 
                        />
                      )}
                      {formData.initial_payment && (
                        <InfoRow 
                          icon={DollarSign} 
                          label="Initial Payment" 
                          value={`$${parseFloat(formData.initial_payment).toFixed(2)}`} 
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Products */}
              <div className="space-y-6">
                {/* Products Card */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-cyan-500/20">
                        <Package className="w-5 h-5 text-cyan-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Products</h3>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold">
                      {totalProducts}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <ProductToggleEdit
                        icon={Wifi}
                        label="Internet"
                        checked={formData.has_internet}
                        onChange={(v) => handleChange('has_internet', v)}
                        color="blue"
                      />
                      <ProductToggleEdit
                        icon={Tv}
                        label="TV Service"
                        checked={formData.has_tv}
                        onChange={(v) => handleChange('has_tv', v)}
                        color="purple"
                      />
                      <ProductToggleEdit
                        icon={Radio}
                        label="WIB"
                        checked={formData.has_wib}
                        onChange={(v) => handleChange('has_wib', v)}
                        color="green"
                      />
                      <ProductToggleEdit
                        icon={Wifi}
                        label="Gig Internet"
                        checked={formData.has_gig}
                        onChange={(v) => handleChange('has_gig', v)}
                        color="emerald"
                      />
                      <ProductCounterEdit
                        icon={PhoneCall}
                        label="Voice Lines"
                        value={formData.has_voice}
                        onChange={(v) => handleChange('has_voice', v)}
                        color="orange"
                      />
                      <ProductCounterEdit
                        icon={Smartphone}
                        label="Mobile Lines"
                        value={formData.has_mobile}
                        onChange={(v) => handleChange('has_mobile', v)}
                        subLabel="Activated"
                        subValue={formData.mobile_activated}
                        onSubChange={(v) => handleChange('mobile_activated', Math.min(v, formData.has_mobile))}
                        showSub={formData.has_mobile > 0}
                        color="indigo"
                      />
                      <ProductCounterEdit
                        icon={Package}
                        label="SBC"
                        value={formData.has_sbc}
                        onChange={(v) => handleChange('has_sbc', v)}
                        color="pink"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.has_internet && <ProductBadge icon={Wifi} label="Internet" color="blue" />}
                      {formData.has_tv && <ProductBadge icon={Tv} label="TV Service" color="purple" />}
                      {formData.has_wib && <ProductBadge icon={Radio} label="WIB" color="green" />}
                      {formData.has_gig && <ProductBadge icon={Wifi} label="Gig Internet" color="emerald" />}
                      {formData.has_voice > 0 && <ProductBadge icon={PhoneCall} label="Voice Lines" count={formData.has_voice} color="orange" />}
                      {formData.has_mobile > 0 && <ProductBadge icon={Smartphone} label="Mobile Lines" count={formData.has_mobile} color="indigo" />}
                      {formData.has_sbc > 0 && <ProductBadge icon={Package} label="SBC" count={formData.has_sbc} color="pink" />}
                      {totalProducts === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No products</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile Activation Progress */}
                {!isEditing && formData.has_mobile > 0 && (
                  <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="w-5 h-5 text-indigo-400" />
                      <h4 className="text-white font-semibold">Mobile Activation</h4>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Progress</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">{formData.mobile_activated}</span>
                        <span className="text-gray-400">/ {formData.has_mobile}</span>
                        {formData.mobile_activated === formData.has_mobile ? (
                          <CheckCircle className="w-5 h-5 text-green-400 ml-1" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-400 ml-1" />
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                        style={{ width: `${(formData.mobile_activated / formData.has_mobile) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {formData.mobile_activated === formData.has_mobile
                        ? 'All lines activated'
                        : `${formData.has_mobile - formData.mobile_activated} pending activation`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Trail Section */}
            <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
              <AuditLog orderId={order.orderid} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex flex-col xs:flex-row items-stretch xs:items-center xs:justify-end gap-2 xs:gap-3 mt-6 pt-4 border-t border-white/10">
            {/* Email Button - Primary Action */}
            <button
              onClick={handleSendToEmail}
              disabled={sendingEmail || isSubmitting}
              className="xs:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              title="Send order details to your email"
            >
              {sendingEmail ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send to My Email</span>
                </>
              )}
            </button>

            {/* Delete Button - Secondary/Destructive Action */}
            <button
              onClick={handleDeleteClick}
              disabled={isSubmitting}
              className="xs:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-300 hover:text-red-400 text-sm font-medium transition-colors border border-white/10 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Order</span>
            </button>
          </div>
        </Card>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-10">
            <Card className="max-w-md w-full">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-full bg-red-500/20">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Delete Order?</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Are you sure you want to delete this order? This action cannot be undone and all order data will be permanently removed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Order'
                    )}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Unsaved Changes Warning Dialog */}
        {showUnsavedWarning && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-white/10">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-full bg-yellow-500/20">
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Unsaved Changes</h3>
                    <p className="text-gray-300 text-sm">
                      You have unsaved changes. Are you sure you want to discard them?
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-4 bg-white/5 border-t border-white/10">
                <button
                  onClick={handleCancelDiscard}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Keep Editing
                </button>
                <button
                  onClick={handleConfirmDiscard}
                  className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Follow-Up Modal */}
      <FollowUpModal
        isOpen={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        onSubmit={createFollowup}
        order={order}
        loading={followupLoading}
      />

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          margin: 8px 0;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(59, 130, 246, 0.5) 0%,
            rgba(37, 99, 235, 0.5) 100%
          );
          border-radius: 10px;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(59, 130, 246, 0.7) 0%,
            rgba(37, 99, 235, 0.7) 100%
          );
        }

        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.5) rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  )
}

// Helper components
function InfoRow({ icon: Icon, label, value, highlight, onCopy, isCopied }) {
  return (
    <div className="flex items-start gap-3 py-2 group">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className={`${highlight ? 'text-white font-medium' : 'text-gray-300'} break-words`}>
          {value || <span className="text-gray-600 italic">Not set</span>}
        </p>
      </div>
      {value && onCopy && (
        <button
          onClick={() => onCopy(value, label)}
          className={`p-1.5 rounded transition-all flex-shrink-0 ${
            isCopied
              ? 'bg-green-500/20 text-green-400 scale-110'
              : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300'
          }`}
          title={isCopied ? 'Copied!' : `Copy ${label}`}
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  )
}

function EditField({ icon: Icon, label, value, onChange, type = 'text', error, required }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
        <Icon className="w-4 h-4" />
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {type === 'time' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
            error ? 'border-red-500' : 'border-white/10'
          } text-white focus:outline-none focus:border-blue-500 transition-colors`}
        >
          <option value="" className="bg-gray-800">Select time slot</option>
          {TIME_SLOTS.map(slot => (
            <option key={slot.value} value={slot.value} className="bg-gray-800">
              {slot.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
            error ? 'border-red-500' : 'border-white/10'
          } text-white focus:outline-none focus:border-blue-500 transition-colors`}
        />
      )}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

const colorMap = {
  blue: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
  purple: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  green: 'bg-green-500/10 border-green-500/30 text-green-300',
  orange: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
  indigo: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  pink: 'bg-pink-500/10 border-pink-500/30 text-pink-300',
}

const iconColorMap = {
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  green: 'text-green-400',
  orange: 'text-orange-400',
  indigo: 'text-indigo-400',
  pink: 'text-pink-400',
}

function ProductBadge({ icon: Icon, label, count, color = 'blue' }) {
  return (
    <div className={`p-3 rounded-lg border flex items-center justify-between ${colorMap[color]}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColorMap[color]}`} />
        <span className="font-medium text-sm">{label}</span>
      </div>
      {count > 0 && (
        <span className={`px-2 py-0.5 rounded-full bg-white/10 text-xs font-bold ${iconColorMap[color]}`}>
          {count}
        </span>
      )}
    </div>
  )
}

function ProductToggleEdit({ icon: Icon, label, checked, onChange, color = 'blue' }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
        checked ? colorMap[color] : 'bg-white/5 border-white/10 hover:border-white/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${checked ? iconColorMap[color] : 'text-gray-400'}`} />
          <span className={`font-medium text-sm ${checked ? 'text-white' : 'text-gray-300'}`}>{label}</span>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          checked ? `${iconColorMap[color]} border-current` : 'border-white/30'
        }`}>
          {checked && <Check className="w-3 h-3" />}
        </div>
      </div>
    </div>
  )
}

function ProductCounterEdit({ icon: Icon, label, value, onChange, subLabel, subValue, onSubChange, showSub, color = 'blue' }) {
  return (
    <div className={`p-3 rounded-lg border ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColorMap[color]}`} />
          <span className="font-medium text-sm text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(Math.max(0, value - 1))}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
          >
            -
          </button>
          <span className="text-white font-bold w-6 text-center">{value}</span>
          <button
            type="button"
            onClick={() => onChange(value + 1)}
            className={`w-7 h-7 rounded-lg hover:opacity-80 text-white font-bold transition-colors ${
              color === 'blue' ? 'bg-blue-500' :
              color === 'purple' ? 'bg-purple-500' :
              color === 'green' ? 'bg-green-500' :
              color === 'orange' ? 'bg-orange-500' :
              color === 'indigo' ? 'bg-indigo-500' :
              'bg-pink-500'
            }`}
          >
            +
          </button>
        </div>
      </div>
      {showSub && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
          <span className="text-xs text-gray-400">{subLabel}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSubChange(Math.max(0, subValue - 1))}
              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors"
            >
              -
            </button>
            <span className="text-white font-bold w-5 text-center text-sm">{subValue}</span>
            <button
              type="button"
              onClick={() => onSubChange(subValue + 1)}
              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetailsModal
