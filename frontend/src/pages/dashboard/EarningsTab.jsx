import { useState, lazy, Suspense } from 'react'
import EarningsCard from '../../components/EarningsCard'
import GoalProgress from '../../components/GoalProgress'
import { useDashboardDataCached } from '../../hooks/useDashboardDataCached'

// Lazy load modals
const GoalSettingsModal = lazy(() => import('../../components/GoalSettingsModal'))

function EarningsTab() {
  const [isGoalSettingsModalOpen, setIsGoalSettingsModalOpen] = useState(false)

  const { refresh } = useDashboardDataCached({})

  const handleGoalSave = async () => {
    await refresh({ goals: true })
  }

  return (
    <div className="px-3 pt-3">
      <div className="max-w-7xl mx-auto">
        {/* Earnings & Goals Section */}
        <section>
          <div className="grid grid-cols-1 gap-4">
            <EarningsCard />
            <GoalProgress onSettingsClick={() => setIsGoalSettingsModalOpen(true)} />
          </div>
        </section>

        {/* Goal Settings Modal */}
        <Suspense fallback={null}>
          <GoalSettingsModal
            isOpen={isGoalSettingsModalOpen}
            onClose={() => setIsGoalSettingsModalOpen(false)}
            onSave={handleGoalSave}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default EarningsTab
