import { useState, useEffect, useRef } from 'react'
import { Target, TrendingUp, Settings, Trophy, Flame, Layers, DollarSign, Wifi, Smartphone, Tv, Phone, Headphones, Radio, ChevronRight, AlertCircle } from 'lucide-react'
import { useGoalProgress, useGoalHistory } from '../hooks/useGoals'
import { useOptionalDashboardDataContext } from '../contexts/DashboardDataContext'

// Status colors
const STATUS_COLORS = {
  green: {
    bg: 'rgba(16, 185, 129, 0.2)',
    border: 'rgba(16, 185, 129, 0.4)',
    bar: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
    text: 'text-emerald-400',
    glow: 'rgba(16, 185, 129, 0.3)'
  },
  yellow: {
    bg: 'rgba(245, 158, 11, 0.2)',
    border: 'rgba(245, 158, 11, 0.4)',
    bar: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
    text: 'text-amber-400',
    glow: 'rgba(245, 158, 11, 0.3)'
  },
  red: {
    bg: 'rgba(239, 68, 68, 0.2)',
    border: 'rgba(239, 68, 68, 0.4)',
    bar: 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
    text: 'text-red-400',
    glow: 'rgba(239, 68, 68, 0.3)'
  }
}

// Metric icons - PSU = Primary Service Unit (Internet + Voice + Mobile + TV + SBC)
const METRIC_ICONS = {
  psu: Layers,
  revenue: DollarSign,
  internet: Wifi,
  mobile: Smartphone,
  tv: Tv,
  voice: Phone,
  sbc: Headphones,
  wib: Radio
}

// Metric labels
const METRIC_LABELS = {
  psu: 'PSU',
  revenue: 'Revenue',
  internet: 'Internet',
  mobile: 'Mobile',
  tv: 'TV',
  voice: 'Voice',
  sbc: 'SBC',
  wib: 'WIB'
}

