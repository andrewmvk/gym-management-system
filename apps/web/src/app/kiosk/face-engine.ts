import type * as FaceApi from '@vladmandic/face-api';

const MODELS_URL = '/kiosk/models';
const MIN_FACE_CONFIDENCE = 0.6;

export type FaceReading = { kind: 'none' } | { kind: 'several' } | { kind: 'one'; descriptor: number[] };

let enginePromise: Promise<typeof FaceApi> | undefined;

// The weights are the same files the backend loads (packages/shared/face-models), so descriptors stay comparable.
export function loadFaceEngine() {
  enginePromise ??= (async () => {
    const faceapi = await import('@vladmandic/face-api');
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
    ]);
    return faceapi;
  })().catch((error: unknown) => {
    enginePromise = undefined;
    throw error;
  });
  return enginePromise;
}

export async function readFace(
  faceapi: typeof FaceApi,
  source: HTMLVideoElement | HTMLCanvasElement,
): Promise<FaceReading> {
  const detections = await faceapi
    .detectAllFaces(source, new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_FACE_CONFIDENCE }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  const [only, ...others] = detections;
  if (!only) return { kind: 'none' };
  if (others.length > 0) return { kind: 'several' };
  return { kind: 'one', descriptor: Array.from(only.descriptor) };
}
