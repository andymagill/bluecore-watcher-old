import { spawnSync } from 'child_process';
import { GitCommitSnapshot, OperationalVector } from '../src/types';

/**
 * All Git access for the server goes through this module, and every call here uses
 * `spawnSync('git', [...argv])` — never `execSync` with an interpolated string.
 *
 * `execSync` runs its command through a shell, so any argument that reaches it — including a
 * headline pulled from an RSS feed in `server/ingest.ts` — can inject shell syntax
 * (`` ` ``, `$(...)`, `;`) and execute arbitrary commands. `spawnSync` with an argv array never
 * invokes a shell, so argument content is passed to `git` literally regardless of what
 * characters it contains. Do not reintroduce `execSync`/`exec` for anything that touches
 * external input.
 */

export interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function runGit(args: string[], cwd: string): GitResult {
  const result = spawnSync('git', args, { cwd, encoding: 'utf-8' });
  if (result.error) {
    return { ok: false, stdout: '', stderr: result.error.message };
  }
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

const VECTOR_KEYWORDS: { pattern: RegExp; vector: OperationalVector }[] = [
  { pattern: /reg|docket|ceqa|nrc|marad|permit|compliance|polb|federal/i, vector: 'REGULATORY_PATHWAYS' },
  { pattern: /series|fund|capital|alliance|partner|hire|executive|sec|forbes|slauson/i, vector: 'ECOSYSTEM_MOMENTUM' },
];

/** Best-effort classification of a commit/record's operational vector from free text. */
export function classifyVector(text: string): OperationalVector {
  for (const { pattern, vector } of VECTOR_KEYWORDS) {
    if (pattern.test(text)) return vector;
  }
  return 'TECHNICAL_EVOLUTION';
}

interface NumstatFile {
  filename: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

/** Parses `git show --numstat --format=` output for one commit into real per-file stats. */
function parseNumstat(raw: string): { files: NumstatFile[]; additions: number; deletions: number } {
  const files: NumstatFile[] = [];
  let additions = 0;
  let deletions = 0;

  for (const line of raw.trim().split('\n')) {
    if (!line.trim()) continue;
    const [addStr, delStr, filename] = line.split('\t');
    if (!filename) continue;

    // Binary files report "-" for both counts.
    const add = addStr === '-' ? 0 : Number(addStr) || 0;
    const del = delStr === '-' ? 0 : Number(delStr) || 0;
    additions += add;
    deletions += del;

    files.push({
      filename,
      // --numstat alone can't distinguish added/modified/deleted; a 0-deletion file with only
      // additions is the common case for this app's append-only ingestion, so that's the
      // reasonable default. Exact status would require --name-status in a second pass.
      status: del > 0 && add === 0 ? 'deleted' : 'added',
      additions: add,
      deletions: del,
    });
  }

  return { files, additions, deletions };
}

/**
 * Reads up to `limit` commits from the repository's history, including real per-file diff
 * stats — replacing the previous placeholder that stamped every commit with a fabricated
 * `+15/-2` regardless of what actually changed.
 */
export function readCommits(cwd: string, limit: number): GitCommitSnapshot[] {
  const log = runGit(['log', `-n${limit}`, '--pretty=format:%H|%h|%P|%aI|%an|%s'], cwd);
  if (!log.ok || !log.stdout.trim()) return [];

  return log.stdout
    .trim()
    .split('\n')
    .map((line): GitCommitSnapshot => {
      const [fullHash, commitHash, parentHash, timestamp, author, message] = line.split('|');
      const hash = fullHash || commitHash || 'head';

      const numstat = runGit(['show', '--numstat', '--format=', hash], cwd);
      const { files, additions, deletions } = numstat.ok
        ? parseNumstat(numstat.stdout)
        : { files: [], additions: 0, deletions: 0 };

      return {
        commitHash: commitHash || hash.slice(0, 7),
        parentHash: parentHash?.split(' ')[0]?.slice(0, 7) || 'root',
        timestamp: timestamp || new Date().toISOString(),
        author: author || 'engine@bluecore.energy',
        message: message || 'operational update',
        vectorTag: classifyVector(message || ''),
        totalAdditions: additions,
        totalDeletions: deletions,
        filesChanged: files,
      };
    })
    .filter((c) => !/REC-TECH-\d{4}|baseline verifiable operational records across/i.test(c.message));
}

/** The short hash of HEAD, or null if there is no commit history yet (or Git is unavailable). */
export function shortHead(cwd: string): string | null {
  const result = runGit(['rev-parse', '--short', 'HEAD'], cwd);
  return result.ok ? result.stdout.trim() : null;
}

export type CommitOutcome = { ok: true; hash: string } | { ok: false; error: string };

/**
 * Stages `paths` and commits with `message`, both passed as literal argv entries — `message`
 * can contain any character (backticks, `$()`, quotes) safely because it never touches a shell.
 */
export function stageAndCommit(cwd: string, paths: string[], message: string): CommitOutcome {
  const add = runGit(['add', '--', ...paths], cwd);
  if (!add.ok) {
    return { ok: false, error: `git add failed: ${add.stderr || 'unknown error'}` };
  }

  const commit = runGit(['commit', '-m', message, '--', ...paths], cwd);
  if (!commit.ok) {
    return { ok: false, error: `git commit failed: ${commit.stderr || commit.stdout || 'unknown error'}` };
  }

  const head = shortHead(cwd);
  if (!head) {
    return { ok: false, error: 'Commit appeared to succeed but HEAD could not be resolved.' };
  }

  return { ok: true, hash: head };
}
