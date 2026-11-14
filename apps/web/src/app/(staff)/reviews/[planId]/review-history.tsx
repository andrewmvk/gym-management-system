import { MessageSquareIcon, PencilLineIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n/i18n-provider';

interface ReviewEntry {
  id: string;
  authorName: string;
  createdAt: string | Date;
  isEdit: boolean;
  note: string;
}

function Header() {
  const { t } = useI18n();
  return (
    <CardHeader>
      <CardTitle>{t('Review history')}</CardTitle>
      <CardDescription>
        {t(
          "Every trainer's notes and edits, in order. Any staff member can read them, the member cannot, and none overwrite another.",
        )}
      </CardDescription>
    </CardHeader>
  );
}

function ReviewHistorySkeleton() {
  return (
    <Card>
      <Header />
      <CardContent className="flex flex-col gap-4 py-4">
        {Array.from({ length: 2 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
          <div key={index} className="flex gap-3">
            <Skeleton className="size-7 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReviewHistoryRoot({ reviews }: { reviews: readonly ReviewEntry[] }) {
  const { t, formatDateTime } = useI18n();
  return (
    <Card>
      <Header />
      <CardContent className="py-2">
        {reviews.length === 0 && <p className="py-4 text-sm text-muted-foreground">{t('No notes or edits yet.')}</p>}
        <ol className="flex flex-col">
          {reviews.map((review) => (
            <li key={review.id} className="flex gap-3 border-b py-4 last:border-b-0">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
                {review.isEdit ? <PencilLineIcon className="size-3.5" /> : <MessageSquareIcon className="size-3.5" />}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold">{review.authorName}</span>
                  <span className="numerals text-base text-muted-foreground">{formatDateTime(review.createdAt)}</span>
                  {review.isEdit ? (
                    <Badge variant="tape">{t('review::Edit')}</Badge>
                  ) : (
                    <Badge variant="secondary">{t('review::Note')}</Badge>
                  )}
                </p>
                <p className="text-sm text-pretty break-words whitespace-pre-wrap">{review.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export const ReviewHistory = Object.assign(ReviewHistoryRoot, { Skeleton: ReviewHistorySkeleton });
