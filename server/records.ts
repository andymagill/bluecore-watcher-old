import fs from 'fs';
import path from 'path';
import { OperationalDeltaRecord } from '../src/types';
import { isOperationalDeltaRecord } from '../src/utils/stateGuards';

const VECTOR_DIRS = ['technical', 'regulatory', 'ecosystem'] as const;

/**
 * Reads every `intelligence/<vector>/*.json` flat file, validating each against
 * `isOperationalDeltaRecord` before it enters the app. Files on disk are exactly as untrusted as
 * a pasted import: an ingest run that partially failed, a hand-edited file, or a future
 * migration mistake can all leave a malformed file behind, and one bad file must not 500 the
 * entire `/api/state` endpoint. Malformed files are skipped and logged, not thrown.
 */
export function readRecords(intelligenceDir: string): OperationalDeltaRecord[] {
  const records: OperationalDeltaRecord[] = [];

  for (const vector of VECTOR_DIRS) {
    const dir = path.join(intelligenceDir, vector);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const filePath = path.join(dir, file);
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (isOperationalDeltaRecord(parsed)) {
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
