'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LOGIN_PATH } from '@/lib/routes';
import { useTRPC } from '@/lib/trpc';

export function LogoutButton() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const logout = useMutation(
    trpc.auth.logout.mutationOptions({
      onSuccess: () => {
        queryClient.clear();
        router.replace(LOGIN_PATH);
      },
      onError: () => toast.error("We couldn't sign you out. Try again."),
    }),
  );

  return (
    <Button variant="outline" size="sm" disabled={logout.isPending} onClick={() => logout.mutate()}>
      Sign out
    </Button>
  );
}
