/**
 * Bluecore Energy Intelligence Engine - Core Types
 * Stateless, zero-database, Git-driven deterministic telemetry and operations schema.
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

export interface EvidenceDiffSnippet {
  filePath: string;
  type?: 'addition' | 'deletion' | 'modification';
  linesAdded?: string[];
  linesRemoved?: string[];
  contextHeader?: string;
  rawPatch?: string;
}

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
    gitTreeSha?: string;
    externalUrl?: string;
    sourcePublisher?: string;
    externalDocketId?: string;
  };
  evidenceDiff?: EvidenceDiffSnippet;
  prNoiseFilter: PRNoiseFilter;
  agentRoutingMeta: AgentRoutingMeta;
}

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
    patch?: string;
  }[];
  totalAdditions: number;
  totalDeletions: number;
  isSimulatedIngest?: boolean;
}

export interface GitSyncConfig {
  repoOwner: string;
  repoName: string;
  branch: string;
  dataPath: string;
  token?: string;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncTimestamp?: string;
  connectionStatus: 'IDLE' | 'SYNCING' | 'CONNECTED' | 'ERROR';
  lastError?: string;
}

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
