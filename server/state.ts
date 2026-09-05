import { FlatFileStateLog } from '../src/types';
import { countByVector, countByStatus } from '../src/utils/counts';
import { readCommits } from './git';
import { readRecords } from './records';
import { INGEST_CRON } from './config';

const COMMIT_LOG_LIMIT = 50;

/**
 * Assembles the full state snapshot served by `GET /api/state` directly from the two sources
 * of truth: the repository's commit history and the flat files under `intelligence/`. There is
 * no cache and no database — every call re-reads both from disk, which is the point of a
 * Git-as-database design (the served state can never drift from what is actually committed).
 */
export function buildStateLog(rootDir: string, intelligenceDir: string): FlatFileStateLog {
  const commits = readCommits(rootDir, COMMIT_LOG_LIMIT);
  const records = readRecords(rootDir, intelligenceDir);

  const vectorCounts = countByVector(records);
  const statusCounts = countByStatus(records);

  // The most recent real ingest commit, not "now" — this used to be regenerated on every call,
  // which meant the UI always read "just synced" whether or not anything had actually run since
  // the schedule in `INGEST_CRON` last fired. Falls back to the newest commit overall (or now, if
  // there is no history yet) so a freshly seeded repo still shows something.
  const lastIngestCommit = commits.find((c) => c.message.startsWith('feat(ingest)'));
  const lastCronSync = (lastIngestCommit ?? commits[0])?.timestamp ?? new Date().toISOString();

  return {
    version: '2.1.0-provenance',
    repoIdentifier: 'bluecore-energy/operational-intelligence',
    cronSchedule: INGEST_CRON,
    lastCronSync,
    totalCommits: commits.length,
    activeVectors: {
      TECHNICAL_EVOLUTION: vectorCounts.technical,
      REGULATORY_PATHWAYS: vectorCounts.regulatory,
      ECOSYSTEM_MOMENTUM: vectorCounts.ecosystem,
    },
    filterMetrics: {
      verifiedDeltas: statusCounts.verified,
      rejectedPrChatter: statusCounts.rejected,
      pendingCorroboration: statusCounts.pending,
      unverifiedExternal: statusCounts.unverified,
      prNoiseSuppressionRatio:
        statusCounts.verified + statusCounts.rejected === 0
          ? 'n/a (no items screened)'
          : statusCounts.rejected === 0
          ? `${statusCounts.verified}:0 (no chatter rejected yet)`
          : `${Math.round(statusCounts.verified / statusCounts.rejected)}:1 (${(
              (statusCounts.verified / (statusCounts.verified + statusCounts.rejected)) *
              100
            ).toFixed(1)}% Chatter Screened)`,
    },
    commits,
    records,
  };
}
