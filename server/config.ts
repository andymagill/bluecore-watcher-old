/**
 * The ingest schedule, quoted once and shared by everything that needs to display or run it:
 * `server/state.ts` (what the UI shows) and `.github/workflows/ingest.yml` (what actually runs
 * the pipeline on a schedule). Keeping this in one place is what stops the two from silently
 * diverging the way the UI's schedule string and reality already had before this existed.
 *
 * If you change this, update the `cron:` line in `.github/workflows/ingest.yml` to match.
 */
export const INGEST_CRON = '0 */4 * * *';
