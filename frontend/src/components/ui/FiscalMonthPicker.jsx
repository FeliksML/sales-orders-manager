import { useState, useRef, useEffect, useCallback } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react'
import {
  getCurrentFiscalMonth,
  formatFiscalMonthLabel,
  getFiscalMonthRange,
  isFutureFiscalMonth,
  formatYearMonth,
  parseYearMonth,
  getMonthsForYear
} from '../../utils/fiscalMonthUtils'

/**
 * FiscalMonthPicker - A dropdown component for selecting fiscal months.
 *
 * Fiscal month runs from 28th 6pm of previous month to 28th 6pm of current month.
 *
 * @param {Object} props
 * @param {string|null} props.selectedMonth - Currently selected month in YYYY-MM format, null for current
 * @param {Function} props.onMonthChange - Callback when month changes (receives YYYY-MM or null)
 * @param {boolean} props.disabled - Whether the picker is disabled
 */
function FiscalMonthPicker({
  selectedMonth,
  onMonthChange,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [displayYear, setDisplayYear] = useState(() => {
    if (selectedMonth) {
      return parseYearMonth(selectedMonth).year
    }
    return new Date().getFullYear()
  })

  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)

  // Current fiscal month for comparison
  const currentFiscalMonth = getCurrentFiscalMonth()
  const effectiveMonth = selectedMonth || currentFiscalMonth

  // Sync displayYear when selectedMonth prop changes
  useEffect(() => {
    if (selectedMonth) {
      setDisplayYear(parseYearMonth(selectedMonth).year)
    }
  }, [selectedMonth])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        triggerRef.current?.focus()
        break
      case 'Home':
        e.preventDefault()
        // Go to current month
        handleMonthSelect(null)
        break
      case 'ArrowLeft':
        e.preventDefault()
        setDisplayYear(prev => prev - 1)
        break
      case 'ArrowRight':
        e.preventDefault()
        if (displayYear < new Date().getFullYear()) {
          setDisplayYear(prev => prev + 1)
        }
        break
      default:
        break
    }
  }, [isOpen, displayYear])

  // Handle month selection
  const handleMonthSelect = (month) => {
    onMonthChange(month === currentFiscalMonth ? null : month)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  // Navigate to current month (back to today)
  const handleBackToCurrent = () => {
    setDisplayYear(parseYearMonth(currentFiscalMonth).year)
    handleMonthSelect(null)
  }

  // Get months for the display year
  const months = getMonthsForYear(displayYear)

  // Get fiscal date range for tooltip
  const range = getFiscalMonthRange(effectiveMonth)

  // Determine if viewing historical data
  const isViewingHistorical = selectedMonth !== null && selectedMonth !== currentFiscalMonth

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'}
          ${isViewingHistorical ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5 border border-white/10'}
        `}
        title={`Fiscal month: ${range.start} - ${range.end}`}
      >
        <Calendar className={`w-4 h-4 ${isViewingHistorical ? 'text-amber-400' : 'text-gray-400'}`} />
        <span className={`text-sm font-medium ${isViewingHistorical ? 'text-amber-300' : 'text-gray-300'}`}>
          {formatFiscalMonthLabel(effectiveMonth)}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-2 z-50 w-72
                     bg-gradient-to-br from-gray-900 to-gray-800
                     rounded-xl border border-white/20 shadow-2xl
                     animate-in fade-in slide-in-from-top-2 duration-200"
          onKeyDown={handleKeyDown}
        >
          {/* Header: Year Navigation */}
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <button
              onClick={() => setDisplayYear(prev => prev - 1)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Previous year"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>

            <span className="text-lg font-semibold text-white">
              {displayYear}
            </span>

            <button
              onClick={() => displayYear < new Date().getFullYear() && setDisplayYear(prev => prev + 1)}
              disabled={displayYear >= new Date().getFullYear()}
              className={`p-1.5 rounded-lg transition-colors ${
                displayYear >= new Date().getFullYear()
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-white/10'
              }`}
              title="Next year"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Month Grid */}
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {months.map(({ value, label, disabled: monthDisabled }) => {
                const isSelected = value === effectiveMonth
                const isCurrent = value === currentFiscalMonth

                return (
                  <button
                    key={value}
                    onClick={() => !monthDisabled && handleMonthSelect(value)}
                    disabled={monthDisabled}
                    className={`
                      relative px-3 py-2 rounded-lg text-sm font-medium
                      transition-all duration-150
                      ${monthDisabled
                        ? 'text-gray-600 cursor-not-allowed'
                        : isSelected
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    {label}
                    {isCurrent && !isSelected && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer: Fiscal Range & Back to Current */}
          <div className="p-3 border-t border-white/10 space-y-2">
            {/* Fiscal range display */}
            <div className="text-xs text-gray-500 text-center">
              <span className="text-gray-400">Fiscal period:</span>{' '}
              {range.start} - {range.end}
            </div>

            {/* Back to Current button */}
            {isViewingHistorical && (
              <button
                onClick={handleBackToCurrent}
                className="w-full flex items-center justify-center gap-2 px-3 py-2
                           rounded-lg bg-emerald-500/20 border border-emerald-500/30
                           text-emerald-300 text-sm font-medium
                           hover:bg-emerald-500/30 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Back to Current Month
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FiscalMonthPicker
