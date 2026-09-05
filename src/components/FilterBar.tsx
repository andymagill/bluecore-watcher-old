import React from 'react';
import { Search, Layers, GitPullRequest, ShieldCheck, AlertOctagon } from 'lucide-react';
import { OperationalVector, VerificationStatus } from '../types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedVector: OperationalVector | 'ALL';
  onVectorSelect: (v: OperationalVector | 'ALL') => void;
  selectedStatus: VerificationStatus | 'ALL';
  onStatusSelect: (s: VerificationStatus | 'ALL') => void;
  activeView: 'GRID' | 'TIMELINE';
  onViewChange: (v: 'GRID' | 'TIMELINE') => void;
  counts: {
    total: number;
    technical: number;
    regulatory: number;
    ecosystem: number;
    verified: number;
    rejected: number;
    pending: number;
  };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedVector,
  onVectorSelect,
  selectedStatus,
  onStatusSelect,
  activeView,
  onViewChange,
  counts,
}) => {
  return (
    <div className="bg-slate-950/85 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-2.5 sticky top-14 z-30 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left: High density search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
          <input
            id="filter-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search commits, files, claims, or docket records..."
            className="w-full pl-8 pr-6 py-1 text-xs rounded bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono-code transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1 text-slate-400 hover:text-slate-200 text-xs font-mono-code"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Center: Vector Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono-code text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">VECTORS:</span>
          
          <button
            id="filter-vector-all"
            onClick={() => onVectorSelect('ALL')}
            className={`px-2 py-0.5 text-xs font-mono-code rounded transition flex items-center gap-1.5 border ${
              selectedVector === 'ALL'
                ? 'bg-slate-200 text-slate-950 font-bold border-slate-300'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800'
            }`}
          >
            ALL
            <span className={`text-[10px] px-1 rounded ${selectedVector === 'ALL' ? 'bg-slate-300 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
              {counts.total}
            </span>
          </button>

          <button
            id="filter-vector-technical"
            onClick={() => onVectorSelect('TECHNICAL_EVOLUTION')}
            className={`px-2 py-0.5 text-xs font-mono-code rounded transition flex items-center gap-1.5 border ${
              selectedVector === 'TECHNICAL_EVOLUTION'
                ? 'bg-blue-600 text-white font-bold border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                : 'bg-slate-900/80 text-blue-400 hover:bg-slate-800 border-blue-900/50'
            }`}
          >
            TECH
            <span className={`text-[10px] px-1 rounded ${selectedVector === 'TECHNICAL_EVOLUTION' ? 'bg-blue-700 text-white' : 'bg-blue-950/80 text-blue-300'}`}>
              {counts.technical}
            </span>
          </button>

          <button
            id="filter-vector-regulatory"
            onClick={() => onVectorSelect('REGULATORY_PATHWAYS')}
            className={`px-2 py-0.5 text-xs font-mono-code rounded transition flex items-center gap-1.5 border ${
              selectedVector === 'REGULATORY_PATHWAYS'
                ? 'bg-emerald-600 text-white font-bold border-emerald-400 shadow-[0_0_10px_rgba(5,150,105,0.4)]'
                : 'bg-slate-900/80 text-emerald-400 hover:bg-slate-800 border-emerald-900/50'
            }`}
          >
            REGULATORY
            <span className={`text-[10px] px-1 rounded ${selectedVector === 'REGULATORY_PATHWAYS' ? 'bg-emerald-700 text-white' : 'bg-emerald-950/80 text-emerald-300'}`}>
              {counts.regulatory}
            </span>
          </button>

          <button
            id="filter-vector-ecosystem"
            onClick={() => onVectorSelect('ECOSYSTEM_MOMENTUM')}
            className={`px-2 py-0.5 text-xs font-mono-code rounded transition flex items-center gap-1.5 border ${
              selectedVector === 'ECOSYSTEM_MOMENTUM'
                ? 'bg-purple-600 text-white font-bold border-purple-400 shadow-[0_0_10px_rgba(147,51,234,0.4)]'
                : 'bg-slate-900/80 text-purple-400 hover:bg-slate-800 border-purple-900/50'
            }`}
          >
            ECOSYSTEM
            <span className={`text-[10px] px-1 rounded ${selectedVector === 'ECOSYSTEM_MOMENTUM' ? 'bg-purple-700 text-white' : 'bg-purple-950/80 text-purple-300'}`}>
              {counts.ecosystem}
            </span>
          </button>
        </div>

        {/* Right: Status Filters & View Toggle */}
        <div className="flex items-center gap-2">
          {/* PR Filter selector */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded p-0.5">
            <button
              id="filter-status-all"
              onClick={() => onStatusSelect('ALL')}
              className={`px-2 py-0.5 text-[10px] font-mono-code rounded ${
                selectedStatus === 'ALL'
                  ? 'bg-slate-800 text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show all records including filtered chatter"
            >
              All
            </button>
            <button
              id="filter-status-verified"
              onClick={() => onStatusSelect('VERIFIED_DELTA')}
              className={`px-2 py-0.5 text-[10px] font-mono-code rounded flex items-center gap-1 ${
                selectedStatus === 'VERIFIED_DELTA'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-medium'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
              title="Show only verified operational deltas (PR noise filtered out)"
            >
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              Verified ({counts.verified})
            </button>
            <button
              id="filter-status-rejected"
              onClick={() => onStatusSelect('REJECTED_PR_CHATTER')}
              className={`px-2 py-0.5 text-[10px] font-mono-code rounded flex items-center gap-1 ${
                selectedStatus === 'REJECTED_PR_CHATTER'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800/80 font-medium'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
              title="Show only items suppressed by PR noise filter"
            >
              <AlertOctagon className="h-3 w-3 text-rose-400" />
              Noise ({counts.rejected})
            </button>
          </div>

          {/* View switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded p-0.5">
            <button
              id="btn-view-grid"
              onClick={() => onViewChange('GRID')}
              className={`px-2 py-0.5 text-xs rounded font-medium flex items-center gap-1 transition ${
                activeView === 'GRID'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Modular Grid View mapped to the 3 operational vectors"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline font-mono-code text-[11px]">Grid</span>
            </button>
            <button
              id="btn-view-timeline"
              onClick={() => onViewChange('TIMELINE')}
              className={`px-2 py-0.5 text-xs rounded font-medium flex items-center gap-1 transition ${
                activeView === 'TIMELINE'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Evidence Timeline displaying Git commit diffs and additions/deletions"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              <span className="hidden sm:inline font-mono-code text-[11px]">Timeline</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
