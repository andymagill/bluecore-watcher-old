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

export type OperationalVector =
  | 'TECHNICAL_EVOLUTION'
  | 'REGULATORY_PATHWAYS'
  | 'ECOSYSTEM_MOMENTUM';

export type SubVector =
  // Technical Evolution
  | 'Berth 48 Physical Assets'
  | 'SMR Scaling Metrics'
  | 'Marine Barge Modifications'
  | 'Subsea Grid Integration'
  // Regulatory Pathways
  | 'Port of Long Beach Compliance'
  | 'MARAD Frameworks'
  | 'Early NRC Indicators'
  // Ecosystem Momentum
  | 'Capital Structure Updates'
  | 'Executive Talent Acquisition'
  | 'Corporate & Maritime Alliances';

export type VerificationStatus = 
  | 'VERIFIED_DELTA'
  | 'PENDING_DOCUMENT_CORROBORATION'
  | 'REJECTED_PR_CHATTER';

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

export interface PRNoiseFilter {
  prChatterDetected: boolean;
  chatterFlags: string[];
  confidenceScore: number; // 0.00 to 1.00
  verificationStatus: VerificationStatus;
  signalNoiseRatio: number; // e.g. 9.4x
  filterRationale: string;
}

export interface AgentRoutingMeta {
  targetAgent: 
    | 'AGENT_MARITIME_INFRASTRUCTURE'
    | 'AGENT_NUCLEAR_COMPLIANCE'
    | 'AGENT_CAPITAL_AUDITOR'
    | 'AGENT_GRID_INTERCONNECT'
    | 'AGENT_HARBOR_LOGISTICS';
  actionType: 
    | 'DISPATCH_INSPECTION'
    | 'QUEUE_LEGAL_AUDIT'
    | 'UPDATE_METRIC_STORE'
    | 'ALERT_SECURITY_ANOMALY'
    | 'LOG_CORROBORATED_DELTA';
  priority: 'P0_CRITICAL' | 'P1_OPERATIONAL' | 'P2_INFORMATIONAL';
  checksum: string;
  routingTimestamp: string;
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
    author: string;
    timestamp: string;
    filePath: string;
    fileSizeBytes?: number;
    externalUrl?: string;
    sourcePublisher?: string;
    externalDocketId?: string;
  };
  evidenceDiff?: EvidenceDiffSnippet;
  prNoiseFilter: PRNoiseFilter;
  agentRoutingMeta: AgentRoutingMeta;
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
  filterMetrics: {
    verifiedDeltas: number;
    pendingCorroboration: number;
    rejectedPrChatter: number;
    prNoiseSuppressionRatio: string;
  };
  commits: GitCommitSnapshot[];
  records: OperationalDeltaRecord[];
}
