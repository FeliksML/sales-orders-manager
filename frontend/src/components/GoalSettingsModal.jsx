import { useState, useEffect } from 'react'
import { X, Target, Layers, DollarSign, Wifi, Smartphone, Tv, Phone, Headphones, Radio, Save, RotateCcw, Zap, TrendingUp, Award } from 'lucide-react'
import { useGoal } from '../hooks/useGoals'

// Preset configurations
// PSU = Primary Service Unit (1 per product category: Internet, Voice, Mobile, TV, SBC)
const PRESETS = [
  { 
    name: 'Conservative',
    icon: '🎯',
    description: 'Achievable baseline',
    psu: 30,
    internet: 12,
    mobile: 8,
    tv: 5,
    voice: 8,
    sbc: 3,
    wib: 2,
    revenue: 3000
  },
  { 
    name: 'Standard',
    icon: '⚡',
    description: 'Solid performance',
    psu: 50,
    internet: 20,
    mobile: 15,
    tv: 10,
    voice: 15,
    sbc: 5,
    wib: 4,
    revenue: 5000
  },
  { 
    name: 'Aggressive',
    icon: '🚀',
    description: 'Top performer',
    psu: 80,
    internet: 35,
    mobile: 25,
    tv: 18,
    voice: 25,
    sbc: 10,
    wib: 8,
    revenue: 8000
  }
]

