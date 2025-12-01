import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { User, LogOut, Settings, ChevronDown, Shield, DollarSign, MoreHorizontal } from 'lucide-react'

function MobileHeader({ title, actions = [], moreActions = [] }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const moreMenuRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header
      className="sticky top-0 z-40 h-14 px-3 flex items-center gap-2"
      style={{
        background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0, 200, 255, 0.2)',
      }}
    >
      {/* Left: User Menu */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95"
          style={{
            backgroundColor: 'rgba(0, 15, 33, 0.5)',
            border: '1px solid rgba(0, 200, 255, 0.3)',
          }}
          aria-label="User menu"
        >
          <User size={20} className="text-blue-400" />
        </button>

        {/* User Menu Dropdown */}
        {isUserMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsUserMenuOpen(false)}
            />
            <div
              className="absolute left-0 mt-2 w-56 rounded-lg shadow-2xl z-50 animate-slideDown"
              style={{
                background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 200, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
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
                  <span className="text-sm">Notification Settings</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/commission-settings')
                    setIsUserMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
                >
                  <DollarSign size={16} />
                  <span className="text-sm">Commission Settings</span>
                </button>

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

      {/* Center: Title */}
      <h1 className="flex-1 text-center text-lg font-semibold text-white truncate">
        {title}
      </h1>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Primary actions (always visible) */}
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <button
              key={index}
              onClick={action.onClick}
              className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg transition-all active:scale-95"
              style={action.primary ? {
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.7), rgba(59, 130, 246, 0.7))',
                border: '1px solid rgba(59, 130, 246, 0.4)',
              } : {
                backgroundColor: 'rgba(0, 15, 33, 0.5)',
                border: '1px solid rgba(0, 200, 255, 0.3)',
              }}
              title={action.label}
            >
              {Icon && <Icon size={18} className="text-white" />}
              {action.showLabel && (
                <span className="text-sm text-white font-medium">{action.label}</span>
              )}
            </button>
          )
        })}

        {/* More Menu (overflow actions) */}
        {moreActions.length > 0 && (
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-lg transition-all active:scale-95"
              style={{
                backgroundColor: 'rgba(0, 15, 33, 0.5)',
                border: '1px solid rgba(0, 200, 255, 0.3)',
              }}
              aria-label="More actions"
            >
              <MoreHorizontal size={20} className="text-white" />
            </button>

            {isMoreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMoreMenuOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 w-56 rounded-lg shadow-2xl z-50 animate-slideDown"
                  style={{
                    background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0, 200, 255, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div className="py-2">
                    {moreActions.map((action, index) => {
                      const Icon = action.icon
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            action.onClick()
                            setIsMoreMenuOpen(false)
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                            action.variant === 'success'
                              ? 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                              : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {Icon && <Icon size={16} />}
                          <span className="text-sm">{action.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export default MobileHeader
