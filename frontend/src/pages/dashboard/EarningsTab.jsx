import { useState, lazy, Suspense } from 'react'
import DashboardHeader from '../../components/DashboardHeader'
import EarningsCard from '../../components/EarningsCard'
import GoalProgress from '../../components/GoalProgress'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useDashboardData } from '../../hooks/useDashboardData'

// Lazy load modals
const GoalSettingsModal = lazy(() => import('../../components/GoalSettingsModal'))
const ExportModal = lazy(() => import('../../components/ExportModal'))
const ScheduledReportsModal = lazy(() => import('../../components/ScheduledReportsModal'))

function EarningsTab() {
  const [isGoalSettingsModalOpen, setIsGoalSettingsModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isScheduledReportsModalOpen, setIsScheduledReportsModalOpen] = useState(false)

  const { refresh } = useDashboardData({})

  const handleGoalSave = async () => {
    await refresh({ goals: true })
  }

  const handleExportStats = () => {
    setIsExportModalOpen(true)
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          onReportsClick={() => setIsScheduledReportsModalOpen(true)}
          onExportClick={handleExportStats}
        />

        {/* Earnings & Goals Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-4">Earnings & Goals</h2>
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

        {/* Export Modal */}
        <Suspense fallback={null}>
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            filters={{}}
            exportType="stats"
          />
        </Suspense>

        {/* Scheduled Reports Modal */}
        <Suspense fallback={null}>
          <ScheduledReportsModal
            isOpen={isScheduledReportsModalOpen}
            onClose={() => setIsScheduledReportsModalOpen(false)}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default EarningsTab
