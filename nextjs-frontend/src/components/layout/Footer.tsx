import Link from 'next/link';
import InfraLogo from '@/components/ui/InfraLogo';

const LINKS = {
  Platform: [
    { href: '/jobs', label: 'Browse Jobs' },
    { href: '/tools', label: 'Equipment' },
    { href: '/search', label: 'Find Professionals' },
    { href: '/pricing', label: 'Pricing' },
  ],
  Company: [
    { href: '/about', label: 'About InfraSells' },
    { href: '/contact', label: 'Contact' },
  ],
  Legal: [
    { href: '/terms', label: 'Terms of Service' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/cookies', label: 'Cookie Policy' },
  ],
};

export default function Footer() {
  const year = 2026;

  return (
    <footer className="border-t border-infra-neutral/20 bg-infra-neutral">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/">
              <InfraLogo size="sm" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-gray-300">
              Connecting verified engineering professionals, clients, and services globally.
            </p>
          </div>

          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{section}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-300 transition-colors duration-200 hover:text-infra-secondary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-gray-100 pt-8 text-center sm:text-left">
          <p className="text-sm text-gray-400">
            &copy; {year} InfraSells Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
