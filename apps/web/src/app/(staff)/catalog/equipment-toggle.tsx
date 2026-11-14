'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { serverMessage } from '@/lib/error-message';
import { type I18n, useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';

interface EquipmentToggleProps {
  id: string;
  name: string;
  isAvailable: boolean;
}

function plans({ t }: I18n, count: number) {
  return count === 1 ? t('1 plan') : t('{count} plans', { count });
}

function members({ t }: I18n, count: number) {
  return count === 1 ? t('1 member') : t('{count} members', { count });
}

// Putting a piece back is one click; taking it out asks first, with the plans it would flag in front of the
// admin. The switch always shows the saved state, so a failed save leaves it where it was.
export function EquipmentToggle({ id, name, isAvailable }: EquipmentToggleProps) {
  const i18n = useI18n();
  const { t, tn, tx } = i18n;
  const pieceName = tx(name);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);

  const impactQuery = useQuery({
    ...trpc.catalog.equipmentImpact.queryOptions({ equipmentId: id }),
    enabled: isConfirming,
    // The counts are read off live plans, so each confirmation asks again instead of showing an old answer.
    gcTime: 0,
  });

  const setAvailability = useMutation(
    trpc.catalog.setEquipmentAvailability.mutationOptions({
      // Exercise availability and must-review plans derive from equipment availability (FR-17 / RN-04), so
      // every list that shows them is refreshed, not just the equipment list.
      onSuccess: (_data, variables) => {
        for (const key of [
          trpc.catalog.listEquipment.queryKey(),
          trpc.catalog.list.queryKey(),
          trpc.reviews.queue.queryKey(),
          trpc.reviews.overview.queryKey(),
        ]) {
          queryClient.invalidateQueries({ queryKey: key });
        }
        setIsConfirming(false);
        toast.success(
          variables.isAvailable
            ? t('{name} is back in service.', { name: pieceName })
            : t('{name} is out of service.', { name: pieceName }),
        );
      },
      onError: (error) => {
        setIsConfirming(false);
        toast.error(tx(serverMessage(error, t("We couldn't update {name}. Try again.", { name: pieceName }))));
      },
    }),
  );

  const impact = impactQuery.data;

  return (
    <>
      <Switch
        id={`equipment-${id}`}
        checked={isAvailable}
        disabled={setAvailability.isPending}
        aria-label={t('{name} in service', { name: pieceName })}
        onCheckedChange={(checked) => {
          if (checked) setAvailability.mutate({ id, isAvailable: true });
          else setIsConfirming(true);
        }}
      />
      <AlertDialog open={isConfirming} onOpenChange={(open) => !setAvailability.isPending && setIsConfirming(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Take {name} out of service?', { name: pieceName })}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                {impactQuery.isPending && (
                  <>
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                  </>
                )}
                {impactQuery.isError && (
                  <p>
                    {t(
                      "We couldn't check which plans depend on it. You can still take it out of service, and any plan that needs it is flagged as Must review.",
                    )}
                  </p>
                )}
                {impact && impact.newlyBlockedPlanCount === 0 && <p>{t('No plan depends on it.')}</p>}
                {impact && impact.newlyBlockedPlanCount > 0 && (
                  <p>
                    {tn('{plans} dated today or later will be marked Must review ({members} affected).', {
                      plans: (
                        <span className="numerals text-base font-semibold text-foreground">
                          {plans(i18n, impact.newlyBlockedPlanCount)}
                        </span>
                      ),
                      members: (
                        <span className="numerals text-base font-semibold text-foreground">
                          {members(i18n, impact.affectedMemberCount)}
                        </span>
                      ),
                    })}
                  </p>
                )}
                {impact && (
                  <p>
                    {tn('{plans} dated today use it.', {
                      plans: (
                        <span className="numerals text-base font-semibold text-foreground">
                          {plans(i18n, impact.todayPlanCount)}
                        </span>
                      ),
                    })}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setAvailability.isPending}>{t('Cancel')}</AlertDialogCancel>
            <Button
              disabled={setAvailability.isPending || impactQuery.isPending}
              onClick={() => setAvailability.mutate({ id, isAvailable: false })}
            >
              {setAvailability.isPending ? t('Saving...') : t('Take out of service')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
