'use client';

import {
  BanIcon,
  CircleCheckBigIcon,
  DoorOpenIcon,
  IdCardIcon,
  type LucideIcon,
  RefreshCwIcon,
  ScanFaceIcon,
  TriangleAlertIcon,
  UserRoundIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Deferred } from '@/components/deferred';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const RESULT_COOLDOWN_MS = 5000;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// no_match_limit is a run of misses, not a determination about the person: it keeps the dashed form.
// see_staff and membership_inactive are settled decisions about access, so they are solid.
export type KioskResult =
  | { kind: 'granted' }
  | { kind: 'turnstile_failed' }
  | { kind: 'retry' }
  | { kind: 'no_match_limit' }
  | { kind: 'see_staff' }
  | { kind: 'membership_inactive' }
  | { kind: 'request_failed' };

export type KioskSource = 'camera' | 'image';

export type KioskStatusState =
  | { kind: 'preparing' }
  | { kind: 'scanning'; severalFaces: boolean; source: KioskSource }
  | { kind: 'unavailable'; title: string; detail: string; devNote?: string; onRetry: () => void }
  | KioskResult;

interface ResultCopy {
  title: string;
  detail: string;
  staffNote?: string;
  tone: string;
  icon: LucideIcon;
}

const COPY: Record<KioskResult['kind'], ResultCopy> = {
  granted: {
    title: 'Access granted',
    detail: 'Welcome in. Your check-in is recorded.',
    tone: 'outline-success bg-success text-success-foreground',
    icon: CircleCheckBigIcon,
  },
  turnstile_failed: {
    title: 'Please wait',
    detail: 'A staff member will open the door for you.',
    staffNote: 'Staff: the turnstile did not respond. The check-in is recorded, so let this member through.',
    tone: 'outline-tape bg-tape text-tape-foreground',
    icon: DoorOpenIcon,
  },
  retry: {
    title: 'Try again',
    detail: 'We could not match your face. Step closer and look straight at the camera.',
    tone: 'outline-dashed outline-kit-muted text-kit-foreground',
    icon: RefreshCwIcon,
  },
  no_match_limit: {
    title: 'Please see the front desk',
    detail: 'We could not match your face after a few tries. Staff will help you in.',
    tone: 'outline-dashed outline-kit-muted text-kit-foreground',
    icon: UserRoundIcon,
  },
  see_staff: {
    title: 'Access not available',
    detail: 'We cannot let you in from here. Please see the front desk.',
    tone: 'outline-destructive text-kit-foreground',
    icon: BanIcon,
  },
  membership_inactive: {
    title: 'Membership inactive',
    detail: 'Please see the front desk.',
    tone: 'outline-destructive text-kit-foreground',
    icon: IdCardIcon,
  },
  request_failed: {
    title: 'Check-in unavailable',
    detail:
      'We could not reach the check-in service, so nothing was recorded. Try again in a moment, or see the front desk.',
    tone: 'outline-dashed outline-destructive text-kit-foreground',
    icon: TriangleAlertIcon,
  },
};

// How loud a card's outline is: low while it waits, mid while its step is under way, high once it has what it needed.
// The two cards each get their own level, so the highlight walks from the camera card to the status card.
export type FrameLevel = 'low' | 'mid' | 'high';

// An inset outline (not a border) so the thickness can change without nudging the content inside.
const LEVEL_OUTLINE: Record<FrameLevel, string> = {
  low: 'outline-1 -outline-offset-1',
  mid: 'outline-2 -outline-offset-2',
  high: 'outline-4 -outline-offset-4',
};

export function frameOutline(level: FrameLevel) {
  return cn('outline motion-safe:transition-all', LEVEL_OUTLINE[level]);
}

// The camera card takes the outline color of the state shown beside it, so the screen still reads as one state.
export function statusFrameTone(state: KioskStatusState) {
  if (state.kind === 'preparing') return 'outline-kit-line';
  if (state.kind === 'scanning') return 'outline-primary';
  if (state.kind === 'unavailable') return 'outline-dashed outline-destructive';
  return COPY[state.kind].tone
    .split(' ')
    .filter((token) => token.startsWith('outline-'))
    .join(' ');
}

