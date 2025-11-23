import { Check } from 'lucide-react'

const colorVariants = {
  blue: {
    checked: 'rgba(59, 130, 246, 1)',
    uncheckedBg: 'rgba(255, 255, 255, 0.95)',
    uncheckedBorder: 'rgba(156, 163, 175, 0.5)',
    glow: 'rgba(59, 130, 246, 0.4)'
  },
  purple: {
    checked: 'rgba(147, 51, 234, 1)',
    uncheckedBg: 'rgba(255, 255, 255, 0.95)',
    uncheckedBorder: 'rgba(156, 163, 175, 0.5)',
    glow: 'rgba(147, 51, 234, 0.4)'
  },
  green: {
    checked: 'rgba(5, 150, 105, 1)',
    uncheckedBg: 'rgba(255, 255, 255, 0.95)',
    uncheckedBorder: 'rgba(156, 163, 175, 0.5)',
    glow: 'rgba(5, 150, 105, 0.4)'
  },
  orange: {
    checked: 'rgba(234, 88, 12, 1)',
    uncheckedBg: 'rgba(255, 255, 255, 0.95)',
    uncheckedBorder: 'rgba(156, 163, 175, 0.5)',
    glow: 'rgba(234, 88, 12, 0.4)'
  },
  indigo: {
    checked: 'rgba(99, 102, 241, 1)',
    uncheckedBg: 'rgba(255, 255, 255, 0.95)',
    uncheckedBorder: 'rgba(156, 163, 175, 0.5)',
    glow: 'rgba(99, 102, 241, 0.4)'
  },
  pink: {
    checked: 'rgba(236, 72, 153, 1)',
    uncheckedBg: 'rgba(255, 255, 255, 0.95)',
    uncheckedBorder: 'rgba(156, 163, 175, 0.5)',
    glow: 'rgba(236, 72, 153, 0.4)'
  },
  yellow: {
    checked: 'rgba(234, 179, 8, 1)',
    uncheckedBg: 'rgba(255, 255, 255, 0.95)',
    uncheckedBorder: 'rgba(156, 163, 175, 0.5)',
    glow: 'rgba(234, 179, 8, 0.4)'
  }
}

function CustomCheckbox({ checked, onChange, onClick, className = '', color = 'blue' }) {
  const colors = colorVariants[color] || colorVariants.blue

  return (
    <div
      onClick={(e) => {
        onClick?.(e)
        onChange?.(e)
      }}
      className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all duration-200 ${className}`}
      style={{
        backgroundColor: checked ? colors.checked : colors.uncheckedBg,
        border: `2px solid ${checked ? colors.checked : colors.uncheckedBorder}`,
        backdropFilter: 'blur(10px)',
        boxShadow: checked ? `0 0 12px ${colors.glow}` : 'none',
        transform: checked ? 'scale(1.05)' : 'scale(1)'
      }}
    >
      {checked && (
        <Check
          size={14}
          className="text-white"
          strokeWidth={3}
        />
      )}
    </div>
  )
}

export default CustomCheckbox
