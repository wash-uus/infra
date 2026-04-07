import Link from 'next/link';
import { ArrowRight, Shield, Star, Globe, Wrench, Briefcase, Users, Lock, CheckCircle, Zap } from 'lucide-react';
import HomepageToolsSection from '@/components/hero/HomepageToolsSection';

export default function HomePage() {
  return (
    <>
      {/* ════════════════════════════════ HERO — STATIC SSR-SAFE ════════════════════════════════ */}
      <section className="relative overflow-hidden bg-infra-primary text-white">
        {/* Ambient glow orbs - STATIC, no animation */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-infra-secondary opacity-20 blur-3xl rounded-full" />
          <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-infra-accent opacity-15 blur-3xl rounded-full" />
        </div>

        {/* Dot grid overlay - STATIC */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 40%, transparent 100%)',
          }}
        />

        {/* Main content */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-28 sm:px-6 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-4xl text-center">
            {/* Top badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-infra-secondary/25 bg-infra-secondary/10 px-5 py-2 text-sm font-medium text-white/80 ring-1 ring-inset ring-white/5 backdrop-blur-sm">
              <Zap className="h-4 w-4 text-infra-accent" />
              Africa&apos;s #1 Infrastructure Professionals Platform
            </div>

            {/* Headline - STATIC */}
            <h1 className="mt-8 text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[84px]">
              Infrastructure Work,
              <span className="block bg-gradient-to-r from-infra-secondary via-infra-accent to-white bg-clip-text text-transparent">
                Reimagined.
              </span>
            </h1>

            {/* Subtitle - STATIC */}
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
              Hire verified engineers, post jobs, list equipment, and process secure payments —
              all in one trusted platform built for infrastructure professionals.
            </p>

            {/* CTAs - STATIC */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup">
                <span className="group inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-infra-secondary px-8 py-4 text-base font-semibold text-white shadow-[0_0_40px_rgba(249,115,22,0.4)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_64px_rgba(249,115,22,0.55)] active:scale-[0.97]">
                  Get started free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
              <Link href="/tools">
                <span className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10 active:scale-[0.97]">
                  Browse equipment
                </span>
              </Link>
            </div>

            {/* Trust tags - STATIC */}
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {[
                { icon: Shield, text: 'Verified Professionals' },
                { icon: Lock, text: 'Escrow Protected' },
                { icon: Globe, text: 'Multi-Currency' },
                { icon: CheckCircle, text: 'Real-Time Bids' },
              ].map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-1.5 text-sm text-slate-400"
                >
                  <Icon className="h-3.5 w-3.5 text-infra-secondary" />
                  {text}
                </span>
              ))}
            </div>
          </div>

          {/* Trust signals — static, factual, always accurate */}
          <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Shield,    label: 'Verified Professionals', value: 'ID-Verified' },
              { icon: Lock,      label: 'Secure Payments',        value: 'Escrow' },
              { icon: Globe,     label: 'Built for Africa',       value: 'Kenya-First' },
              { icon: CheckCircle, label: 'Project Completion',   value: 'Auditable' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center backdrop-blur-sm transition-colors hover:bg-white/[0.07]"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <stat.icon className="h-5 w-5 text-infra-secondary" />
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1.5 text-xs font-medium text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade gradient - STATIC */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-infra-background to-transparent" />
      </section>

      {/* ════ TOOLS-FIRST MARKETPLACE SECTION (dynamic client component) ════ */}
      <HomepageToolsSection />

      {/* ════════════════════════════════ FEATURES SECTION (STATIC) ════════════════════════════════ */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-infra-secondary">Why INFRA</p>
            <h2 className="mt-2 text-4xl font-bold text-gray-900">Everything you need, in one place</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">
              INFRA brings together all the tools engineering professionals and clients need to
              work together efficiently.
            </p>
          </div>

          {/* Features grid - completely STATIC */}
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Shield,
                title: 'Verified Professionals',
                description: 'Every professional is identity-verified. Licence & certification checks add an extra layer of trust.',
                gradient: 'from-infra-primary to-infra-primary/80',
                bg: 'bg-infra-primary/5',
              },
              {
                icon: Wrench,
                title: 'Equipment Marketplace',
                description: "Buy, sell, or rent construction and surveying equipment directly from owners. Kenya's largest infrastructure equipment marketplace.",
                gradient: 'from-infra-accent to-infra-accent/80',
                bg: 'bg-infra-accent/10',
              },
              {
                icon: Briefcase,
                title: 'Jobs & Services Marketplace',
                description: 'Post jobs, list engineering services, and receive bids from qualified professionals across disciplines.',
                gradient: 'from-infra-secondary to-infra-secondary/80',
                bg: 'bg-infra-secondary/5',
              },
              {
                icon: Lock,
                title: 'Escrow Payments',
                description: 'Funds held securely until work is approved. M-Pesa, PayPal, and Stripe supported.',
                gradient: 'from-infra-primary to-infra-secondary',
                bg: 'bg-infra-primary/5',
              },
              {
                icon: Star,
                title: 'Verified Reviews',
                description: 'Ratings are tied to completed, paid transactions — no fake reviews.',
                gradient: 'from-infra-accent to-infra-secondary',
                bg: 'bg-infra-accent/10',
              },
              {
                icon: Globe,
                title: 'Global + Local',
                description: 'Connect with engineers locally or across borders. Multi-currency support built in.',
                gradient: 'from-infra-secondary to-infra-primary',
                bg: 'bg-infra-secondary/5',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.bg}`}>
                  <feature.icon className={`h-6 w-6 bg-gradient-to-br ${feature.gradient} bg-clip-text text-transparent`} />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════ CTA SECTION (STATIC) ════════════════════════════════ */}
      <section className="bg-infra-primary py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white">Ready to get started?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
            Join thousands of verified engineering professionals and clients already using INFRA to collaborate,
            bid on projects, and get work done.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-infra-secondary px-6 py-3 font-semibold text-white transition-all hover:brightness-110">
                Get started for free
              </span>
            </Link>
            <Link href="/browse">
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition-all hover:bg-white/20">
                Browse opportunities
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
