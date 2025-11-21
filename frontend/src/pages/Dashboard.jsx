import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{
        background: `
          radial-gradient(circle at 25% 25%, rgba(30, 58, 138, 0.3), transparent 25%),
          radial-gradient(circle at 75% 75%, rgba(20, 125, 190, 0.2), transparent 30%),
          radial-gradient(circle at 75% 25%, rgba(5, 150, 105, 0.2), transparent 25%),
          radial-gradient(circle at 25% 75%, rgba(5, 150, 105, 0.18), transparent 30%),
          radial-gradient(ellipse 1200px 800px at 50% 50%, rgba(20, 125, 190, 0.08), transparent 50%),
          linear-gradient(142deg, #1e40af, #0d4f8b 30%, #067a5b 70%, #059669)
        `
      }}
    >
      <div
        className="max-w-2xl w-full p-8 rounded-3xl shadow-2xl"
        style={{
          backgroundColor:'rgba(0, 15, 33, 0.25)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 200, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37), inset 0 0 80px rgba(0, 200, 255, 0.1)'
        }}
      >
        <h1 className="text-white text-4xl font-bold mb-6">Dashboard</h1>

        <div className="space-y-4 mb-8">
          <div className="text-gray-300">
            <p className="text-sm text-gray-400">Welcome back,</p>
            <p className="text-2xl font-semibold text-white">{user?.name || 'User'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white font-medium">{user?.email}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="text-gray-400 text-sm">Sales ID</p>
              <p className="text-white font-medium">{user?.salesid || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Logout
          </button>

          <button
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            View Orders
          </button>
        </div>

        <p className="text-gray-400 text-sm mt-8">
          This is a placeholder dashboard. The full order management features will be implemented next.
        </p>
      </div>
    </div>
  )
}

export default Dashboard
