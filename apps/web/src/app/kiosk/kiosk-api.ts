import type { GalleryEntry } from '@cadence/shared/faces/match';

const KIOSK_KEY_HEADER = 'x-kiosk-key';

export type CheckInResult =
  | { kind: 'recorded'; memberName: string; turnstileStatus: 'success' | 'failed' }
  | { kind: 'membership_inactive'; memberName?: string }
  | { kind: 'member_not_found' };

function kioskHeaders(extra: Record<string, string> = {}) {
  return { [KIOSK_KEY_HEADER]: process.env.NEXT_PUBLIC_KIOSK_API_KEY ?? '', ...extra };
}

export async function fetchEmbeddings(): Promise<GalleryEntry[]> {
  const response = await fetch('/kiosk/embeddings', { headers: kioskHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error(`Embeddings request failed with status ${response.status}`);
  return response.json();
}

export type DevMember = { memberId: string; name: string };

export async function fetchDevMembers(): Promise<DevMember[]> {
  const response = await fetch('/kiosk/dev/members', { headers: kioskHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error(`Dev members request failed with status ${response.status}`);
  return response.json();
}

export async function postCheckIn(memberId: string): Promise<CheckInResult> {
  const response = await fetch('/kiosk/checkins', {
    method: 'POST',
    headers: kioskHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ memberId }),
  });
  if (response.status === 404) return { kind: 'member_not_found' };
  if (response.status === 403) {
    const body: { memberName?: string } = await response.json().catch(() => ({}));
    return { kind: 'membership_inactive', memberName: body.memberName };
  }
  if (!response.ok) throw new Error(`Check-in request failed with status ${response.status}`);

  const body: { memberName: string; turnstileStatus: 'success' | 'failed' } = await response.json();
  return { kind: 'recorded', memberName: body.memberName, turnstileStatus: body.turnstileStatus };
}
