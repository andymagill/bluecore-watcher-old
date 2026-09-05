# Architecture

## What this is

Bluecore Watcher is a Git-as-database intelligence tracker. There is no ORM, no SQL, and no
managed database anywhere in this system — **the flat files under `intelligence/` are the
records, and this repository's own commit history is the audit trail.** A React SPA renders
that state and lets a person scrub backwards through the commit history to see what the
repository looked like at any earlier point in time.

Three "operational vectors" partition every record: `TECHNICAL_EVOLUTION`,
`REGULATORY_PATHWAYS`, and `ECOSYSTEM_MOMENTUM`. A record's `operationalVector` and finer-grained
`subVector` (see `src/types.ts`) route it to one of the three columns in the grid view, one of
the three folders in the sidebar's file tree, and one of the three metric-card panels.

## Entry points

| Command | What runs |
|---|---|
| `npm run dev` | `server/index.ts` — Express + Vite dev middleware on one port (`PORT`, default 3000) |
| `npm run build` | `vite build` (SPA → `dist/`) + esbuild bundles `server/index.ts` → `dist/server.cjs` |
| `npm start` | `node dist/server.cjs` — the production server, serving the built SPA as static files |
| `npm run seed` | `scripts/seed_git_repo.ts` — writes `src/data/seedState.ts`'s records to `intelligence/` and commits them |
| `npm run lint` | `tsc --noEmit` under `strict` — the gate this project builds against |

## File layout

```
server/                  Express backend — all filesystem and Git access lives here
  index.ts                 wiring: express app, Vite middleware / static serving, listen(PORT)
  routes.ts                the four /api/* route handlers
  state.ts                 buildStateLog() — assembles the full snapshot from git.ts + records.ts
  git.ts                   ALL git subprocess calls (spawnSync, never a shell); commit parsing
  records.ts                reads + validates intelligence/**/*.json
  ingest.ts                 external fetch (RSS, Federal Register) + candidate classification

src/
  types.ts                  the shared schema — see its own docstrings for what each type means
  App.tsx                   composes the page from hooks + components; no data-fetching itself
  hooks/
    useIntelligenceState.ts   owns stateLog, dataSource, refresh(), runWorkflow(), toasts
  components/                presentational only — one file per UI region
  utils/
    timeline.ts               filterStateByCommit() — the time-series scrubber's core logic
    metricDrift.ts             resolves declared metrics against real records (see below)
    stateGuards.ts             runtime shape validation for untrusted JSON (imports, disk reads)
    vectorTheme.ts             single source of per-vector color/icon/label
    counts.ts, hash.ts         small shared helpers (vector/status tallies, short-hash display)
  data/
    metricDefinitions.ts       declares WHICH metrics are tracked and WHERE to find them
    seedState.ts                bundled offline fallback (used before the first /api/state reply)

intelligence/<vector>/*.json  the actual database: one file per accessioned record
scripts/seed_git_repo.ts       (re)writes intelligence/ from src/data/seedState.ts and commits it
```

## Data flow

```
intelligence/**/*.json  ──┐
                           ├──> server/state.ts buildStateLog() ──> GET /api/state
git log / git show     ──┘

GET /api/state ──> useIntelligenceState (dataSource: 'live')
                       │
                       ▼
              filterStateByCommit(scrubberIndex)   [src/utils/timeline.ts]
                       │
                       ▼
              vector / status / search filters   [App.tsx]
                       │
                       ▼
              ModularGridView  |  EvidenceTimeline
```

If `/api/state` is unreachable, `useIntelligenceState` keeps `src/data/seedState.ts`'s bundled
data on screen with `dataSource: 'seed'`, and `App.tsx` shows a banner saying so — the UI never
silently presents seed data as if it were a live repository read.

## Ingest pipeline (`POST /api/workflow/run`)

```
fetch RSS + Federal Register  →  dedup against existing headlines/URLs
    → classify (vector + subVector)  →  write intelligence/<vector>/<id>.json
    → git add -- <path> && git commit -m <message> --  <path>
    → on success: backfill the real commit hash into the file
    → on failure: delete the file (no orphan left for the dedup check to trip on forever)
```

Every Git call in this path goes through `server/git.ts`'s `spawnSync('git', [argv])` — an
ingested headline is untrusted external text, and an earlier version of this code built a shell
command string from it (`execSync(`git commit -m "${msg}"`)`), which was a command-injection
vector. Do not reintroduce string-built shell commands here.

## What is derived vs. declared

This distinction is the one design decision most worth preserving on future changes:

- **Declared** (config — what to track): `src/data/metricDefinitions.ts` lists which metrics
  exist, which sub-vector supplies each one, and what to say when none does yet.
- **Derived** (data — the actual values): `src/utils/metricDrift.ts` resolves those definitions
  against whatever records are actually on disk. Every number, unit, and source attribution
  shown on a metric card traces back to a real `OperationalDeltaRecord.keyMetrics` entry — none
  of it is a literal written into the resolver.

A metric with no supporting record renders as `isUnpopulated: true` with a stated reason, not a
placeholder value. A comparative "before/after" snapshot only appears once the *same* metric has
two or more accessioned observations to compare — with the current record set that means the
Comparative Snapshots panel is legitimately empty until a follow-up ingestion corroborates an
existing metric.

## Known limits

- No automated tests. `filterStateByCommit`, `classifyVector` / `classifyIngestCandidate`,
  `parseStateLog`, and the metric resolver are all pure functions and would be the cheapest place
  to start.
- `POST /api/workflow/run` and `POST /api/cron-tick` have no auth — anyone who can reach the
  server can trigger a real commit to this repository.
- Records reference their commit by short hash only (`sourceProvenance.commitHash`), not a full
  SHA or ref, which is sufficient for display but not for programmatic lookup if the repository
  ever accumulates enough commits for short-hash collisions to matter.
