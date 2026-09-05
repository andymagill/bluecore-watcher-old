import fs from 'fs';
import path from 'path';
import { OperationalDeltaRecord } from '../src/types';
import { isOperationalDeltaRecord } from '../src/utils/stateGuards';
import { readAddedFileCommits } from './git';

const VECTOR_DIRS = ['technical', 'regulatory', 'ecosystem'] as const;

/**
 * Reads every `intelligence/<vector>/*.json` flat file, validating each against
 * `isOperationalDeltaRecord` before it enters the app. Files on disk are exactly as untrusted as
 * a pasted import: an ingest run that partially failed, a hand-edited file, or a future
 * migration mistake can all leave a malformed file behind, and one bad file must not 500 the
 * entire `/api/state` endpoint. Malformed files are skipped and logged, not thrown.
 *
 * `sourceProvenance.commitHash` is resolved here from Git history (the commit that added the
 * file) rather than being read verbatim off disk: the ingest pipeline writes a record's file
 * once, before the commit exists, and never touches it again — there is no second,
 * hash-backfilling write to leave the working tree dirty after every run. A record whose file
 * predates this (or was hand-seeded with a hash already in place) keeps whatever hash is stored
 * on disk if Git has no "added" entry for its path.
 */
export function readRecords(rootDir: string, intelligenceDir: string): OperationalDeltaRecord[] {
  const records: OperationalDeltaRecord[] = [];
  const addedCommits = readAddedFileCommits(rootDir);

  for (const vector of VECTOR_DIRS) {
    const dir = path.join(intelligenceDir, vector);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const filePath = path.join(dir, file);
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (isOperationalDeltaRecord(parsed)) {
          const relativePath = path.relative(rootDir, filePath).split(path.sep).join('/');
          const resolvedHash = addedCommits.get(relativePath);
          if (resolvedHash) {
            parsed.sourceProvenance.commitHash = resolvedHash;
          }
          records.push(parsed);
        } else {
          console.error(`Skipping ${filePath}: does not match the OperationalDeltaRecord schema.`);
        }
      } catch (err) {
        console.error(`Skipping ${filePath}: failed to read or parse —`, err);
      }
    }
  }

  return records.sort((a, b) => {
    const tA = new Date(a.sourceProvenance?.timestamp || 0).getTime();
    const tB = new Date(b.sourceProvenance?.timestamp || 0).getTime();
    return tB - tA;
  });
}
