/** Timestamp and ID helpers kept outside React components so render stays pure. */

export function nowMs(): number {
  return Date.now();
}

export function makeId(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
