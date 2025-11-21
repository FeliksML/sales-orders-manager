import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function Terms() {
  return (
    <div
      className="min-h-screen py-12 px-4"
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
      <div className="max-w-4xl mx-auto">
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Sign Up
        </Link>

        <div
          className="p-8 rounded-3xl shadow-2xl"
          style={{
            backgroundColor: "rgba(0, 15, 33, 0.25)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 200, 255, 0.3)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.37), inset 0 0 80px rgba(0, 200, 255, 0.1)",
          }}
        >
          <h1 className="text-white text-4xl font-bold mb-6">Terms of Service</h1>
          <div className="text-gray-300 space-y-6">
            <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using the Sales Order Manager application, you accept and agree to be bound by
                the terms and provision of this agreement. If you do not agree to these terms, please do not use
                this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">2. Use License</h2>
              <p>
                Permission is granted to temporarily use Sales Order Manager for personal or commercial purposes.
                This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose without authorization</li>
                <li>Attempt to decompile or reverse engineer any software contained in the application</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">3. User Account</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account and password. You agree to
                accept responsibility for all activities that occur under your account. You must notify us
                immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">4. Data and Privacy</h2>
              <p>
                We collect and process your personal data in accordance with our Privacy Policy. By using this
                service, you consent to such processing and you warrant that all data provided by you is accurate.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">5. Prohibited Activities</h2>
              <p>You agree not to engage in any of the following prohibited activities:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Violating laws and regulations</li>
                <li>Infringing on intellectual property rights</li>
                <li>Transmitting malicious code or viruses</li>
                <li>Attempting to gain unauthorized access to the system</li>
                <li>Interfering with or disrupting the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">6. Limitation of Liability</h2>
              <p>
                In no event shall Sales Order Manager or its suppliers be liable for any damages (including,
                without limitation, damages for loss of data or profit, or due to business interruption) arising
                out of the use or inability to use the materials on Sales Order Manager.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">7. Modifications</h2>
              <p>
                We may revise these terms of service at any time without notice. By using this application you
                are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">8. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us at{" "}
                <a href="mailto:support@salesordermanager.com" className="text-blue-300 hover:underline">
                  support@salesordermanager.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Terms;
