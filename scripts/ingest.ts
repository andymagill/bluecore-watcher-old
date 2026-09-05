import path from 'path';
import { runIngestPipeline } from '../server/pipeline';

/**
 * Headless entry point for the ingest pipeline — `npm run ingest`. Runs the exact same code as
 * the "Run Workflow" button (`POST /api/workflow/run`), without Express or a browser in the
 * loop, so it can run from a terminal or from CI (see `.github/workflows/ingest.yml`).
 *
 * This script only commits locally; it never pushes. A caller that wants the result published
 * (the GitHub Actions workflow) does `git push` itself after this exits 0.
 */
async function main() {
  const rootDir = process.cwd();
  const intelligenceDir = path.join(rootDir, 'intelligence');

  const outcome = await runIngestPipeline(rootDir, intelligenceDir);

  switch (outcome.status) {
    case 'ingested':
      console.log(
        `Ingested ${outcome.records.length} record(s) into commit ${outcome.commitHash}:`
      );
      for (const record of outcome.records) {
        console.log(`  - [${record.operationalVector}] ${record.headline}`);
      }
      process.exit(0);
      break;
    case 'up-to-date':
      console.log('Repository already up to date — no new external records found.');
      process.exit(0);
      break;
    case 'failed':
      console.error(`Ingest pipeline failed: ${outcome.error}`);
      process.exit(1);
      break;
  }
}

main();
