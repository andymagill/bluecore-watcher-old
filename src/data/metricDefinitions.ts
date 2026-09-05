import { OperationalVector, SubVector } from '../types';

/**
 * Declares *which* metrics the dashboard tracks and *where* to look for them — never a value.
 *
 * This is the config/data split that keeps the metric layer honest: `metricDefinitions.ts` says
 * "Technical Evolution watches the SMR net electric output, sourced from the 'SMR Scaling
 * Metrics' sub-vector's 'Net Electric' keyMetric"; `src/utils/metricDrift.ts` resolves that
 * against whatever records actually exist on disk. If a number ever needs to change here, that
 * is a sign the resolver is being bypassed again — the fix belongs in the record data
 * (`intelligence/**\/*.json` or the seed state), not in this file.
 */
export interface MetricDefinition {
  id: string;
  vector: OperationalVector;
  /** Display label for the metric card. */
  label: string;
  /** Which sub-vector's records are eligible to supply this metric. */
  sourceSubVector: SubVector;
  /** The `OperationalMetric.label` to read off the matching record's `keyMetrics`. */
  sourceMetricLabel: string;
  /** Shown when no record currently on disk supplies this metric. */
  unpopulatedReason: string;
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  // ---------------------------------------------------------------------------------------
  // VECTOR 01: TECHNICAL EVOLUTION
  // ---------------------------------------------------------------------------------------
  {
    id: 'METRIC-TECH-SMR-OUTPUT',
    vector: 'TECHNICAL_EVOLUTION',
    label: 'Floating SMR Net Electric Output',
    sourceSubVector: 'SMR Scaling Metrics',
    sourceMetricLabel: 'Net Electric',
    unpopulatedReason:
      'No accessioned record under SMR Scaling Metrics reports a net electric output figure yet.',
  },
  {
    id: 'METRIC-TECH-BERTH-RPV',
    vector: 'TECHNICAL_EVOLUTION',
    label: 'Berth 48 Test RPV Staging',
    sourceSubVector: 'Berth 48 Physical Assets',
    sourceMetricLabel: 'Test RPV',
    unpopulatedReason:
      'No accessioned record under Berth 48 Physical Assets reports test reactor pressure vessel staging.',
  },
  {
    id: 'METRIC-TECH-GRID-VOLTAGE',
    vector: 'TECHNICAL_EVOLUTION',
    label: 'Cold-Ironing Shore Interconnect Voltage',
    sourceSubVector: 'Subsea Grid Integration',
    sourceMetricLabel: 'Voltage Level',
    unpopulatedReason:
      'No accessioned record under Subsea Grid Integration reports an interconnect voltage figure.',
  },
  {
    id: 'METRIC-TECH-CORE-FUEL',
    vector: 'TECHNICAL_EVOLUTION',
    label: 'Core Fuel Loading Accession',
    sourceSubVector: 'SMR Scaling Metrics',
    sourceMetricLabel: 'Core Fuel Shipment',
    unpopulatedReason:
      'Strict Evidence Delineation: no verifiable core fuel shipment or physical criticality delta accessioned. Awaiting Phase 2 NRC/MARAD docket.',
  },

  // ---------------------------------------------------------------------------------------
  // VECTOR 02: REGULATORY PATHWAYS
  // ---------------------------------------------------------------------------------------
  {
    id: 'METRIC-REG-MARAD-DOCKET',
    vector: 'REGULATORY_PATHWAYS',
    label: 'MARAD Statutory Docket',
    sourceSubVector: 'MARAD Frameworks',
    sourceMetricLabel: 'Docket Number',
    unpopulatedReason: 'No accessioned record under MARAD Frameworks cites a docket number.',
  },
  {
    id: 'METRIC-REG-PORT-GOAL',
    vector: 'REGULATORY_PATHWAYS',
    label: 'Port Decarbonization Target',
    sourceSubVector: 'Port of Long Beach Compliance',
    sourceMetricLabel: 'Target Goal',
    unpopulatedReason:
      'No accessioned record under Port of Long Beach Compliance cites a decarbonization target.',
  },
  {
    id: 'METRIC-REG-NRC-JURISDICTION',
    vector: 'REGULATORY_PATHWAYS',
    label: 'FNPP Safety Jurisdiction',
    sourceSubVector: 'Early NRC Indicators',
    sourceMetricLabel: 'Jurisdiction',
    unpopulatedReason: 'No accessioned record under Early NRC Indicators cites a jurisdiction framework.',
  },
  {
    id: 'METRIC-REG-COL',
    vector: 'REGULATORY_PATHWAYS',
    label: 'Commercial Operating License',
    sourceSubVector: 'Early NRC Indicators',
    sourceMetricLabel: 'COL Grant Reference',
    unpopulatedReason:
      'Strict Evidence Delineation: no verifiable COL grant or safety evaluation report recorded in NRC ADAMS. Unpopulated field.',
  },

  // ---------------------------------------------------------------------------------------
  // VECTOR 03: ECOSYSTEM MOMENTUM
  // ---------------------------------------------------------------------------------------
  {
    id: 'METRIC-ECO-CAPITAL-RAISED',
    vector: 'ECOSYSTEM_MOMENTUM',
    label: 'Verifiable Capital Raised',
    sourceSubVector: 'Capital Structure Updates',
    sourceMetricLabel: 'Round Size',
    unpopulatedReason: 'No accessioned record under Capital Structure Updates cites a round size.',
  },
  {
    id: 'METRIC-ECO-HEADQUARTERS',
    vector: 'ECOSYSTEM_MOMENTUM',
    label: 'Operational Headquarters',
    sourceSubVector: 'Corporate & Maritime Alliances',
    sourceMetricLabel: 'Headquarters',
    unpopulatedReason: 'No accessioned record under Corporate & Maritime Alliances cites a headquarters location.',
  },
  {
    id: 'METRIC-ECO-TEAM-BACKGROUND',
    vector: 'ECOSYSTEM_MOMENTUM',
    label: 'Engineering Team Composition',
    sourceSubVector: 'Executive Talent Acquisition',
    sourceMetricLabel: 'Backgrounds',
    unpopulatedReason: 'No accessioned record under Executive Talent Acquisition cites team composition.',
  },
  {
    id: 'METRIC-ECO-SERIES-A',
    vector: 'ECOSYSTEM_MOMENTUM',
    label: 'Series A Institutional Equity',
    sourceSubVector: 'Capital Structure Updates',
    sourceMetricLabel: 'Series A Round',
    unpopulatedReason:
      'Strict Evidence Delineation: no verifiable Series A round or valuation metric registered on SEC EDGAR. Unpopulated field.',
  },
];
