function LoadingSpinner({ size = 'medium' }) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${sizeClasses[size]} border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin`}></div>
    </div>
  )
}

export default LoadingSpinner
