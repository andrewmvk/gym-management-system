import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import { Providers } from '@/components/providers';
import { THEME_INIT_SCRIPT } from '@/lib/theme-script';
import '@/app/globals.css';

const barlow = Barlow({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const barlowCondensed = Barlow_Condensed({
  variable: '--font-barlow-condensed',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: { default: 'Cadence', template: '%s · Cadence' },
  description: 'Gym management with face-recognition check-in and AI training plans',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1c1f28' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1117' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
