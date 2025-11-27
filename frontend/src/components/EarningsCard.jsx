import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Settings, Wifi, Smartphone, Phone, Tv, Radio, Package, ChevronRight, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { commissionService } from '../services/commissionService'

function EarningsCard() {
  const navigate = useNavigate()
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchEarnings = async () => {
    try {
      setRefreshing(true)
      const data = await commissionService.getEarnings()
      setEarnings(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch earnings:', err)
      setError('Failed to load earnings')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchEarnings()
  }, [])

  const formatCurrency = (val) => {
    if (val === 0) return '$0'
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const formatPercent = (val) => {
    const sign = val > 0 ? '+' : ''
    return sign + val.toFixed(1) + '%'
  }

  // Product icon mapping
  const getProductIcon = (product) => {
    const icons = {
      'Internet': Wifi,
      'Mobile': Smartphone,
      'Voice': Phone,
      'Video': Tv,
      'WIB': Radio,
      'Gig Internet': Wifi,
      'SBC Seats': Package,
      'MRR': DollarSign
    }
    return icons[product] || Package
  }

  // Product color mapping
  const getProductColor = (product) => {
    const colors = {
      'Internet': 'from-blue-500 to-cyan-400',
      'Mobile': 'from-indigo-500 to-purple-400',
      'Voice': 'from-orange-500 to-amber-400',
      'Video': 'from-purple-500 to-pink-400',
      'WIB': 'from-green-500 to-emerald-400',
      'Gig Internet': 'from-cyan-500 to-blue-400',
      'SBC Seats': 'from-pink-500 to-rose-400',
      'MRR': 'from-amber-500 to-yellow-400'
    }
    return colors[product] || 'from-gray-500 to-gray-400'
  }

  if (loading) {
    return (
      <div 
        className="p-6 rounded-2xl animate-pulse"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}
      >
        <div className="h-8 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="h-16 bg-white/10 rounded w-2/3 mb-4"></div>
        <div className="h-4 bg-white/10 rounded w-1/2"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className="p-6 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <p className="text-red-400">{error}</p>
        <button 
          onClick={fetchEarnings}
          className="mt-2 text-sm text-red-300 hover:text-white underline"
        >
          Try again
        </button>
      </div>
    )
  }

  const isPositiveChange = earnings.month_over_month_change >= 0

  return (
    <div 
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(16, 185, 129, 0.1) 30%, rgba(59, 130, 246, 0.1) 70%, rgba(37, 99, 235, 0.15) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 60px rgba(16, 185, 129, 0.05)'
      }}
    >
      {/* Decorative gradient orb */}
      <div 
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.6) 0%, transparent 70%)' }}
      />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.3) 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Estimated Earnings</h3>
              <p className="text-sm text-gray-400">{earnings.period}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchEarnings}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/commission-settings')}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Commission Settings"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Main Commission Amount */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3 mb-2">
            <span 
              className="text-5xl font-bold tracking-tight"
              style={{
                fontFamily: "'Space Mono', monospace",
                background: 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 60px rgba(16, 185, 129, 0.3)'
              }}
            >
              {formatCurrency(earnings.total_commission)}
            </span>
            
            {/* Month over month indicator */}
            <div 
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${
                isPositiveChange 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {isPositiveChange ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{formatPercent(earnings.month_over_month_percent)}</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-400">
            {isPositiveChange ? '+' : ''}{formatCurrency(earnings.month_over_month_change)} vs last month
            <span className="mx-2">•</span>
            <span className="text-emerald-400">{earnings.eligible_orders}</span> eligible orders
            <span className="mx-2">•</span>
            Tier: <span className="text-cyan-400">{earnings.current_tier}</span>
          </p>
        </div>

        {/* Breakdown by Product */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Breakdown by Product
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {earnings.breakdown
              .filter(item => item.payout > 0)
              .slice(0, 8)
              .map((item, index) => {
                const Icon = getProductIcon(item.product)
                const gradientColor = getProductColor(item.product)
                return (
                  <div 
                    key={index}
                    className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1 rounded-md bg-gradient-to-br ${gradientColor} opacity-80`}>
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs text-gray-400 truncate">{item.product}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span 
                        className="text-lg font-bold text-white"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        {formatCurrency(item.payout)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ×{item.count}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Additional Payouts Row */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
          {earnings.mrr_payout > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs text-amber-400">MRR</span>
              <span className="text-sm font-bold text-amber-300" style={{ fontFamily: "'Space Mono', monospace" }}>
                {formatCurrency(earnings.mrr_payout)}
              </span>
            </div>
          )}
          
          {earnings.alacarte_total > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-xs text-cyan-400">A-La-Carte</span>
              <span className="text-sm font-bold text-cyan-300" style={{ fontFamily: "'Space Mono', monospace" }}>
                {formatCurrency(earnings.alacarte_total)}
              </span>
            </div>
          )}
          
          {earnings.ramp_amount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <span className="text-xs text-purple-400">Ramp</span>
              <span className="text-sm font-bold text-purple-300" style={{ fontFamily: "'Space Mono', monospace" }}>
                {formatCurrency(earnings.ramp_amount)}
              </span>
            </div>
          )}
          
          {earnings.sae_bonus > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs text-emerald-400">Sr. Bonus</span>
              <span className="text-sm font-bold text-emerald-300" style={{ fontFamily: "'Space Mono', monospace" }}>
                {formatCurrency(earnings.sae_bonus)}
              </span>
            </div>
          )}
          
          {earnings.sae_eligible && !earnings.sae_bonus && (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs text-emerald-400">✓ Sr. Bonus Eligible</span>
            </div>
          )}
          
          {/* Configure link */}
          <button
            onClick={() => navigate('/commission-settings')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white ml-auto"
          >
            <span className="text-xs">Configure</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default EarningsCard

