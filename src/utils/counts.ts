import { OperationalDeltaRecord } from '../types';

export interface VectorCounts {
  total: number;
  technical: number;
  regulatory: number;
  ecosystem: number;
}

export interface UrlVerificationCounts {
  verified: number;
  unverified: number;
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

/**
 * Tallies records by whether their source URL was actually resolved and HTTP-verified
 * (`sourceProvenance.canonicalUrl` + `urlVerifiedAt` both present) — the one real check this
 * system performs on a source, and the only thing this count claims. It does not mean the
 * article was read, or that any claim in it was corroborated.
 */
export function countByUrlVerification(records: OperationalDeltaRecord[]): UrlVerificationCounts {
  const verified = records.filter(
    (r) => Boolean(r.sourceProvenance.canonicalUrl) && Boolean(r.sourceProvenance.urlVerifiedAt)
  ).length;
  return {
    verified,
    unverified: records.length - verified,
  };
}
