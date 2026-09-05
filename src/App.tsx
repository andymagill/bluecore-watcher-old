/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import {
  ActiveTab,
  OperationalDeltaRecord,
  VerificationStatus,
} from './types';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { VectorGridView } from './components/VectorGridView';
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

  // Primary navigation: one operational vector's grid, or the all-vector Timeline.
  const [activeTab, setActiveTab] = useState<ActiveTab>('TECHNICAL_EVOLUTION');

  // Secondary filters: apply within whichever tab is active.
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<VerificationStatus | 'ALL'>('ALL');

  // Time-Series Scrubber (0 = HEAD, commits.length - 1 = Genesis)
  const [scrubberIndex, setScrubberIndex] = useState<number>(0);

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<OperationalDeltaRecord | null>(null);
  const [isStateInspectorOpen, setIsStateInspectorOpen] = useState<boolean>(false);

  // Filter records & commits based on active time-series scrubber index
  const { activeCommits, activeRecords, selectedCommit, isHead } = useMemo(() => {
    return filterStateByCommit(stateLog.records, stateLog.commits, scrubberIndex);
  }, [stateLog.records, stateLog.commits, scrubberIndex]);

  // Status + search apply in every tab (previously search/status only affected the grid, so
  // Timeline's secondary row did nothing — see EvidenceTimeline below for the other half of this).
  const searchedRecords = useMemo(() => {
    return activeRecords.filter((rec) => {
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
          (rec.sourceProvenance.author?.toLowerCase().includes(q) ?? false) ||
          (rec.sourceProvenance.sourcePublisher?.toLowerCase().includes(q) ?? false)
        );
      }

      return true;
    });
  }, [activeRecords, selectedStatus, searchQuery]);

  // Grid tabs additionally narrow to the active vector; Timeline shows every vector.
  const filteredRecords = useMemo(() => {
    if (activeTab === 'TIMELINE') return searchedRecords;
    return searchedRecords.filter((rec) => rec.operationalVector === activeTab);
  }, [searchedRecords, activeTab]);

  // Timeline's commit list follows the same search/status filter as the record list: a commit
  // shows if no filter is active, or if its associated record survives the filter above.
  const filteredCommits = useMemo(() => {
    if (selectedStatus === 'ALL' && !searchQuery.trim()) return activeCommits;
    const survivingHashes = new Set(searchedRecords.map((r) => r.sourceProvenance.commitHash));
    return activeCommits.filter((c) => survivingHashes.has(c.commitHash));
  }, [activeCommits, searchedRecords, selectedStatus, searchQuery]);

  // Counts for tab labels & status filters
  const counts = useMemo(() => {
    const vectorCounts = countByVector(activeRecords);
    const statusCounts = countByStatus(activeRecords);
    return { ...vectorCounts, ...statusCounts };
  }, [activeRecords]);

  // Unfiltered record count for whichever tab is active — the denominator shown next to
  // filteredRecords.length in FilterBar's "n of m" indicator.
  const activeTabTotal = useMemo(() => {
    if (activeTab === 'TIMELINE') return activeRecords.length;
    if (activeTab === 'TECHNICAL_EVOLUTION') return counts.technical;
    if (activeTab === 'REGULATORY_PATHWAYS') return counts.regulatory;
    return counts.ecosystem;
  }, [activeTab, activeRecords.length, counts]);

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

  // Reset secondary filters (status + search). Vector/Timeline selection is navigation, not a
  // filter, so it's untouched by reset.
  const handleResetSecondaryFilters = () => {
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  return (
    <div className="h-screen w-full bg-[#020617] text-slate-300 flex flex-col overflow-hidden selection:bg-blue-600 selection:text-white font-sans">

      {/* Top Application Header */}
      <Header
        onRunWorkflow={runWorkflow}
        onRefreshState={refresh}
        onOpenStateInspector={() => setIsStateInspectorOpen(true)}
        onExportJson={handleExportJson}
        isWorkflowRunning={isWorkflowRunning}
        isRefreshing={isRefreshing}
      />

      {/* Data Provenance Banner: only shown when the on-screen state is not confirmed live */}
      {dataSource !== 'live' && (
        <div className="border-b border-amber-900/70 bg-amber-950/60">
          <div className="layout-container px-4 py-1.5 flex items-center gap-2 text-[11px] font-mono-code text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {dataSource === 'seed'
                ? 'Displaying bundled seed data — the backend at /api/state was unreachable. This is not live repository state.'
                : 'Displaying an imported snapshot — not the live repository state.'}
            </span>
          </div>
        </div>
      )}

      {/* Primary Navigation & Secondary Filters */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabSelect={setActiveTab}
        selectedStatus={selectedStatus}
        onStatusSelect={setSelectedStatus}
        counts={counts}
        filteredCount={filteredRecords.length}
        totalCount={activeTabTotal}
        onResetSecondaryFilters={handleResetSecondaryFilters}
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
        <div className="border-b border-amber-800/80 bg-amber-950/70">
          <div className="layout-container px-4 py-2 flex items-center justify-between text-xs font-mono-code text-amber-200">
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
        </div>
      )}

      {/* Main Command Center Work Surface with High-Density Dual Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: File Tree & Live Evidence Log */}
        <div className="hidden lg:flex flex-none">
          <HighDensitySidebar
            records={activeRecords}
            onSelectRecord={setSelectedRecord}
            onSelectVector={setActiveTab}
            activeTab={activeTab}
          />
        </div>

        {/* Center Operations Grid / Timeline Section */}
        <section className="flex-1 overflow-y-auto bg-slate-900/10">
          {activeTab === 'TIMELINE' ? (
            <EvidenceTimeline
              commits={filteredCommits}
              records={searchedRecords}
              onSelectRecord={setSelectedRecord}
            />
          ) : (
            <VectorGridView
              vector={activeTab}
              records={filteredRecords}
              onSelectRecord={setSelectedRecord}
              onResetFilters={handleResetSecondaryFilters}
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
        <div className="fixed bottom-10 right-6 z-50">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono-code shadow-2xl">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastNotification}</span>
          </div>
        </div>
      )}

      {/* High Density Status Footer */}
      <footer className="h-8 flex-none border-t border-slate-800 bg-slate-950 z-30">
        <div className="layout-container h-full px-4 flex items-center justify-between font-mono-code text-[9px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 uppercase">Engine Online</span>
          </div>

          <div className="flex gap-4 text-slate-500">
            <span className="text-slate-400 font-bold hidden sm:inline">BLUECORE</span>
            <span>{stateLog.version}</span>
            <span>HEAD: {shortHash(stateLog.commits[0]?.commitHash, 'init')}</span>
            {!isHead && selectedCommit && (
              <span className="text-amber-400 font-bold">REPLAY: {shortHash(selectedCommit.commitHash)}</span>
            )}
          </div>
        </div>
      </footer>

    </div>
  );
}
