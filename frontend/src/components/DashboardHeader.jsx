import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, User, Settings, Bell, Clock, FileBarChart, ChevronDown, Shield, FileUp } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import NotificationCenter from './NotificationCenter'

function DashboardHeader({ onReportsClick, onExportClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { unreadCount, loadUnreadCount } = useNotifications()
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="mb-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Brand */}
        <Link
          to="/dashboard"
          className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold whitespace-nowrap"
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              WebkitTextStroke: '0.5px rgba(255, 255, 255, 0.3)',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
              filter: 'drop-shadow(0 0 10px rgba(0, 200, 255, 0.4))',
              position: 'relative',
              paddingRight: '36px'
            }}
          >
            Sales Order Manager
            <span style={{
              position: 'absolute',
              right: '0',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '24px',
              height: '24px',
              background: 'linear-gradient(135deg, #2563eb 0%, #059669 100%)',
              clipPath: 'polygon(0% 0%, 100% 50%, 0% 100%)'
            }}></span>
          </h1>
        </Link>

        {/* Right: Actions + Account Controls */}
        <div className="flex items-center gap-3 flex-wrap ml-auto">
          {/* Primary Actions: Reports & Export */}
          <button
            onClick={onReportsClick}
            className="flex items-center justify-center gap-2 h-10 px-4 text-white rounded-lg transition-all hover:scale-105 transform duration-200"
            style={{
              backgroundColor: 'rgba(0, 15, 33, 0.3)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 200, 255, 0.3)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
            title="Reports"
          >
            <Clock size={16} />
            {/* Leftmost: Shows text only when all buttons can fit with text (620px+) */}
            <span className="hidden min-[620px]:inline text-sm">Reports</span>
          </button>

          <button
            onClick={onExportClick}
            className="flex items-center justify-center gap-2 h-10 px-4 text-white rounded-lg transition-all hover:scale-105 transform duration-200"
            style={{
              backgroundColor: 'rgba(0, 15, 33, 0.3)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 200, 255, 0.3)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
            title="Export"
          >
            <FileBarChart size={16} />
            {/* Shows text when Export + User can fit with text (500px+) */}
            <span className="hidden min-[500px]:inline text-sm">Export</span>
          </button>

          <button
            onClick={() => navigate('/import')}
            className="flex items-center justify-center gap-2 h-10 px-4 text-white rounded-lg transition-all hover:scale-105 transform duration-200"
            style={{
              backgroundColor: 'rgba(5, 150, 105, 0.3)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
            title="Import PDF"
          >
            <FileUp size={16} />
            <span className="hidden min-[700px]:inline text-sm">Import PDF</span>
          </button>

          {/* Secondary Controls: Notifications, Settings, User */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button
              onClick={() => {
                setIsNotificationCenterOpen(true)
                loadUnreadCount()
              }}
              className="relative flex items-center justify-center h-10 w-10 text-white rounded-lg transition-all hover:scale-105 transform duration-200"
              style={{
                backgroundColor: 'rgba(0, 15, 33, 0.3)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 200, 255, 0.3)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 h-10 px-3 text-white rounded-lg transition-all hover:scale-105 transform duration-200"
                style={{
                  backgroundColor: 'rgba(0, 15, 33, 0.3)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 200, 255, 0.3)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                <User size={18} className="text-blue-400" />
                <span className="hidden min-[380px]:inline text-sm font-medium">{user?.name}</span>
                <ChevronDown size={16} className={`transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />

                  {/* Menu */}
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-lg shadow-2xl z-50 animate-slideDown"
                    style={{
                      background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(0, 200, 255, 0.3)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-white text-sm font-medium">{user?.name}</p>
                      <p className="text-gray-400 text-xs mt-1">Sales ID: {user?.salesid}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          navigate('/notification-settings')
                          setIsUserMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Settings size={16} />
                        <span className="text-sm">Settings</span>
                      </button>

                      {/* Admin Panel - Only show for admin users */}
                      {user?.is_admin && (
                        <button
                          onClick={() => {
                            navigate('/admin')
                            setIsUserMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors"
                        >
                          <Shield size={16} />
                          <span className="text-sm">Admin Panel</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          handleLogout()
                          setIsUserMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      >
                        <LogOut size={16} />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
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

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </header>
  )
}

export default DashboardHeader
