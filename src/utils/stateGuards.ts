import {
  FlatFileStateLog,
  GitCommitSnapshot,
  OperationalDeltaRecord,
  OPERATIONAL_VECTORS,
  SUB_VECTORS,
  VERIFICATION_STATUSES,
  TARGET_AGENTS,
  ACTION_TYPES,
  ROUTING_PRIORITIES,
} from '../types';

/**
 * Runtime shape guards for `FlatFileStateLog` and its members.
 *
 * Every record in this app crosses an untrusted boundary at least once: flat files read off
 * disk by the server, or JSON pasted into the State Log Inspector's import tab by a person.
 * `JSON.parse` only proves the input is *valid JSON* — it says nothing about whether it matches
 * `OperationalDeltaRecord`. Without a check here, a malformed file or paste reaches `.map()`,
 * `.filter()`, and template interpolation deep in the render tree before it fails, at which
 * point the stack trace points at the wrong file entirely. Kept dependency-free (no DOM, no
 * Express) so both the browser (import tab) and the server (`readRecords`) can share it.
 */

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

export function isOperationalDeltaRecord(value: unknown): value is OperationalDeltaRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;

  if (!isNonEmptyString(r.id)) return false;
  if (!isOneOf(r.operationalVector, OPERATIONAL_VECTORS)) return false;
  if (!isOneOf(r.subVector, SUB_VECTORS)) return false;
  if (!isNonEmptyString(r.headline)) return false;
  if (!isNonEmptyString(r.verifiableClaim)) return false;
  if (!isNonEmptyString(r.verifiableDelta)) return false;

  const sp = r.sourceProvenance as Record<string, unknown> | undefined;
  if (typeof sp !== 'object' || sp === null) return false;
  if (!isNonEmptyString(sp.documentRef)) return false;
  if (typeof sp.commitHash !== 'string') return false;
  if (sp.author !== undefined && !isNonEmptyString(sp.author)) return false;
  if (!isNonEmptyString(sp.timestamp)) return false;
  if (!isNonEmptyString(sp.filePath)) return false;

  const pnf = r.prNoiseFilter as Record<string, unknown> | undefined;
  if (typeof pnf !== 'object' || pnf === null) return false;
  if (!isOneOf(pnf.verificationStatus, VERIFICATION_STATUSES)) return false;
  if (!Array.isArray(pnf.chatterFlags)) return false;

  const arm = r.agentRoutingMeta as Record<string, unknown> | undefined;
  if (typeof arm !== 'object' || arm === null) return false;
  if (!isOneOf(arm.targetAgent, TARGET_AGENTS)) return false;
  if (!isOneOf(arm.actionType, ACTION_TYPES)) return false;
  if (!isOneOf(arm.priority, ROUTING_PRIORITIES)) return false;

  return true;
}

export function isGitCommitSnapshot(value: unknown): value is GitCommitSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;

  return (
    isNonEmptyString(c.commitHash) &&
    typeof c.parentHash === 'string' &&
    isNonEmptyString(c.timestamp) &&
    isNonEmptyString(c.author) &&
    isNonEmptyString(c.message) &&
    isNonEmptyString(c.vectorTag) &&
    typeof c.totalAdditions === 'number' &&
    typeof c.totalDeletions === 'number' &&
    Array.isArray(c.filesChanged)
  );
}

export type ParseStateLogResult =
  | { ok: true; stateLog: FlatFileStateLog; droppedRecords: number; droppedCommits: number }
  | { ok: false; error: string };

/**
 * Validates and repairs an arbitrary JSON value into a `FlatFileStateLog`.
 *
 * Rather than accepting or rejecting the whole payload, invalid entries within `commits` and
 * `records` are dropped individually and counted, so one malformed record does not take down an
 * otherwise-usable import — the caller decides whether to warn about `droppedRecords` /
 * `droppedCommits` or ignore them if zero.
 */
export function parseStateLog(value: unknown): ParseStateLogResult {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, error: 'Expected a JSON object with "commits" and "records" arrays.' };
  }

  const v = value as Record<string, unknown>;

  if (!Array.isArray(v.commits)) {
    return { ok: false, error: 'Missing or invalid "commits": expected an array.' };
  }
  if (!Array.isArray(v.records)) {
    return { ok: false, error: 'Missing or invalid "records": expected an array.' };
  }

  const commits = v.commits.filter(isGitCommitSnapshot);
  const records = v.records.filter(isOperationalDeltaRecord);

  if (commits.length === 0 && v.commits.length > 0) {
    return { ok: false, error: 'None of the entries in "commits" match the expected commit shape.' };
  }
  if (records.length === 0 && v.records.length > 0) {
    return { ok: false, error: 'None of the entries in "records" match the expected record shape.' };
  }

  const stateLog: FlatFileStateLog = {
    version: isNonEmptyString(v.version) ? v.version : 'unknown',
    repoIdentifier: isNonEmptyString(v.repoIdentifier) ? v.repoIdentifier : 'imported-snapshot',
    lastCronSync: isNonEmptyString(v.lastCronSync) ? v.lastCronSync : new Date().toISOString(),
    cronSchedule: isNonEmptyString(v.cronSchedule) ? v.cronSchedule : 'n/a',
    totalCommits: commits.length,
    activeVectors: {
      TECHNICAL_EVOLUTION: records.filter((r) => r.operationalVector === 'TECHNICAL_EVOLUTION').length,
      REGULATORY_PATHWAYS: records.filter((r) => r.operationalVector === 'REGULATORY_PATHWAYS').length,
      ECOSYSTEM_MOMENTUM: records.filter((r) => r.operationalVector === 'ECOSYSTEM_MOMENTUM').length,
    },
    filterMetrics: {
      verifiedDeltas: records.filter((r) => r.prNoiseFilter.verificationStatus === 'VERIFIED_DELTA').length,
      pendingCorroboration: records.filter((r) => r.prNoiseFilter.verificationStatus === 'PENDING_DOCUMENT_CORROBORATION').length,
      rejectedPrChatter: records.filter((r) => r.prNoiseFilter.verificationStatus === 'REJECTED_PR_CHATTER').length,
      unverifiedExternal: records.filter((r) => r.prNoiseFilter.verificationStatus === 'UNVERIFIED_EXTERNAL_ITEM').length,
      prNoiseSuppressionRatio: 'n/a (imported snapshot)',
    },
    commits,
    records,
  };

  return {
    ok: true,
    stateLog,
    droppedRecords: v.records.length - records.length,
    droppedCommits: v.commits.length - commits.length,
  };
}
