import { useState, useRef } from "react";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const rippleRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [salesid, setSalesid] = useState("");
  const [confirm_password, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    salesid: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touchedFields, setTouchedFields] = useState({
    name: false,
    salesid: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [checkingSalesId, setCheckingSalesId] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const allPasswordChecksPassed = Object.values(passwordChecks).every(Boolean);

  // Validation functions
  const validateName = (value) => {
    if (!value.trim()) return "Name is required";
    if (value.trim().length < 2) return "Name must be at least 2 characters";
    if (!/^[a-zA-Z\s'-]+$/.test(value)) return "Name can only contain letters, spaces, hyphens, and apostrophes";
    return "";
  };

  const validateSalesId = (value) => {
    if (!value.trim()) return "Sales ID is required";
    if (!/^\d{5}$/.test(value)) return "Sales ID must be exactly 5 digits";
    return "";
  };

  // Check if Sales ID already exists in database
  const checkSalesIdAvailability = async (salesId) => {
    if (validateSalesId(salesId) !== "") return; // Don't check if format is invalid

    setCheckingSalesId(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/auth/check-salesid/${salesId}`);
      const data = await response.json();

      if (data.exists) {
        setFieldErrors(prev => ({ ...prev, salesid: "This Sales ID is already registered" }));
      } else {
        setFieldErrors(prev => ({ ...prev, salesid: "" }));
      }
    } catch (error) {
      console.error("Error checking Sales ID:", error);
      // Don't show error to user, just log it
    } finally {
      setCheckingSalesId(false);
    }
  };

  // Check if Email already exists in database
  const checkEmailAvailability = async (emailValue) => {
    if (validateEmail(emailValue) !== "") return; // Don't check if format is invalid

    setCheckingEmail(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/auth/check-email/${encodeURIComponent(emailValue)}`);
      const data = await response.json();

      if (data.exists) {
        setFieldErrors(prev => ({ ...prev, email: "This email is already registered. Please login instead." }));
      } else {
        setFieldErrors(prev => ({ ...prev, email: "" }));
      }
    } catch (error) {
      console.error("Error checking email:", error);
      // Don't show error to user, just log it
    } finally {
      setCheckingEmail(false);
    }
  };

  const validateEmail = (value) => {
    if (!value.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address";
    return "";
  };

  const validatePassword = (value) => {
    if (!value) return "Password is required";
    if (!allPasswordChecksPassed) return "Password does not meet all requirements";
    return "";
  };

  const validateConfirmPassword = (value) => {
    if (!value) return "Please confirm your password";
    if (value !== password) return "Passwords don't match";
    return "";
  };

  // Handle field blur events
  const handleFieldBlur = async (field, value) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    let error = "";
    switch (field) {
      case "name":
        error = validateName(value);
        setFieldErrors(prev => ({ ...prev, [field]: error }));
        break;
      case "salesid":
        error = validateSalesId(value);
        setFieldErrors(prev => ({ ...prev, [field]: error }));
        // Check database availability if format is valid
        if (error === "") {
          await checkSalesIdAvailability(value);
        }
        break;
      case "email":
        error = validateEmail(value);
        setFieldErrors(prev => ({ ...prev, [field]: error }));
        // Check database availability if format is valid
        if (error === "") {
          await checkEmailAvailability(value);
        }
        break;
      case "password":
        error = validatePassword(value);
        setFieldErrors(prev => ({ ...prev, [field]: error }));
        break;
      case "confirmPassword":
        error = validateConfirmPassword(value);
        setFieldErrors(prev => ({ ...prev, [field]: error }));
        break;
      default:
        break;
    }
  };

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: "", color: "" };

    let score = 0;
    if (passwordChecks.length) score++;
    if (passwordChecks.uppercase) score++;
    if (passwordChecks.lowercase) score++;
    if (passwordChecks.number) score++;
    if (passwordChecks.special) score++;
    if (password.length >= 12) score++;

    if (score <= 2) return { score: 33, label: "Weak", color: "#ef4444" };
    if (score <= 4) return { score: 66, label: "Medium", color: "#f59e0b" };
    return { score: 100, label: "Strong", color: "#10b981" };
  };

  const passwordStrength = getPasswordStrength();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isFormValid =
    validateName(name) === "" &&
    validateSalesId(salesid) === "" &&
    validateEmail(email) === "" &&
    validatePassword(password) === "" &&
    validateConfirmPassword(confirm_password) === "" &&
    !fieldErrors.name &&
    !fieldErrors.salesid &&
    !fieldErrors.email &&
    !fieldErrors.password &&
    !fieldErrors.confirmPassword &&
    !checkingSalesId &&
    !checkingEmail &&
    agreedToTerms;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous messages
    setError("");
    setSuccess("");

    // Check for any field errors
    if (fieldErrors.salesid) {
      setError("Cannot register: " + fieldErrors.salesid);
      return;
    }
    if (fieldErrors.email) {
      setError("Cannot register: " + fieldErrors.email);
      return;
    }

    // Validate all fields
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!salesid.trim()) {
      setError("Please enter your sales ID");
      return;
    }
    if (!isEmailValid) {
      setError("Please enter a valid email address");
      return;
    }
    if (!allPasswordChecksPassed) {
      setError("Password does not meet requirements");
      return;
    }
    if (password !== confirm_password) {
      setError("Passwords don't match!");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup(email, password, name, salesid);

      // Check if backend returned an error
      if (result && result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Check if email verification is required
      if (result && result.verification_required) {
        if (result.email_sent) {
          setSuccess(
            `Account created successfully! A verification email has been sent to ${email}. Please check your inbox (and spam folder) to verify your account.`
          );
        } else {
          setSuccess(
            `Account created successfully! However, we couldn't send the verification email. Please contact support or try signing up again.`
          );
        }
        // Don't auto-redirect, let user verify email first
      } else {
        setSuccess("Account created successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && isFormValid && !isLoading) {
      handleSubmit(e);
    }
    // Clear errors on Escape key
    if (e.key === "Escape") {
      setError("");
      setSuccess("");
    }
  };

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
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8"
        style={{
          background: `
            radial-gradient(circle at 25% 25%, rgba(30, 58, 138, 0.3), transparent 25%),
            radial-gradient(circle at 75% 75%, rgba(20, 125, 190, 0.2), transparent 30%),
            radial-gradient(circle at 75% 25%, rgba(5, 150, 105, 0.2), transparent 25%),
            radial-gradient(circle at 25% 75%, rgba(5, 150, 105, 0.18), transparent 30%),
            radial-gradient(ellipse 1200px 800px at 50% 50%, rgba(20, 125, 190, 0.08), transparent 50%),
            linear-gradient(142deg, #1e40af, #0d4f8b 30%, #067a5b 70%, #059669)
          `,
        }}
      >
        <div className="absolute top-4 left-4 sm:top-8 sm:left-8 text-right">
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold"
            style={{
              color: "rgba(255, 255, 255, 0.9)",
              WebkitTextStroke: "0.5px rgba(255, 255, 255, 0.3)",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
              filter: "drop-shadow(0 0 10px rgba(0, 200, 255, 0.4))",
              position: "relative",
            }}
          >
            Sales Order
            <span
              className="hidden sm:inline-block"
              style={{
                position: "absolute",
                right: "-32px",
                top: "60%",
                transform: "translateY(-50%)",
                width: "28px",
                height: "28px",
                background: "linear-gradient(135deg, #2563eb 0%, #059669 100%)",
                clipPath: "polygon(0% 0%, 100% 50%, 0% 100%)",
              }}
            ></span>
          </h1>
          <p
            className="text-white text-lg sm:text-xl lg:text-2xl tracking-widest"
            style={{
              color: "rgba(255, 255, 255, 0.9)",
              WebkitTextStroke: "0.5px rgba(255, 255, 255, 0.3)",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
              filter: "drop-shadow(0 0 10px rgba(0, 200, 255, 0.4))",
            }}
          >
            MANAGER
          </p>
        </div>

        <div
          className="w-full max-w-md flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl shadow-2xl mt-24 sm:mt-0"
          style={{
            backgroundColor: "rgba(0, 15, 33, 0.25)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 200, 255, 0.3)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.37), inset 0 0 80px rgba(0, 200, 255, 0.1)",
          }}
        >
          <h1 className="text-white text-3xl sm:text-4xl font-bold mb-6">Sign Up</h1>

          <div className="w-full mb-4">
            <label htmlFor="name_input" className="text-gray-300 mb-1 block">Name</label>
            <div className="magic-ring">
              <input
                id="name_input"
                className="input-base w-full px-4 py-3"
                type="text"
                name="name_input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (touchedFields.name) {
                    handleFieldBlur("name", e.target.value);
                  }
                }}
                onBlur={(e) => handleFieldBlur("name", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your name"
                disabled={isLoading}
                autoFocus
                aria-label="Full name"
                aria-required="true"
                aria-invalid={touchedFields.name && fieldErrors.name ? "true" : "false"}
              />
            </div>
            {touchedFields.name && fieldErrors.name && (
              <p className="text-red-400 text-sm mt-1" role="alert">{fieldErrors.name}</p>
            )}
          </div>

          <div className="w-full mb-4">
            <label htmlFor="salesid_input" className="text-gray-300 mb-1 block">
              Sales ID
              <span className="text-gray-400 text-xs ml-2">(exactly 5 digits)</span>
            </label>
            <div className="magic-ring relative">
              <input
                id="salesid_input"
                className="input-base w-full px-4 py-3 pr-10"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="salesid_input"
                value={salesid}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ""); // Only allow digits
                  setSalesid(value);
                  if (touchedFields.salesid) {
                    handleFieldBlur("salesid", value);
                  }
                }}
                onBlur={(e) => handleFieldBlur("salesid", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., 12345"
                disabled={isLoading}
                maxLength={5}
                aria-label="Sales ID"
                aria-required="true"
                aria-invalid={touchedFields.salesid && fieldErrors.salesid ? "true" : "false"}
              />
              {checkingSalesId && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10" aria-label="Checking availability">
                  <Loader2 className="animate-spin text-blue-400" size={20} />
                </div>
              )}
              {!checkingSalesId && touchedFields.salesid && salesid.length === 5 && !fieldErrors.salesid && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10" aria-label="Sales ID available">
                  <Check className="text-green-500" size={20} />
                </div>
              )}
            </div>
            {touchedFields.salesid && fieldErrors.salesid && (
              <p className="text-red-400 text-sm mt-1" role="alert">{fieldErrors.salesid}</p>
            )}
          </div>

          <div className="w-full mb-4">
            <label htmlFor="email_input" className="text-gray-300 mb-1 block">Email Address</label>
            <div className="magic-ring relative">
              <input
                id="email_input"
                className="input-base w-full px-4 py-3 pr-10"
                type="email"
                name="email_input"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touchedFields.email) {
                    handleFieldBlur("email", e.target.value);
                  }
                }}
                onBlur={(e) => handleFieldBlur("email", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your email"
                disabled={isLoading}
                aria-label="Email address"
                aria-required="true"
                aria-invalid={touchedFields.email && fieldErrors.email ? "true" : "false"}
              />
              {checkingEmail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10" aria-label="Checking email availability">
                  <Loader2 className="animate-spin text-blue-400" size={20} />
                </div>
              )}
              {!checkingEmail && email && isEmailValid && !fieldErrors.email && touchedFields.email && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10" aria-label="Email available">
                  <Check className="text-green-500" size={20} />
                </div>
              )}
              {!checkingEmail && email && touchedFields.email && fieldErrors.email && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10" aria-label="Invalid or taken email">
                  <X className="text-red-500" size={20} />
                </div>
              )}
            </div>
            {touchedFields.email && fieldErrors.email && (
              <p className="text-red-400 text-sm mt-1" role="alert">{fieldErrors.email}</p>
            )}
          </div>

          <div className="w-full mb-6">
            <label className="text-gray-300 mb-1 block">Password</label>
            <div className="magic-ring relative">
              <input
                ref={passwordRef}
                className="input-base w-full px-4 py-3 pr-12"
                type={showPassword ? "text" : "password"}
                name="password_input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touchedFields.password) {
                    handleFieldBlur("password", e.target.value);
                  }
                }}
                onBlur={(e) => {
                  setPasswordFocused(false);
                  handleFieldBlur("password", e.target.value);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setPasswordFocused(true)}
                placeholder="Enter your password"
                disabled={isLoading}
                aria-label="Password"
                aria-required="true"
                aria-invalid={touchedFields.password && fieldErrors.password ? "true" : "false"}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowPassword(!showPassword);
                  passwordRef.current.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white z-10"
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {password && (
              <div className="w-full mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Password Strength:</span>
                  <span className="text-xs font-medium" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 ease-out rounded-full"
                    style={{
                      width: `${passwordStrength.score}%`,
                      backgroundColor: passwordStrength.color
                    }}
                  />
                </div>
              </div>
            )}

            {passwordFocused && (
              <div
                className="w-full mt-2 mb-4 px-4 py-3 rounded-lg border border-cyan-400/40 bg-[rgba(10,22,40,0.6)] backdrop-blur-md shadow-sm text-sm text-gray-200"
              >
                <p className="text-gray-300 mb-1">Password must contain:</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2 text-gray-200">
                    {passwordChecks.length ? (
                      <Check className="text-green-500" size={16} />
                    ) : (
                      <X className="text-red-500" size={16} />
                    )}
                    <span>At least 8 characters</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-200">
                    {passwordChecks.uppercase ? (
                      <Check className="text-green-500" size={16} />
                    ) : (
                      <X className="text-red-500" size={16} />
                    )}
                    <span>One uppercase letter</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-200">
                    {passwordChecks.lowercase ? (
                      <Check className="text-green-500" size={16} />
                    ) : (
                      <X className="text-red-500" size={16} />
                    )}
                    <span>One lowercase letter</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-200">
                    {passwordChecks.number ? (
                      <Check className="text-green-500" size={16} />
                    ) : (
                      <X className="text-red-500" size={16} />
                    )}
                    <span>One number</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-200">
                    {passwordChecks.special ? (
                      <Check className="text-green-500" size={16} />
                    ) : (
                      <X className="text-red-500" size={16} />
                    )}
                    <span>One special character (!@#$%^&*...)</span>
                  </li>
                </ul>
              </div>
            )}
            {touchedFields.password && fieldErrors.password && !passwordFocused && (
              <p className="text-red-400 text-sm mt-1" role="alert">{fieldErrors.password}</p>
            )}
          </div>

          <div className="w-full mb-6">
            <label className="text-gray-300 mb-1 block">Confirm Password</label>
            <div className="magic-ring relative">
              <input
                ref={confirmPasswordRef}
                className="input-base w-full px-4 py-3 pr-12"
                type={showConfirmPassword ? "text" : "password"}
                name="confirm_password_input"
                value={confirm_password}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (touchedFields.confirmPassword) {
                    handleFieldBlur("confirmPassword", e.target.value);
                  }
                }}
                onBlur={(e) => handleFieldBlur("confirmPassword", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Confirm your password"
                disabled={isLoading}
                aria-label="Confirm password"
                aria-required="true"
                aria-invalid={touchedFields.confirmPassword && fieldErrors.confirmPassword ? "true" : "false"}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowConfirmPassword(!showConfirmPassword);
                  confirmPasswordRef.current.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white z-10"
                type="button"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {touchedFields.confirmPassword && fieldErrors.confirmPassword && (
              <p className="text-red-400 text-sm mt-1" role="alert">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div className="w-full mb-4">
            <label className="flex items-start gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setAgreedToTerms(!agreedToTerms);
                  }
                }}
                className="w-4 h-4 mt-0.5 rounded border-gray-400 bg-transparent cursor-pointer flex-shrink-0 focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-transparent"
                disabled={isLoading}
                aria-label="Agree to terms and privacy policy"
                aria-required="true"
              />
              <span className="text-gray-300 text-sm sm:text-base">
                I agree to the{" "}
                <Link to="/terms" className="text-blue-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-blue-300 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded">
                  Privacy Policy
                </Link>
              </span>
            </label>
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
                const button = e.currentTarget;
                const rippleContainer = rippleRef.current;
                const circle = rippleContainer.querySelector(".ripple-circle");

                const rect = button.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                circle.style.left = x + "px";
                circle.style.top = y + "px";

                rippleContainer.classList.remove("active");
                void rippleContainer.offsetWidth;
                rippleContainer.classList.add("active");
              }

              handleSubmit(e);
            }}
            disabled={!isFormValid || isLoading}
            style={{
              background: !isFormValid || isLoading
                ? "linear-gradient(90deg, #6b7280 0%, #4b5563 100%)"
                : "linear-gradient(90deg, #2563eb 0%, #059669 100%)",
              position: "relative",
              cursor: !isFormValid || isLoading ? "not-allowed" : "pointer",
            }}
            className="w-full text-white font-bold px-4 py-3 transition-transform active:scale-98 rounded-lg hover:opacity-90 shadow-md flex items-center justify-center gap-2 text-base sm:text-lg"
          >
            <div className="ripple-container" ref={rippleRef}>
              <span className="ripple-circle"></span>
            </div>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span className="hidden sm:inline">Creating Account...</span>
                <span className="sm:hidden">Creating...</span>
              </>
            ) : (
              "Sign Up"
            )}
          </button>

          <p className="text-gray-300 mt-3 px-4 py-3 text-sm sm:text-base text-center">
            Have an account? <Link to="/login" className="text-blue-300 cursor-pointer hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default Signup;
