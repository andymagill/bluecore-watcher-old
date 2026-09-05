import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { buildStateLog } from './state';
import { readRecords } from './records';
import { stageAndCommit } from './git';
import { fetchRealExternalCandidates, classifyIngestCandidate, buildRecordFromCandidate } from './ingest';

export function createRoutes(rootDir: string, intelligenceDir: string): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      system: 'Bluecore Energy Intelligence Engine',
      mode: 'native-git-repository',
      dataProvenance: '100% Real Externally Sourced (MARAD, POLB, Forbes, Federal Register)',
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

  // Fetches live external news/dockets and, if anything new is found, accessions it as a
  // flat file and a real Git commit.
  router.post('/workflow/run', async (_req: Request, res: Response) => {
    try {
      const existingRecords = readRecords(intelligenceDir);
      const existingTitles = new Set(existingRecords.map((r) => r.headline.toLowerCase()));
      const existingUrls = new Set(
        existingRecords.map((r) => (r.sourceProvenance?.externalUrl || '').toLowerCase())
      );

      const candidates = await fetchRealExternalCandidates();
      const fresh = candidates.find(
        (c) => !existingTitles.has(c.title.toLowerCase()) && !existingUrls.has(c.url.toLowerCase())
      );

      if (!fresh) {
        return res.json({
          success: true,
          alreadyUpToDate: true,
          message:
            'Repository up to date: All real-world external publications and statutory dockets from MARAD, Port of Long Beach, Federal Register, and certified industry publications are already accessioned into Git.',
          data: buildStateLog(rootDir, intelligenceDir),
        });
      }

      const { vector, subVector, targetSubdir } = classifyIngestCandidate(fresh);
      const recordId = `REC-${
        vector === 'TECHNICAL_EVOLUTION' ? 'TECH' : vector === 'REGULATORY_PATHWAYS' ? 'REG' : 'ECO'
      }-LIVE-${Date.now().toString().slice(-4)}`;

      const record = buildRecordFromCandidate(fresh, recordId, targetSubdir, vector, subVector);
      const targetPath = path.join(intelligenceDir, targetSubdir, `${record.id}.json`);
      const relativePath = path.relative(rootDir, targetPath).split(path.sep).join('/');

      fs.writeFileSync(targetPath, JSON.stringify(record, null, 2), 'utf-8');

      const commitMessage = `feat(ingest): accession real external record: ${record.headline.slice(0, 50)} [${record.sourceProvenance.sourcePublisher}]`;
      const outcome = stageAndCommit(rootDir, [relativePath], commitMessage);

      if (!outcome.ok) {
        // Roll back the write: an uncommitted file on disk would be picked up as "already
        // accessioned" by the dedup check above on the next run, permanently excluding this
        // headline from ever being retried.
        fs.unlinkSync(targetPath);
        console.error('Ingest commit failed, rolled back file write:', outcome.error);
        return res.status(500).json({
          success: false,
          error: 'Failed to commit the new record to Git; no file was left on disk.',
        });
      }

      record.sourceProvenance.commitHash = outcome.hash;
      fs.writeFileSync(targetPath, JSON.stringify(record, null, 2), 'utf-8');

      res.json({
        success: true,
        message: `Workflow executed: Accessioned external record from ${record.sourceProvenance.sourcePublisher} into Git commit ${outcome.hash}`,
        commitHash: outcome.hash,
        newRecord: record,
        data: buildStateLog(rootDir, intelligenceDir),
      });
    } catch (err) {
      console.error('Workflow execution error:', err);
      res.status(500).json({ success: false, error: 'Workflow execution failed.' });
    }
  });

  // Legacy / compatibility cron tick — re-reads and returns current state without ingesting.
  router.post('/cron-tick', (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: buildStateLog(rootDir, intelligenceDir),
        message: 'Cron tick completed from local Git repository.',
      });
    } catch (err) {
      console.error('Cron tick error:', err);
      res.status(500).json({ success: false, error: 'Cron tick failed.' });
    }
  });

  return router;
}
