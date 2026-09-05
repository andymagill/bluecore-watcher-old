import fs from 'fs';
import path from 'path';
import { OperationalDeltaRecord } from '../src/types';
import { readRecords } from './records';
import { stageAndCommit } from './git';
import { fetchRealExternalCandidates, classifyIngestCandidate, buildRecordFromCandidate, normalizeHeadline } from './ingest';

const DEFAULT_MAX_RECORDS = 5;

export type IngestResult =
  | { status: 'ingested'; records: OperationalDeltaRecord[]; commitHash: string }
  | { status: 'up-to-date' }
  | { status: 'failed'; error: string };

/**
 * The full ingest pipeline, extracted so it can run identically from `POST /api/workflow/run`
 * (`server/routes.ts`) and from `scripts/ingest.ts` (a plain CLI, no Express/browser involved).
 * This function only ever commits locally — it never pushes — so the same code can back a
 * button click in the running server and a scheduled CI job without either one surprising you
 * with a network push the other didn't expect; the workflow that wants a push does that itself.
 *
 * Fetches candidates, dedups against both existing records and other candidates from this same
 * fetch, writes up to `maxRecords` new record files, and makes ONE commit covering all of them —
 * not one commit per record — so a catch-up run after being offline doesn't spam the history.
 */
export async function runIngestPipeline(
  rootDir: string,
  intelligenceDir: string,
  opts: { maxRecords?: number } = {}
): Promise<IngestResult> {
  const maxRecords = opts.maxRecords ?? DEFAULT_MAX_RECORDS;

  try {
    const existingRecords = readRecords(rootDir, intelligenceDir);
    const existingHeadlines = new Set(existingRecords.map((r) => normalizeHeadline(r.headline)));
    const existingUrls = new Set(
      existingRecords.map((r) => (r.sourceProvenance?.externalUrl || '').toLowerCase())
    );

    const candidates = await fetchRealExternalCandidates();

    const seenHeadlines = new Set(existingHeadlines);
    const seenUrls = new Set(existingUrls);
    const fresh = [];
    for (const candidate of candidates) {
      const normalizedHeadline = normalizeHeadline(candidate.title);
      const normalizedUrl = candidate.url.toLowerCase();
      if (seenHeadlines.has(normalizedHeadline) || seenUrls.has(normalizedUrl)) continue;

      // Mark seen immediately (not just at the end) so duplicate stories within this same fetch
      // — the four RSS queries overlap — don't both make it into the batch.
      seenHeadlines.add(normalizedHeadline);
      seenUrls.add(normalizedUrl);
      fresh.push(candidate);
      if (fresh.length >= maxRecords) break;
    }

    if (fresh.length === 0) {
      return { status: 'up-to-date' };
    }

    const writtenPaths: string[] = [];
    const newRecords: OperationalDeltaRecord[] = [];

    for (const candidate of fresh) {
      const { vector, subVector, targetSubdir } = classifyIngestCandidate(candidate);
      const recordId = `REC-${
        vector === 'TECHNICAL_EVOLUTION' ? 'TECH' : vector === 'REGULATORY_PATHWAYS' ? 'REG' : 'ECO'
      }-LIVE-${Date.now().toString().slice(-4)}-${writtenPaths.length}`;

      const record = buildRecordFromCandidate(candidate, recordId, targetSubdir, vector, subVector);
      const targetPath = path.join(intelligenceDir, targetSubdir, `${record.id}.json`);
      const relativePath = path.relative(rootDir, targetPath).split(path.sep).join('/');

      fs.writeFileSync(targetPath, JSON.stringify(record, null, 2), 'utf-8');
      writtenPaths.push(relativePath);
      newRecords.push(record);
    }

    const commitMessage =
      newRecords.length === 1
        ? `feat(ingest): accession real external record: ${newRecords[0].headline.slice(0, 50)} [${newRecords[0].sourceProvenance.sourcePublisher}]`
        : `feat(ingest): accession ${newRecords.length} real external records`;

    const outcome = stageAndCommit(rootDir, writtenPaths, commitMessage);

    if (!outcome.ok) {
      // Roll back every write from this run: an uncommitted file on disk would be picked up as
      // "already accessioned" by the dedup check above on the next run, permanently excluding
      // that headline from ever being retried.
      for (const relativePath of writtenPaths) {
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
