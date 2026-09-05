import {
  OperationalVector,
  OperationalDeltaRecord,
  VectorMetricItem,
  ComparativeSnapshotItem,
} from '../types';
import { METRIC_DEFINITIONS, MetricDefinition } from '../data/metricDefinitions';
import { shortHash } from './hash';

/**
 * Resolves declared metric definitions against the records actually on disk, and derives
 * comparative before/after snapshots from repeated observations of the same metric.
 *
 * Nothing in this file hardcodes a displayed value or a commit hash — every number, unit, and
 * attribution shown to the user traces back to a `keyMetrics` entry on a real
 * `OperationalDeltaRecord`. A metric with no supporting record renders as unpopulated rather than
 * a placeholder value; see `METRIC_DEFINITIONS` for what "supporting" means for each metric.
 */

/** Extracts the leading numeric token from a metric value string (handles "$10,000,000", "6.6 / 11", "10"). */
function parseLeadingNumber(value: string): number | null {
  const match = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isNaN(n) ? null : n;
}

function formatPercent(delta: number, base: number): string {
  if (base === 0) return '';
  const pct = (delta / Math.abs(base)) * 100;
  return ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`;
}

interface Observation {
  record: OperationalDeltaRecord;
  value: string;
  unit?: string;
  timestamp: number;
}

/** Every record under `subVector` that carries a `keyMetrics` entry labeled `metricLabel`, newest first. */
function findObservations(
  records: OperationalDeltaRecord[],
  subVector: string,
  metricLabel: string
): Observation[] {
  const observations: Observation[] = [];

  for (const record of records) {
    if (record.subVector !== subVector) continue;
    const metric = record.keyMetrics?.find((m) => m.label === metricLabel);
    if (!metric) continue;
    observations.push({
      record,
      value: metric.value,
      unit: metric.unit,
      timestamp: new Date(record.sourceProvenance.timestamp).getTime(),
    });
  }

  return observations.sort((a, b) => b.timestamp - a.timestamp);
}

/** Computes a drift direction/label/detail between two chronologically ordered observations. */
function computeDrift(previous: Observation, current: Observation): VectorMetricItem['drift'] {
  const prevNum = parseLeadingNumber(previous.value);
  const currNum = parseLeadingNumber(current.value);

  if (prevNum !== null && currNum !== null && prevNum !== currNum) {
    const delta = currNum - prevNum;
    const arrow = delta > 0 ? '▲' : '▼';
    return {
      direction: delta > 0 ? 'up' : 'down',
      label: `${arrow} ${delta > 0 ? '+' : ''}${delta}${formatPercent(delta, prevNum)}`,
      detail: `Changed from ${previous.value}${previous.unit ? ` ${previous.unit}` : ''} to ${current.value}${current.unit ? ` ${current.unit}` : ''} between accessioned records.`,
    };
  }

  if (previous.value !== current.value) {
    return {
      direction: 'neutral',
      label: '► Value updated',
      detail: `Changed from "${previous.value}" to "${current.value}" between accessioned records.`,
    };
  }

  return {
    direction: 'neutral',
    label: '► No change',
    detail: 'Latest accession confirms the previously recorded value.',
  };
}

/**
 * Resolves the metric cards for one operational vector against the records currently on disk.
 */
export function getVectorMetrics(
  vector: OperationalVector,
  records: OperationalDeltaRecord[]
): VectorMetricItem[] {
  const definitions = METRIC_DEFINITIONS.filter((d) => d.vector === vector);

  return definitions.map((def: MetricDefinition): VectorMetricItem => {
    const observations = findObservations(records, def.sourceSubVector, def.sourceMetricLabel);
    const current = observations[0];

    if (!current) {
      return {
        id: def.id,
        vector: def.vector,
        label: def.label,
        currentValue: 'Pending Ingestion',
        status: 'unpopulated',
        drift: {
          direction: 'neutral',
          label: '— Pending Filing',
          detail: def.unpopulatedReason,
        },
        sourceAttribution: {
          publisher: 'Awaiting Accession',
          documentRef: 'AWAITING-FIRST-OBSERVATION',
          commitHash: 'uncommitted',
        },
        isUnpopulated: true,
        unpopulatedReason: def.unpopulatedReason,
      };
    }

    const previous = observations[1];

    return {
      id: def.id,
      vector: def.vector,
      label: def.label,
      currentValue: current.value,
      unit: current.unit,
      status: 'nominal',
      drift: previous
        ? computeDrift(previous, current)
        : { direction: 'neutral', label: '— First observation', detail: 'No prior accessioned value to compare against.' },
      baselineEstimate: previous ? `${previous.value}${previous.unit ? ` ${previous.unit}` : ''}` : undefined,
      currentActual: `${current.value}${current.unit ? ` ${current.unit}` : ''}`,
      sourceAttribution: {
        publisher: current.record.sourceProvenance.sourcePublisher ?? current.record.sourceProvenance.author,
        documentRef: current.record.sourceProvenance.documentRef,
        commitHash: shortHash(current.record.sourceProvenance.commitHash),
        url: current.record.sourceProvenance.externalUrl,
      },
    };
  });
}

/**
 * Derives comparative before/after snapshots from metrics that have accumulated two or more
 * accessioned observations. A metric observed only once has nothing to compare against and is
 * correctly absent here — it will appear once a second record supplies the same metric label
 * under the same sub-vector.
 */
export function getComparativeSnapshots(records: OperationalDeltaRecord[]): ComparativeSnapshotItem[] {
  const snapshots: ComparativeSnapshotItem[] = [];

  for (const def of METRIC_DEFINITIONS) {
    const observations = findObservations(records, def.sourceSubVector, def.sourceMetricLabel);
    if (observations.length < 2) continue;

    const [current, previous] = observations;
    const drift = computeDrift(previous, current);

    snapshots.push({
      id: `SNAP-${def.id}`,
      vector: def.vector,
      metricName: def.label,
      previousEstimate: `${previous.value}${previous.unit ? ` ${previous.unit}` : ''}`,
      currentActual: `${current.value}${current.unit ? ` ${current.unit}` : ''}`,
      varianceDelta: drift.label.replace(/^[▲▼►]\s*/, ''),
      direction: drift.direction,
      evolutionRationale: drift.detail,
      sourcePublisher: current.record.sourceProvenance.sourcePublisher ?? current.record.sourceProvenance.author,
      sourceUrl: current.record.sourceProvenance.externalUrl,
      commitHash: shortHash(current.record.sourceProvenance.commitHash),
      targetHorizon: current.record.nextMilestone?.targetDate ?? 'Unspecified',
      revisionDate: current.record.sourceProvenance.timestamp.slice(0, 10),
    });
  }

  return snapshots;
}
