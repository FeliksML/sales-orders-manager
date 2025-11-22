import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

function Toast({ message, type = 'success', onClose, duration = 5000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const styles = {
    success: {
      bg: 'bg-gradient-to-r from-green-600 to-emerald-600',
      border: 'border-green-500',
      icon: CheckCircle,
      iconColor: 'text-green-200'
    },
    error: {
      bg: 'bg-gradient-to-r from-red-600 to-rose-600',
      border: 'border-red-500',
      icon: AlertCircle,
      iconColor: 'text-red-200'
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-600 to-indigo-600',
      border: 'border-blue-500',
      icon: Info,
      iconColor: 'text-blue-200'
    }
  }

  const style = styles[type] || styles.info
  const Icon = style.icon

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slideIn">
      <div className={`${style.bg} ${style.border} border rounded-lg shadow-2xl p-4 pr-12 max-w-md min-w-[300px]`}>
        <div className="flex items-start gap-3">
          <Icon className={`${style.iconColor} flex-shrink-0 mt-0.5`} size={24} />
          <p className="text-white text-sm font-medium leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default Toast
