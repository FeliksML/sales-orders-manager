import { useState, useEffect } from 'react'
import {
  Search, Filter, X, Save, ChevronDown, Calendar,
  Wifi, Tv, Smartphone, Phone, Radio, Server, CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import Card from './Card'

function FilterBar({ onFilterChange, onClearFilters }) {
  const [showFilters, setShowFilters] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [savedPresets, setSavedPresets] = useState([])

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
                  <input
                    type="checkbox"
                    checked={filters.productTypes.internet}
                    onChange={() => handleProductToggle('internet')}
                    className="w-4 h-4 text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-2 focus:ring-blue-500 accent-blue-600"
                  />
                  <Wifi size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Internet</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.productTypes.tv}
                    onChange={() => handleProductToggle('tv')}
                    className="w-4 h-4 text-purple-600 bg-purple-100 border-purple-300 rounded focus:ring-2 focus:ring-purple-500 accent-purple-600"
                  />
                  <Tv size={16} className="text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">TV</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.productTypes.mobile}
                    onChange={() => handleProductToggle('mobile')}
                    className="w-4 h-4 text-green-600 bg-green-100 border-green-300 rounded focus:ring-2 focus:ring-green-500 accent-green-600"
                  />
                  <Smartphone size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Mobile</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.productTypes.voice}
                    onChange={() => handleProductToggle('voice')}
                    className="w-4 h-4 text-orange-600 bg-orange-100 border-orange-300 rounded focus:ring-2 focus:ring-orange-500 accent-orange-600"
                  />
                  <Phone size={16} className="text-orange-600" />
                  <span className="text-sm font-medium text-gray-900">Voice</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.productTypes.wib}
                    onChange={() => handleProductToggle('wib')}
                    className="w-4 h-4 text-indigo-600 bg-indigo-100 border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 accent-indigo-600"
                  />
                  <Radio size={16} className="text-indigo-600" />
                  <span className="text-sm font-medium text-gray-900">WIB</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.productTypes.sbc}
                    onChange={() => handleProductToggle('sbc')}
                    className="w-4 h-4 text-pink-600 bg-pink-100 border-pink-300 rounded focus:ring-2 focus:ring-pink-500 accent-pink-600"
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
                  <input
                    type="checkbox"
                    checked={filters.installStatus.installed}
                    onChange={() => handleStatusToggle('installed')}
                    className="w-4 h-4 text-green-600 bg-green-100 border-green-300 rounded focus:ring-2 focus:ring-green-500 accent-green-600"
                  />
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Installed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.installStatus.today}
                    onChange={() => handleStatusToggle('today')}
                    className="w-4 h-4 text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-2 focus:ring-blue-500 accent-blue-600"
                  />
                  <Clock size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Today</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.installStatus.pending}
                    onChange={() => handleStatusToggle('pending')}
                    className="w-4 h-4 text-yellow-600 bg-yellow-100 border-yellow-300 rounded focus:ring-2 focus:ring-yellow-500 accent-yellow-600"
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
                      onChange={(e) => setPresetName(e.target.value)}
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
