import { NavLink } from 'react-router-dom'
import { Package, DollarSign, BarChart3, Bell } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'

const tabs = [
  { path: '/dashboard/orders', icon: Package, label: 'Orders' },
  { path: '/dashboard/earnings', icon: DollarSign, label: 'Earnings' },
  { path: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
]

function BottomNav() {
  const { unreadCount } = useNotifications()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl"
      style={{
        background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))',
        borderTop: '1px solid rgba(0, 200, 255, 0.2)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center flex-1 h-full
              transition-colors duration-200
              ${isActive ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-300'}
            `}
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon className={`w-6 h-6 ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,200,255,0.6)]' : ''}`} />
                  {label === 'Notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>{label}</span>
                {isActive && (
                  <div
                    className="absolute bottom-0 w-12 h-0.5 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(0, 200, 255, 0.8), transparent)'
                    }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
