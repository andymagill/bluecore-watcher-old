/**
 * Bundled offline fallback state for the Bluecore Energy Intelligence Engine.
 *
 * This is a SECONDARY source of truth, not the primary one: `intelligence/**\/*.json` on disk
 * (read by `server/records.ts`) is authoritative. `useIntelligenceState` renders this data only
 * until the first successful `/api/state` response replaces it, and falls back to it again if
 * the backend becomes unreachable — see `DataSource` in `src/hooks/useIntelligenceState.ts`.
 *
 * Deliberately empty. An earlier version of this file shipped nine hand-authored records
 * presented as "real, publicly-sourced" — several cited dead or unrelated URLs, one asserted a
 * regulatory framework that does not exist, and all of it carried commit hashes that resolved to
 * no commit in this repository. Fabricated content in the *fallback* path is exactly as dishonest
 * as fabricated content in a live record: the `dataSource: 'seed'` banner only tells the user the
 * backend is unreachable, not that what's on screen was invented. So this stays empty rather than
 * seeded — the UI's empty-state rendering (`records.length === 0` branches, `unpopulatedReason`
 * on metric cards) is the correct and only honest thing to show before the ingest pipeline has
 * accessioned anything real.
 */

import { FlatFileStateLog, GitCommitSnapshot, OperationalDeltaRecord } from '../types';

export const INITIAL_GIT_COMMITS: GitCommitSnapshot[] = [];

export const INITIAL_DELTA_RECORDS: OperationalDeltaRecord[] = [];

export const INITIAL_STATE_LOG: FlatFileStateLog = {
  version: "2.1.0-provenance",
  repoIdentifier: "bluecore-energy/operational-intelligence",
  cronSchedule: "0 */4 * * *",
  lastCronSync: new Date(0).toISOString(),
  totalCommits: INITIAL_GIT_COMMITS.length,
  activeVectors: {
    TECHNICAL_EVOLUTION: 0,
    REGULATORY_PATHWAYS: 0,
    ECOSYSTEM_MOMENTUM: 0
  },
  urlVerification: {
    verified: 0,
    unverified: 0
  },
  commits: INITIAL_GIT_COMMITS,
  records: INITIAL_DELTA_RECORDS
};
