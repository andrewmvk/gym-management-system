'use client';

import { matchFace } from '@cadence/shared/faces/match';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { DevSimulation, KioskSourceToggle } from '@/app/kiosk/dev-simulation';
import { type FaceReading, loadFaceEngine, readFace } from '@/app/kiosk/face-engine';
import { fetchEmbeddings, postCheckIn } from '@/app/kiosk/kiosk-api';
import {
  type FrameLevel,
  frameOutline,
  type KioskResult,
  type KioskSource,
  KioskStatus,
  type KioskStatusState,
  RESULT_COOLDOWN_MS,
  statusFrameTone,
} from '@/app/kiosk/kiosk-status';
import { Brand } from '@/components/brand';
import { FileDropzone } from '@/components/file-dropzone';
import { Skeleton } from '@/components/ui/skeleton';
import { fileToCanvas, IMAGE_ACCEPTED_TYPES } from '@/lib/image';
import { cn } from '@/lib/utils';

const EMBEDDINGS_REFRESH_MS = 5 * 60 * 1000;
const SCAN_INTERVAL_MS = 600;
const MISSES_BEFORE_FRONT_DESK = 3;
const MISSES_IDLE_RESET_MS = 3 * 60 * 1000;
const UNAVAILABLE_DETAIL = 'This check-in panel is not available right now. Please see the front desk.';

type CameraState = 'starting' | 'ready' | 'failed';

export function KioskPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<CameraState>('starting');
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [result, setResult] = useState<KioskResult | null>(null);
  const [severalFaces, setSeveralFaces] = useState(false);
  const [source, setSource] = useState<KioskSource>('camera');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const embeddings = useQuery({
    queryKey: ['kiosk', 'embeddings'],
    queryFn: fetchEmbeddings,
    refetchInterval: EMBEDDINGS_REFRESH_MS,
    retry: 2,
  });
  const engine = useQuery({
    queryKey: ['kiosk', 'face-engine'],
    queryFn: loadFaceEngine,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

  const misses = useRef({ count: 0, lastAt: 0 });

  // The member's name is never shown here: the kiosk is the public, least-trusted screen, so results carry no identity.
  const checkIn = useMutation({
    mutationFn: postCheckIn,
    onSuccess: (outcome) => {
      if (outcome.kind === 'recorded') {
        misses.current = { count: 0, lastAt: 0 };
        setResult({ kind: outcome.turnstileStatus === 'failed' ? 'turnstile_failed' : 'granted' });
        return;
      }
      // Any other outcome, including one this panel does not know yet, sends the person to the front desk.
      setResult({ kind: outcome.kind === 'membership_inactive' ? 'membership_inactive' : 'see_staff' });
    },
    onError: () => setResult({ kind: 'request_failed' }),
  });
  const { mutate: submitCheckIn } = checkIn;

  useEffect(() => {
    if (engine.isError) console.error('Kiosk face model failed to load', engine.error);
  }, [engine.isError, engine.error]);

  useEffect(() => {
    if (embeddings.isError) console.error('Kiosk could not load the members dataset', embeddings.error);
  }, [embeddings.isError, embeddings.error]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: cameraAttempt only exists to restart the camera on Retry.
  useEffect(() => {
    if (source !== 'camera') return;
    let stream: MediaStream | undefined;
    let cancelled = false;

    const request =
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false }) ??
      Promise.reject(new Error('Camera API unavailable'));
    request
      .then((opened) => {
        if (cancelled) {
          for (const track of opened.getTracks()) track.stop();
          return;
        }
        stream = opened;
        const video = videoRef.current;
        if (video) {
          video.srcObject = opened;
          void video.play();
        }
        setCamera('ready');
      })
      .catch(() => {
        if (!cancelled) setCamera('failed');
      });

    return () => {
      cancelled = true;
      for (const track of stream?.getTracks() ?? []) track.stop();
    };
  }, [cameraAttempt, source]);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      setResult(null);
      setImagePreview(null);
    }, RESULT_COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [result]);

  const faceApi = engine.data;
  const gallery = embeddings.data;
  const ready = faceApi !== undefined && gallery !== undefined && result === null;
  const scanning = source === 'camera' && camera === 'ready' && ready;

  // A run of no-match or ambiguous results stops looping "try again" and sends the person to the front desk.
  const registerMiss = () => {
    const now = Date.now();
    const previous = now - misses.current.lastAt > MISSES_IDLE_RESET_MS ? 0 : misses.current.count;
    misses.current = { count: previous + 1, lastAt: now };
    setResult({ kind: misses.current.count >= MISSES_BEFORE_FRONT_DESK ? 'no_match_limit' : 'retry' });
  };

  // Returns true when a face was read and either a check-in was sent or a miss was registered.
  const handleReading = (reading: FaceReading, members: NonNullable<typeof gallery>) => {
    if (reading.kind !== 'one') return false;
    const match = matchFace(reading.descriptor, members);
    if (match.status === 'match') submitCheckIn(match.memberId);
    else registerMiss();
    return true;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: handleReading only closes over submitCheckIn and setters.
  useEffect(() => {
    if (!scanning || !faceApi || !gallery) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const video = videoRef.current;
      const reading: FaceReading =
        video && video.readyState >= 2
          ? await readFace(faceApi, video).catch(() => ({ kind: 'none' as const }))
          : { kind: 'none' };
      if (cancelled) return;

      setSeveralFaces(reading.kind === 'several');
      if (handleReading(reading, gallery)) return;
      timer = setTimeout(tick, SCAN_INTERVAL_MS);
    };
    void tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scanning, faceApi, gallery, submitCheckIn]);

  const checkImage = async ([file]: File[]) => {
    if (!file || !faceApi || !gallery || !ready) return;
    setAnalyzing(true);
    try {
      const canvas = await fileToCanvas(file);
      setImagePreview(canvas.toDataURL('image/jpeg', 0.8));
      const reading = await readFace(faceApi, canvas);
      if (!handleReading(reading, gallery)) registerMiss();
    } catch {
      registerMiss();
    } finally {
      setAnalyzing(false);
    }
  };

  const changeSource = (next: KioskSource) => {
    setSource(next);
    setImagePreview(null);
    if (next === 'camera') setCamera('starting');
  };

  const retryCamera = () => {
    setCamera('starting');
    setCameraAttempt((attempt) => attempt + 1);
  };

  let state: KioskStatusState;
  if (source === 'camera' && camera === 'failed') {
    state = {
      kind: 'unavailable',
      title: 'Camera unavailable',
      detail: 'Allow camera access for this panel, or check that the camera is plugged in.',
      onRetry: retryCamera,
    };
  } else if (engine.isError) {
    state = {
      kind: 'unavailable',
      title: 'Check-in unavailable',
      detail: UNAVAILABLE_DETAIL,
      devNote: 'The recognition files could not be loaded. See packages/shared/face-models/README.md.',
      onRetry: () => void engine.refetch(),
    };
  } else if (embeddings.isError && !gallery) {
    state = {
      kind: 'unavailable',
      title: 'Check-in unavailable',
      detail: UNAVAILABLE_DETAIL,
      devNote: 'The panel cannot reach the check-in service. Check the API and the kiosk key.',
      onRetry: () => void embeddings.refetch(),
    };
  } else if (result) {
    state = result;
  } else if (!(scanning || (source === 'image' && ready)) && !checkIn.isPending) {
    state = { kind: 'preparing' };
  } else {
    state = { kind: 'scanning', severalFaces, source };
  }

  // Camera card: low until the camera is on or an image is chosen, mid while it watches, high once a face is in.
  // Status card: low until recognition starts, mid while it runs, high once it has an answer.
  const recognizing = checkIn.isPending || analyzing;
  const faceCaptured = result !== null || recognizing || (source === 'image' && imagePreview !== null);
  let stageLevel: FrameLevel = 'low';
  if (faceCaptured) stageLevel = 'high';
  else if (source === 'camera' && camera === 'ready') stageLevel = 'mid';
  let statusLevel: FrameLevel = 'low';
  if (result !== null) statusLevel = 'high';
  else if (recognizing) statusLevel = 'mid';

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:gap-6 lg:p-8">
      <header className="flex items-center justify-between gap-4">
        <Brand className="origin-left scale-125" />
        <div className="flex items-center gap-2">
          <KioskSourceToggle source={source} onChange={changeSource} />
          <DevSimulation disabled={result !== null || checkIn.isPending} onSimulate={submitCheckIn} />
        </div>
      </header>
      <div className="grid flex-1 gap-4 lg:grid-cols-5 lg:gap-6">
        <div className="relative min-h-96 overflow-hidden rounded-lg bg-kit-line lg:col-span-3">
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 z-10 rounded-lg',
              frameOutline(stageLevel),
              statusFrameTone(state),
            )}
          />
          {source === 'camera' ? (
            <>
              <video
                ref={videoRef}
                muted
                playsInline
                aria-label="Live camera preview"
                className="absolute inset-0 size-full -scale-x-100 object-cover"
              />
              {camera !== 'ready' && <Skeleton className="absolute inset-0 rounded-none bg-kit-foreground/10" />}
            </>
          ) : imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Chosen face" className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="w-full max-w-md text-kit-foreground">
                <FileDropzone
                  id="kiosk-image-upload"
                  accept={IMAGE_ACCEPTED_TYPES.join(',')}
                  hint="JPEG or PNG with one face."
                  onFiles={checkImage}
                  disabled={!ready || checkIn.isPending}
                />
              </div>
            </div>
          )}
          {state.kind === 'scanning' && source === 'camera' && (
            <div
              aria-hidden
              className="absolute top-1/2 left-1/2 aspect-3/4 h-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-dashed border-kit-foreground/50"
            />
          )}
        </div>
        <div className="lg:col-span-2">
          <KioskStatus state={state} level={statusLevel} />
        </div>
      </div>
    </main>
  );
}
