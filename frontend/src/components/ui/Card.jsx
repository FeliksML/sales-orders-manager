function Card({ children, className = '' }) {
  return (
    <div
      className={`p-6 rounded-xl shadow-lg ${className}`}
      style={{
        backgroundColor: 'rgba(0, 15, 33, 0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 200, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37), inset 0 0 80px rgba(0, 200, 255, 0.1)',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      {children}
    </div>
  )
}

export default Card
