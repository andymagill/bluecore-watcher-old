/**
 * Renders a Git object hash in its conventional short form.
 *
 * Centralized because every provenance display in the app (record cards, the scrubber, the
 * state inspector) needs the same 7-character truncation, and several call sites used to do
 * `hash.slice(0, 7)` directly — which threw whenever `hash` was empty or undefined (e.g. an
 * ingested record whose commit hash hadn't been backfilled yet).
 */
export function shortHash(hash?: string | null, fallback = 'unknown'): string {
  if (!hash) return fallback;
  return hash.slice(0, 7);
}
