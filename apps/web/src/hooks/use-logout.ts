import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LOGIN_PATH } from '@/lib/routes';
import { useTRPC } from '@/lib/trpc';

export function useLogout() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation(
    trpc.auth.logout.mutationOptions({
      onSuccess: () => {
        queryClient.clear();
        router.replace(LOGIN_PATH);
      },
      onError: () => toast.error("We couldn't sign you out. Try again."),
    }),
  );
}
