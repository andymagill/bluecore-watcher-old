import { OperationalDeltaRecord } from '../types';

export interface VectorCounts {
  total: number;
  technical: number;
  regulatory: number;
  ecosystem: number;
}

export interface StatusCounts {
  verified: number;
  rejected: number;
  pending: number;
}

/**
 * Tallies records per operational vector.
 *
 * Dependency-free (no DOM, no Express types) so both the browser UI and the Express server can
 * import the exact same implementation instead of maintaining three parallel copies of the same
 * three `.filter(...).length` calls, which had already drifted from each other before this
 * extraction.
 */
export function countByVector(records: OperationalDeltaRecord[]): VectorCounts {
  return {
    total: records.length,
    technical: records.filter((r) => r.operationalVector === 'TECHNICAL_EVOLUTION').length,
    regulatory: records.filter((r) => r.operationalVector === 'REGULATORY_PATHWAYS').length,
    ecosystem: records.filter((r) => r.operationalVector === 'ECOSYSTEM_MOMENTUM').length,
  };
}

/** Tallies records per PR-noise-filter verification status. */
export function countByStatus(records: OperationalDeltaRecord[]): StatusCounts {
  return {
    verified: records.filter((r) => r.prNoiseFilter.verificationStatus === 'VERIFIED_DELTA').length,
    rejected: records.filter((r) => r.prNoiseFilter.verificationStatus === 'REJECTED_PR_CHATTER').length,
    pending: records.filter((r) => r.prNoiseFilter.verificationStatus === 'PENDING_DOCUMENT_CORROBORATION').length,
  };
}
