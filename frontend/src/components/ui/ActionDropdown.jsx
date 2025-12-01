import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

function ActionDropdown({ trigger, items, position = 'right' }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const menuRef = useRef(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return

      switch (event.key) {
        case 'Escape':
          setIsOpen(false)
          setFocusedIndex(-1)
          break
        case 'ArrowDown':
          event.preventDefault()
          setFocusedIndex((prev) => (prev + 1) % items.length)
          break
        case 'ArrowUp':
          event.preventDefault()
          setFocusedIndex((prev) => (prev - 1 + items.length) % items.length)
          break
        case 'Enter':
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            items[focusedIndex].onClick()
            setIsOpen(false)
            setFocusedIndex(-1)
          }
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, focusedIndex, items])

  // Focus management
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && menuRef.current) {
      const buttons = menuRef.current.querySelectorAll('button')
      buttons[focusedIndex]?.focus()
    }
  }, [focusedIndex, isOpen])

  const getVariantStyles = (variant) => {
    switch (variant) {
      case 'success':
        return 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
      case 'danger':
        return 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
      default:
        return 'text-gray-300 hover:bg-white/5 hover:text-white'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 h-10 px-3 text-white rounded-lg transition-all hover:scale-105 transform duration-200"
        style={{
          backgroundColor: 'rgba(0, 15, 33, 0.3)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 200, 255, 0.3)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {trigger}
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute ${position === 'right' ? 'right-0' : 'left-0'} mt-2 w-56 rounded-lg shadow-2xl z-50 animate-slideDown`}
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 200, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
          role="menu"
        >
          <div className="py-2">
            {items.map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  key={index}
                  onClick={() => {
                    item.onClick()
                    setIsOpen(false)
                    setFocusedIndex(-1)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${getVariantStyles(item.variant)} ${
                    focusedIndex === index ? 'bg-white/10' : ''
                  }`}
                  role="menuitem"
                >
                  {Icon && <Icon size={16} />}
                  <span className="text-sm">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ActionDropdown
