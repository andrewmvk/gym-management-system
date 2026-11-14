'use client';

import type { Locale } from '@cadence/shared/schemas/locale';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/lib/i18n/i18n-provider';
import { createTrpcClient, TRPCProvider } from '@/lib/trpc';

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  const [trpcClient] = useState(createTrpcClient);

  return (
    <I18nProvider locale={locale}>
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          {children}
          <Toaster richColors />
        </TRPCProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
