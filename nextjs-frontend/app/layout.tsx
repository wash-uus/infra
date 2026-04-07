import { ReactNode } from 'react';
import './globals.css';
import QueryProvider from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import ToasterClient from '@/components/ToasterClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://infrasells.com';
const LOGO_URL = `${SITE_URL}/infrasells-logo.jpeg`;
const OG_IMAGE = LOGO_URL;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'InfraSells — Engineering Professionals Platform',
    template: '%s | InfraSells',
  },
  description: 'Find and hire verified engineering professionals across Africa. Post jobs, list tools, and connect with top talent.',
  keywords: ['engineering jobs', 'Africa', 'construction', 'infrastructure', 'professionals', 'hire engineers'],
  authors: [{ name: 'InfraSells' }],
  creator: 'InfraSells',
  publisher: 'InfraSells',
  manifest: '/manifest.json',
  themeColor: '#059669',
  colorScheme: 'light',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'InfraSells',
    title: 'InfraSells — Engineering Professionals Platform',
    description: 'Find and hire verified engineering professionals across Africa.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'InfraSells Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InfraSells — Engineering Professionals Platform',
    description: 'Find and hire verified engineering professionals across Africa.',
    images: [OG_IMAGE],
    creator: '@infrasells',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: [{ url: '/infrasells-logo.jpeg', type: 'image/jpeg' }],
    apple: [{ url: '/infrasells-logo.jpeg', type: 'image/jpeg' }],
    shortcut: '/infrasells-logo.jpeg',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'InfraSells',
  url: SITE_URL,
  logo: LOGO_URL,
  sameAs: ['https://twitter.com/infrasells'],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <QueryProvider>
          <AuthProvider>
            {children}
            <ToasterClient />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
