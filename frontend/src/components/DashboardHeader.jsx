import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, User, Settings } from 'lucide-react'

function DashboardHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="mb-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Logo/Brand */}
        <Link
          to="/dashboard"
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          <h1
            className="text-3xl sm:text-4xl font-bold"
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              WebkitTextStroke: '0.5px rgba(255, 255, 255, 0.3)',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
              filter: 'drop-shadow(0 0 10px rgba(0, 200, 255, 0.4))',
            }}
          >
            Sales Order Manager
          </h1>
        </Link>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
            <User className="w-5 h-5 text-blue-400" />
            <div className="text-right">
              <p className="text-white text-sm font-medium">{user?.name}</p>
              <p className="text-gray-400 text-xs">Sales ID: {user?.salesid}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
