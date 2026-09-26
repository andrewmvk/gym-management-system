'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Take a reference photo</CardTitle>
        <CardDescription>This is used for face recognition at check-in. Only the backend ever sees it.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}
        {rejection && <p className="text-sm text-destructive">{rejection}</p>}

        {!capturedImage && !cameraError && (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} autoPlay playsInline muted className="aspect-square w-full rounded-lg bg-muted object-cover" />
            <Button onClick={capture}>Capture photo</Button>
          </>
        )}

        {capturedImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="Captured reference" className="aspect-square w-full rounded-lg object-cover" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCapturedImage(null)} disabled={savePhoto.isPending}>
                Retake
              </Button>
              <Button
                className="flex-1"
                disabled={savePhoto.isPending}
                onClick={() => savePhoto.mutate({ userId, imageBase64: capturedImage, mimeType: 'image/jpeg' })}
              >
                {savePhoto.isPending ? 'Saving...' : 'Use this photo'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
