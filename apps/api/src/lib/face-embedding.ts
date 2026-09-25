import { createHash } from 'node:crypto';
import { env } from '@api/config/env';

export const FACE_EMBEDDING_LENGTH = 128;

export type FaceEmbeddingResult =
  | { ok: true; embedding: number[] }
  | { ok: false; reason: 'no_face' | 'multiple_faces' | 'unavailable' };

export type FaceEmbeddingMode = 'stub' | 'real';
export type ComputeFaceEmbedding = (image: Uint8Array) => Promise<FaceEmbeddingResult>;

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

export function createFaceEmbedder(mode: FaceEmbeddingMode): ComputeFaceEmbedding {
  return async (image) => {
    try {
      if (mode === 'real') return { ok: false, reason: 'unavailable' };
      if (image.length === 0) return { ok: false, reason: 'no_face' };
      return { ok: true, embedding: stubEmbedding(image) };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  };
}

export const computeFaceEmbedding = createFaceEmbedder(env.FACE_EMBEDDING_MODE);
