/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import {
  OperationalDeltaRecord,
  OperationalVector,
  VerificationStatus,
} from './types';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { ModularGridView } from './components/ModularGridView';
import { EvidenceTimeline } from './components/EvidenceTimeline';
import { DeltaDetailModal } from './components/DeltaDetailModal';
import { StateLogInspectorModal } from './components/StateLogInspectorModal';
import { HighDensitySidebar } from './components/HighDensitySidebar';
import { DateScrubber } from './components/DateScrubber';
import { filterStateByCommit } from './utils/timeline';
import { countByVector, countByStatus } from './utils/counts';
import { shortHash } from './utils/hash';
import { useIntelligenceState } from './hooks/useIntelligenceState';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export default function App() {
  const {
    stateLog,
    dataSource,
    isRefreshing,
    isWorkflowRunning,
    toastNotification,
    refresh,
    runWorkflow,
    importStateLog,
  } = useIntelligenceState();

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVector, setSelectedVector] = useState<OperationalVector | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<VerificationStatus | 'ALL'>('ALL');
  const [activeView, setActiveView] = useState<'GRID' | 'TIMELINE'>('GRID');

  // Time-Series Scrubber (0 = HEAD, commits.length - 1 = Genesis)
  const [scrubberIndex, setScrubberIndex] = useState<number>(0);

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<OperationalDeltaRecord | null>(null);
  const [isStateInspectorOpen, setIsStateInspectorOpen] = useState<boolean>(false);

  // Filter records & commits based on active time-series scrubber index
  const { activeCommits, activeRecords, selectedCommit, isHead } = useMemo(() => {
    return filterStateByCommit(stateLog.records, stateLog.commits, scrubberIndex);
  }, [stateLog.records, stateLog.commits, scrubberIndex]);

  // Filter records in browser memory based on active time-series window
  const filteredRecords = useMemo(() => {
    return activeRecords.filter((rec) => {
      if (selectedVector !== 'ALL' && rec.operationalVector !== selectedVector) {
        return false;
      }

      if (selectedStatus !== 'ALL' && rec.prNoiseFilter.verificationStatus !== selectedStatus) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.headline.toLowerCase().includes(q) ||
          rec.verifiableClaim.toLowerCase().includes(q) ||
          rec.verifiableDelta.toLowerCase().includes(q) ||
          rec.sourceProvenance.documentRef.toLowerCase().includes(q) ||
          rec.sourceProvenance.commitHash.toLowerCase().includes(q) ||
          rec.subVector.toLowerCase().includes(q) ||
          rec.sourceProvenance.author.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [activeRecords, selectedVector, selectedStatus, searchQuery]);

  // Counts for filters
  const counts = useMemo(() => {
    const vectorCounts = countByVector(activeRecords);
    const statusCounts = countByStatus(activeRecords);
    return { ...vectorCounts, ...statusCounts };
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
        onRunWorkflow={runWorkflow}
        onRefreshState={refresh}
        onOpenStateInspector={() => setIsStateInspectorOpen(true)}
        onExportJson={handleExportJson}
        isWorkflowRunning={isWorkflowRunning}
        isRefreshing={isRefreshing}
      />

      {/* Data Provenance Banner: only shown when the on-screen state is not confirmed live */}
      {dataSource !== 'live' && (
        <div className="bg-amber-950/60 border-b border-amber-900/70 px-4 py-1.5 flex items-center gap-2 text-[11px] font-mono-code text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {dataSource === 'seed'
              ? 'Displaying bundled seed data — the backend at /api/state was unreachable. This is not live repository state.'
              : 'Displaying an imported snapshot — not the live repository state.'}
          </span>
        </div>
      )}

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
      />

      {/* Historical Replay Active Banner */}
      {!isHead && selectedCommit && (
        <div className="bg-amber-950/70 border-b border-amber-800/80 px-4 py-2 flex items-center justify-between text-xs font-mono-code text-amber-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              <strong>POINT-IN-TIME AUDIT ACTIVE:</strong> Viewing historical Git repository state at commit{' '}
              <span className="font-bold underline text-amber-100">{shortHash(selectedCommit.commitHash)}</span>{' '}
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
        onImportStateLog={importStateLog}
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
          <span>HEAD: {shortHash(stateLog.commits[0]?.commitHash, 'init')}</span>
          {!isHead && selectedCommit && (
            <span className="text-amber-400 font-bold">REPLAY: {shortHash(selectedCommit.commitHash)}</span>
          )}
        </div>
      </footer>

    </div>
  );
}
