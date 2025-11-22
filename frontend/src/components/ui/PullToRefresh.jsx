import { useState, useEffect, useRef } from 'react'
import { RotateCw } from 'lucide-react'

function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const containerRef = useRef(null)

  const PULL_THRESHOLD = 80 // Distance to trigger refresh
  const MAX_PULL = 120 // Maximum pull distance

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let startY = 0
    let currentY = 0
    let isDragging = false

    const handleTouchStart = (e) => {
      // Only allow pull-to-refresh when scrolled to top
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY
        setTouchStart(startY)
        isDragging = true
      }
    }

    const handleTouchMove = (e) => {
      if (!isDragging || isRefreshing) return

      currentY = e.touches[0].clientY
      const distance = currentY - startY

      // Only pull down (positive distance) and when at top
      if (distance > 0 && window.scrollY === 0) {
        e.preventDefault()
        // Apply resistance to the pull
        const dampedDistance = Math.min(distance * 0.5, MAX_PULL)
        setPullDistance(dampedDistance)
      }
    }

    const handleTouchEnd = async () => {
      if (!isDragging) return
      isDragging = false

      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } catch (error) {
          console.error('Refresh error:', error)
        } finally {
          setIsRefreshing(false)
        }
      }

      setPullDistance(0)
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullDistance, isRefreshing, onRefresh])

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1)
  const shouldTrigger = pullDistance >= PULL_THRESHOLD

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute left-0 right-0 top-0 flex items-center justify-center transition-all duration-200"
          style={{
            transform: `translateY(-${60 - pullDistance}px)`,
            opacity: pullProgress
          }}
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg">
            <RotateCw
              size={20}
              className={`${
                isRefreshing ? 'animate-spin' : shouldTrigger ? 'rotate-180' : ''
              } transition-transform duration-200`}
              style={{
                transform: isRefreshing ? '' : `rotate(${pullProgress * 180}deg)`
              }}
            />
            <span className="text-sm font-medium">
              {isRefreshing ? 'Refreshing...' : shouldTrigger ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Content with transform */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${isRefreshing ? 60 : pullDistance * 0.5}px)`
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default PullToRefresh
