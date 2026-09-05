import React from 'react';
import { VectorMetricItem } from '../types';
import {
  ExternalLink,
  Minus
} from 'lucide-react';

interface VectorMetricCardsProps {
  metrics: VectorMetricItem[];
}

/**
 * Renders one vector's tracked metrics as a KPI row across the full width of the (now
 * single-vector) grid view — previously nested inside a 1/3-width column, which forced every
 * label, value, and publisher below to `truncate`.
 */
export const VectorMetricCards: React.FC<VectorMetricCardsProps> = ({
  metrics,
}) => {
  return (
    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {metrics.map((metric) => {
        if (metric.isUnpopulated) {
          return (
            <div
              key={metric.id}
              className="bg-slate-950/60 border border-slate-800/90 border-dashed rounded-md p-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-tight">
                  {metric.label}
                </span>
                <span className="text-[8px] font-mono-code px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                  UNPOPULATED
                </span>
              </div>
              <div className="text-xs font-mono-code font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                <Minus className="h-3 w-3 text-slate-400" />
                <span>NO DELTA RECORDED</span>
              </div>
              <p className="text-[9px] text-slate-400 font-mono-code leading-relaxed">
                {metric.unpopulatedReason || 'Pending initial automated accession from public regulatory or corporate filing.'}
              </p>
            </div>
          );
        }

        const isUp = metric.drift.direction === 'up';
        const isNeutral = metric.drift.direction === 'neutral';

        return (
          <div
            key={metric.id}
            className="bg-slate-900/85 border border-slate-800/90 hover:border-slate-700/90 rounded-md p-3 flex flex-col justify-between transition group shadow-sm"
          >
            <div>
              {/* Metric Label & Automated Drift Badge */}
              <div className="flex items-start justify-between gap-1.5 mb-1">
                <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-tight font-medium">
                  {metric.label}
                </span>

                {/* Automated Drift Badge */}
                <span
                  className={`text-[9px] font-mono-code font-semibold px-1.5 py-0.5 rounded border flex items-center gap-0.5 shrink-0 ${
                    isUp
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/70'
                      : isNeutral
                      ? 'bg-blue-950/80 text-blue-300 border-blue-800/70'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800/70'
                  }`}
                  title={metric.drift.detail}
                >
                  {metric.drift.label}
                </span>
              </div>

              {/* Primary Quantitative Value Display */}
              <div className="flex items-baseline gap-1.5 my-1">
                <span className="text-base sm:text-lg font-bold font-mono-code text-slate-100 tracking-tight group-hover:text-blue-300 transition">
                  {metric.currentValue}
                </span>
                {metric.unit && (
                  <span className="text-[10px] font-mono-code text-slate-400 font-normal">
                    {metric.unit}
                  </span>
                )}
              </div>

              {/* Micro baseline vs actual contrast */}
              {metric.baselineEstimate && (
                <div className="text-[9px] font-mono-code text-slate-400 mb-1 flex items-center gap-1">
                  <span className="text-slate-400">Est: {metric.baselineEstimate}</span>
                </div>
              )}
            </div>

            {/* Source Attribution & External Filing Citation */}
            <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[9px] font-mono-code text-slate-400">
              <span className="truncate text-slate-300 font-semibold" title={metric.sourceAttribution.documentRef}>
                {metric.sourceAttribution.publisher}
              </span>

              {metric.sourceAttribution.url ? (
                <a
                  href={metric.sourceAttribution.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-0.5 text-cyan-400 hover:text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60 hover:bg-cyan-900/40 transition shrink-0"
                  title={`Inspect public source: ${metric.sourceAttribution.publisher}`}
                >
                  <span>Cite</span>
                  <ExternalLink className="h-2 w-2" />
                </a>
              ) : (
                <span className="text-slate-400 text-[8px] shrink-0">
                  ref: {metric.sourceAttribution.commitHash}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
