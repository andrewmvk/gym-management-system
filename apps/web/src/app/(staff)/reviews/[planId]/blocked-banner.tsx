import { TriangleAlertIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-provider';

interface BlockedBannerProps {
  blocked: readonly { exerciseId: string; name: string; equipmentDown: readonly string[] }[];
}

// A fact, not a verdict: these exercises cannot be done today. It never blocks publication.
export function BlockedBanner({ blocked }: BlockedBannerProps) {
  const { t, tx } = useI18n();

  function describeEquipmentDown(equipmentDown: readonly string[]) {
    const equipment = equipmentDown.map((piece) => tx(piece)).join(', ');
    return equipmentDown.length === 1
      ? t('{equipment} is out of service', { equipment })
      : t('{equipment} are out of service', { equipment });
  }

  return (
    <section
      role="status"
      aria-label={t('Must review')}
      className="flex gap-4 rounded-lg bg-tape px-5 py-4 text-tape-foreground sm:px-6"
    >
      <TriangleAlertIcon className="mt-1 size-5 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="font-display text-xl font-bold tracking-wide uppercase">{t('Must review')}</h2>
        <ul className="flex flex-col gap-0.5">
          {blocked.map((entry) => (
            <li key={entry.exerciseId} className="text-pretty">
              <span className="font-semibold">{tx(entry.name)}</span>
              {entry.equipmentDown.length > 0 && <span>: {describeEquipmentDown(entry.equipmentDown)}</span>}
            </li>
          ))}
        </ul>
        <p className="text-sm text-pretty">
          {t(
            'The member sees this plan flagged too. Save a version without these exercises, or bring the equipment back, and the flag clears.',
          )}
        </p>
      </div>
    </section>
  );
}
