import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import { Providers } from '@/components/providers';
import { getI18n, getLocale } from '@/lib/i18n/server';
import { htmlLang } from '@/lib/i18n/translate';
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

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: 'Cadence', template: '%s · Cadence' },
    description: t('Gym management with face-recognition check-in and AI training plans'),
    appleWebApp: { capable: true, title: 'Cadence', statusBarStyle: 'black-translucent' },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1c1f28' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1117' },
  ],
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();

  return (
    <html
      lang={htmlLang(locale)}
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant theme init script, no user input; must run before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
