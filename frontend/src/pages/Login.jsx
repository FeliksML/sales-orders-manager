import { useState } from "react"

function Login() {
  return (
    <>
   <style>{`
  /* CSS Custom Property for rotation using turns */
  @property --rotation {
    syntax: "<angle>";
    initial-value: 0turn;
    inherits: false;
  }

  @keyframes hue-rotation {
    from {
      --rotation: 0turn;
    }
    to {
      --rotation: 1turn;
    }
  }

  /* Wrapper that creates the rotating border effect */
  .magic-ring {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
  }

  /* The rotating cyan gradient border - HIDDEN by default */
  .magic-ring::before {
    position: absolute;
    inset: 0;
    content: "";
    z-index: 1;
    background-image: conic-gradient(
      from var(--rotation, 0turn),
      transparent,
      transparent,
      #00c8ff,
      #00e5ff,
      #00c8ff,
      transparent,
      transparent
    );
    animation: 4s hue-rotation infinite linear;
    border-radius: 12px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  /* Show the rotating border ONLY when focused */
  .magic-ring:focus-within::before {
    opacity: 1;
  }

  /* Creates the inner area with SOLID background - reveals border around edges */
  .magic-ring::after {
    position: absolute;
    width: calc(100% - 4px);
    height: calc(100% - 4px);
    top: 2px;
    left: 2px;
    border-radius: 10px;
    content: "";
    z-index: 2;
    background: #0a1628;
  }

  /* Input styling - sits on top */
  .input-base {
    width: 100%;
    border-radius: 10px;
    outline: none;
    border: 0;
    display: block;
    background: transparent;
    font-size: 16px;
    box-shadow: none;
    transition: box-shadow 300ms;
    color-scheme: dark;
    position: relative;
    z-index: 3;
    color: #e5e7eb;
  }
  
  .input-base:focus {
    box-shadow: 
      0 0 0 3px rgba(0, 200, 255, 0.2),
      inset 0 0 20px rgba(0, 200, 255, 0.15);
  }

  /* Autofill styling */
  .input-base:-webkit-autofill,
  .input-base:-webkit-autofill:hover,
  .input-base:-webkit-autofill:focus {
    -webkit-text-fill-color: #e5e7eb !important;
    transition: background-color 9999s ease-out;
    -webkit-box-shadow: 0 0 0px 1000px #0a1628 inset !important;
    box-shadow: 0 0 0px 1000px #0a1628 inset !important;
  }
  `}</style>
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
      <div className="absolute top-8 left-8 text-right" > 
        <h1 
          className="text-5xl font-bold"
          style={{
            color: 'rgba(255, 255, 255, 0.9)',
            WebkitTextStroke: '1px rgba(255, 255, 255, 0.3)',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            filter: 'drop-shadow(0 0 10px rgba(0, 200, 255, 0.4))',
            position: 'relative',
          }}
        >
          Sales Order
          <span style={{
            position: 'absolute',
            right: '-32px',
            top: '60%',
            transform: 'translateY(-50%)',
            width: '28px',
            height: '28px',
            background: 'linear-gradient(135deg, #2563eb 0%, #059669 100%)',
            clipPath: 'polygon(0% 0%, 100% 50%, 0% 100%)'
          }}></span>
        </h1>
        <p className="text-white text-2xl tracking-widest" style={{
          color: 'rgba(255, 255, 255, 0.9)',
          WebkitTextStroke: '1px rgba(255, 255, 255, 0.3)',
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          filter: 'drop-shadow(0 0 10px rgba(0, 200, 255, 0.4))'
        }}>MANAGER</p>
      </div>

      <div 
        className="flex flex-col items-center justify-center p-8 rounded-3xl shadow-2xl"
        style={{
          backgroundColor:'rgba(0, 15, 33, 0.25)', 
          backdropFilter: 'blur(20px)', 
          border: '1px solid rgba(0, 200, 255, 0.3)', 
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37), inset 0 0 80px rgba(0, 200, 255, 0.1)'
        }}
      >
        <h1 className="text-white text-4xl font-bold mb-6">Login</h1>
        
        <div className="w-full mb-4">
          <label className="text-gray-300 mb-1 block">Email Address</label>
          <div className="magic-ring">
            <input
              className="input-base w-full px-4 py-3"
              type="email"
              name="email_input"
              placeholder="Enter your email"
            />
          </div>
        </div>
        
        <div className="w-full mb-6">
          <label className="text-gray-300 mb-1 block">Password</label>
          <div className="magic-ring">
            <input 
              className="input-base w-full px-4 py-3"
              type="password" 
              name="password_input"
              placeholder="Enter your password"
            />
          </div>
        </div>
        
        <button 
          style={{
            background: 'linear-gradient(90deg, #2563eb 0%, #059669 100%)'
          }}
          className="w-full text-white font-bold px-4 py-3 transition-transform active:scale-98 rounded-lg hover:opacity-90 shadow-md"
        >
          Login
        </button>
        <p className="text-gray-300 mt-3 px-4 py-3">Don't have an account? <a className="text-blue-300 cursor-pointer hover:underline">Sign up</a></p>
      </div>
    </div>
    </>
  )
}

export default Login