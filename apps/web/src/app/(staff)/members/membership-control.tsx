'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAppAbility } from '@/abilities';
import { MembershipBadge } from '@/app/(staff)/members/membership-badge';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { serverMessage } from '@/lib/error-message';
import { useTRPC } from '@/lib/trpc';

interface MembershipControlProps {
  userId: string;
  name: string;
  status: 'active' | 'inactive' | null;
}

// Admins flip the membership here; everyone else with access to the page reads the badge. Activating is one
// click, deactivating asks first because it signs the member out.
export function MembershipControl({ userId, name, status }: MembershipControlProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ability = useAppAbility();
  const [isConfirming, setIsConfirming] = useState(false);

  const setStatus = useMutation(
    trpc.members.setMembershipStatus.mutationOptions({
      onSuccess: (row) => {
        queryClient.setQueryData(trpc.auth.listMembers.queryKey(), (rows) =>
          rows?.map((item) => (item.id === row.id ? row : item)),
        );
        queryClient.setQueryData(trpc.members.get.queryKey({ userId }), (member) =>
          member
            ? { ...member, membership: { ...member.membership, status: row.membershipStatus ?? 'inactive' } }
            : member,
        );
        setIsConfirming(false);
        toast.success(
          row.membershipStatus === 'active'
            ? `${name} is active again and can log in.`
            : `${name} is inactive and was signed out.`,
        );
      },
      onError: (error) => {
        setIsConfirming(false);
        toast.error(serverMessage(error, `We couldn't change the membership of ${name}. Try again.`));
      },
    }),
  );

  if (status === null || !ability.can('update', 'Member')) return <MembershipBadge status={status} />;

  const isActive = status === 'active';

  return (
    <>
      <div className="flex items-center gap-3">
        <Switch
          checked={isActive}
          disabled={setStatus.isPending}
          aria-label={`Membership of ${name}`}
          onCheckedChange={(checked) => {
            if (checked) setStatus.mutate({ userId, status: 'active' });
            else setIsConfirming(true);
          }}
        />
        <MembershipBadge status={status} />
      </div>
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {name} is signed out right away and cannot log in until a staff member activates the membership again.
              Their plans and history stay as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setStatus.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ userId, status: 'inactive' })}
            >
              {setStatus.isPending ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
