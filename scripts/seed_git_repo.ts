import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { INITIAL_DELTA_RECORDS } from '../src/data/seedState';

const ROOT_DIR = process.cwd();
const INTELLIGENCE_DIR = path.join(ROOT_DIR, 'intelligence');

const VECTORS = ['technical', 'regulatory', 'ecosystem'];

// Clear old placeholder files
for (const v of VECTORS) {
  const dir = path.join(INTELLIGENCE_DIR, v);
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        fs.unlinkSync(path.join(dir, f));
      }
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Write out all real records to disk as flat JSON files
for (const rec of INITIAL_DELTA_RECORDS) {
  let subDir = 'technical';
  if (rec.operationalVector === 'REGULATORY_PATHWAYS') subDir = 'regulatory';
  if (rec.operationalVector === 'ECOSYSTEM_MOMENTUM') subDir = 'ecosystem';

  const filePath = path.join(INTELLIGENCE_DIR, subDir, `${rec.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(rec, null, 2), 'utf-8');
}

console.log(`Seeded ${INITIAL_DELTA_RECORDS.length} real flat-file records into ${INTELLIGENCE_DIR}`);

// Stage and commit to local git repository
try {
  execSync('git add intelligence/', { stdio: 'inherit' });
  execSync('git commit -m "feat(intelligence): populate real externally sourced records (MARAD RFI, POLB Pact, Forbes, NEI Specs)"', { stdio: 'inherit' });
  console.log('Successfully committed real externally sourced intelligence records to local Git repo.');
} catch (err: any) {
  console.log('Git commit output/error:', err.message);
}
