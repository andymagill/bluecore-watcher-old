/**
 * Bluecore Energy Intelligence Engine - Core Types
 *
 * Stateless, zero-database, Git-driven telemetry schema. There is no ORM and no migration
 * layer behind these types: every `OperationalDeltaRecord` is a literal JSON file under
 * `intelligence/<vector>/`, and every `GitCommitSnapshot` is a literal commit in this
 * repository. A value that doesn't match these shapes is either a malformed file on disk or an
 * untrusted paste into the import tab — see `src/utils/stateGuards.ts` for the runtime checks
 * that stand in for the schema validation a database would normally provide.
 */

export const OPERATIONAL_VECTORS = [
  'TECHNICAL_EVOLUTION',
  'REGULATORY_PATHWAYS',
  'ECOSYSTEM_MOMENTUM',
] as const;
export type OperationalVector = (typeof OPERATIONAL_VECTORS)[number];

/**
 * The app's single primary-navigation state: one operational vector's grid, or the all-vector
 * Timeline. Replaces the old pairing of a `selectedVector: OperationalVector | 'ALL'` filter
 * with a separate `activeView: 'GRID' | 'TIMELINE'` toggle — vector selection now *is* the view.
 */
export type ActiveTab = OperationalVector | 'TIMELINE';

export const SUB_VECTORS = [
  // Technical Evolution
  'Berth 48 Physical Assets',
  'SMR Scaling Metrics',
  'Marine Barge Modifications',
  'Subsea Grid Integration',
  // Regulatory Pathways
  'Port of Long Beach Compliance',
  'MARAD Frameworks',
  'Early NRC Indicators',
  // Ecosystem Momentum
  'Capital Structure Updates',
  'Executive Talent Acquisition',
  'Corporate & Maritime Alliances',
] as const;
export type SubVector = (typeof SUB_VECTORS)[number];

export interface OperationalMetric {
  label: string;
  value: string;
  unit?: string;
  status?: 'nominal' | 'elevated' | 'critical' | 'completed';
}

/**
 * A single metric card as resolved by `getVectorMetrics` (`src/utils/metricDrift.ts`).
 *
 * Every field except `id`/`vector`/`label` is *derived*, never hand-set: `currentValue` and
 * `sourceAttribution` come from a real record's `keyMetrics`/`sourceProvenance`, and
 * `isUnpopulated` is true when no record currently supports the metric. See
 * `src/data/metricDefinitions.ts` for what determines which records are eligible.
 */
export interface VectorMetricItem {
  id: string;
  vector: OperationalVector;
  label: string;
  currentValue: string;
  unit?: string;
  status: 'nominal' | 'elevated' | 'critical' | 'unpopulated';
  drift: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
    detail: string;
  };
  baselineEstimate?: string;
  currentActual?: string;
  sourceAttribution: {
    publisher: string;
    documentRef: string;
    commitHash: string;
    url?: string;
  };
  isUnpopulated?: boolean;
  unpopulatedReason?: string;
}

/**
 * A before/after comparison emitted by `getComparativeSnapshots` when the same tracked metric
 * has two or more accessioned observations. A metric observed only once has nothing to compare
 * against and produces no snapshot — an empty list here is a correct, expected state, not a
 * bug, until a second corroborating record arrives.
 */
export interface ComparativeSnapshotItem {
  id: string;
  vector: OperationalVector;
  metricName: string;
  previousEstimate: string;
  currentActual: string;
  varianceDelta: string;
  direction: 'up' | 'down' | 'neutral';
  evolutionRationale: string;
  sourcePublisher: string;
  sourceUrl?: string;
  commitHash: string;
  targetHorizon: string;
  revisionDate: string;
}

export interface OperationalMilestone {
  title: string;
  targetDate: string;
  criticalPath: boolean;
}

