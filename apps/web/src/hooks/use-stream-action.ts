import { useCallback, useEffect, useRef, useState } from 'react';

type StreamStatus = 'idle' | 'pending' | 'success' | 'error';

interface UseStreamActionOptions<Input, StreamEvent> {
  run: (input: Input) => Promise<AsyncIterable<StreamEvent>>;
  onEvent: (event: StreamEvent, input: Input) => void;
  onSuccess?: (input: Input) => void;
  onError?: (error: unknown, input: Input) => void;
}

// Runs a tRPC procedure that yields events (a coach reply, a plan being built) and hands each one to
// onEvent the moment it arrives. It is the streaming counterpart of useMutation: a stream that breaks
// ends in the error state, never in a half-finished success.
export function useStreamAction<Input, StreamEvent>(options: UseStreamActionOptions<Input, StreamEvent>) {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const optionsRef = useRef(options);
  const isMountedRef = useRef(true);

  useEffect(() => {
    optionsRef.current = options;
  });
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const start = useCallback(async (input: Input) => {
    const setSafely = (next: StreamStatus) => {
      if (isMountedRef.current) setStatus(next);
    };
    setSafely('pending');
    try {
      const stream = await optionsRef.current.run(input);
      for await (const event of stream) optionsRef.current.onEvent(event, input);
      setSafely('success');
      optionsRef.current.onSuccess?.(input);
    } catch (error) {
      setSafely('error');
      optionsRef.current.onError?.(error, input);
    }
  }, []);

  const reset = useCallback(() => setStatus('idle'), []);

  return {
    start,
    reset,
    status,
    isPending: status === 'pending',
    isError: status === 'error',
    isSuccess: status === 'success',
  };
}