function ProgressBar({ metric, data, showPace = true }) {
  const Icon = METRIC_ICONS[metric]
  const label = METRIC_LABELS[metric]
  const colors = STATUS_COLORS[data.status]
  const targetWidth = Math.min(data.percentage, 100)

  // Track previous value to detect actual data changes
  const prevPercentageRef = useRef(data.percentage)
  const hasInitializedRef = useRef(false)

  // Initialize with actual value (no animation on cached render)
  // Only animate from 0 on true first load, or when value changes
  const [animatedWidth, setAnimatedWidth] = useState(() => {
    // Start at target value to avoid animation on cached data
    return targetWidth
  })

  useEffect(() => {
    const prevPercentage = prevPercentageRef.current
    const valueChanged = Math.abs(prevPercentage - data.percentage) > 0.1

    if (!hasInitializedRef.current) {
      // First render - set immediately without animation
      hasInitializedRef.current = true
      setAnimatedWidth(targetWidth)
    } else if (valueChanged) {
      // Data actually changed from backend - animate the change
      const timer = setTimeout(() => {
        setAnimatedWidth(targetWidth)
      }, 100)
      prevPercentageRef.current = data.percentage
      return () => clearTimeout(timer)
    }

    prevPercentageRef.current = data.percentage
  }, [data.percentage, targetWidth])
  
  const formatValue = (val) => {
    if (metric === 'revenue') {
      return '$' + val.toLocaleString()
    }
    return val.toLocaleString()
  }
  
  return (
    <div className="mb-4 last:mb-0">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded-lg"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
          >
            <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
          </div>
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span 
            className="text-lg font-bold"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            <span className={colors.text}>{formatValue(data.current)}</span>
            <span className="text-gray-500"> / {formatValue(data.target)}</span>
          </span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div 
        className="relative h-3 rounded-full overflow-hidden"
        style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div 
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${animatedWidth}%`,
            background: colors.bar,
            boxShadow: `0 0 12px ${colors.glow}`
          }}
        />
        
        {/* Percentage marker */}
        {data.percentage < 100 && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 h-full w-0.5 bg-white/30"
            style={{ 
              left: `${Math.min(data.percentage, 100)}%`,
              transition: 'left 1s ease-out'
            }}
          />
        )}
      </div>
      
      {/* Pace indicator */}
      {showPace && data.projected > 0 && (
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-gray-500">
            {data.percentage.toFixed(0)}% complete
          </span>
          <span className={`text-xs ${data.on_track ? 'text-emerald-400' : 'text-amber-400'}`}>
            {data.on_track ? (
              <>Pace: {formatValue(data.projected)} projected</>
            ) : (
              <>Behind pace ({formatValue(data.projected)} projected)</>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

function Confetti({ active }) {
  const canvasRef = useRef(null)
  
  useEffect(() => {
    if (!active || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const particles = []
    const colors = ['#10b981', '#34d399', '#fbbf24', '#3b82f6', '#8b5cf6', '#ec4899']
    
    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    
    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      })
    }
    
    let animationId
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.3 // gravity
        p.rotation += p.rotationSpeed
        
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      })
      
      // Continue animation if particles are visible
      if (particles.some(p => p.y < canvas.height + 50)) {
        animationId = requestAnimationFrame(animate)
      }
    }
    
    animate()
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [active])
  
  if (!active) return null
  
  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    />
  )
}

function GoalProgress({ onSettingsClick }) {
  // Try to use cached context if available (inside dashboard)
  const dashboardContext = useOptionalDashboardDataContext()
  const cachedGoalProgress = dashboardContext?.goalProgress
  const contextRefresh = dashboardContext?.refresh

  // Fall back to independent hook if outside dashboard context
  const { progress: hookProgress, loading: hookLoading, error: hookError, refetch: hookRefetch } = useGoalProgress()
  const { history } = useGoalHistory(6)

  // Use cached data if available, otherwise use hook data
  const progress = cachedGoalProgress || hookProgress
  const loading = cachedGoalProgress ? false : hookLoading
  const error = cachedGoalProgress ? null : hookError
  const refetch = contextRefresh ? () => contextRefresh({ goals: true }) : hookRefetch

  const [showConfetti, setShowConfetti] = useState(false)
  const [hasShownConfetti, setHasShownConfetti] = useState(false)
  
  // Trigger confetti when goal is achieved (only once per session)
  useEffect(() => {
    if (progress?.goal_achieved && !hasShownConfetti) {
      setShowConfetti(true)
      setHasShownConfetti(true)
      // Stop confetti after animation
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }, [progress?.goal_achieved, hasShownConfetti])
  
  if (loading) {
    return (
      <div 
        className="p-5 rounded-2xl animate-pulse"
        style={{
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
        }}
      >
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-white/10 rounded w-full mb-3"></div>
        <div className="h-4 bg-white/10 rounded w-2/3"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div 
        className="p-5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button 
          onClick={refetch}
          className="mt-2 text-sm text-red-300 hover:text-white underline"
        >
          Try again
        </button>
      </div>
    )
  }
  
  // If no goals set, show prompt to set goals
  if (!progress?.has_goal) {
    return (
      <div 
        className="p-5 rounded-2xl relative overflow-hidden cursor-pointer group"
        style={{
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
        }}
        onClick={onSettingsClick}
      >
        {/* Decorative gradient */}
        <div 
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(251, 191, 36, 0.8) 0%, transparent 70%)' }}
        />
        
        <div className="relative flex items-center gap-4">
          <div 
            className="p-3 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.3)'
            }}
          >
            <Target className="w-6 h-6 text-amber-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">Set Your Monthly Goal</h3>
            <p className="text-sm text-gray-400">
              Track your progress and stay motivated with custom targets
            </p>
          </div>
          
          <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    )
  }
  
  // Determine overall status colors
  const overallColors = STATUS_COLORS[progress.overall_status] || STATUS_COLORS.green
  
  // Get active metrics (ones with targets)
  const activeMetrics = ['psu', 'revenue', 'internet', 'mobile', 'tv', 'voice', 'sbc', 'wib'].filter(m => progress[m])
  
  return (
    <div 
      className="p-5 rounded-2xl relative overflow-hidden"
      style={{
        background: progress.goal_achieved 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(34, 197, 94, 0.1) 50%, rgba(16, 185, 129, 0.15) 100%)'
          : 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)',
        border: progress.goal_achieved 
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : '1px solid rgba(251, 191, 36, 0.2)',
      }}
    >
      {/* Confetti overlay */}
      <Confetti active={showConfetti} />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-xl"
            style={{
              background: progress.goal_achieved 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(34, 197, 94, 0.3) 100%)'
                : 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
              boxShadow: `0 4px 12px ${progress.goal_achieved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`
            }}
          >
            {progress.goal_achieved ? (
              <Trophy className="w-5 h-5 text-emerald-400" />
            ) : (
              <Target className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {progress.goal_achieved ? 'Goal Achieved!' : 'Monthly Goals'}
            </h3>
            <p className="text-xs text-gray-400">
              {progress.period} • {progress.days_remaining} days remaining
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* History badge */}
          {history && history.months_with_goals > 0 && (
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              title="Goal achievement history"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-gray-300">
                {history.goals_achieved}/{history.months_with_goals}
              </span>
            </div>
          )}
          
          {/* Settings button */}
          <button
            onClick={onSettingsClick}
            className="flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            title="Goal Settings"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
      
      {/* Goal achieved celebration */}
      {progress.goal_achieved && (
        <div 
          className="mb-4 p-3 rounded-xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(34, 197, 94, 0.15) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xl">🎉</span>
            <span className="text-lg font-bold text-emerald-300">Congratulations!</span>
            <span className="text-xl">🎉</span>
          </div>
          <p className="text-sm text-emerald-200/80">
            You've hit all your targets for {progress.period}!
          </p>
        </div>
      )}
      
      {/* Progress bars */}
      <div className="space-y-1">
        {activeMetrics.map(metric => (
          <ProgressBar 
            key={metric}
            metric={metric}
            data={progress[metric]}
          />
        ))}
      </div>
      
      {/* Overall pace summary */}
      {!progress.goal_achieved && activeMetrics.length > 1 && (
        <div 
          className="mt-4 pt-4 border-t flex items-center justify-between"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 ${overallColors.text}`} />
            <span className="text-sm text-gray-400">Overall Status:</span>
          </div>
          <span className={`text-sm font-semibold ${overallColors.text}`}>
            {progress.overall_status === 'green' && 'On Track'}
            {progress.overall_status === 'yellow' && 'Slightly Behind'}
            {progress.overall_status === 'red' && 'Needs Attention'}
          </span>
        </div>
      )}
    </div>
  )
}

export default GoalProgress

