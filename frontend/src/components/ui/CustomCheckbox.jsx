import { Check } from 'lucide-react'

function CustomCheckbox({ checked, onChange, onClick, className = '' }) {
  return (
    <div
      onClick={(e) => {
        onClick?.(e)
        onChange?.(e)
      }}
      className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-all ${className}`}
      style={{
        backgroundColor: checked ? 'rgba(59, 130, 246, 1)' : 'rgba(0, 15, 33, 0.3)',
        border: `2px solid ${checked ? 'rgba(59, 130, 246, 1)' : 'rgba(59, 130, 246, 0.6)'}`,
        backdropFilter: 'blur(10px)',
        boxShadow: checked ? '0 0 8px rgba(59, 130, 246, 0.4)' : 'none'
      }}
    >
      {checked && (
        <Check
          size={12}
          className="text-white"
          strokeWidth={3}
        />
      )}
    </div>
  )
}

export default CustomCheckbox
