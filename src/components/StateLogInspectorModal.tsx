import React, { useState } from 'react';
import { FlatFileStateLog } from '../types';
import { parseStateLog } from '../utils/stateGuards';
import {
  X,
  Copy,
  Check,
  Download,
  Upload,
  Database,
} from 'lucide-react';

interface StateLogInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stateLog: FlatFileStateLog;
  onImportStateLog: (imported: FlatFileStateLog) => void;
}

export const StateLogInspectorModal: React.FC<StateLogInspectorModalProps> = ({
  isOpen,
  onClose,
  stateLog,
  onImportStateLog,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'JSON' | 'COMMITS' | 'VECTORS' | 'IMPORT'>('JSON');
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(stateLog, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bluecore-state-log-${stateLog.commits[0]?.commitHash.slice(0, 7) || 'snapshot'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportError(null);

    let raw: unknown;
    try {
      raw = JSON.parse(importJsonText);
    } catch {
      setImportError('Failed to parse JSON — check for a trailing comma or unbalanced bracket.');
      return;
    }

    const result = parseStateLog(raw);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }

    onImportStateLog(result.stateLog);

    if (result.droppedRecords > 0 || result.droppedCommits > 0) {
      // Import still applies (the valid entries are real data worth keeping) but the modal
      // stays open so this warning is actually visible before the user dismisses it.
      setImportError(
        `Imported, but dropped ${result.droppedRecords} malformed record(s) and ${result.droppedCommits} malformed commit(s) that didn't match the expected schema.`
      );
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0b101d] border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0e1628] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 font-mono-code uppercase tracking-wider">
                  Stateless Git Log & File Tree State
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono-code">
                  ZERO-DATABASE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Stateless browser memory state synchronized with flat Git commit history.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation & Export Actions */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-800 bg-[#0c1322] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('JSON')}
              className={`px-3 py-2 text-xs font-mono-code border-b-2 transition ${
                activeTab === 'JSON'
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Raw State JSON
            </button>
            <button
              onClick={() => setActiveTab('COMMITS')}
              className={`px-3 py-2 text-xs font-mono-code border-b-2 transition ${
                activeTab === 'COMMITS'
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Git Tree ({stateLog.commits.length})
            </button>
            <button
              onClick={() => setActiveTab('VECTORS')}
              className={`px-3 py-2 text-xs font-mono-code border-b-2 transition ${
                activeTab === 'VECTORS'
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Vector Health Metrics
            </button>
            <button
              onClick={() => setActiveTab('IMPORT')}
              className={`px-3 py-2 text-xs font-mono-code border-b-2 transition ${
                activeTab === 'IMPORT'
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Import Snapshot
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2 sm:pb-0">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono-code bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono-code bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 max-h-[65vh] overflow-y-auto font-mono-code text-xs">
          
          {/* TAB 1: JSON */}
          {activeTab === 'JSON' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <pre className="text-slate-300 overflow-x-auto leading-relaxed text-[11px]">
                {jsonString}
              </pre>
            </div>
          )}

          {/* TAB 2: COMMITS */}
          {activeTab === 'COMMITS' && (
            <div className="space-y-3">
              {stateLog.commits.map((c) => (
                <div key={c.commitHash} className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-cyan-300">sha:{c.commitHash.slice(0, 7)}</span>
                      <span className="text-[10px] text-slate-400">parent:{c.parentHash.slice(0, 7)}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {c.vectorTag}
                      </span>
                    </div>
                    <p className="text-slate-200 text-xs">{c.message}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Author: {c.author} • {c.timestamp}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] shrink-0">
                    <span className="text-emerald-400">+{c.totalAdditions}</span>
                    <span className="text-rose-400">-{c.totalDeletions}</span>
                    <span className="text-slate-400">({c.filesChanged.length} files)</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: VECTOR HEALTH METRICS */}
          {activeTab === 'VECTORS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-cyan-900/50 bg-cyan-950/20">
                  <span className="text-[10px] text-cyan-400 block mb-1">TECHNICAL EVOLUTION</span>
                  <span className="text-xl font-bold text-slate-100">{stateLog.activeVectors.TECHNICAL_EVOLUTION}</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Berth 48, SMR Scaling, Barge Keels, Subsea</span>
                </div>

                <div className="p-4 rounded-xl border border-amber-900/50 bg-amber-950/20">
                  <span className="text-[10px] text-amber-400 block mb-1">REGULATORY PATHWAYS</span>
                  <span className="text-xl font-bold text-slate-100">{stateLog.activeVectors.REGULATORY_PATHWAYS}</span>
                  <span className="text-[10px] text-slate-400 block mt-1">POLB CEQA, MARAD Title XI, NRC Part 53</span>
                </div>

                <div className="p-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20">
                  <span className="text-[10px] text-emerald-400 block mb-1">ECOSYSTEM MOMENTUM</span>
                  <span className="text-xl font-bold text-slate-100">{stateLog.activeVectors.ECOSYSTEM_MOMENTUM}</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Cap Table, Executive Hiring, Crowley MSA</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220]">
                <h4 className="text-xs font-bold text-slate-200 mb-2">Noise Suppression & Operational Integrity</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Verified Deltas</span>
                    <span className="text-emerald-400 font-bold text-base">{stateLog.filterMetrics.verifiedDeltas}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Pending Corroboration</span>
                    <span className="text-amber-400 font-bold text-base">{stateLog.filterMetrics.pendingCorroboration}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rejected PR Chatter</span>
                    <span className="text-rose-400 font-bold text-base">{stateLog.filterMetrics.rejectedPrChatter}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Signal Ratio</span>
                    <span className="text-purple-400 font-bold text-base">{stateLog.filterMetrics.prNoiseSuppressionRatio}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: IMPORT */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Paste Flat-File State JSON to load directly into client-side memory:
                </label>
                <textarea
                  rows={8}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{"version": "...", "commits": [...], "records": [...]}'
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500 font-mono-code text-[11px]"
                />
              </div>

              {importError && (
                <div className="p-3 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                  {importError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleImport}
                  disabled={!importJsonText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Load State Snapshot
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0e1628] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-mono-code bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
