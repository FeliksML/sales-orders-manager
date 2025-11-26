import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { API_BASE_URL } from '../utils/apiUrl';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");
  const verificationAttempted = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. No token provided.");
      return;
    }

    // Prevent duplicate verification attempts
    if (verificationAttempted.current) {
      console.log("⏭️ Verification already attempted, skipping...");
      return;
    }

    verificationAttempted.current = true;

    // Verify the email
    const verifyEmail = async () => {
      try {
        console.log("🔍 Starting email verification...");
        const response = await fetch(`${API_BASE_URL}/auth/verify-email/${token}`);
        console.log("📡 Response status:", response.status, response.statusText);

        const data = await response.json();
        console.log("📦 Response data:", data);

        // Check for errors (status 400 or error field)
        if (!response.ok || data.error) {
          console.log("❌ Verification failed:", data.error);
          setStatus("error");
          setMessage(data.error || "Failed to verify email. Please try again.");
          return;
        }

        // Check for success
        if (data.success && data.message) {
          console.log("✅ Verification successful!");
          setStatus("success");
          setMessage(data.message);

          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        } else {
          console.log("⚠️ Unexpected response format:", data);
          setStatus("error");
          setMessage("Unexpected response from server. Please contact support.");
        }
      } catch (error) {
        console.error("💥 Verification error:", error);
        setStatus("error");
        setMessage("Network error. Please try again later.");
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
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
      <div
        className="w-full max-w-md p-8 rounded-3xl shadow-2xl text-center"
        style={{
          backgroundColor: "rgba(0, 15, 33, 0.25)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(0, 200, 255, 0.3)",
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.37), inset 0 0 80px rgba(0, 200, 255, 0.1)",
        }}
      >
        <h1 className="text-white text-3xl font-bold mb-6">Email Verification</h1>

        <div className="flex flex-col items-center justify-center min-h-[200px]">
          {status === "verifying" && (
            <>
              <Loader2 className="animate-spin text-blue-400 mb-4" size={64} />
              <p className="text-gray-300 text-lg">Verifying your email...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="text-green-500 mb-4" size={64} />
              <p className="text-green-400 text-lg font-semibold mb-2">Success!</p>
              <p className="text-gray-300 mb-4">{message}</p>
              <p className="text-gray-400 text-sm">Redirecting to login page...</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="text-red-500 mb-4" size={64} />
              <p className="text-red-400 text-lg font-semibold mb-2">Verification Failed</p>
              <p className="text-gray-300 mb-6">{message}</p>
              <Link
                to="/signup"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Go to Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
