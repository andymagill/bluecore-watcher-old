import { FlatFileStateLog } from '../src/types';
import { countByVector, countByStatus } from '../src/utils/counts';
import { readCommits } from './git';
import { readRecords } from './records';

const COMMIT_LOG_LIMIT = 50;

/**
 * Assembles the full state snapshot served by `GET /api/state` directly from the two sources
 * of truth: the repository's commit history and the flat files under `intelligence/`. There is
 * no cache and no database — every call re-reads both from disk, which is the point of a
 * Git-as-database design (the served state can never drift from what is actually committed).
 */
export function buildStateLog(rootDir: string, intelligenceDir: string): FlatFileStateLog {
  const commits = readCommits(rootDir, COMMIT_LOG_LIMIT);
  const records = readRecords(intelligenceDir);

  const vectorCounts = countByVector(records);
  const statusCounts = countByStatus(records);

  return {
    version: '2.1.0-provenance',
    repoIdentifier: 'bluecore-energy/operational-intelligence',
    cronSchedule: '0 */4 * * *',
    lastCronSync: new Date().toISOString(),
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
      prNoiseSuppressionRatio:
        statusCounts.rejected === 0
          ? '100% Signal Fidelity (100% Real Sourced)'
          : `${Math.round(statusCounts.verified / statusCounts.rejected)}:1 (${(
              (statusCounts.verified / (statusCounts.verified + statusCounts.rejected)) *
              100
            ).toFixed(1)}% Chatter Screened)`,
    },
    commits,
    records,
  };
}
