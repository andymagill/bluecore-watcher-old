import { Router, Request, Response } from 'express';
import { buildStateLog } from './state';
import { runIngestPipeline } from './pipeline';

export function createRoutes(rootDir: string, intelligenceDir: string): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      system: 'Bluecore Energy Intelligence Engine',
      mode: 'native-git-repository',
      timestamp: new Date().toISOString(),
    });
  });

  // Reads state directly from the real local Git repository and flat files on disk.
  router.get('/state', (_req: Request, res: Response) => {
    try {
      res.json({ success: true, data: buildStateLog(rootDir, intelligenceDir) });
    } catch (err) {
      // Internal paths and stack traces stay server-side; the client gets a stable message.
      console.error('Error building state log:', err);
      res.status(500).json({ success: false, error: 'Failed to read repository state.' });
    }
  });

  // Fetches live external news/dockets and, if anything new is found, accessions it as one or
  // more flat files and a single real Git commit. The pipeline itself lives in `server/pipeline.ts`
  // so it can also run headlessly via `npm run ingest` / `scripts/ingest.ts` — this route is just
  // an adapter from `IngestResult` onto the response shape the frontend already expects.
  router.post('/workflow/run', async (_req: Request, res: Response) => {
    try {
      const outcome = await runIngestPipeline(rootDir, intelligenceDir);

      if (outcome.status === 'up-to-date') {
        return res.json({
          success: true,
          alreadyUpToDate: true,
          message:
            'Repository up to date: All real-world external publications and statutory dockets from MARAD, Port of Long Beach, Federal Register, and certified industry publications are already accessioned into Git.',
          data: buildStateLog(rootDir, intelligenceDir),
        });
      }

      if (outcome.status === 'failed') {
        console.error('Ingest pipeline failed:', outcome.error);
        return res.status(500).json({
          success: false,
          error: 'Failed to commit the new record(s) to Git; no files were left on disk.',
        });
      }

      const publishers = [...new Set(outcome.records.map((r) => r.sourceProvenance.sourcePublisher))];
      res.json({
        success: true,
        message: `Workflow executed: Accessioned ${outcome.records.length} external record(s) from ${publishers.join(', ')} into Git commit ${outcome.commitHash}`,
        commitHash: outcome.commitHash,
        newRecord: outcome.records[0],
        newRecords: outcome.records,
        data: buildStateLog(rootDir, intelligenceDir),
      });
    } catch (err) {
      console.error('Workflow execution error:', err);
      res.status(500).json({ success: false, error: 'Workflow execution failed.' });
    }
  });

  return router;
}
