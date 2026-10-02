import {
  DEFAULT_MATCH_MARGIN,
  DEFAULT_MATCH_THRESHOLD,
  type GalleryEntry,
  type MatchResult,
  matchFace,
} from '@shared/faces/match';
import { describe, expect, it } from 'vitest';

const PROBE = new Array<number>(128).fill(0);

// A vector at exactly `distance` from the all-zero probe.
function atDistance(distance: number) {
  const vector = new Array<number>(128).fill(0);
  vector[0] = distance;
  return vector;
}

function entry(memberId: string, distance: number): GalleryEntry {
  return { memberId, embedding: atDistance(distance) };
}

describe('matchFace', () => {
  const cases: { name: string; gallery: GalleryEntry[]; expected: MatchResult }[] = [
    { name: 'an empty gallery', gallery: [], expected: { status: 'no_match' } },
    {
      name: 'a best candidate above the threshold',
      gallery: [entry('a', 0.7), entry('b', 0.9)],
      expected: { status: 'no_match' },
    },
    {
      name: 'one clear match',
      gallery: [entry('a', 0.3), entry('b', 0.9)],
      expected: { status: 'match', memberId: 'a', distance: 0.3 },
    },
    {
      name: 'two close candidates under the threshold',
      gallery: [entry('a', 0.3), entry('b', 0.35)],
      expected: { status: 'ambiguous' },
    },
    {
      name: 'two far-apart candidates under the threshold',
      gallery: [entry('a', 0.2), entry('b', 0.5)],
      expected: { status: 'match', memberId: 'a', distance: 0.2 },
    },
    {
      name: 'a close runner-up above the threshold',
      gallery: [entry('a', 0.58), entry('b', 0.62)],
      expected: { status: 'match', memberId: 'a', distance: 0.58 },
    },
    {
      name: 'a single candidate under the threshold',
      gallery: [entry('a', 0.4)],
      expected: { status: 'match', memberId: 'a', distance: 0.4 },
    },
    {
      name: 'a single candidate exactly at the threshold',
      gallery: [entry('a', DEFAULT_MATCH_THRESHOLD)],
      expected: { status: 'match', memberId: 'a', distance: DEFAULT_MATCH_THRESHOLD },
    },
    {
      name: 'a runner-up exactly one margin behind',
      gallery: [entry('a', 0.25), entry('b', 0.25 + DEFAULT_MATCH_MARGIN + 0.001)],
      expected: { status: 'match', memberId: 'a', distance: 0.25 },
    },
  ];

  it.each(cases)('returns the right status for $name', ({ gallery, expected }) => {
    const result = matchFace(PROBE, gallery);

    expect(result.status).toBe(expected.status);
    if (expected.status === 'match' && result.status === 'match') {
      expect(result.memberId).toBe(expected.memberId);
      expect(result.distance).toBeCloseTo(expected.distance, 10);
    }
  });

  it('picks the closest candidate regardless of gallery order', () => {
    const result = matchFace(PROBE, [entry('far', 0.5), entry('near', 0.1)]);

    expect(result).toMatchObject({ status: 'match', memberId: 'near' });
  });

  it('honors custom threshold and margin options', () => {
    const gallery = [entry('a', 0.3), entry('b', 0.35)];

    expect(matchFace(PROBE, gallery, { margin: 0.01 })).toMatchObject({ status: 'match', memberId: 'a' });
    expect(matchFace(PROBE, gallery, { threshold: 0.2 })).toEqual({ status: 'no_match' });
  });

  it('throws a TypeError for a probe or gallery vector of the wrong length', () => {
    expect(() => matchFace([0, 1], [entry('a', 0.1)])).toThrow(TypeError);
    expect(() => matchFace(PROBE, [{ memberId: 'a', embedding: [0, 1] }])).toThrow(TypeError);
  });
});
