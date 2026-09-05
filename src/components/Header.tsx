import React from 'react';
import {
  RefreshCw,
  Play,
  DownloadCloud,
  FileCode2,
} from 'lucide-react';
interface HeaderProps {
  onRunWorkflow: () => void;
  onRefreshState: () => void;
  onOpenStateInspector: () => void;
  onExportJson: () => void;
  isWorkflowRunning: boolean;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onRunWorkflow,
  onRefreshState,
  onOpenStateInspector,
  onExportJson,
  isWorkflowRunning,
  isRefreshing,
}) => {
  return (
    <header className="h-14 flex-none border-b border-slate-800 bg-[#020617] sticky top-0 z-40">
      <div className="layout-container h-full flex items-center justify-between px-4 sm:px-6">
        {/* Brand & Local Git Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] shrink-0 font-mono">
            B
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base sm:text-lg tracking-tight text-white font-mono-code">
              BLUECORE <span className="text-blue-500 font-medium">INTELLIGENCE</span>
            </h1>
            <span className="hidden md:flex px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400 font-mono-code items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              GIT: MAIN
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Run Real Automated Workflow */}
          <button
            id="btn-run-workflow"
            onClick={onRunWorkflow}
            disabled={isWorkflowRunning}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs border border-blue-500 transition disabled:opacity-50 flex items-center gap-1.5 font-mono-code font-semibold shadow-[0_0_12px_rgba(37,99,235,0.3)]"
            title="Execute automated ingestion pipeline and create real Git commit on disk"
          >
            <Play className={`h-3.5 w-3.5 ${isWorkflowRunning ? 'animate-pulse' : 'fill-white'}`} />
            <span>{isWorkflowRunning ? 'Ingesting...' : 'Run Workflow'}</span>
          </button>

          {/* Refresh State from Local Git Repo */}
          <button
            id="btn-refresh-state"
            onClick={onRefreshState}
            disabled={isRefreshing}
            className="bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded text-xs border border-slate-700 text-slate-300 transition disabled:opacity-50 flex items-center gap-1.5 font-mono-code"
            title="Poll and reload state directly from real Git log and files on disk"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* State Log Inspector */}
          <button
            id="btn-inspect-state-log"
            onClick={onOpenStateInspector}
            className="hidden sm:inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded text-xs border border-slate-800 text-slate-400 hover:text-slate-200 transition font-mono-code"
            title="Inspect zero-database flat-file state log JSON & Git commit tree"
          >
            <FileCode2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">State Log</span>
          </button>

          {/* Export State Log Snapshot */}
          <button
            id="btn-export-json"
            onClick={onExportJson}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Export state log snapshot to JSON"
          >
            <DownloadCloud className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