function CooldownBar() {
  const [drained, setDrained] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrained(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="h-2 w-full -skew-x-12 overflow-hidden rounded-xs bg-current/20" aria-hidden>
      <div
        className={cn(
          'h-full origin-left bg-current ease-linear motion-safe:transition-transform',
          drained && 'scale-x-0',
        )}
        style={{ transitionDuration: `${RESULT_COOLDOWN_MS}ms` }}
      />
    </div>
  );
}

// Three slanted segments pulse in turn while the panel waits for a face.
function ScanningSegments() {
  return (
    <div className="flex gap-2" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-3 w-12 -skew-x-12 rounded-xs bg-primary motion-safe:animate-pulse"
          style={{ animationDelay: `${index * 300}ms` }}
        />
      ))}
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="size-20 bg-kit-foreground/10" />
      <Skeleton className="h-20 w-4/5 bg-kit-foreground/10 xl:h-24" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-full bg-kit-foreground/10" />
        <Skeleton className="h-8 w-2/3 bg-kit-foreground/10" />
      </div>
    </div>
  );
}

const PANEL = 'flex h-full flex-col justify-between gap-10 rounded-lg p-6 sm:p-8 lg:p-10';
const ICON = 'size-20 stroke-[1.75] lg:size-24';
const TITLE =
  'font-display text-6xl leading-none font-extrabold text-balance uppercase sm:text-7xl lg:text-7xl 2xl:text-8xl';
const DETAIL = 'max-w-prose text-2xl leading-snug lg:text-3xl';

type ScanningState = Extract<KioskStatusState, { kind: 'scanning' }>;

function scanningTitle({ source, severalFaces }: ScanningState) {
  if (source === 'image') return 'Choose a photo';
  return severalFaces ? 'One at a time' : 'Look at the camera';
}

function scanningDetail({ source, severalFaces }: ScanningState) {
  if (source === 'image') return 'Pick a clear JPEG or PNG with one face in it.';
  return severalFaces
    ? 'More than one face is in view. Please step up on your own.'
    : 'Stand still and face the screen. The door opens when we know you.';
}

export function KioskStatus({ state, level }: { state: KioskStatusState; level: FrameLevel }) {
  const frame = frameOutline(level);

  if (state.kind === 'preparing') {
    return (
      <section aria-busy className={cn(PANEL, frame, statusFrameTone(state))}>
        <Deferred>
          <StatusSkeleton />
        </Deferred>
      </section>
    );
  }

  if (state.kind === 'scanning') {
    return (
      <section role="status" className={cn(PANEL, frame, statusFrameTone(state))}>
        <div key="scanning" className="flex animate-block-in flex-col gap-8">
          <ScanFaceIcon className={cn(ICON, 'text-primary')} aria-hidden />
          <h1 className={TITLE}>{scanningTitle(state)}</h1>
          <p className={cn(DETAIL, 'text-kit-muted')}>{scanningDetail(state)}</p>
        </div>
        {state.source === 'camera' && <ScanningSegments />}
      </section>
    );
  }

  if (state.kind === 'unavailable') {
    return (
      <section role="alert" className={cn(PANEL, frame, statusFrameTone(state))}>
        <div key="unavailable" className="flex animate-block-in flex-col gap-8">
          <TriangleAlertIcon className={ICON} aria-hidden />
          <h1 className={TITLE}>{state.title}</h1>
          <p className={cn(DETAIL, 'text-kit-muted')}>{state.detail}</p>
          {!IS_PRODUCTION && state.devNote && <p className="text-base text-kit-muted">Dev only: {state.devNote}</p>}
        </div>
        <Button size="lg" variant="outline" className="self-start" onClick={state.onRetry}>
          Retry
        </Button>
      </section>
    );
  }

  const copy = COPY[state.kind];
  const Icon = copy.icon;
  return (
    <section role="status" className={cn(PANEL, frame, copy.tone)}>
      <div key={state.kind} className="flex animate-block-in flex-col gap-8">
        <Icon className={ICON} aria-hidden />
        <h1 className={TITLE}>{copy.title}</h1>
        <p className={DETAIL}>{copy.detail}</p>
        {copy.staffNote && <p className="text-lg opacity-80">{copy.staffNote}</p>}
      </div>
      <CooldownBar />
    </section>
  );
}
