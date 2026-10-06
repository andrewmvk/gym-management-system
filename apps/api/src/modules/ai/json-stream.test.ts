import { createJsonStream, eventsFromObject, type JsonStreamEvent } from '@api/modules/ai/json-stream';
import { describe, expect, it } from 'vitest';

function run(chunks: readonly string[]): JsonStreamEvent[] {
  const stream = createJsonStream();
  return chunks.flatMap((chunk) => stream.push(chunk));
}

function joinDeltas(events: readonly JsonStreamEvent[], key: string) {
  return events.flatMap((event) => (event.type === 'delta' && event.key === key ? [event.text] : [])).join('');
}

const SAMPLE = JSON.stringify({
  reply: 'Swap the squat. "Quotes" and \\ slashes, plus é.',
  planProposal: {
    date: '2026-10-04',
    exercises: [
      { id: 'a', sets: 3 },
      { id: 'b', sets: 4 },
    ],
  },
  quickReplies: ['Shorter', 'Explain why'],
  confidence: 0.5,
  flag: true,
  nothing: null,
});

describe('createJsonStream', () => {
  it('reports keys, values and array items of the top-level object', () => {
    const events = run([SAMPLE]);

    expect(events.filter((event) => event.type === 'key').map((event) => event.key)).toEqual([
      'reply',
      'planProposal',
      'quickReplies',
      'confidence',
      'flag',
      'nothing',
    ]);
    expect(events.find((event) => event.type === 'value' && event.key === 'planProposal')).toMatchObject({
      value: {
        date: '2026-10-04',
        exercises: [
          { id: 'a', sets: 3 },
          { id: 'b', sets: 4 },
        ],
      },
    });
    expect(events.filter((event) => event.type === 'item' && event.key === 'quickReplies')).toEqual([
      { type: 'item', key: 'quickReplies', index: 0, value: 'Shorter' },
      { type: 'item', key: 'quickReplies', index: 1, value: 'Explain why' },
    ]);
    expect(events.find((event) => event.type === 'value' && event.key === 'confidence')).toMatchObject({ value: 0.5 });
    expect(events.find((event) => event.type === 'value' && event.key === 'flag')).toMatchObject({ value: true });
    expect(events.find((event) => event.type === 'value' && event.key === 'nothing')).toMatchObject({ value: null });
  });

  it('gives the same result however the text is split, including inside escapes', () => {
    const whole = run([SAMPLE]);
    for (const size of [1, 2, 3, 5, 7, 13]) {
      const chunks = SAMPLE.match(new RegExp(`.{1,${size}}`, 'gs')) ?? [];
      const events = run(chunks);

      expect(events.filter((event) => event.type !== 'delta')).toEqual(whole.filter((event) => event.type !== 'delta'));
      expect(joinDeltas(events, 'reply')).toBe(JSON.parse(SAMPLE).reply);
    }
  });

  it('streams a string value as deltas before it closes', () => {
    const stream = createJsonStream();

    expect(stream.push('{"reply": "Hel')).toEqual([
      { type: 'key', key: 'reply' },
      { type: 'delta', key: 'reply', text: 'Hel' },
    ]);
    expect(stream.push('lo there"}')).toEqual([
      { type: 'delta', key: 'reply', text: 'lo there' },
      { type: 'value', key: 'reply', value: 'Hello there' },
    ]);
  });

  it('emits an array item only once its object has closed', () => {
    const stream = createJsonStream();

    expect(stream.push('{"exercises": [{"id": "a", "sets"')).toEqual([{ type: 'key', key: 'exercises' }]);
    expect(stream.push(': 3}, {"id"')).toEqual([
      { type: 'item', key: 'exercises', index: 0, value: { id: 'a', sets: 3 } },
    ]);
  });

  it('ignores a code fence and anything after the closing brace', () => {
    const events = run(['```json\n{"reply": "ok"}\n```', ' trailing { "reply": "no" }']);

    expect(events.filter((event) => event.type === 'value')).toEqual([{ type: 'value', key: 'reply', value: 'ok' }]);
  });

  it('keeps braces and brackets inside strings from changing the nesting', () => {
    const events = run(['{"reply": "a } ] { [ b", "next": {"x": "}"}}']);

    expect(events.filter((event) => event.type === 'value')).toEqual([
      { type: 'value', key: 'reply', value: 'a } ] { [ b' },
      { type: 'value', key: 'next', value: { x: '}' } },
    ]);
  });

  it('stops quietly on malformed input', () => {
    expect(() => run(['{"reply": nope, "x": [1,, }'])).not.toThrow();
  });
});

describe('eventsFromObject', () => {
  it('produces the events a stream of the same object would', () => {
    const object = { reply: 'hi', quickReplies: ['a', 'b'], planProposal: { date: 'x' } };
    const streamed = run([JSON.stringify(object)]);
    const synthesized = eventsFromObject(object);

    expect(synthesized.filter((event) => event.type !== 'delta')).toEqual(
      streamed.filter((event) => event.type !== 'delta'),
    );
    expect(joinDeltas(synthesized, 'reply')).toBe('hi');
  });
});
