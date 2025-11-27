import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Save, RotateCcw, DollarSign, User, Calendar, 
  Wifi, Smartphone, Phone, Tv, Radio, Package, Edit2, Check, X,
  AlertCircle, Info, Receipt, Landmark, Building2, Shield, Heart
} from 'lucide-react'
import { commissionService } from '../services/commissionService'
import { US_STATES, FEDERAL_TAX_BRACKETS, FIXED_TAX_RATES, formatTaxRate } from '../utils/stateTaxRates'

function CommissionSettings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Settings state
  const [settings, setSettings] = useState({
    ae_type: 'Account Executive',
    is_new_hire: false,
    new_hire_month: 1,
    federal_bracket: 0.22,
    state_code: 'CA',
    state_tax_rate: 0.093
  })
  
  // Auto totals state
  const [autoTotals, setAutoTotals] = useState(null)
  
  // Rate tables
  const [rates, setRates] = useState(null)
  
  // Editing overrides
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [settingsData, totalsData, ratesData] = await Promise.all([
        commissionService.getSettings(),
        commissionService.getAutoTotals(),
        commissionService.getRates()
      ])
      
      setSettings({
        ae_type: settingsData.ae_type || 'Account Executive',
        is_new_hire: settingsData.is_new_hire || false,
        new_hire_month: settingsData.new_hire_month || 1,
        federal_bracket: settingsData.federal_bracket ?? 0.22,
        state_code: settingsData.state_code || 'CA',
        state_tax_rate: settingsData.state_tax_rate ?? 0.093
      })
      
      setAutoTotals(totalsData)
      setRates(ratesData)
    } catch (error) {
      console.error('Failed to load commission settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      await commissionService.updateSettings({
        ae_type: settings.ae_type,
        is_new_hire: settings.is_new_hire,
        new_hire_month: settings.is_new_hire ? settings.new_hire_month : null,
        federal_bracket: settings.federal_bracket,
        state_code: settings.state_code,
        state_tax_rate: settings.state_tax_rate
      })
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  // Handle state selection change
  const handleStateChange = (stateCode) => {
    const selectedState = US_STATES.find(s => s.code === stateCode)
    setSettings({
      ...settings,
      state_code: stateCode,
      state_tax_rate: selectedState?.rate || 0
    })
  }

  // Calculate effective tax rate
  const calculateEffectiveTaxRate = () => {
    return settings.federal_bracket + 
           settings.state_tax_rate + 
           FIXED_TAX_RATES.socialSecurity + 
           FIXED_TAX_RATES.medicare
  }

  const handleStartEdit = (field, currentValue) => {
    setEditingField(field)
    setEditValue(currentValue.toString())
  }

  const handleSaveOverride = async (field) => {
    try {
      const numValue = parseFloat(editValue) || 0
      await commissionService.updateOverrides({ [field]: numValue })
      
      // Refresh totals
      const totalsData = await commissionService.getAutoTotals()
      setAutoTotals(totalsData)
      
      setEditingField(null)
      setEditValue('')
      setMessage({ type: 'success', text: 'Override saved' })
      setTimeout(() => setMessage({ type: '', text: '' }), 2000)
    } catch (error) {
      console.error('Failed to save override:', error)
      setMessage({ type: 'error', text: 'Failed to save override' })
    }
  }

  const handleClearOverride = async (field) => {
    try {
      await commissionService.updateOverrides({ [field]: null })
      
      // Refresh totals
      const totalsData = await commissionService.getAutoTotals()
      setAutoTotals(totalsData)
      
      setMessage({ type: 'success', text: 'Override cleared' })
      setTimeout(() => setMessage({ type: '', text: '' }), 2000)
    } catch (error) {
      console.error('Failed to clear override:', error)
    }
  }

  const handleClearAllOverrides = async () => {
    try {
      await commissionService.clearOverrides()
      
      // Refresh totals
      const totalsData = await commissionService.getAutoTotals()
      setAutoTotals(totalsData)
      
      setMessage({ type: 'success', text: 'All overrides cleared' })
      setTimeout(() => setMessage({ type: '', text: '' }), 2000)
    } catch (error) {
      console.error('Failed to clear overrides:', error)
    }
  }

  const formatCurrency = (val) => '$' + val.toLocaleString()

  const productFields = [
    { key: 'internet', label: 'Internet', icon: Wifi, color: 'blue' },
    { key: 'mobile', label: 'Mobile', icon: Smartphone, color: 'indigo' },
    { key: 'voice', label: 'Voice', icon: Phone, color: 'orange' },
    { key: 'video', label: 'Video/TV', icon: Tv, color: 'purple' },
    { key: 'wib', label: 'WIB', icon: Radio, color: 'green' },
    { key: 'gig_internet', label: 'Gig Internet', icon: Wifi, color: 'cyan' },
    { key: 'sbc', label: 'SBC Seats', icon: Package, color: 'pink' },
    { key: 'mrr', label: 'MRR ($)', icon: DollarSign, color: 'amber', isMoney: true }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(142deg, #1e40af, #0d4f8b 30%, #067a5b 70%, #059669)'
      }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen p-4 sm:p-8"
      style={{
        background: `
          radial-gradient(circle at 25% 25%, rgba(30, 58, 138, 0.3), transparent 25%),
          radial-gradient(circle at 75% 75%, rgba(20, 125, 190, 0.2), transparent 30%),
          radial-gradient(circle at 75% 25%, rgba(5, 150, 105, 0.2), transparent 25%),
          radial-gradient(circle at 25% 75%, rgba(5, 150, 105, 0.18), transparent 30%),
          linear-gradient(142deg, #1e40af, #0d4f8b 30%, #067a5b 70%, #059669)
        `
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Commission Settings</h1>
            <p className="text-gray-300 text-sm">Configure your commission calculation preferences</p>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === 'success' 
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' 
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* AE Settings Card */}
        <div 
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: 'rgba(0, 15, 33, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 200, 255, 0.2)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">AE Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AE Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                AE Type
              </label>
              <select
                value={settings.ae_type}
                onChange={(e) => setSettings({ ...settings, ae_type: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="Account Executive">Account Executive</option>
                <option value="Sr Account Executive">Sr Account Executive</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Sr. AE gets 15% bonus with 12+ Internet or 12+ Lines
              </p>
            </div>

            {/* New Hire Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Hire Status
              </label>
              <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.is_new_hire}
                    onChange={(e) => setSettings({ ...settings, is_new_hire: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
                <span className="text-gray-300">{settings.is_new_hire ? 'Yes' : 'No'}</span>
              </div>
            </div>

            {/* Month on Ramp */}
            {settings.is_new_hire && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Month on Ramp
                </label>
                <select
                  value={settings.new_hire_month}
                  onChange={(e) => setSettings({ ...settings, new_hire_month: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {[1, 2, 3, 4, 5, 6].map(m => (
                    <option key={m} value={m}>Month {m} - ${rates?.ramp_table[m] || 0} ramp</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Tax Settings Card */}
        <div 
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: 'rgba(0, 15, 33, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-rose-500/20">
              <Receipt className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Tax Settings</h2>
              <p className="text-sm text-gray-400">Configure estimated tax deductions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Federal Tax Bracket */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-rose-400" />
                  Federal Tax Bracket
                </div>
              </label>
              <select
                value={settings.federal_bracket}
                onChange={(e) => setSettings({ ...settings, federal_bracket: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-rose-500 transition-colors"
              >
                {FEDERAL_TAX_BRACKETS.map(bracket => (
                  <option key={bracket.rate} value={bracket.rate}>
                    {bracket.label} Federal
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select your marginal federal tax bracket
              </p>
            </div>

            {/* State Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-400" />
                  State
                </div>
              </label>
              <select
                value={settings.state_code}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500 transition-colors"
              >
                {US_STATES.map(state => (
                  <option key={state.code} value={state.code}>
                    {state.name} ({state.rate === 0 ? 'No tax' : formatTaxRate(state.rate)})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                State income tax: {formatTaxRate(settings.state_tax_rate)}
              </p>
            </div>
          </div>

          {/* Fixed Taxes Info */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-gray-400">Social Security</span>
              </div>
              <span className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Mono', monospace" }}>
                6.2%
              </span>
              <p className="text-xs text-gray-500 mt-1">Fixed rate (2024)</p>
            </div>
            
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-pink-400" />
                <span className="text-sm text-gray-400">Medicare</span>
              </div>
              <span className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Mono', monospace" }}>
                1.45%
              </span>
              <p className="text-xs text-gray-500 mt-1">Fixed rate (2024)</p>
            </div>
          </div>

          {/* Effective Tax Rate Summary */}
          <div 
            className="mt-6 p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(251, 146, 60, 0.1) 100%)',
              border: '1px solid rgba(244, 63, 94, 0.2)'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-400">Total Effective Tax Rate</span>
                <p className="text-xs text-gray-500 mt-1">
                  Federal ({formatTaxRate(settings.federal_bracket)}) + 
                  State ({formatTaxRate(settings.state_tax_rate)}) + 
                  SS (6.2%) + 
                  Medicare (1.45%)
                </p>
              </div>
              <span 
                className="text-3xl font-bold text-rose-400"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {formatTaxRate(calculateEffectiveTaxRate())}
              </span>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 text-white font-medium hover:from-rose-700 hover:to-orange-600 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Tax Settings'}
          </button>
        </div>

        {/* Auto-Calculated Totals Card */}
        <div 
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: 'rgba(0, 15, 33, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Calendar className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Monthly Totals</h2>
                <p className="text-sm text-gray-400">Auto-calculated from your orders (edit if needed)</p>
              </div>
            </div>
            
            {autoTotals && Object.values(autoTotals.overrides).some(v => v) && (
              <button
                onClick={handleClearAllOverrides}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset All
              </button>
            )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200">
                <p className="font-medium mb-1">Auto-Aggregation</p>
                <p className="text-amber-300/80">
                  Values are automatically calculated from orders created this month with install date before the 28th.
                  Click the edit icon to override any value you feel is incorrect.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {autoTotals && productFields.map(({ key, label, icon: Icon, color, isMoney }) => {
              const autoValue = autoTotals[`auto_${key}`]
              const effectiveValue = autoTotals[key]
              const isOverridden = autoTotals.overrides[key]
              const isEditing = editingField === key
              
              return (
                <div 
                  key={key}
                  className={`p-4 rounded-xl transition-all ${
                    isOverridden 
                      ? 'bg-amber-500/10 border border-amber-500/30' 
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 text-${color}-400`} />
                      <span className="text-sm text-gray-400">{label}</span>
                    </div>
                    
                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(key, effectiveValue)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        <Edit2 className="w-3 h-3 text-gray-500 hover:text-white" />
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-lg font-bold focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveOverride(key)}
                        className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                      </button>
                      <button
                        onClick={() => { setEditingField(null); setEditValue(''); }}
                        className="p-1 rounded bg-red-500/20 hover:bg-red-500/30"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span 
                        className="text-2xl font-bold text-white"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        {isMoney ? formatCurrency(effectiveValue) : effectiveValue}
                      </span>
                      
                      {isOverridden && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-amber-400">
                            Auto: {isMoney ? formatCurrency(autoValue) : autoValue}
                          </span>
                          <button
                            onClick={() => handleClearOverride(key)}
                            className="text-xs text-amber-400 hover:text-amber-300 underline"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Rate Table Card */}
        <div 
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'rgba(0, 15, 33, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 200, 255, 0.2)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <DollarSign className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Rate Table</h2>
          </div>

          {rates && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Internet #</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">HSD</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Mobile</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Voice</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">Video</th>
                    <th className="text-center py-3 px-2 text-gray-400 font-medium">MRR %</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.is_new_hire ? rates.new_hire_rates : rates.regular_rates).map((tier, i) => {
                    const tierLabel = tier.max_internet 
                      ? `${tier.min_internet}-${tier.max_internet}` 
                      : `${tier.min_internet}+`
                    
                    // Highlight current tier
                    const internetCount = autoTotals?.internet || 0
                    const maxVal = tier.max_internet || Infinity
                    const isCurrentTier = internetCount >= tier.min_internet && internetCount <= maxVal
                    
                    return (
                      <tr 
                        key={i} 
                        className={`border-b border-white/5 ${
                          isCurrentTier ? 'bg-cyan-500/10' : ''
                        }`}
                      >
                        <td className={`py-3 px-2 font-medium ${isCurrentTier ? 'text-cyan-400' : 'text-gray-300'}`}>
                          {tierLabel}
                        </td>
                        <td className={`text-center py-3 px-2 ${isCurrentTier ? 'text-cyan-400' : 'text-gray-400'}`} style={{ fontFamily: "'Space Mono', monospace" }}>
                          ${tier.internet_rate}
                        </td>
                        <td className={`text-center py-3 px-2 ${isCurrentTier ? 'text-cyan-400' : 'text-gray-400'}`} style={{ fontFamily: "'Space Mono', monospace" }}>
                          ${tier.mobile_rate}
                        </td>
                        <td className={`text-center py-3 px-2 ${isCurrentTier ? 'text-cyan-400' : 'text-gray-400'}`} style={{ fontFamily: "'Space Mono', monospace" }}>
                          ${tier.voice_rate}
                        </td>
                        <td className={`text-center py-3 px-2 ${isCurrentTier ? 'text-cyan-400' : 'text-gray-400'}`} style={{ fontFamily: "'Space Mono', monospace" }}>
                          ${tier.video_rate}
                        </td>
                        <td className={`text-center py-3 px-2 ${isCurrentTier ? 'text-cyan-400' : 'text-gray-400'}`} style={{ fontFamily: "'Space Mono', monospace" }}>
                          {(tier.mrr_rate * 100).toFixed(0)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* A-la-carte rates */}
          {rates && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-sm font-medium text-gray-400 mb-3">A-La-Carte Rates (requires 5+ Internet)</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(rates.alacarte_rates).map(([key, value]) => (
                  <div key={key} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-gray-400 text-sm">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: </span>
                    <span className="text-white font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>${value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommissionSettings

