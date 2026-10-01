'use client';

import { useMutation } from '@tanstack/react-query';
import { CameraIcon, CameraOffIcon, RotateCcwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/trpc';

interface PhotoStepProps {
  userId: string;
  onSaved: () => void;
}

const REJECTION_MESSAGES: Record<'no_face' | 'multiple_faces' | 'unavailable', string> = {
  no_face: "We couldn't detect a face in that photo. Make sure your face is centered and well lit, then try again.",
  multiple_faces: 'More than one face was detected. Make sure you are alone in the frame, then try again.',
  unavailable: "We couldn't process that photo right now. Try again.",
};

function FrameGuide() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="h-3/4 w-7/12 rounded-full border-2 border-dashed border-white/75" />
    </div>
  );
}

export function PhotoStep({ userId, onSaved }: PhotoStepProps) {
  const trpc = useTRPC();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);

  useEffect(() => {
    if (capturedImage) return;
    let cancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCameraError('We could not access your camera. Check your browser permissions and try again.'));

    return () => {
      cancelled = true;
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      streamRef.current = null;
    };
  }, [capturedImage]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
    setRejection(null);
  }

  const savePhoto = useMutation(
    trpc.aptitude.savePhoto.mutationOptions({
      onSuccess: (result) => {
        if (result.status === 'photo_rejected') {
          setRejection(REJECTION_MESSAGES[result.reason]);
          return;
        }
        onSaved();
      },
      onError: () => toast.error("We couldn't save your photo. Try again."),
    }),
  );

  return (
    <StepPanel
      title="Reference photo"
      description="Used for face recognition at check-in. Face the camera in good light, alone in the frame."
    >
      {rejection && (
        <p role="alert" className="rounded-md border-2 border-dashed border-destructive/60 px-4 py-3 text-sm text-destructive">
          {rejection}
        </p>
      )}

      {cameraError && (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-destructive/50 p-6 text-center">
          <CameraOffIcon className="size-8 text-destructive" />
          <p className="max-w-xs text-sm text-muted-foreground">{cameraError}</p>
        </div>
      )}

      {!capturedImage && !cameraError && (
        <>
          <div className="relative overflow-hidden rounded-lg bg-kit">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} autoPlay playsInline muted className="aspect-square w-full -scale-x-100 object-cover" />
            <FrameGuide />
          </div>
          <Button size="lg" className="w-full" onClick={capture}>
            <CameraIcon data-icon="inline-start" />
            Capture photo
          </Button>
        </>
      )}

      {capturedImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedImage} alt="Captured reference" className="aspect-square w-full -scale-x-100 rounded-lg object-cover" />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="lg" onClick={() => setCapturedImage(null)} disabled={savePhoto.isPending}>
              <RotateCcwIcon data-icon="inline-start" />
              Retake
            </Button>
            <Button
              size="lg"
              disabled={savePhoto.isPending}
              onClick={() => savePhoto.mutate({ userId, imageBase64: capturedImage, mimeType: 'image/jpeg' })}
            >
              {savePhoto.isPending ? 'Saving...' : 'Use this photo'}
            </Button>
          </div>
        </>
      )}
    </StepPanel>
  );
}
