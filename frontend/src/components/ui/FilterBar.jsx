import { useState, useEffect } from 'react'
import {
  Search, Filter, X, Save, ChevronDown, Calendar,
  Wifi, Tv, Smartphone, Phone, Radio, Server, CheckCircle, Clock, AlertCircle, Package
} from 'lucide-react'
import Card from './Card'
import CustomCheckbox from './CustomCheckbox'

function FilterBar({ onFilterChange, onClearFilters, totalResults = 0, filteredResults = 0 }) {
  const [showFilters, setShowFilters] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [savedPresets, setSavedPresets] = useState([])
  const [isMobile, setIsMobile] = useState(false)

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    productTypes: {
      internet: false,
      tv: false,
      mobile: false,
      voice: false,
      wib: false,
      sbc: false
    },
    installStatus: {
      installed: false,
      pending: false,
      today: false
    },
    mobileActivation: {
      activated: false,
      pendingActivation: false,
      fullyActivated: false
    },
    hasGig: false
  })

  // Separate state for search input with debouncing
  const [searchInput, setSearchInput] = useState('')

  // Date range validation error
  const [dateRangeError, setDateRangeError] = useState('')

  // Date formatting utilities for text input (MM/DD/YYYY display format)
  const formatDateForDisplay = (isoDate) => {
    if (!isoDate) return ''
    const [year, month, day] = isoDate.split('-')
    return `${month}/${day}/${year}`
  }

  // Display state for date inputs (MM/DD/YYYY format)
  const [dateFromDisplay, setDateFromDisplay] = useState('')
  const [dateToDisplay, setDateToDisplay] = useState('')

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Lock body scroll when filter modal is open (iOS Safari compatible)
  useEffect(() => {
    if (showFilters) {
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
  }, [showFilters])

  // Load saved presets from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('filterPresets')
    if (stored) {
      try {
        setSavedPresets(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to load presets:', e)
      }
    }
  }, [])

  // Debounce search input to prevent excessive re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }))
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchInput])

  // Notify parent when filters change
  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value)
  }

  const handleDateChange = (field, value) => {
    // Clear previous error
    setDateRangeError('')

    // Validate date range
    if (field === 'dateFrom' && filters.dateTo && value > filters.dateTo) {
      setDateRangeError('Start date cannot be after end date')
      return
    }
    if (field === 'dateTo' && filters.dateFrom && value < filters.dateFrom) {
      setDateRangeError('End date cannot be before start date')
      return
    }

    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleProductToggle = (product) => {
    setFilters(prev => ({
      ...prev,
      productTypes: {
        ...prev.productTypes,
        [product]: !prev.productTypes[product]
      }
    }))
  }

  const handleStatusToggle = (status) => {
    setFilters(prev => ({
      ...prev,
      installStatus: {
        ...prev.installStatus,
        [status]: !prev.installStatus[status]
      }
    }))
  }

  const handleMobileActivationToggle = (status) => {
    setFilters(prev => ({
      ...prev,
      mobileActivation: {
        ...prev.mobileActivation,
        [status]: !prev.mobileActivation[status]
      }
    }))
  }

  const handleGigToggle = () => {
    setFilters(prev => ({
      ...prev,
      hasGig: !prev.hasGig
    }))
  }

  const clearAllFilters = () => {
    const emptyFilters = {
      search: '',
      dateFrom: '',
      dateTo: '',
      productTypes: {
        internet: false,
        tv: false,
        mobile: false,
        voice: false,
        wib: false,
        sbc: false
      },
      installStatus: {
        installed: false,
        pending: false,
        today: false
      },
      mobileActivation: {
        activated: false,
        pendingActivation: false,
        fullyActivated: false
      },
      hasGig: false
    }
    setSearchInput('') // Clear search input state
    setDateFromDisplay('') // Clear date display states
    setDateToDisplay('')
    setFilters(emptyFilters)
    onClearFilters()
  }

  const savePreset = () => {
    if (!presetName.trim()) return

    const newPreset = {
      id: Date.now(),
      name: presetName,
      filters: { ...filters }
    }

    const updatedPresets = [...savedPresets, newPreset]
    setSavedPresets(updatedPresets)
    localStorage.setItem('filterPresets', JSON.stringify(updatedPresets))
    setPresetName('')
    setShowPresets(false)
  }

  const loadPreset = (preset) => {
    setFilters(preset.filters)
    setDateFromDisplay(formatDateForDisplay(preset.filters.dateFrom))
    setDateToDisplay(formatDateForDisplay(preset.filters.dateTo))
    setShowPresets(false)
  }

  const deletePreset = (presetId) => {
    const updatedPresets = savedPresets.filter(p => p.id !== presetId)
    setSavedPresets(updatedPresets)
    localStorage.setItem('filterPresets', JSON.stringify(updatedPresets))
  }

  // Count active filters
  const activeFilterCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.dateFrom || filters.dateTo) count++
    if (Object.values(filters.productTypes).some(v => v)) count++
    if (Object.values(filters.installStatus).some(v => v)) count++
    if (Object.values(filters.mobileActivation).some(v => v)) count++
    if (filters.hasGig) count++
    return count
  }

  const activeCount = activeFilterCount()

  // Parse display format (MM/DD/YYYY) to ISO format (YYYY-MM-DD)
  const formatDateForState = (displayDate) => {
    const cleaned = displayDate.replace(/[^\d/]/g, '')
    const parts = cleaned.split('/')
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      const [month, day, year] = parts
      const date = new Date(year, month - 1, day)
      if (date.getFullYear() == year && date.getMonth() == month - 1 && date.getDate() == day) {
        return `${year}-${month}-${day}`
      }
    }
    return null
  }

  // Handle date input with auto-formatting
  const handleDateInputChange = (field, value) => {
    let formatted = value.replace(/[^\d]/g, '')
    if (formatted.length > 2) {
      formatted = formatted.slice(0, 2) + '/' + formatted.slice(2)
    }
    if (formatted.length > 5) {
      formatted = formatted.slice(0, 5) + '/' + formatted.slice(5)
    }
    formatted = formatted.slice(0, 10)

    if (field === 'dateFrom') {
      setDateFromDisplay(formatted)
    } else {
      setDateToDisplay(formatted)
    }

    const isoDate = formatDateForState(formatted)
    if (isoDate) {
      handleDateChange(field, isoDate)
    } else if (formatted === '') {
      handleDateChange(field, '')
    }
  }

  // Filters content component (reused for both desktop and mobile)
  const FiltersContent = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        {/* Date Range Filter */}
        <div className="min-w-0 overflow-hidden">
          <label className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <Calendar size={18} className="text-blue-400" />
            Install Date Range
          </label>
          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              value={dateFromDisplay}
              onChange={(e) => handleDateInputChange('dateFrom', e.target.value)}
              className={`w-full min-w-0 max-w-full box-border px-2 sm:px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-white bg-white/10 hover:bg-white/15 transition-colors ${
                dateRangeError ? 'border-red-400' : 'border-white/20'
              }`}
              placeholder="MM/DD/YYYY"
            />
            <input
              type="text"
              inputMode="numeric"
              value={dateToDisplay}
              onChange={(e) => handleDateInputChange('dateTo', e.target.value)}
              className={`w-full min-w-0 max-w-full box-border px-2 sm:px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-white bg-white/10 hover:bg-white/15 transition-colors ${
                dateRangeError ? 'border-red-400' : 'border-white/20'
              }`}
              placeholder="MM/DD/YYYY"
            />
            {dateRangeError && (
              <p className="text-red-400 text-sm">{dateRangeError}</p>
            )}
          </div>
        </div>

        {/* Product Type Filter */}
        <div>
          <label className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <Filter size={18} className="text-blue-400" />
            Product Types
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.productTypes.internet}
                onChange={() => handleProductToggle('internet')}
                color="blue"
              />
              <Wifi size={18} className="text-blue-400" />
              <span className="text-sm font-medium text-white flex-1">Internet</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.productTypes.tv}
                onChange={() => handleProductToggle('tv')}
                color="purple"
              />
              <Tv size={18} className="text-purple-400" />
              <span className="text-sm font-medium text-white flex-1">TV</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.productTypes.mobile}
                onChange={() => handleProductToggle('mobile')}
                color="green"
              />
              <Smartphone size={18} className="text-green-400" />
              <span className="text-sm font-medium text-white flex-1">Mobile</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.productTypes.voice}
                onChange={() => handleProductToggle('voice')}
                color="orange"
              />
              <Phone size={18} className="text-orange-400" />
              <span className="text-sm font-medium text-white flex-1">Voice</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.productTypes.wib}
                onChange={() => handleProductToggle('wib')}
                color="indigo"
              />
              <Radio size={18} className="text-indigo-400" />
              <span className="text-sm font-medium text-white flex-1">WIB</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.productTypes.sbc}
                onChange={() => handleProductToggle('sbc')}
                color="pink"
              />
              <Server size={18} className="text-pink-400" />
              <span className="text-sm font-medium text-white flex-1">SBC</span>
            </label>
          </div>
        </div>

        {/* Install Status Filter */}
        <div>
          <label className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <AlertCircle size={18} className="text-blue-400" />
            Install Status
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.installStatus.installed}
                onChange={() => handleStatusToggle('installed')}
                color="green"
              />
              <CheckCircle size={18} className="text-green-400" />
              <span className="text-sm font-medium text-white flex-1">Installed</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.installStatus.today}
                onChange={() => handleStatusToggle('today')}
                color="blue"
              />
              <Clock size={18} className="text-blue-400" />
              <span className="text-sm font-medium text-white flex-1">Today</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.installStatus.pending}
                onChange={() => handleStatusToggle('pending')}
                color="yellow"
              />
              <AlertCircle size={18} className="text-yellow-400" />
              <span className="text-sm font-medium text-white flex-1">Pending</span>
            </label>
          </div>
        </div>

        {/* Mobile Activation Filter */}
        <div>
          <label className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <Smartphone size={18} className="text-green-400" />
            Mobile Activation
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.mobileActivation.activated}
                onChange={() => handleMobileActivationToggle('activated')}
                color="green"
              />
              <CheckCircle size={18} className="text-green-400" />
              <span className="text-sm font-medium text-white flex-1">Has Activated</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.mobileActivation.pendingActivation}
                onChange={() => handleMobileActivationToggle('pendingActivation')}
                color="yellow"
              />
              <Clock size={18} className="text-yellow-400" />
              <span className="text-sm font-medium text-white flex-1">Pending Activation</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.mobileActivation.fullyActivated}
                onChange={() => handleMobileActivationToggle('fullyActivated')}
                color="blue"
              />
              <CheckCircle size={18} className="text-blue-400" />
              <span className="text-sm font-medium text-white flex-1">Fully Activated</span>
            </label>
          </div>
        </div>

        {/* Special Products Filter */}
        <div>
          <label className="flex items-center gap-2 text-base font-bold text-white mb-4">
            <Wifi size={18} className="text-cyan-400" />
            Special Products
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors">
              <CustomCheckbox
                checked={filters.hasGig}
                onChange={handleGigToggle}
                color="blue"
              />
              <Wifi size={18} className="text-cyan-400" />
              <span className="text-sm font-medium text-white flex-1">Gig Internet Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Filter Presets */}
      <div className="mt-8 pt-6 border-t border-white/20">
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-2 text-base font-bold text-white">
            <Save size={18} className="text-purple-400" />
            Filter Presets
          </label>
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 font-semibold rounded-lg transition-colors"
          >
            {showPresets ? 'Hide' : 'Manage Presets'}
            <ChevronDown size={16} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showPresets && (
          <div className="space-y-4 animate-fadeIn">
            {/* Save new preset */}
            {activeCount > 0 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e)=> setPresetName(e.target.value)}
                  placeholder="Enter preset name..."
                  className="flex-1 px-4 py-2.5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm text-white bg-white/10 placeholder-gray-400 hover:bg-white/15 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && presetName.trim()) {
                      savePreset()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={savePreset}
                  disabled={!presetName.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                >
                  <Save size={16} />
                  Save
                </button>
              </div>
            )}

            {/* Saved presets list */}
            {savedPresets.length > 0 ? (
              <div className="space-y-2">
                {savedPresets.map(preset => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/15 transition-all border border-white/10"
                  >
                    <button
                      type="button"
                      onClick={() => loadPreset(preset)}
                      className="flex-1 text-left text-sm font-semibold text-white hover:text-purple-300 transition-colors"
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePreset(preset.id)}
                      className="ml-2 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 px-4 bg-white/5 rounded-xl border border-dashed border-white/20">
                <Save size={32} className="mx-auto mb-2 text-purple-400" />
                <p className="text-sm text-white font-bold mb-1">
                  No saved presets yet
                </p>
                <p className="text-xs text-gray-400">
                  Apply filters above and save them for quick access
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )

  // Mobile bottom sheet view
  if (isMobile) {
    return (
      <>
        <div className="space-y-3">
          {/* Mobile search bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search orders..."
                className="w-full pl-11 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Filter button */}
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all shadow-md ${
                activeCount > 0
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              <Filter size={20} />
              {activeCount > 0 && (
                <span className="px-2 py-0.5 bg-white text-blue-600 text-xs font-bold rounded-full min-w-[22px] text-center shadow-sm">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {/* Results counter and Active filter badges */}
          {activeCount > 0 && (
            <div className="space-y-2 animate-fadeIn">
            {/* Results counter */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-600 rounded">
                  <Package size={14} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-900">
                  <span className="text-blue-600 font-bold">{filteredResults}</span> of <span className="font-bold">{totalResults}</span>
                </span>
              </div>
              {filteredResults === 0 && activeCount > 0 && (
                <span className="text-xs text-amber-600 font-medium">No results</span>
              )}
            </div>

            {/* Active filter badges */}
            <div className="flex flex-wrap gap-2 min-h-[1.5rem]">
              {filters.search && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium border border-blue-200 shadow-sm">
                  <Search size={14} />
                  <span className="max-w-[100px] truncate font-semibold">{filters.search}</span>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                    className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium border border-purple-200 shadow-sm">
                  <Calendar size={14} />
                  <span className="font-semibold">Date</span>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }))}
                    className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {Object.values(filters.productTypes).some(v => v) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-medium border border-green-200 shadow-sm">
                  <span className="font-semibold">Products</span>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      productTypes: Object.fromEntries(Object.keys(prev.productTypes).map(k => [k, false]))
                    }))}
                    className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {Object.values(filters.installStatus).some(v => v) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium border border-yellow-200 shadow-sm">
                  <span className="font-semibold">Status</span>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      installStatus: Object.fromEntries(Object.keys(prev.installStatus).map(k => [k, false]))
                    }))}
                    className="hover:bg-yellow-200 rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {Object.values(filters.mobileActivation).some(v => v) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-medium border border-emerald-200 shadow-sm">
                  <Smartphone size={14} />
                  <span className="font-semibold">Activation</span>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      mobileActivation: Object.fromEntries(Object.keys(prev.mobileActivation).map(k => [k, false]))
                    }))}
                    className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {filters.hasGig && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-100 text-cyan-800 rounded-lg text-xs font-medium border border-cyan-200 shadow-sm">
                  <Wifi size={14} />
                  <span className="font-semibold">Gig</span>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, hasGig: false }))}
                    className="hover:bg-cyan-200 rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            </div>
          )}
        </div>

        {/* Filter Modal - Centered Dialog */}
        {showFilters && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto pb-[72px] sm:pb-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowFilters(false)
            }}
          >
            <div className="w-full max-w-2xl my-auto flex flex-col max-h-[calc(100vh-88px)] sm:max-h-[90vh]">
              <Card className="relative flex flex-col max-h-full overflow-hidden p-3! sm:p-6!">
                {/* Modal Header */}
                <div className="pb-4 border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Filter size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Filters</h3>
                        {activeCount > 0 && (
                          <p className="text-sm text-gray-400">{activeCount} active filter{activeCount !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeCount > 0 && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="text-sm text-red-400 font-semibold px-3 py-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          Clear All
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                        title="Close"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 min-h-0">
                  <div className="bg-white/5 rounded-xl p-2 sm:p-4">
                    {FiltersContent()}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-white/10 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </>
    )
  }

  // Desktop view
  return (
    <div className="space-y-4">
      {/* Integrated search bar and filter toggle */}
      <div className="flex items-stretch gap-0 shadow-md">
        {/* Search input - Integrated left side */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 z-10 pointer-events-none" size={20} />
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search by customer name, account number, or spectrum reference..."
            className="w-full h-full pl-12 pr-12 py-3.5 text-sm border-2 border-r-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all relative"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)',
              borderTopLeftRadius: '0.75rem',
              borderBottomLeftRadius: '0.75rem',
              borderColor: 'rgba(209, 213, 219, 1)'
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filter toggle button - Integrated right side */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-5 py-3.5 transition-all text-sm font-semibold border-2 ${
            showFilters || activeCount > 0
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
              : 'text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
          style={{
            backgroundColor: showFilters || activeCount > 0 ? undefined : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            borderTopRightRadius: '0.75rem',
            borderBottomRightRadius: '0.75rem',
            borderColor: showFilters || activeCount > 0 ? undefined : 'rgba(209, 213, 219, 1)'
          }}
        >
          <Filter size={18} />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-white text-blue-600 text-xs font-bold rounded-full min-w-[20px] text-center shadow-sm">
              {activeCount}
            </span>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Clear filters button - Only show when filters are active */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex items-center gap-2 px-4 py-3.5 ml-3 text-sm text-red-600 font-semibold border-2 border-red-400 rounded-xl hover:bg-red-50 hover:border-red-500 transition-all shadow-md animate-fadeIn"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <X size={18} />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <Card className="p-6 animate-fadeIn shadow-xl">
          {FiltersContent()}
        </Card>
      )}

      {/* Results counter and Active filter badges */}
      {activeCount > 0 && (
        <div className="space-y-3 animate-fadeIn">
        {/* Results counter */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Package size={16} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">
              Showing <span className="text-blue-600 font-bold">{filteredResults}</span> of <span className="font-bold">{totalResults}</span> orders
            </span>
          </div>
          {filteredResults === 0 && activeCount > 0 && (
            <span className="text-xs text-amber-600 font-medium">No results match your filters</span>
          )}
        </div>

        {/* Active filter badges */}
        <div className="flex flex-wrap gap-2 min-h-[2rem]">
          {filters.search && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium shadow-sm border border-blue-200 animate-fadeIn">
              <Search size={16} />
              <span className="font-semibold">Search:</span>
              <span className="max-w-[200px] truncate">{filters.search}</span>
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                className="ml-1 p-1 hover:bg-blue-200 rounded-full transition-colors"
                title="Remove filter"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium shadow-sm border border-purple-200 animate-fadeIn">
              <Calendar size={16} />
              <span className="font-semibold">Date:</span>
              <span>
                {filters.dateFrom || '...'} to {filters.dateTo || '...'}
              </span>
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }))}
                className="ml-1 p-1 hover:bg-purple-200 rounded-full transition-colors"
                title="Remove filter"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {Object.entries(filters.productTypes).map(([product, enabled]) =>
            enabled ? (
              <div key={product} className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium shadow-sm border border-green-200 animate-fadeIn">
                <span className="capitalize font-semibold">{product}</span>
                <button
                  type="button"
                  onClick={() => handleProductToggle(product)}
                  className="ml-1 p-1 hover:bg-green-200 rounded-full transition-colors"
                  title="Remove filter"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null
          )}
          {Object.entries(filters.installStatus).map(([status, enabled]) =>
            enabled ? (
              <div key={status} className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium shadow-sm border border-yellow-200 animate-fadeIn">
                <span className="capitalize font-semibold">{status}</span>
                <button
                  type="button"
                  onClick={() => handleStatusToggle(status)}
                  className="ml-1 p-1 hover:bg-yellow-200 rounded-full transition-colors"
                  title="Remove filter"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null
          )}
          {Object.entries(filters.mobileActivation).map(([status, enabled]) =>
            enabled ? (
              <div key={status} className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium shadow-sm border border-emerald-200 animate-fadeIn">
                <Smartphone size={16} />
                <span className="font-semibold">
                  {status === 'activated' ? 'Has Activated' : status === 'pendingActivation' ? 'Pending Activation' : 'Fully Activated'}
                </span>
                <button
                  type="button"
                  onClick={() => handleMobileActivationToggle(status)}
                  className="ml-1 p-1 hover:bg-emerald-200 rounded-full transition-colors"
                  title="Remove filter"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null
          )}
          {filters.hasGig && (
            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-100 text-cyan-800 rounded-lg text-sm font-medium shadow-sm border border-cyan-200 animate-fadeIn">
              <Wifi size={16} />
              <span className="font-semibold">Gig Internet</span>
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, hasGig: false }))}
                className="ml-1 p-1 hover:bg-cyan-200 rounded-full transition-colors"
                title="Remove filter"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  )
}

export default FilterBar
