import type { Metadata } from 'next';
import Link from 'next/link';
import { PageMessage } from '@/components/page-message';
import { PublicHeader } from '@/components/public-header';
import { Button } from '@/components/ui/button';
import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Page not found') };
}

export default async function NotFound() {
  const { t } = await getI18n();

  return (
    <>
      <PublicHeader />
      <PageMessage title={t("We can't find that page. It may have moved, or the link is wrong.")}>
        <Button asChild>
          <Link href="/">{t('Back to Cadence')}</Link>
        </Button>
      </PageMessage>
    </>
  );
}
