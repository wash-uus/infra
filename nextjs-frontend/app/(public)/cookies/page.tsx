export const metadata = {
  title: 'Cookie Policy — INFRA',
};

export default function CookiePolicyPage() {
  return (
    <div className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="mb-3 text-3xl font-extrabold text-gray-900">Cookie Policy</h1>
        <p className="mb-10 text-sm text-gray-400">Effective: March 10, 2026</p>

        <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-600 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-800">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device by your browser when you visit a website.
              They help websites remember information about your visit and improve your experience on return visits.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800">2. How INFRA Uses Cookies</h2>
            <p>We use cookies for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Authentication:</strong> Firebase Auth uses session cookies to keep you signed in securely.</li>
              <li><strong>Preferences:</strong> We store your currency and display preferences locally.</li>
              <li><strong>Analytics:</strong> We use anonymised usage data to improve platform performance.</li>
              <li><strong>Security:</strong> Cookies help us detect and prevent fraudulent activity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800">3. Types of Cookies We Use</h2>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">Cookie</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Purpose</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2 font-mono">firebase-auth</td>
                    <td className="border border-gray-200 px-3 py-2">Keeps you signed in</td>
                    <td className="border border-gray-200 px-3 py-2">Session / 30 days</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2 font-mono">_infra_pref</td>
                    <td className="border border-gray-200 px-3 py-2">Stores UI preferences (currency, theme)</td>
                    <td className="border border-gray-200 px-3 py-2">1 year</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2 font-mono">_ga</td>
                    <td className="border border-gray-200 px-3 py-2">Google Analytics (anonymised)</td>
                    <td className="border border-gray-200 px-3 py-2">2 years</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800">4. Third-Party Cookies</h2>
            <p>
              Some features of INFRA (such as Google Sign-In and payment gateways) may set their own cookies.
              These are governed by the respective third parties&apos; privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800">5. Managing Cookies</h2>
            <p>
              You can control or delete cookies through your browser settings. Note that disabling certain cookies
              (such as authentication cookies) will affect your ability to use INFRA.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800">6. Your Consent</h2>
            <p>
              By continuing to use INFRA, you consent to our use of cookies as described in this policy.
              You may withdraw consent at any time by clearing cookies in your browser.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800">7. Contact Us</h2>
            <p>
              If you have questions about our cookie practices, please visit our{' '}
              <a href="/contact" className="text-infra-secondary hover:underline">Contact page</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
