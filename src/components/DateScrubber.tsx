import React from 'react';
import { GitCommitSnapshot } from '../types';
import { 
  History, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  GitCommit, 
  Play, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface DateScrubberProps {
  commits: GitCommitSnapshot[];
  scrubberIndex: number; // 0 is HEAD, commits.length - 1 is oldest
  onScrubberChange: (index: number) => void;
  onResetToHead: () => void;
  activeRecordsCount: number;
}

export const DateScrubber: React.FC<DateScrubberProps> = ({
  commits,
  scrubberIndex,
  onScrubberChange,
  onResetToHead,
  activeRecordsCount,
}) => {
  if (commits.length === 0) return null;

  const isHead = scrubberIndex === 0;
  const currentCommit = commits[scrubberIndex] || commits[0];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Slider value: 0 is oldest commit, (commits.length - 1) is HEAD
    const sliderVal = parseInt(e.target.value, 10);
    // Convert slider position to commits array index (where 0 is HEAD)
    const commitIdx = (commits.length - 1) - sliderVal;
    onScrubberChange(commitIdx);
  };

  // Convert scrubberIndex back to slider value
  const sliderPosition = (commits.length - 1) - scrubberIndex;

  const handlePrev = () => {
    if (scrubberIndex < commits.length - 1) {
      onScrubberChange(scrubberIndex + 1);
    }
  };

  const handleNext = () => {
    if (scrubberIndex > 0) {
      onScrubberChange(scrubberIndex - 1);
    }
  };

  return (
    <div className="w-full bg-[#020617] border-b border-slate-800 px-4 py-2.5 font-mono-code">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Status & Replay Mode Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-200 font-bold uppercase tracking-tight">
            <History className={`h-4 w-4 ${isHead ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
            <span>Time-Series Scrubber</span>
          </div>

          {isHead ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE HEAD
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/90 border border-amber-800/90 text-amber-300 font-bold flex items-center gap-1">
                <Clock className="h-3 w-3" />
                HISTORICAL REPLAY ({commits.length - 1 - scrubberIndex + 1}/{commits.length})
              </span>
              <button
                onClick={onResetToHead}
                className="text-[10px] px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 border border-blue-700 text-blue-200 flex items-center gap-1 transition"
                title="Return to latest live Git state"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                Jump to HEAD
              </button>
            </div>
          )}
        </div>

        {/* Center: Interactive Scrubber Slider & Stepper Controls */}
        <div className="flex-1 max-w-xl flex items-center gap-2.5">
          <button
            onClick={handlePrev}
            disabled={scrubberIndex >= commits.length - 1}
            className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition shrink-0"
            title="Step backward one commit in time"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min={0}
              max={commits.length - 1}
              value={sliderPosition}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition"
              aria-label="Git history date scrubber"
            />
            <div className="flex justify-between text-[9px] text-slate-400">
              <span title={commits[commits.length - 1]?.commitHash}>
                Genesis ({commits[commits.length - 1]?.commitHash.slice(0, 7)})
              </span>
              <span className="text-slate-400">
                Drag to rewind metrics & estimates
              </span>
              <span title={commits[0]?.commitHash}>
                HEAD ({commits[0]?.commitHash.slice(0, 7)})
              </span>
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={scrubberIndex <= 0}
            className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition shrink-0"
            title="Step forward one commit in time"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: Active Commit Details */}
        <div className="flex items-center gap-2.5 text-[10px] bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800/80 shrink-0">
          <div className="flex items-center gap-1 text-blue-400 font-bold">
            <GitCommit className="h-3 w-3" />
            <span>{currentCommit.commitHash.slice(0, 7)}</span>
          </div>
          <span className="text-slate-400 truncate max-w-[180px] sm:max-w-[240px]" title={currentCommit.message}>
            {currentCommit.message}
          </span>
          <span className="text-slate-400 border-l border-slate-800 pl-2">
            {new Date(currentCommit.timestamp).toLocaleDateString()}
          </span>
        </div>

      </div>
    </div>
  );
};
