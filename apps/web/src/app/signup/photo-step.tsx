'use client';

import { CameraIcon, CameraOffIcon, RotateCcwIcon, UploadIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FileDropzone } from '@/components/file-dropzone';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fileToCanvas, IMAGE_ACCEPTED_TYPES } from '@/lib/image';

export type CapturedPhoto = { dataUrl: string; mirrored: boolean };

interface PhotoStepProps {
  photo: CapturedPhoto | null;
  onPhotoChange: (photo: CapturedPhoto | null) => void;
  // Why the backend rejected the last photo, shown until a new one is picked.
  rejection: string | null;
  onContinue: () => void;
}

type PhotoMode = 'camera' | 'upload';

export const PHOTO_REJECTION_MESSAGES: Record<'no_face' | 'multiple_faces' | 'unavailable', string> = {
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

export function PhotoStep({ photo, onPhotoChange, rejection, onContinue }: PhotoStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<PhotoMode>('camera');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const cameraActive = mode === 'camera' && !photo;

  useEffect(() => {
    if (!cameraActive) return;
    let cancelled = false;
    setCameraReady(false);
    setCameraError(null);

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
      .catch(() =>
        setCameraError('We could not access your camera. Check your browser permissions, or upload a photo.'),
      );

    return () => {
      cancelled = true;
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      streamRef.current = null;
    };
  }, [cameraActive]);

  function capture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    onPhotoChange({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), mirrored: true });
  }

  async function handleFiles([file]: File[]) {
    if (!file) return;
    if (!IMAGE_ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('Use a JPEG or PNG photo.');
      return;
    }
    try {
      const canvas = await fileToCanvas(file);
      onPhotoChange({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), mirrored: false });
      setUploadError(null);
    } catch {
      setUploadError("We couldn't read that image. Try another one.");
    }
  }

  return (
    <StepPanel
      title="Reference photo"
      description="Used for face recognition at check-in. Face the camera in good light, alone in the frame, or upload a clear photo."
    >
      {rejection && (
        <p
          role="alert"
          className="rounded-md border-2 border-dashed border-destructive/60 px-4 py-3 text-sm text-destructive"
        >
          {rejection}
        </p>
      )}

      {!photo && (
        <Tabs
          value={mode}
          onValueChange={(next) => {
            setMode(next as PhotoMode);
            setUploadError(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="camera">
              <CameraIcon data-icon="inline-start" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="upload">
              <UploadIcon data-icon="inline-start" />
              Upload
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {cameraActive && cameraError && (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-destructive/50 p-6 text-center">
          <CameraOffIcon className="size-8 text-destructive" />
          <p className="max-w-xs text-sm text-muted-foreground">{cameraError}</p>
          <Button variant="outline" onClick={() => setMode('upload')}>
            Upload a photo instead
          </Button>
        </div>
      )}

      {cameraActive && !cameraError && (
        <div className="relative overflow-hidden rounded-lg bg-kit">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedData={() => setCameraReady(true)}
            className="aspect-square w-full -scale-x-100 object-cover"
          />
          <FrameGuide />
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <Button size="lg" onClick={capture} disabled={!cameraReady}>
              <CameraIcon data-icon="inline-start" />
              Take photo
            </Button>
          </div>
        </div>
      )}

      {mode === 'upload' && !photo && (
        <>
          <FileDropzone
            id="reference-photo-upload"
            accept={IMAGE_ACCEPTED_TYPES.join(',')}
            hint="JPEG or PNG. Your face centered, alone in the frame."
            onFiles={handleFiles}
          />
          {uploadError && (
            <p role="alert" className="text-sm text-destructive">
              {uploadError}
            </p>
          )}
        </>
      )}

      {photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.dataUrl}
            alt="Selected reference"
            className={`aspect-square w-full rounded-lg object-cover ${photo.mirrored ? '-scale-x-100' : ''}`}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="lg" onClick={() => onPhotoChange(null)}>
              <RotateCcwIcon data-icon="inline-start" />
              {photo.mirrored ? 'Retake' : 'Choose another'}
            </Button>
            <Button size="lg" onClick={onContinue}>
              Use this photo
            </Button>
          </div>
        </>
      )}
    </StepPanel>
  );
}
