export const metadata = { title: 'Privacy Policy – INFRA' };

const SECTIONS = [
  {
    title: '1. Introduction',
    body: `INFRA ("we", "our", "us") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect information you provide directly (name, email, phone number, professional credentials, uploaded documents), information generated through your use of the Platform (job postings, applications, messages, transaction history, profile views), and technical data (IP address, browser type, device identifiers, cookies).`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your data to: operate and improve the Platform; match professionals with job opportunities; process payments; send transactional and marketing communications (you may opt out of marketing at any time); verify professional identities and credentials; comply with legal obligations; and prevent fraud and abuse.`,
  },
  {
    title: '4. Data Sharing',
    body: `We do not sell your personal data. We share data with: service providers who help us operate the Platform (Firebase, payment processors, cloud storage); other users to the extent necessary for the service (e.g. your public profile and listings); law enforcement or regulators when required by law. All third-party processors are bound by data processing agreements.`,
  },
  {
    title: '5. Profile Visibility',
    body: `Your public profile (name, headline, disciplines, average rating, public portfolio) is visible to all users. Contact details (phone number, email) are only shared after a connection is established or where required for a transaction. You can control visibility in your account settings.`,
  },
  {
    title: '6. Document Verification',
    body: `Documents you upload for verification (ID, licences, certificates) are stored securely and reviewed only by authorised INFRA staff. They are not shared publicly or with other users. Documents are retained for 3 years after account closure for compliance purposes.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your account data for as long as your account is active. After account deletion, data is retained for 30 days in backups before permanent deletion, except where we are legally required to retain it longer.`,
  },
  {
    title: '8. Security',
    body: `We use industry-standard security measures including encryption in transit (TLS), encrypted storage, access controls, and regular security audits. However, no method of transmission over the internet is 100% secure.`,
  },
  {
    title: '9. Your Rights',
    body: `Depending on your jurisdiction, you may have the right to: access the personal data we hold about you; correct inaccurate data; request deletion of your data; object to processing; or data portability. To exercise these rights, contact privacy@infrasells.com.`,
  },
  {
    title: '10. Cookies',
    body: `We use cookies and similar technologies for authentication, preferences, and analytics. You can control cookie preferences through your browser settings, though disabling cookies may affect Platform functionality.`,
  },
  {
    title: '11. Children',
    body: `The Platform is not directed at individuals under 18 years of age. We do not knowingly collect personal data from minors.`,
  },
  {
    title: '12. Changes to This Policy',
    body: `We may update this policy periodically. We will notify registered users of material changes by email or in-app notification. The effective date at the top of this page will be updated accordingly.`,
  },
  {
    title: '13. Contact',
    body: `For privacy enquiries, contact our Data Protection Officer at privacy@infrasells.com.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold text-gray-900">Privacy Policy</h1>
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
