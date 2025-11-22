import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, User, Settings, Bell } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import NotificationCenter from './NotificationCenter'

function DashboardHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { unreadCount, loadUnreadCount } = useNotifications()
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)

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

          {/* Notification Settings Button */}
          <button
            onClick={() => navigate('/notification-settings')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
            title="Notification Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Notification Bell */}
          <button
            onClick={() => {
              setIsNotificationCenterOpen(true)
              loadUnreadCount()
            }}
            className="relative flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => {
          setIsNotificationCenterOpen(false)
          loadUnreadCount()
        }}
      />
    </header>
  )
}

export default DashboardHeader
