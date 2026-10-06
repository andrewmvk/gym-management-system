// What the parser reports about the top-level object while its text is still arriving: a key is read, a
// string value grows, a value completes, or an element of a top-level array completes.
export type JsonStreamEvent =
  | { type: 'key'; key: string }
  | { type: 'delta'; key: string; text: string }
  | { type: 'value'; key: string; value: unknown }
  | { type: 'item'; key: string; index: number; value: unknown };

type Container = '{' | '[';

function tryParse(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

// Decodes the text of a string literal that has not been closed yet, leaving out a trailing escape that is
// still incomplete.
function decodePartialString(content: string): string | null {
  let safe = content;
  const trailingBackslashes = /\\+$/.exec(safe)?.[0].length ?? 0;
  if (trailingBackslashes % 2 === 1) safe = safe.slice(0, -1);
  safe = safe.replace(/\\u[0-9a-fA-F]{0,3}$/, '');
  const parsed = tryParse(`"${safe}"`);
  return parsed.ok && typeof parsed.value === 'string' ? parsed.value : null;
}

const WHITESPACE = new Set([' ', '\n', '\r', '\t']);

// Reads one JSON object that arrives in arbitrary chunks. Text before the first "{" (a code fence, a
// sentence) and after the closing "}" is ignored. Malformed input only stops events; the caller still
// validates the complete text itself, so this never decides what is true.
export function createJsonStream() {
  let text = '';
  let pos = 0;
  const stack: Container[] = [];
  let inString = false;
  let isEscaped = false;
  let stringStart = -1;
  let expectKey = false;
  let key: string | null = null;
  let valueStart = -1;
  let itemStart = -1;
  let itemIndex = 0;
  let primitiveStart = -1;
  let deltaSent = 0;
  let isFinished = false;

  const isInTopLevelArray = () => stack.length === 2 && stack[1] === '[';
  const isStartingValue = () => stack.length === 1 && !expectKey && key !== null && valueStart === -1;

  function push(chunk: string): JsonStreamEvent[] {
    const events: JsonStreamEvent[] = [];
    text += chunk;

    const emitValue = (end: number) => {
      const parsed = tryParse(text.slice(valueStart, end));
      if (parsed.ok && key !== null) events.push({ type: 'value', key, value: parsed.value });
      valueStart = -1;
    };
    const emitItem = (end: number) => {
      const parsed = tryParse(text.slice(itemStart, end));
      if (parsed.ok && key !== null) events.push({ type: 'item', key, index: itemIndex, value: parsed.value });
      itemStart = -1;
      itemIndex += 1;
    };
    const endPrimitive = (end: number) => {
      if (primitiveStart === -1) return;
      if (stack.length === 1 && valueStart === primitiveStart) emitValue(end);
      else if (isInTopLevelArray() && itemStart === primitiveStart) emitItem(end);
      primitiveStart = -1;
    };
    const endString = (end: number) => {
      if (stack.length === 1 && expectKey) {
        const parsed = tryParse(text.slice(stringStart, end + 1));
        if (parsed.ok && typeof parsed.value === 'string') {
          key = parsed.value;
          events.push({ type: 'key', key });
        }
        expectKey = false;
      } else if (stack.length === 1 && valueStart === stringStart && key !== null) {
        const parsed = tryParse(text.slice(stringStart, end + 1));
        if (parsed.ok && typeof parsed.value === 'string' && parsed.value.length > deltaSent) {
          events.push({ type: 'delta', key, text: parsed.value.slice(deltaSent) });
        }
        deltaSent = 0;
        emitValue(end + 1);
      } else if (isInTopLevelArray() && itemStart === stringStart) {
        emitItem(end + 1);
      }
    };

    while (pos < text.length && !isFinished) {
      const char = text[pos]!;

      if (inString) {
        if (isEscaped) isEscaped = false;
        else if (char === '\\') isEscaped = true;
        else if (char === '"') {
          inString = false;
          endString(pos);
        }
        pos += 1;
        continue;
      }

      if (stack.length === 0) {
        if (char === '{') {
          stack.push('{');
          expectKey = true;
        }
        pos += 1;
        continue;
      }

      if (WHITESPACE.has(char)) {
        endPrimitive(pos);
      } else if (char === '"') {
        inString = true;
        stringStart = pos;
        if (isStartingValue()) {
          valueStart = pos;
          deltaSent = 0;
        } else if (isInTopLevelArray() && itemStart === -1) {
          itemStart = pos;
        }
      } else if (char === '{' || char === '[') {
        if (isStartingValue()) {
          valueStart = pos;
          if (char === '[') itemIndex = 0;
        } else if (isInTopLevelArray() && itemStart === -1) {
          itemStart = pos;
        }
        stack.push(char);
      } else if (char === '}' || char === ']') {
        endPrimitive(pos);
        stack.pop();
        if (stack.length === 0) {
          isFinished = true;
        } else if (stack.length === 1 && valueStart !== -1) {
          emitValue(pos + 1);
        } else if (isInTopLevelArray() && itemStart !== -1) {
          emitItem(pos + 1);
        }
      } else if (char === ',') {
        endPrimitive(pos);
        if (stack.length === 1) {
          expectKey = true;
          key = null;
          valueStart = -1;
        }
      } else if (char === ':') {
        expectKey = false;
      } else if (primitiveStart === -1) {
        primitiveStart = pos;
        if (isStartingValue()) valueStart = pos;
        else if (isInTopLevelArray() && itemStart === -1) itemStart = pos;
      }
      pos += 1;
    }

    if (inString && stack.length === 1 && key !== null && valueStart === stringStart) {
      const decoded = decodePartialString(text.slice(stringStart + 1));
      if (decoded !== null && decoded.length > deltaSent) {
        events.push({ type: 'delta', key, text: decoded.slice(deltaSent) });
        deltaSent = decoded.length;
      }
    }

    return events;
  }

  return { push };
}

// The same events a stream would have produced, for an answer that is already complete (mock mode).
export function eventsFromObject(object: Record<string, unknown>): JsonStreamEvent[] {
  const events: JsonStreamEvent[] = [];
  for (const [key, value] of Object.entries(object)) {
    events.push({ type: 'key', key });
    if (typeof value === 'string') events.push({ type: 'delta', key, text: value });
    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) events.push({ type: 'item', key, index, value: item });
    }
    events.push({ type: 'value', key, value });
  }
  return events;
}
