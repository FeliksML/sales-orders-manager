import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function Privacy() {
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
          <h1 className="text-white text-4xl font-bold mb-6">Privacy Policy</h1>
          <div className="text-gray-300 space-y-6">
            <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <p>We collect information that you provide directly to us, including:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Name and contact information</li>
                <li>Sales ID and professional details</li>
                <li>Email address and password (encrypted)</li>
                <li>Sales order and customer data</li>
                <li>Usage data and analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Provide, maintain, and improve our services</li>
                <li>Process and complete transactions</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">3. Information Sharing</h2>
              <p>
                We do not sell, trade, or otherwise transfer your personal information to outside parties except
                in the following circumstances:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>With your consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>With service providers who assist in our operations (under strict confidentiality agreements)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal data
                against unauthorized or unlawful processing, accidental loss, destruction, or damage. This includes:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Encryption of sensitive data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure backup and recovery procedures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">5. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes outlined in
                this privacy policy, unless a longer retention period is required or permitted by law. When we no
                longer need your information, we will securely delete or anonymize it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Access your personal data</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Request data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">7. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our service and hold certain
                information. You can instruct your browser to refuse all cookies or to indicate when a cookie is
                being sent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">8. Children's Privacy</h2>
              <p>
                Our service is not intended for use by children under the age of 13. We do not knowingly collect
                personal information from children under 13. If you become aware that a child has provided us with
                personal data, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting
                the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">10. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:privacy@salesordermanager.com" className="text-blue-300 hover:underline">
                  privacy@salesordermanager.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Privacy;
