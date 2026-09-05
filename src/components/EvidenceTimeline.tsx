import React from 'react';
import { GitCommitSnapshot, OperationalDeltaRecord } from '../types';
import { ComparativeSnapshots } from './ComparativeSnapshots';
import { getComparativeSnapshots } from '../utils/metricDrift';
import { getVectorTheme } from '../utils/vectorTheme';
import {
  Calendar,
  User,
  FileText,
  Activity,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface EvidenceTimelineProps {
  commits: GitCommitSnapshot[];
  records: OperationalDeltaRecord[];
  onSelectRecord: (record: OperationalDeltaRecord) => void;
}

export const EvidenceTimeline: React.FC<EvidenceTimelineProps> = ({
  commits,
  records,
  onSelectRecord,
}) => {
  const snapshots = getComparativeSnapshots(records);

  return (
    <div className="layout-container px-4 py-5">
      {/* Comparative Snapshots Panel */}
      <ComparativeSnapshots snapshots={snapshots} />

      {/* Timeline Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 p-3 rounded-lg bg-[#020617] border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wide font-mono-code">
              Operational Chronology // Verifiable Audit Trail
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-mono-code">
              {commits.length} Verified Commits
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono-code">
            Immutable chronological record of physical milestones, regulatory dockets, and operational capital events.
          </p>
        </div>

        <div className="text-[10px] font-mono-code text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
          Source: Git State Log
        </div>
      </div>

      {/* Timeline List */}
      <div className="relative pl-6 sm:pl-8 border-l border-slate-800 space-y-3.5 ml-3">
        {commits.map((commit) => {
          // Find associated operational delta record if any
          const associatedRecord = records.find(r => r.sourceProvenance.commitHash === commit.commitHash);

          const theme = getVectorTheme(commit.vectorTag);
          const VectorIcon = theme.icon;

          return (
            <div key={commit.commitHash} className="relative group">
              {/* Timeline Bullet Node */}
              <div className="absolute -left-[31px] sm:-left-[39px] top-3.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-slate-700 group-hover:border-blue-400 transition flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 group-hover:bg-blue-400" />
              </div>

              {/* Commit Snapshot Container */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition">
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-code font-bold text-blue-400">
                      {commit.commitHash}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono-code flex items-center gap-1 ${theme.detailBadge}`}>
                      <VectorIcon className="h-3 w-3" />
                      {theme.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-mono-code text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" />
                      {commit.author.split('@')[0]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {new Date(commit.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Commit Message */}
                <h3 className="text-xs font-bold text-slate-100 font-mono-code mb-2">
                  {commit.message}
                </h3>

                {/* Associated Operational Context if found */}
                {associatedRecord && (
                  <div className="mb-2.5 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono-code text-slate-400 uppercase font-semibold">
                        {associatedRecord.subVector}
                      </span>
                      <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {associatedRecord.prNoiseFilter.verificationStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mb-2 font-sans leading-relaxed max-w-prose">
                      {associatedRecord.verifiableDelta}
                    </p>

                    {/* Operational Metrics Chips */}
                    {associatedRecord.keyMetrics && associatedRecord.keyMetrics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {associatedRecord.keyMetrics.map((m, idx) => (
                          <span 
                            key={idx}
                            className="text-[10px] font-mono-code bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-200"
                          >
                            <strong className="text-slate-400 font-normal">{m.label}: </strong>
                            {m.value} {m.unit || ''}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] font-mono-code text-slate-400 border-t border-slate-900">
                      <div className="flex items-center gap-2 truncate max-w-[320px]">
                        <span className="truncate text-slate-300 font-semibold">
                          {associatedRecord.sourceProvenance.sourcePublisher || associatedRecord.sourceProvenance.documentRef}
                        </span>
                        {associatedRecord.sourceProvenance.externalUrl && (
                          <a
                            href={associatedRecord.sourceProvenance.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60"
                          >
                            <span>Source</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => onSelectRecord(associatedRecord)}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold shrink-0"
                      >
                        Inspect Record <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Files Provenance */}
                <div className="flex flex-wrap gap-2 text-[10px] font-mono-code text-slate-400">
                  {commit.filesChanged.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80">
                      <FileText className="h-2.5 w-2.5 text-slate-400" />
                      <span className="truncate max-w-[250px]">{file.filename}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
