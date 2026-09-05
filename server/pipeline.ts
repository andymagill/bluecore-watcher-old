import fs from 'fs';
import path from 'path';
import { OperationalDeltaRecord } from '../src/types';
import { readRecords } from './records';
import { stageAndCommit } from './git';
import {
  fetchRealExternalCandidates,
  classifyIngestCandidate,
  buildRecordFromCandidate,
  makeRecordId,
  resolveAndVerify,
  isVerified,
  headlineTokens,
  jaccardSimilarity,
  DUPLICATE_HEADLINE_THRESHOLD,
  VerifiedCandidate,
  QuarantinedCandidate,
} from './ingest';

const DEFAULT_MAX_RECORDS = 5;

export type IngestResult =
  | { status: 'ingested'; records: OperationalDeltaRecord[]; commitHash: string }
  | { status: 'up-to-date' }
  | { status: 'failed'; error: string };

/**
 * Appends this run's rejected candidates to a dated quarantine file, so a failure to resolve or
 * verify a URL is visible for later review rather than silently discarded. `readRecords` only
 * ever looks under `technical/`, `regulatory/`, `ecosystem/`, so this directory is never read
 * into `/api/state` — quarantined items never masquerade as accessioned records.
 *
 * Returns the file's repo-relative path so the caller can stage and commit it. Every CI run
 * (`.github/workflows/ingest.yml`) starts from a fresh checkout — a quarantine write that never
 * makes it into a commit would simply vanish before the next scheduled run could ever surface it,
 * defeating the entire point of keeping a record of what got rejected and why.
 */
