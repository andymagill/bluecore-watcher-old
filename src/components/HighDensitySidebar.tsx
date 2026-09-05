import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react';
import { OperationalDeltaRecord, OperationalVector } from '../types';
import { getVectorTheme } from '../utils/vectorTheme';
import { shortHash } from '../utils/hash';

interface HighDensitySidebarProps {
  records: OperationalDeltaRecord[];
  onSelectRecord: (rec: OperationalDeltaRecord) => void;
  onFilterByVector: (vector: OperationalVector | 'ALL') => void;
  selectedVector: OperationalVector | 'ALL';
}

const FOLDERS: { vector: OperationalVector; folderLabel: string }[] = [
  { vector: 'TECHNICAL_EVOLUTION', folderLabel: 'core/telemetry' },
  { vector: 'REGULATORY_PATHWAYS', folderLabel: 'reg/filings' },
  { vector: 'ECOSYSTEM_MOMENTUM', folderLabel: 'momentum/sec' },
];

export const HighDensitySidebar: React.FC<HighDensitySidebarProps> = ({
  records,
  onSelectRecord,
  onFilterByVector,
  selectedVector,
}) => {
  const [openFolders, setOpenFolders] = useState<Record<OperationalVector, boolean>>({
    TECHNICAL_EVOLUTION: true,
    REGULATORY_PATHWAYS: true,
    ECOSYSTEM_MOMENTUM: true,
  });

  const toggleFolder = (vector: OperationalVector) => {
    setOpenFolders((prev) => ({ ...prev, [vector]: !prev[vector] }));
  };

  return (
    <aside className="w-64 xl:w-72 flex-none border-r border-slate-800 bg-slate-950/40 flex flex-col h-full overflow-hidden select-none">
      {/* SECTION 1: GIT FILE TREE */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/30">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono-code flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Git File Tree
          </h2>
          <span className="text-[9px] text-slate-500 font-mono-code">git status: clean</span>
        </div>

        <div className="font-mono-code text-[11px] space-y-1">
          {FOLDERS.map(({ vector, folderLabel }) => (
            <VectorFolder
              key={vector}
              vector={vector}
              folderLabel={folderLabel}
              isOpen={openFolders[vector]}
              isSelected={selectedVector === vector}
              records={records.filter((r) => r.operationalVector === vector)}
              onToggle={() => {
                toggleFolder(vector);
                onFilterByVector(selectedVector === vector ? 'ALL' : vector);
              }}
              onSelectRecord={onSelectRecord}
            />
          ))}
        </div>
      </div>

      {/* SECTION 2: LIVE EVIDENCE LOG */}
      <div className="flex-1 overflow-y-auto p-3.5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono-code flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Evidence Log
          </h2>
          <span className="text-[9px] text-slate-500 font-mono-code">real-time</span>
        </div>

        <div className="space-y-3 font-mono-code">
          {records.slice(0, 5).map((rec) => {
            const isRejected = rec.prNoiseFilter.verificationStatus === 'REJECTED_PR_CHATTER';
            const theme = getVectorTheme(rec.operationalVector);

            return (
              <div
                key={rec.id}
                onClick={() => onSelectRecord(rec)}
                className={`border-l-2 ${theme.accentBorder} pl-2.5 py-0.5 hover:bg-slate-900/50 rounded-r cursor-pointer transition`}
              >
                <div className="flex items-center justify-between text-[9px] mb-1">
                  <span className="text-emerald-400 font-bold">
                    {new Date(rec.sourceProvenance.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-slate-500">
                    commit_{shortHash(rec.sourceProvenance.commitHash)}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-slate-200 line-clamp-2 leading-snug">
                  {rec.headline}
                </div>
                <div className="text-[9px] text-slate-400 flex items-center justify-between mt-1 pt-1 border-t border-slate-800/40">
                  <span className="truncate max-w-[120px] text-blue-300 font-medium">
                    {rec.sourceProvenance.sourcePublisher || rec.subVector}
                  </span>
                  {isRejected ? (
                    <span className="text-rose-400 flex items-center gap-0.5">
                      <AlertOctagon className="h-2.5 w-2.5" /> Noise
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <ShieldCheck className="h-2.5 w-2.5" /> Delta
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

interface VectorFolderProps {
  vector: OperationalVector;
  folderLabel: string;
  isOpen: boolean;
  isSelected: boolean;
  records: OperationalDeltaRecord[];
  onToggle: () => void;
  onSelectRecord: (rec: OperationalDeltaRecord) => void;
}

/**
 * One collapsible vector folder in the Git File Tree section.
 *
 * Extracted from three near-identical 50-line blocks (one per vector) that differed only in
 * color classes and the vector being filtered — the theme now comes from `getVectorTheme`
 * instead of being hand-copied per block.
 */
const VectorFolder: React.FC<VectorFolderProps> = ({
  vector,
  folderLabel,
  isOpen,
  isSelected,
  records,
  onToggle,
  onSelectRecord,
}) => {
  const theme = getVectorTheme(vector);

  return (
    <div>
      <div
        onClick={onToggle}
        className={`flex items-center justify-between px-1.5 py-1 rounded cursor-pointer transition ${
          isSelected ? theme.sidebarSelected : 'hover:bg-slate-800/60 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-slate-500 shrink-0" />
          )}
          {isOpen ? (
            <FolderOpen className={`h-3.5 w-3.5 shrink-0 ${theme.accentText}`} />
          ) : (
            <Folder className={`h-3.5 w-3.5 shrink-0 ${theme.accentText}`} />
          )}
          <span className="truncate">{folderLabel}</span>
        </div>
        <span className="text-[9px] text-slate-500 ml-1">{records.length}</span>
      </div>

      {isOpen && (
        <div className="ml-4 pl-1.5 border-l border-slate-800 space-y-0.5 mt-0.5">
          {records.slice(0, 3).map((r) => (
            <div
              key={r.id}
              onClick={() => onSelectRecord(r)}
              className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:bg-slate-800/40 cursor-pointer truncate ${theme.hoverText}`}
              title={r.sourceProvenance.documentRef}
            >
              <span className="truncate flex items-center gap-1">
                <FileText className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                {r.sourceProvenance.documentRef.toLowerCase()}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1 ${theme.accentDot}`}></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
