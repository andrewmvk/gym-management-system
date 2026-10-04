import { MemberDetail } from '@/app/(staff)/members/[id]/member-detail';

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberDetail userId={id} />;
}