function GoalSettingsModal({ isOpen, onClose, onSave }) {
  const { goal, loading, updateGoal, clearGoal } = useGoal()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Form state
  const [formData, setFormData] = useState({
    target_psu: '',
    target_revenue: '',
    target_internet: '',
    target_mobile: '',
    target_tv: '',
    target_voice: '',
    target_sbc: '',
    target_wib: ''
  })
  
  // Initialize form when goal loads
  useEffect(() => {
    if (goal) {
      setFormData({
        target_psu: goal.target_psu || '',
        target_revenue: goal.target_revenue || '',
        target_internet: goal.target_internet || '',
        target_mobile: goal.target_mobile || '',
        target_tv: goal.target_tv || '',
        target_voice: goal.target_voice || '',
        target_sbc: goal.target_sbc || '',
        target_wib: goal.target_wib || ''
      })
    }
  }, [goal])
  
  const handleChange = (field, value) => {
    // Allow empty string or valid positive numbers
    if (value === '' || (Number(value) >= 0 && !isNaN(Number(value)))) {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }
  
  const handlePreset = (preset) => {
    setFormData({
      target_psu: preset.psu,
      target_revenue: preset.revenue,
      target_internet: preset.internet,
      target_mobile: preset.mobile,
      target_tv: preset.tv,
      target_voice: preset.voice,
      target_sbc: preset.sbc,
      target_wib: preset.wib
    })
    setMessage({ type: 'info', text: `Applied "${preset.name}" preset` })
    setTimeout(() => setMessage({ type: '', text: '' }), 2000)
  }
  
  const handleSave = async () => {
    setSaving(true)
    try {
      // Convert to numbers, treating empty strings as null
      const goalData = {
        target_psu: formData.target_psu === '' ? null : Number(formData.target_psu),
        target_revenue: formData.target_revenue === '' ? null : Number(formData.target_revenue),
        target_internet: formData.target_internet === '' ? null : Number(formData.target_internet),
        target_mobile: formData.target_mobile === '' ? null : Number(formData.target_mobile),
        target_tv: formData.target_tv === '' ? null : Number(formData.target_tv),
        target_voice: formData.target_voice === '' ? null : Number(formData.target_voice),
        target_sbc: formData.target_sbc === '' ? null : Number(formData.target_sbc),
        target_wib: formData.target_wib === '' ? null : Number(formData.target_wib)
      }
      
      await updateGoal(goalData)
      setMessage({ type: 'success', text: 'Goals saved successfully!' })
      
      // Notify parent and close after brief delay
      setTimeout(() => {
        onSave && onSave()
        onClose()
      }, 1000)
    } catch (err) {
      console.error('Failed to save goals:', err)
      setMessage({ type: 'error', text: 'Failed to save goals' })
    } finally {
      setSaving(false)
    }
  }
  
  const handleClear = async () => {
    if (!confirm('Clear all goal targets? This will remove your current goals.')) return
    
    setSaving(true)
    try {
      await clearGoal()
      setFormData({
        target_psu: '',
        target_revenue: '',
        target_internet: '',
        target_mobile: '',
        target_tv: '',
        target_voice: '',
        target_sbc: '',
        target_wib: ''
      })
      setMessage({ type: 'success', text: 'Goals cleared' })
      setTimeout(() => setMessage({ type: '', text: '' }), 2000)
    } catch (err) {
      console.error('Failed to clear goals:', err)
      setMessage({ type: 'error', text: 'Failed to clear goals' })
    } finally {
      setSaving(false)
    }
  }
  
  // Check if any targets are set
  const hasTargets = Object.values(formData).some(v => v !== '' && v !== null)
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(251, 191, 36, 0.1)'
        }}
      >
        {/* Header - Fixed */}
        <div 
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
            borderBottom: '1px solid rgba(251, 191, 36, 0.1)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
              }}
            >
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Monthly Goals</h2>
              <p className="text-xs text-gray-400">Set targets for {goal?.month}/{goal?.year}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {/* Message */}
          {message.text && (
            <div 
              className={`mb-4 p-3 rounded-xl text-sm ${
                message.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' :
                message.type === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-300' :
                'bg-blue-500/20 border border-blue-500/30 text-blue-300'
              }`}
            >
              {message.text}
            </div>
          )}
          
          {/* Presets */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  className="p-3 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-sm font-medium text-white">{preset.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom Targets */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-400">
              Custom Targets
            </label>
            
            {/* PSU */}
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                  border: '1px solid rgba(168, 85, 247, 0.3)'
                }}
              >
                <Layers className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-1">
                  Total PSU
                  <span className="ml-1 text-xs text-gray-500">(Internet + Voice + Mobile + TV + SBC)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.target_psu}
                  onChange={(e) => handleChange('target_psu', e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />
              </div>
            </div>
            
            {/* Internet */}
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                <Wifi className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-1">Internet Units</label>
                <input
                  type="number"
                  min="0"
                  value={formData.target_internet}
                  onChange={(e) => handleChange('target_internet', e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />
              </div>
            </div>
            
            {/* Mobile */}
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}
              >
                <Smartphone className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-1">Mobile Lines</label>
                <input
                  type="number"
                  min="0"
                  value={formData.target_mobile}
                  onChange={(e) => handleChange('target_mobile', e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />
              </div>
            </div>
            
            {/* TV */}
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(219, 39, 119, 0.2) 100%)',
                  border: '1px solid rgba(236, 72, 153, 0.3)'
                }}
              >
                <Tv className="w-5 h-5 text-pink-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-1">TV Units</label>
                <input
                  type="number"
                  min="0"
                  value={formData.target_tv}
                  onChange={(e) => handleChange('target_tv', e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />
              </div>
            </div>
            
            {/* Voice */}
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(2, 132, 199, 0.2) 100%)',
                  border: '1px solid rgba(14, 165, 233, 0.3)'
                }}
              >
                <Phone className="w-5 h-5 text-sky-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-1">Voice Lines</label>
                <input
                  type="number"
                  min="0"
                  value={formData.target_voice}
                  onChange={(e) => handleChange('target_voice', e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />
              </div>
            </div>
            
            {/* SBC */}
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(234, 88, 12, 0.2) 100%)',
                  border: '1px solid rgba(251, 146, 60, 0.3)'
                }}
              >
                <Headphones className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-1">SBC Seats</label>
                <input
                  type="number"
                  min="0"
                  value={formData.target_sbc}
                  onChange={(e) => handleChange('target_sbc', e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />
              </div>
            </div>
            
            {/* WIB */}
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%)',
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}
              >
                <Radio className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-1">WIB Units</label>
                <input
                  type="number"
                  min="0"
                  value={formData.target_wib}
                  onChange={(e) => handleChange('target_wib', e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />
              </div>
            </div>
            
            {/* Revenue */}
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-300 mb-1">MRR Revenue ($)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.target_revenue}
                  onChange={(e) => handleChange('target_revenue', e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                />
              </div>
            </div>
          </div>
          
          {/* Tip */}
          <div 
            className="mt-5 p-3 rounded-xl flex items-start gap-2"
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
          >
            <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200/80">
              <span className="font-semibold text-blue-300">Tip:</span> Leave fields empty to skip tracking them. 
              Only metrics with targets will show on your dashboard.
            </p>
          </div>
        </div>
        
        {/* Footer - Fixed */}
        <div 
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          {hasTargets ? (
            <button
              onClick={handleClear}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Clear All
            </button>
          ) : (
            <div />
          )}
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.8) 0%, rgba(245, 158, 11, 0.8) 100%)',
                boxShadow: '0 4px 16px rgba(251, 191, 36, 0.3)'
              }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Goals'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GoalSettingsModal

