// FILE: src/app/layout.tsx

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import InstallAppBanner from '@/components/pwa/InstallAppBanner';

export const metadata: Metadata = {
  title: 'EdStop',
  description:
    'IIT Kharagpur campus commerce, food, essentials, orders and student services.',
  applicationName: 'EdStop',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EdStop',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <ToastProvider>
            {children}
            <InstallAppBanner />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}