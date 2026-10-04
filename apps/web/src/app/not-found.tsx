import type { Metadata } from 'next';
import Link from 'next/link';
import { PageMessage } from '@/components/page-message';
import { PublicHeader } from '@/components/public-header';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <PageMessage title="We can't find that page. It may have moved, or the link is wrong.">
        <Button asChild>
          <Link href="/">Back to Cadence</Link>
        </Button>
      </PageMessage>
    </>
  );
}
