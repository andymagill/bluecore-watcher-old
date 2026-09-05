import React, { useState } from 'react';
import { OperationalDeltaRecord } from '../types';
import { getVectorTheme } from '../utils/vectorTheme';
import { shortHash } from '../utils/hash';
import {
  X,
  CheckCircle2,
  ShieldQuestion,
  FileText,
  Copy,
  Check,
  Calendar,
  ChevronDown,
  ChevronUp,
  Zap,
  ExternalLink,
} from 'lucide-react';

interface DeltaDetailModalProps {
  record: OperationalDeltaRecord | null;
  onClose: () => void;
}

export const DeltaDetailModal: React.FC<DeltaDetailModalProps> = ({
  record,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [showFileDiff, setShowFileDiff] = useState(false);

  if (!record) return null;

  // The only evaluation this app actually performs on a source: was its URL resolved and
  // confirmed reachable by an HTTP request. See `sourceProvenance.canonicalUrl`/`urlVerifiedAt`.
  const isUrlVerified = Boolean(record.sourceProvenance.canonicalUrl && record.sourceProvenance.urlVerifiedAt);

  const theme = getVectorTheme(record.operationalVector);
  const VectorIcon = theme.icon;

  // evidenceDiff (and its line arrays) are optional on the record schema — an ingested record
  // with no captured patch must not crash the modal.
  const evidenceDiff = record.evidenceDiff;
  const linesAdded = evidenceDiff?.linesAdded ?? [];
  const linesRemoved = evidenceDiff?.linesRemoved ?? [];

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#020617] border border-slate-700/80 rounded-lg w-full max-w-3xl shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/90 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className={`inline-flex items-center gap-1 font-mono-code text-[10px] px-2 py-0.5 rounded border ${theme.detailBadge}`}>
                <VectorIcon className="h-4 w-4" />
                {theme.label}
              </span>

              <span className="font-mono-code text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-blue-300">
                {record.subVector}
              </span>

              {isUrlVerified ? (
                <span className="inline-flex items-center gap-1 font-mono-code text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  URL VERIFIED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono-code text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                  <ShieldQuestion className="h-3 w-3 text-slate-400" />
                  URL UNVERIFIED
                </span>
              )}
            </div>

            <h2 className="text-sm sm:text-base font-bold text-slate-100 font-mono-code leading-snug">
              {record.headline}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyJson}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 transition"
              title="Copy Record JSON"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto font-mono-code">
          
          {/* Key Quantitative Metrics Dashboard */}
          {record.keyMetrics && record.keyMetrics.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Operational Telemetry & Verified Parameters
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {record.keyMetrics.map((m, idx) => (
                  <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded p-2.5">
                    <span className="text-[9px] text-slate-400 uppercase block truncate">
                      {m.label}
                    </span>
                    <span className="text-sm font-bold text-slate-100 font-mono-code">
                      {m.value} <span className="text-xs font-normal text-slate-400">{m.unit || ''}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Milestone & Critical Path */}
          {record.nextMilestone && record.nextMilestone.targetDate !== 'N/A' && (
            <div className="rounded-lg border border-blue-900/60 bg-blue-950/20 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-blue-300 block">
                      Next Verifiable Milestone
                    </span>
                    <span className="text-xs font-bold text-slate-100">
                      {record.nextMilestone.title}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-blue-400 block font-mono-code">
                    {record.nextMilestone.targetDate}
                  </span>
                  {record.nextMilestone.criticalPath && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono-code">
                      CRITICAL PATH
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Verifiable Operational Delta */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-mono-code font-bold text-slate-200 uppercase">
                Verifiable Operational Delta
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 text-xs font-mono-code text-slate-200 leading-relaxed">
              {record.verifiableDelta}
            </div>
          </div>

          {/* Operational Claim vs Deterministic Verification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
              <span className="text-[10px] font-mono-code font-bold text-slate-400 uppercase block mb-1">
                Raw Ingest Claim
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-mono-code">
                {record.verifiableClaim}
              </p>
            </div>

            <div className={`rounded-lg border p-3 ${
              isUrlVerified ? 'border-slate-800 bg-slate-900/30' : 'border-amber-900/60 bg-amber-950/10'
            }`}>
              <span className="text-[10px] font-mono-code font-bold text-slate-400 uppercase block mb-1">
                Source Verification
              </span>
              {/* Derived directly from sourceProvenance, not a stored rationale string — the only
                  thing this app checks on a source is whether its URL resolves and responds, and
                  this states exactly that, no more. */}
              <p className="text-xs text-slate-300 leading-relaxed font-mono-code">
                {isUrlVerified
                  ? `Canonical URL resolved to ${record.sourceProvenance.canonicalUrl} and confirmed reachable (successful HTTP response) at ${new Date(record.sourceProvenance.urlVerifiedAt!).toLocaleString()}. No further corroboration — article body, cross-source confirmation, or claim verification — has been performed.`
                  : 'No canonical URL has been resolved and HTTP-verified for this record.'}
              </p>
            </div>
          </div>

          {/* Source Provenance & Audit Header */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Statutory & Repository Provenance
                </span>
                {record.sourceProvenance.sourcePublisher && (
                  <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 font-semibold">
                    {record.sourceProvenance.sourcePublisher}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(record.sourceProvenance.canonicalUrl || record.sourceProvenance.externalUrl) && (
                  <a
                    href={record.sourceProvenance.canonicalUrl || record.sourceProvenance.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-mono-code px-2 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/80 hover:bg-cyan-900/60 transition font-bold"
                  >
                    <span>{record.sourceProvenance.canonicalUrl ? 'View URL-Verified Source' : 'View External Source (unverified link)'}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <span className="text-[10px] text-blue-400 font-bold font-mono-code">
                  Git: {shortHash(record.sourceProvenance.commitHash, 'head')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-[9px] text-slate-400 block uppercase">Document Reference</span>
                <span className="font-bold text-slate-200 truncate block">{record.sourceProvenance.documentRef}</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-[9px] text-slate-400 block uppercase">Committed Path</span>
                <span className="font-mono-code text-slate-200 truncate block">{record.sourceProvenance.filePath}</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-[9px] text-slate-400 block uppercase">Author / Station</span>
                <span className="font-mono-code text-slate-200 truncate block">{record.sourceProvenance.author ?? record.sourceProvenance.sourcePublisher ?? 'Not established'}</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-[9px] text-slate-400 block uppercase">Committed Timestamp</span>
                <span className="font-mono-code text-slate-200 block">{new Date(record.sourceProvenance.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Collapsible File Patch Inspector — hidden entirely when no diff was captured */}
          {evidenceDiff && (linesAdded.length > 0 || linesRemoved.length > 0) && (
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowFileDiff(!showFileDiff)}
                className="w-full px-3 py-2 bg-slate-900/80 hover:bg-slate-800/80 flex items-center justify-between text-xs text-slate-300 font-mono-code transition"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <span>Raw Flat-File Audit ({linesAdded.length + linesRemoved.length} lines)</span>
                </div>
                {showFileDiff ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showFileDiff && (
                <div className="p-3 bg-slate-950 font-mono-code text-[11px] overflow-x-auto space-y-0.5 border-t border-slate-800">
                  {linesRemoved.map((line, idx) => (
                    <div key={idx} className="text-rose-400 bg-rose-950/20 px-1 py-0.5 rounded">
                      {line}
                    </div>
                  ))}
                  {linesAdded.map((line, idx) => (
                    <div key={idx} className="text-emerald-400 bg-emerald-950/20 px-1 py-0.5 rounded">
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
