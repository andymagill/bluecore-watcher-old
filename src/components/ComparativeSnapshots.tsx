import React from 'react';
import { ComparativeSnapshotItem } from '../types';
import {
  GitCompare,
  ExternalLink,
  Calendar,
  TrendingUp,
  CheckCircle2,
  SearchX
} from 'lucide-react';

interface ComparativeSnapshotsProps {
  snapshots: ComparativeSnapshotItem[];
}

export const ComparativeSnapshots: React.FC<ComparativeSnapshotsProps> = ({
  snapshots,
}) => {
  return (
    <div className="w-full bg-[#020617] border border-slate-800 rounded-lg p-3.5 mb-5 font-mono-code">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-tight text-slate-100">
            Comparative Snapshots // Historical Metric & Milestone Drift
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/80 text-blue-300">
            Automated Audit
          </span>
        </div>
        <p className="text-[10px] text-slate-400">
          Contrasting baseline estimates against current actuals across Git accessions
        </p>
      </div>

      {/* Snapshots Table / Card Grid */}
      {snapshots.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-lg p-5 text-center">
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-2">
            <SearchX className="h-4 w-4" />
          </div>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto font-mono-code leading-relaxed">
            No comparative snapshot is available yet: a snapshot requires the same tracked metric to
            appear on two or more accessioned records. This panel populates automatically as
            follow-up ingestions corroborate an existing metric.
          </p>
        </div>
      ) : (
      <div className="space-y-2.5">
        {snapshots.map((snap) => (
          <div
            key={snap.id}
            className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-lg p-3 transition"
          >
            {/* Top Row: Metric Name, Vector Tag, and Variance Delta */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  {snap.metricName}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 uppercase">
                  {snap.vector.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Variance Badge */}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
                {snap.varianceDelta}
              </span>
            </div>

            {/* Middle: Contrast Box (Previous Estimate vs Current Actual) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5 bg-slate-950/70 p-2.5 rounded border border-slate-800/70 text-[11px]">
              {/* Previous Estimate */}
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase tracking-wide">
                  Baseline / Initial Estimate:
                </span>
                <span className="text-slate-300 line-through opacity-80 mt-0.5 font-medium">
                  {snap.previousEstimate}
                </span>
              </div>

              {/* Current Actual */}
              <div className="flex flex-col">
                <span className="text-[9px] text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Current Actual (Git Provenance):
                </span>
                <span className="text-slate-100 font-bold mt-0.5">
                  {snap.currentActual}
                </span>
              </div>
            </div>

            {/* Evolution Rationale */}
            <p className="text-[11px] text-slate-300 font-sans leading-relaxed mb-2 bg-slate-950/40 p-2 rounded border border-slate-800/40">
              <strong className="font-mono-code text-[10px] text-slate-400 mr-1.5">EVOLUTION RATIONALE:</strong>
              {snap.evolutionRationale}
            </p>

            {/* Footer Metadata & Citation Link */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/60 text-[9px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  Revised: {snap.revisionDate}
                </span>
                <span className="text-slate-400">
                  Target Horizon: <strong className="text-slate-200">{snap.targetHorizon}</strong>
                </span>
                <span className="text-blue-400">
                  Commit: {snap.commitHash}
                </span>
              </div>

              {snap.sourceUrl && (
                <a
                  href={snap.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 transition"
                  title={`Source: ${snap.sourcePublisher}`}
                >
                  <span className="truncate max-w-[150px]">{snap.sourcePublisher}</span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
