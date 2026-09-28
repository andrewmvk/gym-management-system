import { PlanReviewDetail } from './plan-review-detail';

export default async function ReviewDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  return <PlanReviewDetail planId={planId} />;
}
