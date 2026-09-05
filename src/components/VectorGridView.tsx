import React from 'react';
import {
  OperationalDeltaRecord,
  OperationalVector,
} from '../types';
import { VectorMetricCards } from './VectorMetricCards';
import { getVectorMetrics } from '../utils/metricDrift';
import { getVectorTheme } from '../utils/vectorTheme';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  SearchX,
  ArrowRight,
  Calendar,
  ExternalLink,
} from 'lucide-react';

interface VectorGridViewProps {
  vector: OperationalVector;
  records: OperationalDeltaRecord[];
  onSelectRecord: (record: OperationalDeltaRecord) => void;
  onResetFilters: () => void;
}

/**
 * Renders one operational vector's metrics and record cards at full page width.
 *
 * Previously this rendered all three vectors side by side (`ModularGridView` /
 * `VectorColumn`), which meant a single filtered vector still occupied only 1/3 of the width
 * and every metric card and field inside it had to be `truncate`d to fit. Vector selection is
 * now primary navigation (see FilterBar), so exactly one vector renders here at a time.
 */
export const VectorGridView: React.FC<VectorGridViewProps> = ({
  vector,
  records,
  onSelectRecord,
  onResetFilters,
}) => {
  const theme = getVectorTheme(vector);
  const metrics = getVectorMetrics(vector, records);

  return (
    <div className="layout-container p-5 lg:p-6">
      {/* Vector Orientation */}
      <p className="text-[11px] text-slate-400 font-mono-code mb-4 leading-relaxed max-w-3xl">
        {theme.subVectorsDescription}
      </p>

      {/* Metric Cards & Automated Drift Indicators */}
      <VectorMetricCards metrics={metrics} />

      {/* Record Cards */}
      {records.length === 0 ? (
        /* Zero-State Card */
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 border-dashed text-center max-w-md mx-auto mt-6">
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-2">
            <SearchX className="h-4 w-4" />
          </div>
          <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider mb-1">
            Zero Operational Deltas
          </div>
          <p className="text-[11px] text-slate-400 font-mono-code leading-relaxed mb-3">
            No verifiable document changes or engineering updates have been accessioned into Vector {theme.number} under current filters.
          </p>
          <button
            onClick={onResetFilters}
            className="px-2.5 py-1 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono-code border border-slate-700 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onSelect={() => onSelectRecord(record)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface RecordCardProps {
  record: OperationalDeltaRecord;
  onSelect: () => void;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, onSelect }) => {
  const isRejected = record.prNoiseFilter.verificationStatus === 'REJECTED_PR_CHATTER';
  const isVerified = record.prNoiseFilter.verificationStatus === 'VERIFIED_DELTA';

  return (
    <div
      onClick={onSelect}
      className={`bg-slate-900/70 border border-slate-800 rounded-lg p-4 hover:border-blue-500/60 hover:bg-slate-800/40 transition group cursor-pointer shadow-sm ${
        isRejected ? 'bg-rose-950/10 border-rose-900/40 hover:border-rose-700/60' : ''
      }`}
    >
      {/* Top Meta: Sub-Vector Tag & Verification Status */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wide">
          {record.subVector}
        </span>
        {isVerified ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-mono-code flex items-center gap-1 shrink-0">
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
            VERIFIED DELTA
          </span>
        ) : isRejected ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 font-mono-code flex items-center gap-1 shrink-0">
            <ShieldAlert className="h-2.5 w-2.5 text-rose-400" />
            NOISE PURGED
          </span>
        ) : (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono-code flex items-center gap-1 shrink-0">
            <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
            PENDING
          </span>
        )}
      </div>

      {/* Card Operational Headline */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-xs font-bold text-slate-100 leading-snug group-hover:text-blue-300 transition font-mono-code line-clamp-2">
          {record.headline}
        </h3>
        <ArrowRight className="h-3.5 w-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition shrink-0 mt-0.5" />
      </div>

      {/* Operational Delta Summary */}
      <div className="text-[11px] text-slate-300 leading-relaxed font-sans mb-3 bg-slate-950/40 p-2 rounded border border-slate-800/60">
        <p className="line-clamp-2">
          {record.verifiableDelta}
        </p>
      </div>

      {/* Key Telemetry & Quantitative Metrics */}
      {record.keyMetrics && record.keyMetrics.length > 0 && (
        <div className="mb-2.5">
          <div className="grid grid-cols-2 gap-2">
            {record.keyMetrics.map((metric, idx) => (
              <div
                key={idx}
                className="bg-slate-950/80 border border-slate-800/90 rounded px-2 py-1 flex flex-col"
              >
                <span className="text-[9px] font-mono-code text-slate-400 truncate uppercase">
                  {metric.label}
                </span>
                <span className="text-[11px] font-mono-code font-bold text-slate-100 truncate">
                  {metric.value} {metric.unit ? <span className="text-[9px] text-slate-400 font-normal">{metric.unit}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Milestone / Critical Path */}
      {record.nextMilestone && record.nextMilestone.targetDate !== 'N/A' && (
        <div className="mb-2.5 flex items-center justify-between gap-2 text-[10px] font-mono-code bg-blue-950/20 border border-blue-900/30 rounded px-2 py-1 text-slate-300">
          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="h-3 w-3 text-blue-400 shrink-0" />
            <span className="truncate">{record.nextMilestone.title}</span>
          </div>
          <span className="text-blue-300 font-bold shrink-0">
            {record.nextMilestone.targetDate}
          </span>
        </div>
      )}

      {/* Verifiable Provenance Footer */}
      <div className="pt-2 border-t border-slate-800/60 text-[10px] font-mono-code text-slate-400">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            {record.sourceProvenance.sourcePublisher ? (
              <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold text-[9px] truncate">
                {record.sourceProvenance.sourcePublisher}
              </span>
            ) : (
              <span className="truncate text-slate-400">
                {record.sourceProvenance.documentRef}
              </span>
            )}
          </div>

          {record.sourceProvenance.externalUrl && (
            <a
              href={record.sourceProvenance.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[9px] text-cyan-400 hover:text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-900/40 transition shrink-0"
              title="Open verified external source"
            >
              <span>Source</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
