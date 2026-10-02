export const DEFAULT_MATCH_THRESHOLD = 0.6;
export const DEFAULT_MATCH_MARGIN = 0.1;

const EMBEDDING_LENGTH = 128;

export type GalleryEntry = { memberId: string; embedding: number[] };

export type MatchOptions = { threshold?: number; margin?: number };

export type MatchResult =
  | { status: 'match'; memberId: string; distance: number }
  | { status: 'ambiguous' }
  | { status: 'no_match' };

function assertEmbedding(embedding: number[], label: string) {
  if (embedding.length !== EMBEDDING_LENGTH) {
    throw new TypeError(`${label} must have ${EMBEDDING_LENGTH} values, got ${embedding.length}`);
  }
}

function euclideanDistance(a: number[], b: number[]) {
  let sum = 0;
  for (let index = 0; index < a.length; index++) {
    const difference = a[index]! - b[index]!;
    sum += difference * difference;
  }
  return Math.sqrt(sum);
}

export function matchFace(probe: number[], gallery: GalleryEntry[], options: MatchOptions = {}): MatchResult {
  const { threshold = DEFAULT_MATCH_THRESHOLD, margin = DEFAULT_MATCH_MARGIN } = options;
  assertEmbedding(probe, 'probe');

  const ranked = gallery
    .map((entry) => {
      assertEmbedding(entry.embedding, `gallery embedding of ${entry.memberId}`);
      return { memberId: entry.memberId, distance: euclideanDistance(probe, entry.embedding) };
    })
    .sort((a, b) => a.distance - b.distance);

  const best = ranked[0];
  if (!best || best.distance > threshold) return { status: 'no_match' };

  const second = ranked[1];
  if (second && second.distance <= threshold && second.distance - best.distance < margin) {
    return { status: 'ambiguous' };
  }

  return { status: 'match', memberId: best.memberId, distance: best.distance };
}
