function Login() {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: `
          radial-gradient(circle at 25% 25%, rgba(30, 58, 138, 0.3), transparent 25%),
          radial-gradient(circle at 75% 75%, rgba(20, 125, 190, 0.2), transparent 30%),
          radial-gradient(circle at 75% 25%, rgba(5, 150, 105, 0.2), transparent 25%),
          radial-gradient(circle at 25% 75%, rgba(5, 150, 105, 0.18), transparent 30%),
          radial-gradient(ellipse 1200px 800px at 50% 50%, rgba(20, 125, 190, 0.08), transparent 50%),
          linear-gradient(142deg, #1e40af, #0d4f8b 30%, #067a5b 70%, #059669)
        `
      }}
    >
      <div 
        className="flex flex-col items-center justify-center p-8 rounded-lg shadow-2xl"
        style={{backgroundColor:'#03192E'}}
      >
        <h1 className="text-white text-4xl font-bold mb-6">Login</h1>
        
        <div className="w-full">
          <label className="text-gray-300">Email Address</label>
          <input 
            type="email" 
            name="email_input"
            style={{
              backgroundColor: '#000F21',
              borderColor: '#132C43'
            }}
            className="text-gray-300 w-full px-4 py-3 mb-4 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        
        <div className="w-full">
          <label className="text-gray-300">Password</label>
          <input 
            type="password" 
            name="password_input"
            style={{
              backgroundColor: '#000F21',
              borderColor: '#132C43'
            }}
            className="text-gray-300 w-full px-4 py-3 mb-9 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        
        <button 
          style={{
            background: 'linear-gradient(90deg, #2563eb 0%, #059669 100%)'
          }}
          className="w-full text-white font-bold px-4 py-3 rounded-lg hover:opacity-90 shadow-md transition-opacity"
        >
          Login
        </button>
        <p className="text-gray-300 mt-3 px-4 py-3" >Don't have an account? <a className="text-blue-300">Sign up</a></p>
      </div>
    </div>
  )
}

export default Login