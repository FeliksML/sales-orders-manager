import { useState, useEffect } from 'react'
import {
  Search, Filter, X, Save, ChevronDown, Calendar,
  Wifi, Tv, Smartphone, Phone, Radio, Server, CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import Card from './Card'
import CustomCheckbox from './CustomCheckbox'

function FilterBar({ onFilterChange, onClearFilters }) {
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
    }
  })

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Notify parent when filters change
  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }))
  }

  const handleDateChange = (field, value) => {
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
      }
    }
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
    return count
  }

  const activeCount = activeFilterCount()

  // Filters content component (reused for both desktop and mobile)
  const FiltersContent = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Date Range Filter */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
            <Calendar size={16} className="text-blue-600" />
            Install Date Range
          </label>
          <div className="space-y-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleDateChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-blue-50/30 hover:bg-blue-50"
              placeholder="From"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleDateChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-blue-50/30 hover:bg-blue-50"
              placeholder="To"
            />
          </div>
        </div>

        {/* Product Type Filter */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
            <Filter size={16} className="text-blue-600" />
            Product Types
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <CustomCheckbox
                checked={filters.productTypes.internet}
                onChange={() => handleProductToggle('internet')}
              />
              <Wifi size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Internet</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <CustomCheckbox
                checked={filters.productTypes.tv}
                onChange={() => handleProductToggle('tv')}
              />
              <Tv size={16} className="text-purple-600" />
              <span className="text-sm font-medium text-gray-900">TV</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <CustomCheckbox
                checked={filters.productTypes.mobile}
                onChange={() => handleProductToggle('mobile')}
              />
              <Smartphone size={16} className="text-green-600" />
              <span className="text-sm font-medium text-gray-900">Mobile</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <CustomCheckbox
                checked={filters.productTypes.voice}
                onChange={() => handleProductToggle('voice')}
              />
              <Phone size={16} className="text-orange-600" />
              <span className="text-sm font-medium text-gray-900">Voice</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <CustomCheckbox
                checked={filters.productTypes.wib}
                onChange={() => handleProductToggle('wib')}
              />
              <Radio size={16} className="text-indigo-600" />
              <span className="text-sm font-medium text-gray-900">WIB</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <CustomCheckbox
                checked={filters.productTypes.sbc}
                onChange={() => handleProductToggle('sbc')}
              />
              <Server size={16} className="text-pink-600" />
              <span className="text-sm font-medium text-gray-900">SBC</span>
            </label>
          </div>
        </div>

        {/* Install Status Filter */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
            <AlertCircle size={16} className="text-blue-600" />
            Install Status
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <CustomCheckbox
                checked={filters.installStatus.installed}
                onChange={() => handleStatusToggle('installed')}
              />
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm font-medium text-gray-900">Installed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <CustomCheckbox
                checked={filters.installStatus.today}
                onChange={() => handleStatusToggle('today')}
              />
              <Clock size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Today</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <CustomCheckbox
                checked={filters.installStatus.pending}
                onChange={() => handleStatusToggle('pending')}
              />
              <AlertCircle size={16} className="text-yellow-600" />
              <span className="text-sm font-medium text-gray-900">Pending</span>
            </label>
          </div>
        </div>
      </div>

      {/* Filter Presets */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Save size={16} className="text-blue-600" />
            Filter Presets
          </label>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
          >
            {showPresets ? 'Hide' : 'Manage Presets'}
          </button>
        </div>

        {showPresets && (
          <div className="space-y-3">
            {/* Save new preset */}
            {activeCount > 0 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e)=> setPresetName(e.target.value)}
                  placeholder="Enter preset name..."
                  className="flex-1 px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 bg-purple-50/30 hover:bg-purple-50"
                />
                <button
                  onClick={savePreset}
                  disabled={!presetName.trim()}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-semibold"
                >
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
                    className="flex items-center justify-between p-3 bg-indigo-50/30 rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-100"
                  >
                    <button
                      onClick={() => loadPreset(preset)}
                      className="flex-1 text-left text-sm font-semibold text-gray-900"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 px-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-200">
                <p className="text-sm text-gray-800 font-semibold">
                  No saved presets yet
                </p>
                <p className="text-xs text-gray-600 mt-1">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={filters.search}
                onChange={handleSearchChange}
                placeholder="Search orders..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter button */}
            <button
              onClick={() => setShowFilters(true)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                activeCount > 0
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              <Filter size={18} />
              {activeCount > 0 && (
                <span className="px-1.5 py-0.5 bg-white text-blue-600 text-xs font-bold rounded-full min-w-[20px] text-center">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {/* Active filter badges */}
          {activeCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  <Search size={12} />
                  <span className="max-w-[100px] truncate">{filters.search}</span>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                  <Calendar size={12} />
                  <span>Date</span>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }))}
                    className="hover:bg-purple-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {Object.values(filters.productTypes).some(v => v) && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  <span>Products</span>
                  <button
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      productTypes: Object.fromEntries(Object.keys(prev.productTypes).map(k => [k, false]))
                    }))}
                    className="hover:bg-green-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {Object.values(filters.installStatus).some(v => v) && (
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  <span>Status</span>
                  <button
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      installStatus: Object.fromEntries(Object.keys(prev.installStatus).map(k => [k, false]))
                    }))}
                    className="hover:bg-yellow-200 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Sheet Overlay */}
        {showFilters && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 animate-fadeIn"
              onClick={() => setShowFilters(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-slideUp">
              {/* Bottom sheet header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <Filter size={20} className="text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                  {activeCount > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">
                      {activeCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-red-600 font-semibold px-3 py-1.5 hover:bg-red-50 rounded-lg"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Bottom sheet content */}
              <div className="p-4">
                <FiltersContent />
              </div>

              {/* Bottom sheet footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </>
        )}
      </>
    )
  }

  // Desktop view
  return (
    <div className="space-y-3">
      {/* Search bar and filter toggle */}
      <div className="flex gap-3">
        {/* Search input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search by customer name, account number, or spectrum reference..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {filters.search && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filter toggle button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
            showFilters
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter size={20} />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-white text-blue-600 text-xs font-semibold rounded-full">
              {activeCount}
            </span>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Clear filters button */}
        {activeCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            <X size={20} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <Card className="p-4">
          <FiltersContent />
        </Card>
      )}

      {/* Active filter badges */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              <Search size={14} />
              <span>Search: {filters.search}</span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <div className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              <Calendar size={14} />
              <span>
                Date: {filters.dateFrom || '...'} to {filters.dateTo || '...'}
              </span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }))}
                className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {Object.entries(filters.productTypes).map(([product, enabled]) =>
            enabled ? (
              <div key={product} className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                <span className="capitalize">{product}</span>
                <button
                  onClick={() => handleProductToggle(product)}
                  className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null
          )}
          {Object.entries(filters.installStatus).map(([status, enabled]) =>
            enabled ? (
              <div key={status} className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                <span className="capitalize">{status}</span>
                <button
                  onClick={() => handleStatusToggle(status)}
                  className="ml-1 hover:bg-yellow-200 rounded-full p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}

export default FilterBar
