interface ServerError {
  message: string;
  data?: { code?: string } | null;
}

// A rule the server enforced ("Past plans cannot be edited") is worth quoting as it is; a crash or a dropped
// connection carries nothing a person can act on, so those fall back to the generic sentence.
export function serverMessage(error: ServerError, fallback: string) {
  const code = error.data?.code;
  return code && code !== 'INTERNAL_SERVER_ERROR' ? error.message : fallback;
}
