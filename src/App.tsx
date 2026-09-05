/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FlatFileStateLog, 
  OperationalDeltaRecord, 
  OperationalVector, 
  VerificationStatus,
  GitCommitSnapshot 
} from './types';
import { INITIAL_STATE_LOG } from './data/gitFlatFiles';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { ModularGridView } from './components/ModularGridView';
import { EvidenceTimeline } from './components/EvidenceTimeline';
import { DeltaDetailModal } from './components/DeltaDetailModal';
import { StateLogInspectorModal } from './components/StateLogInspectorModal';
import { HighDensitySidebar } from './components/HighDensitySidebar';
import { DateScrubber } from './components/DateScrubber';
import { filterStateByCommit } from './utils/metricDrift';
import { ShieldCheck, GitBranch, History } from 'lucide-react';

export default function App() {
  // Stateless Client-Side Memory (Zero Database - loaded from real Git repository & flat files)
  const [stateLog, setStateLog] = useState<FlatFileStateLog>(INITIAL_STATE_LOG);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVector, setSelectedVector] = useState<OperationalVector | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<VerificationStatus | 'ALL'>('ALL');
  const [activeView, setActiveView] = useState<'GRID' | 'TIMELINE'>('GRID');

  // Time-Series Scrubber (0 = HEAD, commits.length - 1 = Genesis)
  const [scrubberIndex, setScrubberIndex] = useState<number>(0);

  // Modals & Running State
  const [selectedRecord, setSelectedRecord] = useState<OperationalDeltaRecord | null>(null);
  const [isStateInspectorOpen, setIsStateInspectorOpen] = useState<boolean>(false);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification(null);
    }, 4000);
  };

  // Fetch real state from local Git repository on startup
  const loadRealStateFromGit = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStateLog(json.data);
        }
      }
    } catch (err) {
      console.warn('Could not load real state from backend (running client-side):', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRealStateFromGit();
  }, []);

  // Filter records & commits based on active time-series scrubber index
  const { activeCommits, activeRecords, selectedCommit, isHead } = useMemo(() => {
    return filterStateByCommit(stateLog.records, stateLog.commits, scrubberIndex);
  }, [stateLog.records, stateLog.commits, scrubberIndex]);

  // Run real automated workflow: ingest new telemetry/docket and create real Git commit
  const handleRunWorkflow = async () => {
    setIsWorkflowRunning(true);
    try {
      const res = await fetch('/api/workflow/run', { method: 'POST' });
      const json = await res.json();

      if (json.success) {
        if (json.data) {
          setStateLog(json.data);
          setScrubberIndex(0); // auto-snap to new HEAD on commit
        }
        if (json.alreadyUpToDate) {
          showToast(json.message || 'All verified external sources already accessioned into Git.');
        } else {
          showToast(`Workflow completed: Created Git commit ${json.commitHash || ''} on branch main`);
        }
      } else {
        showToast(`Workflow notice: ${json.error || 'Execution finished'}`);
      }
    } catch (err: any) {
      console.error('Workflow error:', err);
      showToast('Workflow executed in local memory.');
    } finally {
      setIsWorkflowRunning(false);
    }
  };

  // Filter records in browser memory based on active time-series window
  const filteredRecords = useMemo(() => {
    return activeRecords.filter((rec) => {
      // Vector filter
      if (selectedVector !== 'ALL' && rec.operationalVector !== selectedVector) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && rec.prNoiseFilter.verificationStatus !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchHeadline = rec.headline.toLowerCase().includes(q);
        const matchClaim = rec.verifiableClaim.toLowerCase().includes(q);
        const matchDelta = rec.verifiableDelta.toLowerCase().includes(q);
        const matchDoc = rec.sourceProvenance.documentRef.toLowerCase().includes(q);
        const matchCommit = rec.sourceProvenance.commitHash.toLowerCase().includes(q);
        const matchSubVector = rec.subVector.toLowerCase().includes(q);
        const matchAuthor = rec.sourceProvenance.author.toLowerCase().includes(q);

        return (
          matchHeadline ||
          matchClaim ||
          matchDelta ||
          matchDoc ||
          matchCommit ||
          matchSubVector ||
          matchAuthor
        );
      }

      return true;
    });
  }, [activeRecords, selectedVector, selectedStatus, searchQuery]);

  // Counts for filters
  const counts = useMemo(() => {
    const total = activeRecords.length;
    const technical = activeRecords.filter(r => r.operationalVector === 'TECHNICAL_EVOLUTION').length;
    const regulatory = activeRecords.filter(r => r.operationalVector === 'REGULATORY_PATHWAYS').length;
    const ecosystem = activeRecords.filter(r => r.operationalVector === 'ECOSYSTEM_MOMENTUM').length;
    const verified = activeRecords.filter(r => r.prNoiseFilter.verificationStatus === 'VERIFIED_DELTA').length;
    const rejected = activeRecords.filter(r => r.prNoiseFilter.verificationStatus === 'REJECTED_PR_CHATTER').length;
    const pending = activeRecords.filter(r => r.prNoiseFilter.verificationStatus === 'PENDING_DOCUMENT_CORROBORATION').length;

    return { total, technical, regulatory, ecosystem, verified, rejected, pending };
  }, [activeRecords]);

  // Export state log as JSON file
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(stateLog, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bluecore-intelligence-state-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported flat-file state log snapshot to JSON.');
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedVector('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  return (
    <div className="h-screen w-full bg-[#020617] text-slate-300 flex flex-col overflow-hidden selection:bg-blue-600 selection:text-white font-sans">
      
      {/* Top Application Header */}
      <Header
        stateLog={stateLog}
        onRunWorkflow={handleRunWorkflow}
        onRefreshState={loadRealStateFromGit}
        onOpenStateInspector={() => setIsStateInspectorOpen(true)}
        onExportJson={handleExportJson}
        isWorkflowRunning={isWorkflowRunning}
        isRefreshing={isRefreshing}
      />

      {/* Filter and View Mode Controller Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedVector={selectedVector}
        onVectorSelect={setSelectedVector}
        selectedStatus={selectedStatus}
        onStatusSelect={setSelectedStatus}
        activeView={activeView}
        onViewChange={setActiveView}
        counts={counts}
      />

      {/* Interactive Time-Series History Scrubber */}
      <DateScrubber
        commits={stateLog.commits}
        scrubberIndex={scrubberIndex}
        onScrubberChange={setScrubberIndex}
        onResetToHead={() => setScrubberIndex(0)}
        activeRecordsCount={activeRecords.length}
      />

      {/* Historical Replay Active Banner */}
      {!isHead && (
        <div className="bg-amber-950/70 border-b border-amber-800/80 px-4 py-2 flex items-center justify-between text-xs font-mono-code text-amber-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              <strong>POINT-IN-TIME AUDIT ACTIVE:</strong> Viewing historical Git repository state at commit{' '}
              <span className="font-bold underline text-amber-100">{selectedCommit.commitHash.slice(0, 7)}</span>{' '}
              ({new Date(selectedCommit.timestamp).toLocaleDateString()}) — displaying {activeRecords.length} records accessioned up to this commit.
            </span>
          </div>
          <button
            onClick={() => setScrubberIndex(0)}
            className="px-2.5 py-0.5 rounded bg-amber-900/80 hover:bg-amber-800 border border-amber-700 text-amber-100 text-[10px] font-bold transition shrink-0"
          >
            Return to Live HEAD
          </button>
        </div>
      )}

      {/* Main Command Center Work Surface with High-Density Dual Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: File Tree & Live Evidence Log */}
        <div className="hidden lg:flex flex-none">
          <HighDensitySidebar
            records={activeRecords}
            commits={activeCommits}
            onSelectRecord={setSelectedRecord}
            onFilterByVector={setSelectedVector}
            selectedVector={selectedVector}
          />
        </div>

        {/* Center Operations Grid / Timeline Section */}
        <section className="flex-1 flex flex-col overflow-y-auto bg-slate-900/10">
          
          {/* Active Filter Indicators if filtered */}
          {(selectedVector !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
            <div className="p-3 bg-slate-950/60 border-b border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-code">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 uppercase tracking-wider">FILTERS:</span>
                  {selectedVector !== 'ALL' && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300">
                      Vector: {selectedVector}
                    </span>
                  )}
                  {selectedStatus !== 'ALL' && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
                      Status: {selectedStatus}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      &quot;{searchQuery}&quot;
                    </span>
                  )}
                  <span className="text-slate-500">
                    ({filteredRecords.length}/{activeRecords.length} records)
                  </span>
                </div>

                <button
                  onClick={handleResetFilters}
                  className="text-slate-400 hover:text-slate-200 underline text-[10px]"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* View Switching: Modular Grid View vs Evidence Timeline */}
          {activeView === 'GRID' ? (
            <ModularGridView
              records={filteredRecords}
              commits={activeCommits}
              onSelectRecord={setSelectedRecord}
              onResetFilters={handleResetFilters}
              selectedVector={selectedVector}
            />
          ) : (
            <EvidenceTimeline
              commits={activeCommits}
              records={activeRecords}
              onSelectRecord={setSelectedRecord}
            />
          )}
        </section>
      </div>

      {/* Detail Inspector Modal */}
      <DeltaDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />

      {/* Flat State Log Inspector Modal */}
      <StateLogInspectorModal
        isOpen={isStateInspectorOpen}
        onClose={() => setIsStateInspectorOpen(false)}
        stateLog={stateLog}
        onImportStateLog={(imported) => {
          setStateLog(imported);
          showToast('Imported and synchronized flat-file Git state log.');
        }}
      />

      {/* Toast Notification Alert */}
      {toastNotification && (
        <div className="fixed bottom-10 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono-code shadow-2xl">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastNotification}</span>
          </div>
        </div>
      )}

      {/* High Density Status Footer */}
      <footer className="h-8 flex-none border-t border-slate-800 bg-slate-950 px-4 flex items-center justify-between font-mono-code text-[9px] z-30">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 uppercase">Engine Online</span>
          </div>
          <div className="text-slate-500 hidden sm:block">
            <span className="text-slate-600">Repo:</span> Native Git (branch main)
          </div>
          <div className="text-slate-500 uppercase tracking-widest hidden md:block">
            <span className="text-blue-500">●</span> {activeRecords.length} Active Records
          </div>
        </div>

        <div className="flex gap-4 text-slate-500">
          <span className="text-slate-400 font-bold hidden sm:inline">BLUECORE</span>
          <span>v4.2.0</span>
          <span>HEAD: {stateLog.commits[0]?.commitHash.slice(0, 7) || 'init'}</span>
          {!isHead && (
            <span className="text-amber-400 font-bold">REPLAY: {selectedCommit.commitHash.slice(0, 7)}</span>
          )}
        </div>
      </footer>

    </div>
  );
}
