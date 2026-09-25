import { describe, expect, it } from 'vitest';
import { createFaceEmbedder, FACE_EMBEDDING_LENGTH } from '@api/lib/face-embedding';

const image = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3, 4, 5]);

describe('computeFaceEmbedding stub', () => {
  const compute = createFaceEmbedder('stub');

  it('yields 128 finite numbers', async () => {
    const result = await compute(image);

    if (!result.ok) throw new Error('expected an embedding');
    expect(result.embedding).toHaveLength(FACE_EMBEDDING_LENGTH);
    expect(result.embedding.every(Number.isFinite)).toBe(true);
    expect(Math.hypot(...result.embedding)).toBeCloseTo(1);
  });

  it('is deterministic for the same bytes and differs for different bytes', async () => {
    const first = await compute(image);
    const again = await compute(new Uint8Array(image));
    const other = await compute(new Uint8Array([...image, 6]));

    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
  });

  it('reports no_face for an empty image', async () => {
    await expect(compute(new Uint8Array())).resolves.toEqual({ ok: false, reason: 'no_face' });
  });
});

describe('computeFaceEmbedding real mode', () => {
  it('reports unavailable until the real model is wired in', async () => {
    await expect(createFaceEmbedder('real')(image)).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });
});
