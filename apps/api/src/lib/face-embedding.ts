import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { env } from '@api/config/env';
import type * as FaceApi from '@vladmandic/face-api';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

export const FACE_EMBEDDING_LENGTH = 128;
export const FACE_MODELS_DIR = fileURLToPath(new URL('../../../../packages/shared/face-models', import.meta.url));

// Same detector threshold as the kiosk (apps/web/src/app/kiosk/face-engine.ts), so both sides agree on what counts as a face.
const MIN_FACE_CONFIDENCE = 0.6;

export type FaceEmbeddingResult =
  | { ok: true; embedding: number[] }
  | { ok: false; reason: 'no_face' | 'multiple_faces' | 'unavailable' };

export type FaceEmbeddingMode = 'stub' | 'real';
export type ComputeFaceEmbedding = (image: Uint8Array) => Promise<FaceEmbeddingResult>;

export interface FaceEmbedderOptions {
  modelsDir?: string;
}

// Expands SHA-256 in counter mode into 128 values in [-1, 1], then scales to unit length like a real descriptor.
function stubEmbedding(image: Uint8Array) {
  const values: number[] = [];
  for (let block = 0; values.length < FACE_EMBEDDING_LENGTH; block++) {
    const digest = createHash('sha256').update(image).update(String(block)).digest();
    for (let offset = 0; offset < digest.length && values.length < FACE_EMBEDDING_LENGTH; offset += 2) {
      values.push(digest.readUInt16BE(offset) / 0x7fff - 1);
    }
  }
  const norm = Math.hypot(...values) || 1;
  return values.map((value) => value / norm);
}

interface DecodedImage {
  width: number;
  height: number;
  rgba: Uint8Array;
}

function decodeImage(image: Uint8Array): DecodedImage | undefined {
  const bytes = Buffer.from(image.buffer, image.byteOffset, image.byteLength);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const { width, height, data } = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
    return { width, height, rgba: data };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const { width, height, data } = PNG.sync.read(bytes);
    return { width, height, rgba: data };
  }
  return undefined;
}

function rgbValues({ width, height, rgba }: DecodedImage) {
  const rgb = new Int32Array(width * height * 3);
  for (let pixel = 0; pixel < width * height; pixel++) {
    rgb[pixel * 3] = rgba[pixel * 4] ?? 0;
    rgb[pixel * 3 + 1] = rgba[pixel * 4 + 1] ?? 0;
    rgb[pixel * 3 + 2] = rgba[pixel * 4 + 2] ?? 0;
  }
  return rgb;
}

// The WASM backend keeps the install pure JavaScript plus a bundled .wasm file, so it works on Windows and in the container without native builds.
async function loadFaceEngine(modelsDir: string) {
  const faceapi = createRequire(import.meta.url)('@vladmandic/face-api/dist/face-api.node-wasm.js') as typeof FaceApi;
  const runtime = faceapi.tf as unknown as { setBackend(name: string): Promise<boolean>; ready(): Promise<void> };
  await runtime.setBackend('wasm');
  await runtime.ready();
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsDir),
    faceapi.nets.faceLandmark68Net.loadFromDisk(modelsDir),
    faceapi.nets.faceRecognitionNet.loadFromDisk(modelsDir),
  ]);
  return faceapi;
}

function createRealEmbedder(modelsDir: string): ComputeFaceEmbedding {
  let enginePromise: Promise<typeof FaceApi> | undefined;

  return async (image) => {
    const decoded = decodeImage(image);
    if (!decoded) return { ok: false, reason: 'unavailable' };

    enginePromise ??= loadFaceEngine(modelsDir).catch((error: unknown) => {
      enginePromise = undefined;
      throw error;
    });
    const faceapi = await enginePromise;

    const input = faceapi.tf.tensor3d(rgbValues(decoded), [decoded.height, decoded.width, 3], 'int32');
    try {
      const detections = await faceapi
        .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_FACE_CONFIDENCE }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      const [only, ...others] = detections;
      if (!only) return { ok: false, reason: 'no_face' };
      if (others.length > 0) return { ok: false, reason: 'multiple_faces' };
      return { ok: true, embedding: Array.from(only.descriptor) };
    } finally {
      input.dispose();
    }
  };
}

export function createFaceEmbedder(
  mode: FaceEmbeddingMode,
  { modelsDir = FACE_MODELS_DIR }: FaceEmbedderOptions = {},
): ComputeFaceEmbedding {
  const real = mode === 'real' ? createRealEmbedder(modelsDir) : undefined;

  return async (image) => {
    try {
      if (real) return await real(image);
      if (image.length === 0) return { ok: false, reason: 'no_face' };
      return { ok: true, embedding: stubEmbedding(image) };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  };
}

export const computeFaceEmbedding = createFaceEmbedder(env.FACE_EMBEDDING_MODE);