function writeQuarantine(rootDir: string, rejected: QuarantinedCandidate[]): string | null {
  if (rejected.length === 0) return null;

  const dir = path.join(rootDir, 'intelligence', '_quarantine');
  fs.mkdirSync(dir, { recursive: true });

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filePath = path.join(dir, `${dateStamp}.json`);

  const existing: unknown[] = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    : [];

  const entries = rejected.map((q) => ({
    quarantinedAt: new Date().toISOString(),
    reason: q.reason,
    candidate: q.candidate,
  }));

  fs.writeFileSync(filePath, JSON.stringify([...existing, ...entries], null, 2), 'utf-8');
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

/**
 * The full ingest pipeline, extracted so it can run identically from `POST /api/workflow/run`
 * (`server/routes.ts`) and from `scripts/ingest.ts` (a plain CLI, no Express/browser involved).
 * This function only ever commits locally — it never pushes — so the same code can back a
 * button click in the running server and a scheduled CI job without either one surprising you
 * with a network push the other didn't expect; the workflow that wants a push does that itself.
 *
 * Fetches candidates, resolves and HTTP-verifies each one's real publisher URL (quarantining any
 * that fail), dedups the survivors against both existing records and other candidates from this
 * same fetch (by canonical URL and by headline token-similarity, not just exact URL/headline
 * equality), writes up to `maxRecords` new record files, and makes ONE commit covering all of
 * them — not one commit per record — so a catch-up run after being offline doesn't spam the
 * history.
 */
export async function runIngestPipeline(
  rootDir: string,
  intelligenceDir: string,
  opts: { maxRecords?: number } = {}
): Promise<IngestResult> {
  const maxRecords = opts.maxRecords ?? DEFAULT_MAX_RECORDS;

  try {
    const existingRecords = readRecords(rootDir, intelligenceDir);
    const existingUrls = new Set(
      existingRecords
        .map((r) => (r.sourceProvenance?.canonicalUrl || r.sourceProvenance?.externalUrl || '').toLowerCase())
        .filter(Boolean)
    );
    const existingTokenSets = existingRecords.map((r) => headlineTokens(r.headline));

    const candidates = await fetchRealExternalCandidates();

    const resolutions = await Promise.all(candidates.map((c) => resolveAndVerify(c)));
    const quarantined = resolutions.filter(
      (r): r is QuarantinedCandidate => !isVerified(r)
    );
    const quarantinePath = writeQuarantine(rootDir, quarantined);

    const seenUrls = new Set(existingUrls);
    const seenTokenSets = [...existingTokenSets];
    const fresh: VerifiedCandidate[] = [];

    for (const resolution of resolutions) {
      if (!isVerified(resolution)) continue;

      const normalizedUrl = resolution.canonicalUrl.toLowerCase();
      const tokens = headlineTokens(resolution.candidate.title);

      const isUrlDuplicate = seenUrls.has(normalizedUrl);
      const isHeadlineDuplicate = seenTokenSets.some(
        (existing) => jaccardSimilarity(existing, tokens) >= DUPLICATE_HEADLINE_THRESHOLD
      );
      if (isUrlDuplicate || isHeadlineDuplicate) continue;

      // Mark seen immediately (not just at the end) so duplicate stories within this same fetch
      // — the four RSS queries overlap, and the same event is often filed under regulatory and
      // technical alike — don't both make it into the batch.
      seenUrls.add(normalizedUrl);
      seenTokenSets.push(tokens);
      fresh.push(resolution);
      if (fresh.length >= maxRecords) break;
    }

    if (fresh.length === 0) {
      // Nothing accessioned this run, but if anything was quarantined it still needs to be
      // committed on its own — otherwise it never leaves the working tree of this one run.
      if (quarantinePath) {
        const outcome = stageAndCommit(
          rootDir,
          [quarantinePath],
          `chore(ingest): log ${quarantined.length} quarantined candidate(s)`
        );
        if (!outcome.ok) {
          return { status: 'failed', error: `Failed to commit quarantine log: ${outcome.error}` };
        }
      }
      return { status: 'up-to-date' };
    }

    const recordPaths: string[] = [];
    const newRecords: OperationalDeltaRecord[] = [];
    const commitTime = new Date();

    for (const verified of fresh) {
      const { vector, subVector, targetSubdir } = classifyIngestCandidate(verified.candidate);
      const recordId = makeRecordId(vector, verified.canonicalUrl, commitTime);

      const record = buildRecordFromCandidate(verified, recordId, targetSubdir, vector, subVector);
      const targetPath = path.join(intelligenceDir, targetSubdir, `${record.id}.json`);
      const relativePath = path.relative(rootDir, targetPath).split(path.sep).join('/');

      // Written once with an approximate size (the field can't include its own final byte
      // count), then re-measured against the file actually on disk — closer to the truth than a
      // hardcoded literal, and still a single logical write since nothing is committed yet.
      fs.writeFileSync(targetPath, JSON.stringify(record, null, 2), 'utf-8');
      record.sourceProvenance.fileSizeBytes = fs.statSync(targetPath).size;
      fs.writeFileSync(targetPath, JSON.stringify(record, null, 2), 'utf-8');

      recordPaths.push(relativePath);
      newRecords.push(record);
    }

    const commitMessage =
      newRecords.length === 1
        ? `feat(ingest): accession external item: ${newRecords[0].headline.slice(0, 50)} [${newRecords[0].sourceProvenance.sourcePublisher}]`
        : `feat(ingest): accession ${newRecords.length} external items`;

    // The quarantine file (if any) rides along in the same commit as the records — one commit
    // per run, same as before — but is kept out of the rollback list below: unlike a record file,
    // it is often an *append* to entries from earlier runs, and deleting it on a failed commit
    // would destroy that history, not just this run's contribution to it.
    const commitPaths = quarantinePath ? [...recordPaths, quarantinePath] : recordPaths;
    const outcome = stageAndCommit(rootDir, commitPaths, commitMessage);

    if (!outcome.ok) {
      // Roll back this run's record writes: an uncommitted file on disk would be picked up as
      // "already accessioned" by the dedup check above on the next run, permanently excluding
      // that headline from ever being retried.
      for (const relativePath of recordPaths) {
        fs.unlinkSync(path.join(rootDir, relativePath));
      }
      return { status: 'failed', error: `Failed to commit new records to Git: ${outcome.error}` };
    }

    // No post-commit write-back here: `sourceProvenance.commitHash` is resolved from Git history
    // at read time (`server/records.ts`), so the file written above is the only write this
    // record ever gets and the working tree is clean the moment this function returns.
    for (const record of newRecords) {
      record.sourceProvenance.commitHash = outcome.hash;
    }

    return { status: 'ingested', records: newRecords, commitHash: outcome.hash };
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }
}
