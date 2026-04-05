import { ReactNode } from 'react';
import './globals.css';
import QueryProvider from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import ToasterClient from '@/components/ToasterClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://infrasells.com';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'INFRA — Engineering Professionals Platform',
    template: '%s | INFRA',
  },
  description: 'Find and hire verified engineering professionals across Africa. Post jobs, list tools, and connect with top talent.',
  keywords: ['engineering jobs', 'Africa', 'construction', 'infrastructure', 'professionals', 'hire engineers'],
  authors: [{ name: 'INFRA' }],
  creator: 'INFRA',
  publisher: 'INFRA',
  manifest: '/manifest.json',
  themeColor: '#059669',
  colorScheme: 'light',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'INFRA',
    title: 'INFRA — Engineering Professionals Platform',
    description: 'Find and hire verified engineering professionals across Africa.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'INFRA Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'INFRA — Engineering Professionals Platform',
    description: 'Find and hire verified engineering professionals across Africa.',
    images: [OG_IMAGE],
    creator: '@infraafrica',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
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
