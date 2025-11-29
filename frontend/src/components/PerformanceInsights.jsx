import { useState, useMemo, useEffect } from 'react'
import { 
  TrendingUp, TrendingDown, Minus, Trophy, Flame, Zap, 
  Package, Wifi, Smartphone, Layers, DollarSign, Tv, Phone, 
  ChevronRight, Lightbulb, Calendar, BarChart3, Award, Sparkles, Loader2,
  Smile, Scale, Skull
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { usePerformanceInsights } from '../hooks/usePerformanceInsights'
import { orderService } from '../services/orderService'
import Card from './ui/Card'
import LoadingSpinner from './ui/LoadingSpinner'

// Tone configurations
const TONE_CONFIG = {
  positive: { label: 'Positive', icon: Smile, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  realistic: { label: 'Realistic', icon: Scale, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  brutal: { label: 'Brutal', icon: Skull, color: 'text-rose-400', bg: 'bg-rose-500/20' }
}

// Metric configurations
const METRIC_CONFIG = {
  orders: { label: 'Orders', icon: Package, color: '#3b82f6', format: (v) => v.toLocaleString() },
  psu: { label: 'PSU', icon: Layers, color: '#8b5cf6', format: (v) => v.toLocaleString() },
  revenue: { label: 'Revenue', icon: DollarSign, color: '#10b981', format: (v) => '$' + v.toLocaleString() },
  internet: { label: 'Internet', icon: Wifi, color: '#06b6d4', format: (v) => v.toLocaleString() },
  mobile: { label: 'Mobile', icon: Smartphone, color: '#ec4899', format: (v) => v.toLocaleString() },
  tv: { label: 'TV', icon: Tv, color: '#f59e0b', format: (v) => v.toLocaleString() },
  voice: { label: 'Voice', icon: Phone, color: '#ef4444', format: (v) => v.toLocaleString() },
}

function ComparisonCard({ metric, current, previous, changePercent, changeAbsolute }) {
  const config = METRIC_CONFIG[metric]
  if (!config) return null
  
  const Icon = config.icon
  const isPositive = changePercent > 0
  const isNeutral = changePercent === 0
  
  const TrendIcon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown
  const trendColor = isPositive ? 'text-emerald-400' : isNeutral ? 'text-amber-400' : 'text-rose-400'
  const bgColor = isPositive ? 'rgba(16, 185, 129, 0.1)' : isNeutral ? 'rgba(245, 158, 11, 0.1)' : 'rgba(244, 63, 94, 0.1)'
  const borderColor = isPositive ? 'rgba(16, 185, 129, 0.3)' : isNeutral ? 'rgba(245, 158, 11, 0.3)' : 'rgba(244, 63, 94, 0.3)'
  
  return (
    <div
      className="p-3 xs:p-4 rounded-xl relative overflow-hidden group hover:scale-[1.02] transition-transform"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Header with icon and label */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1 xs:gap-0 mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="p-2 rounded-lg"
            style={{ 
              background: `${config.color}20`,
              border: `1px solid ${config.color}40`
            }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <span className="text-sm font-medium text-gray-400">{config.label}</span>
        </div>
        
        {/* Change badge */}
        <div
          className={`self-start xs:self-auto flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${trendColor}`}
          style={{ background: bgColor, border: `1px solid ${borderColor}` }}
        >
          <TrendIcon className="w-3 h-3" />
          <span>{isPositive ? '+' : ''}{Math.round(changePercent)}%</span>
        </div>
      </div>
      
      {/* Main value */}
      <div className="mb-2">
        <span 
          className="text-2xl xs:text-3xl font-bold text-white"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {config.format(current)}
        </span>
      </div>
      
      {/* Comparison text */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">vs</span>
        <span className="text-gray-400">{config.format(previous)}</span>
        <span className={`font-medium ${trendColor}`}>
          ({isPositive ? '+' : ''}{typeof changeAbsolute === 'number' ? 
            (metric === 'revenue' ? '$' + changeAbsolute.toLocaleString() : changeAbsolute) : changeAbsolute})
        </span>
      </div>
    </div>
  )
}

function TrendChart({ data, selectedMetric, viewMode }) {
  const config = METRIC_CONFIG[selectedMetric]
  if (!config || !data || data.length === 0) return null
  
  const chartData = data.map(point => ({
    ...point,
    value: point[selectedMetric]
  }))
  
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={config.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="period" 
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickFormatter={(value) => selectedMetric === 'revenue' ? `$${value}` : value}
          />
          <Tooltip 
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
            formatter={(value) => [config.format(value), config.label]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={config.color}
            strokeWidth={2}
            fill={`url(#gradient-${selectedMetric})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function RecordCard({ record }) {
  const config = METRIC_CONFIG[record.metric.toLowerCase()]
  const Icon = config?.icon || Trophy
  const color = config?.color || '#f59e0b'
  
  return (
    <div 
      className={`p-3 rounded-xl relative overflow-hidden ${record.is_current_period ? 'ring-2 ring-amber-400/50' : ''}`}
      style={{
        background: record.is_current_period 
          ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
        border: record.is_current_period 
          ? '1px solid rgba(251, 191, 36, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {record.is_current_period && (
        <div className="absolute top-2 right-2">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
        </div>
      )}
      
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs font-medium text-gray-400">Best {record.metric}</span>
      </div>
      
      <div className="text-xl font-bold text-white" style={{ fontFamily: "'Space Mono', monospace" }}>
        {config?.format(record.value) || record.value}
      </div>
      
      <div className="text-xs text-gray-500 mt-1">
        {record.period}
        {record.is_current_period && (
          <span className="ml-2 text-amber-400 font-medium">New Record!</span>
        )}
      </div>
    </div>
  )
}

function InsightBubble({ insight, index }) {
  const icons = [Lightbulb, Zap, TrendingUp, Award]
  const Icon = icons[index % icons.length]
  
  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }}
    >
      <div className="p-1.5 rounded-lg bg-indigo-500/20 flex-shrink-0">
        <Icon className="w-4 h-4 text-indigo-400" />
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{insight}</p>
    </div>
  )
}

function StreakBadge({ streak, type }) {
  if (streak < 2) return null
  
  const isGrowth = type === 'growth'
  
  return (
    <div 
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: isGrowth 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%)',
        border: isGrowth 
          ? '1px solid rgba(16, 185, 129, 0.3)'
          : '1px solid rgba(244, 63, 94, 0.3)'
      }}
    >
      <Flame className={`w-5 h-5 ${isGrowth ? 'text-emerald-400' : 'text-rose-400'}`} />
      <div>
        <span className={`text-lg font-bold ${isGrowth ? 'text-emerald-300' : 'text-rose-300'}`}>
          {streak}-month
        </span>
        <span className={`text-sm ml-1 ${isGrowth ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
          {type} streak
        </span>
      </div>
    </div>
  )
}

function PerformanceInsights() {
  const { insights, loading, error, refetch } = usePerformanceInsights()
  const [viewMode, setViewMode] = useState('monthly') // 'monthly' or 'weekly'
  const [selectedMetric, setSelectedMetric] = useState('orders')
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRemaining, setAiRemaining] = useState(null) // null = not loaded yet
  const [aiEnabled, setAiEnabled] = useState(true)
  const [aiError, setAiError] = useState(null)
  const [aiTone, setAiTone] = useState('positive')
  const [aiResetsAt, setAiResetsAt] = useState(null)
  const [aiMetrics, setAiMetrics] = useState(null) // Cached metrics for free tone changes
  
  // LocalStorage key for persisting AI insights
  const AI_STORAGE_KEY = 'sales_ai_insights'
  
  // Format reset time as "X hours" or "Tomorrow at midnight"
  const formatResetTime = (isoString) => {
    if (!isoString) return 'tomorrow'
    const resetDate = new Date(isoString)
    const now = new Date()
    const hoursUntil = Math.ceil((resetDate - now) / (1000 * 60 * 60))
    if (hoursUntil <= 1) return 'in about an hour'
    if (hoursUntil <= 12) return `in ${hoursUntil} hours`
    return 'at midnight'
  }
  
  // Load persisted AI insights from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AI_STORAGE_KEY)
      if (stored) {
        const { insights, tone, timestamp, metrics } = JSON.parse(stored)
        // Only restore if from today (same day)
        const storedDate = new Date(timestamp).toDateString()
        const todayDate = new Date().toDateString()
        if (storedDate === todayDate && insights?.length > 0) {
          setAiInsights(insights)
          setAiTone(tone || 'positive')
          if (metrics) setAiMetrics(metrics)
        } else {
          // Clear old data
          localStorage.removeItem(AI_STORAGE_KEY)
        }
      }
    } catch (err) {
      console.error('Failed to load persisted AI insights:', err)
    }
  }, [])
  
  // Fetch AI status on mount
  useEffect(() => {
    const fetchAIStatus = async () => {
      try {
        const status = await orderService.getAIInsightsStatus()
        setAiRemaining(status.remaining_today)
        setAiEnabled(status.ai_enabled)
        setAiResetsAt(status.resets_at)
      } catch (err) {
        console.error('Failed to fetch AI status:', err)
        setAiRemaining(3) // Default fallback
      }
    }
    fetchAIStatus()
  }, [])
  
  // Generate AI insights handler
  const handleGenerateAI = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await orderService.generateAIInsights(aiTone)
      setAiInsights(result.insights)
      setAiRemaining(result.remaining_today)
      setAiEnabled(result.ai_enabled)
      setAiResetsAt(result.resets_at)
      if (result.metrics) setAiMetrics(result.metrics)
      
      // Persist to localStorage (including metrics for free tone changes)
      localStorage.setItem(AI_STORAGE_KEY, JSON.stringify({
        insights: result.insights,
        tone: aiTone,
        timestamp: new Date().toISOString(),
        metrics: result.metrics
      }))
    } catch (err) {
      console.error('Failed to generate AI insights:', err)
      if (err.response?.status === 429) {
        setAiError(`Daily limit reached. Resets ${formatResetTime(aiResetsAt)}`)
        setAiRemaining(0)
      } else {
        setAiError('Failed to generate insights. Try again.')
      }
    } finally {
      setAiLoading(false)
    }
  }
  
  // Handle tone change - use free regeneration if metrics are cached
  const handleToneChange = async (newTone) => {
    if (newTone === aiTone) return
    setAiTone(newTone)
    
    // If we have cached metrics and insights, regenerate for free
    if (aiMetrics && aiInsights) {
      setAiLoading(true)
      setAiError(null)
      try {
        const result = await orderService.regenerateAITone(newTone, aiMetrics)
        setAiInsights(result.insights)
        setAiResetsAt(result.resets_at)
        // Note: remaining_today doesn't change (free regeneration)
        
        // Update localStorage with new tone
        localStorage.setItem(AI_STORAGE_KEY, JSON.stringify({
          insights: result.insights,
          tone: newTone,
          timestamp: new Date().toISOString(),
          metrics: aiMetrics
        }))
      } catch (err) {
        console.error('Failed to regenerate with new tone:', err)
        setAiError('Failed to change tone. Try again.')
      } finally {
        setAiLoading(false)
      }
    }
  }
  
  // Get display data based on view mode
  const trendData = useMemo(() => {
    if (!insights) return []
    return viewMode === 'monthly' ? insights.monthly_trend : insights.weekly_trend
  }, [insights, viewMode])
  
  if (loading) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner />
          <p className="text-gray-400 mt-4">Loading performance insights...</p>
        </div>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
            <TrendingDown className="w-6 h-6 text-rose-400" />
          </div>
          <p className="text-rose-400 mb-2">{error}</p>
          <button 
            onClick={refetch}
            className="text-sm text-cyan-400 hover:text-cyan-300 underline"
          >
            Try again
          </button>
        </div>
      </Card>
    )
  }
  
  if (!insights) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-white text-xl font-bold mb-2">No Performance Data Yet</h3>
          <p className="text-gray-400 max-w-sm">
            Create orders to see your performance trends and insights.
          </p>
        </div>
      </Card>
    )
  }
  
  const { month_comparison, week_comparison, records, current_streak, streak_type, insights: textInsights } = insights
  
  // Primary metrics for comparison cards
  const primaryMetrics = ['orders', 'psu', 'revenue', 'internet']
  
  return (
    <div className="space-y-6">
      {/* Header Row with Streak */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-white text-2xl font-bold">Performance Insights</h2>
          <p className="text-gray-400 text-sm mt-1">Your sales performance at a glance</p>
        </div>
        
        <StreakBadge streak={current_streak} type={streak_type} />
      </div>
      
      {/* Comparison Cards - This Month vs Last Month */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            This Month vs Last Month
          </h3>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {primaryMetrics.map((metric) => (
            <ComparisonCard
              key={metric}
              metric={metric}
              current={month_comparison.current[metric]}
              previous={month_comparison.previous[metric]}
              changePercent={month_comparison.change_percent[metric]}
              changeAbsolute={month_comparison.change_absolute[metric]}
            />
          ))}
        </div>
      </div>
      
      {/* Trend Chart */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Performance Trend
          </h3>
          
          <div className="flex items-center gap-3">
            {/* Metric Selector */}
            <div className="flex items-center gap-1 rounded-lg p-1 bg-white/5">
              {['orders', 'psu', 'revenue'].map((metric) => {
                const config = METRIC_CONFIG[metric]
                const Icon = config.icon
                return (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      selectedMetric === metric
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: selectedMetric === metric ? config.color : undefined }} />
                    <span className="hidden sm:inline">{config.label}</span>
                  </button>
                )
              })}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg p-1 bg-white/5">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'weekly'
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>
        </div>
        
        <TrendChart 
          data={trendData} 
          selectedMetric={selectedMetric}
          viewMode={viewMode}
        />
      </Card>
      
      {/* Personal Records & Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Records */}
        {records && records.length > 0 && (
          <Card>
            <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-400" />
              Personal Records
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {records.slice(0, 4).map((record, idx) => (
                <RecordCard key={idx} record={record} />
              ))}
            </div>
          </Card>
        )}
        
        {/* Smart Insights with AI Generation */}
        <Card>
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-indigo-400" />
                Insights
              </h3>
              
              {/* AI Generate Button */}
              <button
                onClick={handleGenerateAI}
                disabled={aiLoading || aiRemaining === 0 || !aiEnabled}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  aiLoading || aiRemaining === 0 || !aiEnabled
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 hover:from-violet-500/30 hover:to-fuchsia-500/30 border border-violet-500/30'
                }`}
                title={!aiEnabled ? 'AI not configured' : aiRemaining === 0 ? `Daily limit reached. Resets ${formatResetTime(aiResetsAt)}` : `Generate AI insights (${aiRemaining}/3 remaining today)`}
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {aiLoading ? 'Generating...' : aiRemaining === 0 ? `Resets ${formatResetTime(aiResetsAt)}` : 'AI Insights'}
                </span>
                <span className="text-xs opacity-70">({aiRemaining !== null ? aiRemaining : '?'}/3)</span>
              </button>
            </div>
            
            {/* Tone Selector */}
            {aiEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Tone:</span>
                <div className="flex items-center gap-1 rounded-lg p-0.5 bg-white/5">
                  {Object.entries(TONE_CONFIG).map(([tone, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={tone}
                        onClick={() => handleToneChange(tone)}
                        disabled={aiLoading}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                          aiTone === tone
                            ? `${config.bg} ${config.color}`
                            : 'text-gray-400 hover:text-gray-300'
                        } ${aiLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={aiMetrics && aiInsights ? `Switch to ${config.label} (free)` : config.label}
                      >
                        <Icon className="w-3 h-3" />
                        <span className="hidden sm:inline">{config.label}</span>
                      </button>
                    )
                  })}
                </div>
                {aiMetrics && aiInsights && (
                  <span className="text-xs text-emerald-400/70">✨ Free tone switch</span>
                )}
              </div>
            )}
          </div>
          
          {/* AI Error */}
          {aiError && (
            <div className="mb-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <p className="text-sm text-rose-400">{aiError}</p>
            </div>
          )}
          
          {/* AI Generated Insights */}
          {aiInsights && aiInsights.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3 h-3 text-violet-400" />
                <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">AI Generated</span>
              </div>
              <div className="space-y-2">
                {aiInsights.map((insight, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.1) 100%)',
                      border: '1px solid rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    <div className="p-1.5 rounded-lg bg-violet-500/20 flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Regular Insights - Only shown when no AI insights */}
          {!aiInsights && textInsights && textInsights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-3 h-3 text-indigo-400" />
                <span className="text-xs font-medium text-indigo-400/70 uppercase tracking-wider">Quick Stats</span>
              </div>
              {textInsights.slice(0, 4).map((insight, idx) => (
                <InsightBubble key={idx} insight={insight} index={idx} />
              ))}
            </div>
          )}
          
          {/* Empty state */}
          {(!textInsights || textInsights.length === 0) && !aiInsights && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-3">No insights yet. Try generating AI insights!</p>
            </div>
          )}
        </Card>
      </div>
      
      {/* Week Comparison - Secondary */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            This Week vs Last Week
          </h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {primaryMetrics.map((metric) => {
            const config = METRIC_CONFIG[metric]
            const changePercent = week_comparison.change_percent[metric]
            const isPositive = changePercent > 0
            
            return (
              <div 
                key={metric}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <config.icon className="w-4 h-4" style={{ color: config.color }} />
                  <span className="text-sm text-gray-300">
                    {week_comparison.current[metric]}
                  </span>
                </div>
                <span className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : changePercent < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                  {isPositive ? '+' : ''}{changePercent.toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

export default PerformanceInsights