/**
 * An illustrative diff snippet shown in the record detail modal's "Raw Flat-File Audit" panel.
 * Every field is optional — a record ingested without a captured diff (or one hand-authored
 * without one) is valid and must render with the panel simply omitted, not a crash. See
 * `DeltaDetailModal`'s handling of `evidenceDiff`.
 */
export interface EvidenceDiffSnippet {
  filePath: string;
  type?: 'addition' | 'deletion' | 'modification';
  linesAdded?: string[];
  linesRemoved?: string[];
  contextHeader?: string;
}

/**
 * One accessioned intelligence record — the atomic unit of this app's "database". Each one is a
 * single JSON file at `sourceProvenance.filePath` under `intelligence/<vector>/`, so `id` should
 * be treated as a stable filename-safe key, not just a display identifier.
 */
export interface OperationalDeltaRecord {
  id: string;
  operationalVector: OperationalVector;
  subVector: SubVector;
  headline: string;
  verifiableClaim: string;
  verifiableDelta: string;
  keyMetrics?: OperationalMetric[];
  nextMilestone?: OperationalMilestone;
  sourceProvenance: {
    documentRef: string;
    commitHash: string;
    /** Optional: the ingest pipeline records the publisher as `sourcePublisher`, not as an
     * author — this is unknown for most feed items and should not be filled with the publisher
     * name as a stand-in. */
    author?: string;
    timestamp: string;
    filePath: string;
    fileSizeBytes?: number;
    /** As given by the source feed — for Google News items this is an opaque
     * `news.google.com/rss/articles/...` redirect, not the publisher's real URL. See
     * `canonicalUrl` for what was actually resolved and checked. */
    externalUrl?: string;
    /** The resolved publisher URL that was actually HTTP-verified before this record was
     * accessioned. Absent means no resolution/verification was performed. */
    canonicalUrl?: string;
    /** When `canonicalUrl` was last confirmed to return a successful response. */
    urlVerifiedAt?: string;
    sourcePublisher?: string;
    externalDocketId?: string;
  };
  evidenceDiff?: EvidenceDiffSnippet;
}

/**
 * One entry in the repository's commit history, as read by `server/git.ts#readCommits`.
 * `totalAdditions`/`totalDeletions`/`filesChanged` are real `git show --numstat` output, not
 * placeholder values — treat any code that hardcodes these as a regression.
 */
export interface GitCommitSnapshot {
  commitHash: string;
  parentHash: string;
  timestamp: string;
  author: string;
  message: string;
  vectorTag: OperationalVector;
  filesChanged: {
    filename: string;
    status: 'added' | 'modified' | 'deleted';
    additions: number;
    deletions: number;
  }[];
  totalAdditions: number;
  totalDeletions: number;
}

/**
 * The full state snapshot exchanged between server and client: `GET /api/state`'s response
 * body, the shape `useIntelligenceState` holds in React state, and what the State Log
 * Inspector's import/export tabs read and write verbatim. Constructed by `buildStateLog`
 * (`server/state.ts`) on the server, or by `parseStateLog` (`src/utils/stateGuards.ts`) when
 * assembled from an untrusted import.
 */
export interface FlatFileStateLog {
  version: string;
  repoIdentifier: string;
  lastCronSync: string;
  cronSchedule: string;
  totalCommits: number;
  activeVectors: {
    TECHNICAL_EVOLUTION: number;
    REGULATORY_PATHWAYS: number;
    ECOSYSTEM_MOMENTUM: number;
  };
  /**
   * A record's `sourceProvenance.canonicalUrl`/`urlVerifiedAt` presence is the only evaluation
   * this system actually performs on a source — a live HTTP check, nothing more (no claim
   * corroboration, no cross-source confirmation). This tally is derived straight from that, not
   * from a separate evaluative judgment. See `countByUrlVerification` in `src/utils/counts.ts`.
   */
  urlVerification: {
    verified: number;
    unverified: number;
  };
  commits: GitCommitSnapshot[];
  records: OperationalDeltaRecord[];
}
