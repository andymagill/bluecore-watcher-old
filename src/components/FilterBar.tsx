import React from 'react';
import { Search, GitPullRequest, ShieldCheck, AlertOctagon } from 'lucide-react';
import { ActiveTab, VerificationStatus } from '../types';
import { VECTORS } from '../utils/vectorTheme';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab: ActiveTab;
  onTabSelect: (tab: ActiveTab) => void;
  selectedStatus: VerificationStatus | 'ALL';
  onStatusSelect: (s: VerificationStatus | 'ALL') => void;
  counts: {
    total: number;
    technical: number;
    regulatory: number;
    ecosystem: number;
    verified: number;
    rejected: number;
    pending: number;
  };
  filteredCount: number;
  totalCount: number;
  onResetSecondaryFilters: () => void;
}

const VECTOR_COUNT_KEY: Record<string, keyof FilterBarProps['counts']> = {
  TECHNICAL_EVOLUTION: 'technical',
  REGULATORY_PATHWAYS: 'regulatory',
  ECOSYSTEM_MOMENTUM: 'ecosystem',
};

/**
 * Primary navigation (vector + Timeline tabs) and secondary filters (search, status, reset).
 *
 * Vector selection used to be a filter chip living alongside a separate Grid/Timeline toggle —
 * two overlapping controls doing one job. Now the vector *is* the view: exactly one vector's
 * grid renders at a time, and Timeline is the one place all three vectors appear together, so
 * there is no "ALL" filter state and no separate view switcher.
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabSelect,
  selectedStatus,
  onStatusSelect,
  counts,
  filteredCount,
  totalCount,
  onResetSecondaryFilters,
}) => {
  const hasSecondaryFilter = selectedStatus !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="bg-slate-950/85 backdrop-blur-md border-b border-slate-800 sticky top-14 z-30 shadow-sm">
      {/* Primary Row: Vector & Timeline Navigation */}
      <div className="layout-container px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto">
          {VECTORS.map((theme) => {
            const isActive = activeTab === theme.vector;
            const count = counts[VECTOR_COUNT_KEY[theme.vector]];
            return (
              <button
                key={theme.vector}
                id={`tab-vector-${theme.vector.toLowerCase()}`}
                onClick={() => onTabSelect(theme.vector)}
                className={`px-3 py-2.5 text-xs font-mono-code font-semibold uppercase tracking-tight border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? theme.tabActive
                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700'
                }`}
              >
                {theme.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isActive ? 'bg-slate-800/80' : 'bg-slate-900'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          <button
            id="tab-timeline"
            onClick={() => onTabSelect('TIMELINE')}
            className={`px-3 py-2.5 text-xs font-mono-code font-semibold uppercase tracking-tight border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'TIMELINE'
                ? 'text-slate-100 border-slate-300'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700'
            }`}
            title="Chronological commit history across all operational vectors"
          >
            <GitPullRequest className="h-3.5 w-3.5" />
            Timeline
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeTab === 'TIMELINE' ? 'bg-slate-800/80' : 'bg-slate-900'}`}>
              {counts.total}
            </span>
          </button>
        </div>
      </div>

      {/* Secondary Row: Search & Status Filters */}
      <div className="layout-container px-4 sm:px-6 py-2.5 border-t border-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
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

          <div className="flex items-center gap-3">
            {hasSecondaryFilter && (
              <div className="flex items-center gap-2 text-[11px] font-mono-code text-slate-500">
                <span>{filteredCount} of {totalCount}</span>
                <button
                  onClick={onResetSecondaryFilters}
                  className="text-slate-400 hover:text-slate-200 underline"
                >
                  Reset
                </button>
              </div>
            )}

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
          </div>
        </div>
      </div>
    </div>
  );
};
