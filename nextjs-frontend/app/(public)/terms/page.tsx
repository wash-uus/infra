export const metadata = { title: 'Terms of Service – INFRA' };

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using INFRA ("the Platform"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use the Platform.`,
  },
  {
    title: '2. Description of Service',
    body: `INFRA is a marketplace connecting infrastructure professionals (engineers, surveyors, architects and related specialists), clients, and equipment vendors. The Platform facilitates job postings, equipment listings, professional networking, and project transactions.`,
  },
  {
    title: '3. User Accounts',
    body: `You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You must be at least 18 years old to register. INFRA reserves the right to suspend or terminate accounts that violate these terms.`,
  },
  {
    title: '4. Subscription Tiers',
    body: `INFRA offers Free, Premium, and Gold membership tiers. Each tier carries different limits on active listings and features as described on the Pricing page. Subscription fees are billed monthly and are non-refundable except where required by applicable law. You may upgrade or downgrade your plan at any time.`,
  },
  {
    title: '5. Listings and Content',
    body: `Users are solely responsible for the content they post. You agree not to post false, misleading, discriminatory, or unlawful content. INFRA reserves the right to remove any listing or content that violates these terms without notice. Job or equipment listings must accurately represent the opportunity or item being offered.`,
  },
  {
    title: '6. Transactions and Payments',
    body: `INFRA facilitates payments between clients and professionals through supported payment methods (M-Pesa, PayPal). INFRA is not a party to the underlying service agreement between users. Payment release is contingent on the professional marking work as complete and the client confirming satisfaction. INFRA charges a platform service fee on completed transactions.`,
  },
  {
    title: '7. Professional Verification',
    body: `Verification badges are awarded after INFRA reviews submitted documents. INFRA does not guarantee the accuracy or validity of any professional credentials. Users are encouraged to independently verify qualifications before engaging professionals.`,
  },
  {
    title: '8. Prohibited Conduct',
    body: `Users may not: attempt to circumvent platform fees by conducting transactions off-platform; harass, threaten, or defraud other users; scrape or copy the Platform's data without consent; impersonate another person or entity; or use the Platform for any unlawful purpose.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `To the maximum extent permitted by law, INFRA shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform. INFRA's total liability shall not exceed the amount you paid to INFRA in the 12 months preceding the claim.`,
  },
  {
    title: '10. Changes to Terms',
    body: `INFRA reserves the right to modify these terms at any time. Changes will be posted on this page with an updated effective date. Continued use of the Platform after changes constitutes acceptance of the revised terms.`,
  },
  {
    title: '11. Governing Law',
    body: `These Terms are governed by the laws of Kenya. Any disputes shall be resolved in the courts of Nairobi, Kenya.`,
  },
  {
    title: '12. Contact',
    body: `For questions about these Terms, contact us at legal@infrasells.com.`,
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500">Effective date: March 10, 2026</p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg font-semibold text-gray-800">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
