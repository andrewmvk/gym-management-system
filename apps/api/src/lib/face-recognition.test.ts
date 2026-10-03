import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createFaceEmbedder, FACE_EMBEDDING_LENGTH } from '@api/lib/face-embedding';
import { matchFace } from '@cadence/shared/faces/match';
import { describe, expect, it } from 'vitest';

const FIXTURES_DIR = path.join(import.meta.dirname, '../test/fixtures/faces');
const EXTENSIONS = ['jpg', 'jpeg', 'png'];

function findFixture(name: string) {
  for (const extension of EXTENSIONS) {
    const file = path.join(FIXTURES_DIR, `${name}.${extension}`);
    if (existsSync(file)) return file;
  }
  return undefined;
}

function loadFixture(name: string) {
  const file = findFixture(name);
  if (!file) throw new Error(`Missing fixture ${name}`);
  return new Uint8Array(readFileSync(file));
}

describe('real face recognition on photo fixtures', () => {
  const compute = createFaceEmbedder('real');
  const embeddings = new Map<string, Promise<number[]>>();

  // Each photo costs a full detection pass, so it is computed once and shared by every test that needs it.
  function embed(name: string) {
    let embedding = embeddings.get(name);
    if (!embedding) {
      embedding = compute(loadFixture(name)).then((result) => {
        if (!result.ok) throw new Error(`Expected an embedding for ${name}, got ${result.reason}`);
        return result.embedding;
      });
      embeddings.set(name, embedding);
    }
    return embedding;
  }

  it('gives 128 finite numbers, the same for the same bytes', async () => {
    const first = await embed('valid/reference');
    const again = await compute(loadFixture('valid/reference'));

    expect(first).toHaveLength(FACE_EMBEDDING_LENGTH);
    expect(first.every(Number.isFinite)).toBe(true);
    expect(again).toEqual({ ok: true, embedding: first });
  }, 60_000);

  it('rejects a landscape with no_face', async () => {
    await expect(compute(loadFixture('invalid/landscape'))).resolves.toEqual({ ok: false, reason: 'no_face' });
  }, 60_000);

  it('rejects a group photo with multiple_faces', async () => {
    await expect(compute(loadFixture('invalid/group'))).resolves.toEqual({ ok: false, reason: 'multiple_faces' });
  }, 60_000);

  it('matches the same person in a different pose and clothes', async () => {
    const gallery = [{ memberId: 'member', embedding: await embed('valid/reference') }];
    const probe = await embed('valid/other-pose');

    expect(matchFace(probe, gallery)).toMatchObject({ status: 'match', memberId: 'member' });
  }, 60_000);

  it('does not match a person who is not enrolled', async () => {
    const gallery = [{ memberId: 'member', embedding: await embed('valid/reference') }];
    const probe = await embed('invalid/stranger');

    expect(matchFace(probe, gallery)).toEqual({ status: 'no_match' });
  }, 60_000);
});
