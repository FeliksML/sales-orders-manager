import { useState, useRef, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react"
import ReCAPTCHA from "react-google-recaptcha"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rippleRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmPasswordRef = useRef(null)
  const recaptchaRef = useRef(null)

  const [token, setToken] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState("")

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token")
    if (!tokenFromUrl) {
      setError("Invalid reset link. Please request a new password reset.")
    } else {
      setToken(tokenFromUrl)
    }
  }, [searchParams])

  const isPasswordValid = password.length >= 8
  const doPasswordsMatch = password === confirmPassword && confirmPassword !== ""
  const isFormValid = token && isPasswordValid && doPasswordsMatch && recaptchaToken !== ""

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Clear previous messages
    setError("")
    setSuccess("")

    // Validate token
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.")
      return
    }

    // Validate CAPTCHA
    if (!recaptchaToken) {
      setError("Please complete the CAPTCHA verification")
      return
    }

    // Validate password
    if (!isPasswordValid) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (!doPasswordsMatch) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          new_password: password,
          recaptcha_token: recaptchaToken
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message || "Password reset successful! Redirecting to login...")

        setTimeout(() => {
          navigate("/login")
        }, 2000)
      } else {
        setError(data.error || "Failed to reset password. Please try again.")
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && isFormValid && !isLoading) {
      handleSubmit(e)
    }
  }

  return (
    <>
      <style>{`
        /* Ripple effect styles */
        .ripple-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 8px;
          pointer-events: none;
        }

        .ripple-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          width: 0;
          height: 0;
          opacity: 0;
          transform: translate(-50%, -50%);
        }

        .ripple-container.active .ripple-circle {
          animation: ripple-animation 0.6s ease-out;
        }

        @keyframes ripple-animation {
          0% {
            width: 0;
            height: 0;
            opacity: 0.5;
          }
          100% {
            width: 300px;
            height: 300px;
            opacity: 0;
          }
        }

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
        <Link to="/login" className="absolute top-8 left-8 text-right cursor-pointer hover:opacity-80 transition-opacity">
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
          <p
            className="text-white text-2xl tracking-widest"
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              WebkitTextStroke: '1px rgba(255, 255, 255, 0.3)',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
              filter: 'drop-shadow(0 0 10px rgba(0, 200, 255, 0.4))'
            }}
          >
            MANAGER
          </p>
        </Link>

        <div
          className="flex flex-col items-center justify-center p-8 rounded-3xl shadow-2xl"
          style={{
            backgroundColor:'rgba(0, 15, 33, 0.25)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 200, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37), inset 0 0 80px rgba(0, 200, 255, 0.1)'
          }}
        >
          <h1 className="text-white text-4xl font-bold mb-2">Reset Password</h1>
          <p className="text-gray-300 mb-6 text-center max-w-md">
            Enter your new password below.
          </p>

          <div className="w-full mb-4">
            <label htmlFor="password_input" className="text-gray-300 mb-1 block">New Password</label>
            <div className="magic-ring relative">
              <input
                id="password_input"
                ref={passwordRef}
                className="input-base w-full px-4 py-3 pr-12"
                type={showPassword ? "text" : "password"}
                name="password_input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter new password (min. 8 characters)"
                disabled={isLoading || !token}
                autoFocus
                aria-label="New password"
                aria-required="true"
              />
              <button
                onClick={(e) => {
                  e.preventDefault()
                  setShowPassword(!showPassword)
                  passwordRef.current.focus()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white z-10"
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {password && !isPasswordValid && (
              <p className="text-yellow-400 text-sm mt-1">Password must be at least 8 characters</p>
            )}
          </div>

          <div className="w-full mb-4">
            <label htmlFor="confirm_password_input" className="text-gray-300 mb-1 block">Confirm Password</label>
            <div className="magic-ring relative">
              <input
                id="confirm_password_input"
                ref={confirmPasswordRef}
                className="input-base w-full px-4 py-3 pr-12"
                type={showConfirmPassword ? "text" : "password"}
                name="confirm_password_input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Confirm new password"
                disabled={isLoading || !token}
                aria-label="Confirm password"
                aria-required="true"
              />
              <button
                onClick={(e) => {
                  e.preventDefault()
                  setShowConfirmPassword(!showConfirmPassword)
                  confirmPasswordRef.current.focus()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white z-10"
                type="button"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && !doPasswordsMatch && (
              <p className="text-red-400 text-sm mt-1">Passwords do not match</p>
            )}
            {confirmPassword && doPasswordsMatch && (
              <p className="text-green-400 text-sm mt-1">Passwords match</p>
            )}
          </div>

          <div className="w-full mb-4 flex justify-center">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
              onChange={(token) => setRecaptchaToken(token || "")}
              onExpired={() => setRecaptchaToken("")}
              theme="dark"
            />
          </div>

          {error && (
            <p className="text-red-400 mb-3" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-400 mb-3" role="status" aria-live="polite">
              {success}
            </p>
          )}

          <button
            onClick={(e) => {
              // Ripple effect
              if (!isLoading && isFormValid) {
                const button = e.currentTarget
                const rippleContainer = rippleRef.current
                const circle = rippleContainer.querySelector('.ripple-circle')

                const rect = button.getBoundingClientRect()
                const x = e.clientX - rect.left
                const y = e.clientY - rect.top

                circle.style.left = x + 'px'
                circle.style.top = y + 'px'

                rippleContainer.classList.remove('active')
                void rippleContainer.offsetWidth
                rippleContainer.classList.add('active')
              }

              handleSubmit(e)
            }}
            disabled={!isFormValid || isLoading}
            style={{
              background: !isFormValid || isLoading
                ? 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)'
                : 'linear-gradient(90deg, #2563eb 0%, #059669 100%)',
              position: 'relative',
              cursor: !isFormValid || isLoading ? 'not-allowed' : 'pointer'
            }}
            className="w-full text-white font-bold px-4 py-3 transition-transform active:scale-98 rounded-lg hover:opacity-90 shadow-md flex items-center justify-center gap-2"
          >
            <div className="ripple-container" ref={rippleRef}>
              <span className="ripple-circle"></span>
            </div>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Resetting Password...</span>
              </>
            ) : (
              "Reset Password"
            )}
          </button>

          <Link
            to="/login"
            className="text-gray-300 mt-4 px-4 py-3 flex items-center gap-2 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </>
  )
}

export default ResetPassword
