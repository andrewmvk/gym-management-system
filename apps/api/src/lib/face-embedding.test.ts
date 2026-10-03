import { existsSync } from 'node:fs';
import path from 'node:path';
import { createFaceEmbedder, FACE_EMBEDDING_LENGTH, FACE_MODELS_DIR } from '@api/lib/face-embedding';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

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

const weightsPresent = existsSync(path.join(FACE_MODELS_DIR, 'ssd_mobilenetv1_model-weights_manifest.json'));

function blankPng(width = 160, height = 160) {
  const png = new PNG({ width, height });
  png.data.fill(255);
  return new Uint8Array(PNG.sync.write(png));
}

describe('computeFaceEmbedding real mode', () => {
  it('reports unavailable when the weights are missing instead of throwing', async () => {
    const compute = createFaceEmbedder('real', { modelsDir: path.join(FACE_MODELS_DIR, 'missing') });

    await expect(compute(blankPng())).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('reports unavailable for bytes that are not a supported image', async () => {
    await expect(createFaceEmbedder('real')(image)).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it.skipIf(!weightsPresent)(
    'reports no_face for a blank image',
    async () => {
      await expect(createFaceEmbedder('real')(blankPng())).resolves.toEqual({ ok: false, reason: 'no_face' });
    },
    60_000,
  );
});
