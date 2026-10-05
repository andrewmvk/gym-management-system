// From lg the proposal sits beside the chat; below it the proposal covers the chat. Tailwind's lg is 64rem.
const DOCKED_QUERY = '(min-width: 64rem)';

export function isDockedViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DOCKED_QUERY).matches;
}
