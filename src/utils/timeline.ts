import { OperationalDeltaRecord, GitCommitSnapshot } from '../types';

export interface TimelineWindow {
  activeCommits: GitCommitSnapshot[];
  activeRecords: OperationalDeltaRecord[];
  /** Null when there is no commit history to scrub through (empty or unreachable repo). */
  selectedCommit: GitCommitSnapshot | null;
  isHead: boolean;
}

/**
 * Resolves what should be on screen for a given position of the time-series scrubber.
 *
 * Records are matched to a point in time by `sourceProvenance.timestamp` rather than by
 * walking Git ancestry, because a record only carries a short commit hash (not a resolvable
 * ref) and the UI needs a total order it can slide a single integer index across.
 *
 * `commits` must be ordered newest-first (index 0 is HEAD) — that ordering is what
 * `getLocalGitCommits` on the server and `INITIAL_GIT_COMMITS` in the seed data both produce.
 *
 * An empty `commits` array (a fresh checkout, or a `git log` failure) is not an error case:
 * it means there is no history to scrub, so every record is shown as if it were HEAD instead
 * of leaving the caller to dereference `commits[0]`.
 */
export function filterStateByCommit(
  records: OperationalDeltaRecord[],
  commits: GitCommitSnapshot[],
  commitIndex: number
): TimelineWindow {
  if (commits.length === 0) {
    return {
      activeCommits: [],
      activeRecords: records,
      selectedCommit: null,
      isHead: true,
    };
  }

  // commits are ordered latest first (index 0 is HEAD)
  const safeIndex = Math.max(0, Math.min(commitIndex, commits.length - 1));
  const selectedCommit = commits[safeIndex];
  const isHead = safeIndex === 0;

  // Active commits are from selectedCommit downwards to the oldest commit
  const activeCommits = commits.slice(safeIndex);
  const cutoffTime = new Date(selectedCommit.timestamp).getTime();

  // Records accessioned at or before selectedCommit. The +5000ms tolerance absorbs the gap
  // between a record's own timestamp and the moment its containing commit was created.
  const activeRecords = records.filter((r) => {
    const recordTime = new Date(r.sourceProvenance.timestamp).getTime();
    return recordTime <= cutoffTime + 5000;
  });

  // Deliberately no fallback to an arbitrary slice of records when activeRecords is empty:
  // "zero records existed at this point in history" is a real, correct answer that the
  // point-in-time audit banner must be able to state honestly.
  return {
    activeCommits,
    activeRecords,
    selectedCommit,
    isHead,
  };
}
