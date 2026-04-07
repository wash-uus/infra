import Link from 'next/link';
import { Users, Target, Shield, Globe } from 'lucide-react';

export const metadata = {
  title: 'About INFRA',
  description: 'Learn about INFRA — the platform connecting engineering professionals, clients, and vendors.',
};

const STATS = [
  { label: 'Registered Professionals', value: '5,000+' },
  { label: 'Jobs Posted', value: '12,000+' },
  { label: 'Equipment Listings', value: '3,500+' },
  { label: 'Countries', value: '24' },
];

const VALUES = [
  {
    icon: Shield,
    title: 'Verified & Trusted',
    desc: 'Every professional on INFRA undergoes identity and credential verification, so clients can hire with confidence.',
  },
  {
    icon: Target,
    title: 'Built for Engineering',
    desc: 'Purpose-built for civil, structural, electrical, and other engineering disciplines — not a generic freelance marketplace.',
  },
  {
    icon: Users,
    title: 'Community First',
    desc: 'We invest in the profession, providing resources, networking, and tools to help engineers grow their careers.',
  },
  {
    icon: Globe,
    title: 'Global Reach, Local Impact',
    desc: 'Connect across borders while supporting projects in your local region. Multi-currency support built in.',
  },
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-infra-primary to-infra-primary py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-extrabold sm:text-5xl">About INFRA</h1>
          <p className="mt-5 text-lg text-infra-primary/10 sm:text-xl">
            We&apos;re on a mission to modernise how engineering talent connects with opportunity — transparently, securely, and globally.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-infra-primary">{s.value}</p>
                <p className="mt-1 text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="mb-5 text-2xl font-bold text-gray-900">Our Story</h2>
        <div className="space-y-4 text-gray-600 leading-relaxed">
          <p>
            INFRA was founded by engineers who faced the same frustrations — finding quality projects, verifying subcontractors,
            and getting paid on time. We built the platform we always wished existed.
          </p>
          <p>
            Today, INFRA serves professionals across civil engineering, structural design, surveying, MEP, and many other disciplines.
            Our escrow payment system, document verification, and real‐time messaging bring the entire project lifecycle onto one platform.
          </p>
          <p>
            We believe that the infrastructure of tomorrow is built by the professionals of today — and they deserve the best tools
            the internet can offer.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">What We Stand For</h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-infra-primary/10">
                  <v.icon className="h-5 w-5 text-infra-primary" />
                </div>
                <h3 className="mb-1 font-semibold text-gray-900">{v.title}</h3>
                <p className="text-sm text-gray-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-2xl font-bold text-gray-900">Ready to join INFRA?</h2>
          <p className="mt-3 text-gray-500">Whether you&apos;re hiring or looking for your next project — we have you covered.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-infra-primary px-6 py-3 font-semibold text-white shadow hover:bg-infra-primary transition-colors"
            >
              Create Free Account
            </Link>
            <Link
              href="/jobs"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Browse Jobs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
