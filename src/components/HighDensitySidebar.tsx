import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  GitCommit, 
  ShieldCheck, 
  AlertOctagon,
  Clock,
  Filter
} from 'lucide-react';
import { OperationalDeltaRecord, GitCommitSnapshot, OperationalVector } from '../types';

interface HighDensitySidebarProps {
  records: OperationalDeltaRecord[];
  commits: GitCommitSnapshot[];
  onSelectRecord: (rec: OperationalDeltaRecord) => void;
  onFilterByVector: (vector: OperationalVector | 'ALL') => void;
  selectedVector: OperationalVector | 'ALL';
}

export const HighDensitySidebar: React.FC<HighDensitySidebarProps> = ({
  records,
  commits,
  onSelectRecord,
  onFilterByVector,
  selectedVector,
}) => {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    core: true,
    reg: true,
    momentum: true,
  });

  const toggleFolder = (key: string) => {
    setOpenFolders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const techRecords = records.filter((r) => r.operationalVector === 'TECHNICAL_EVOLUTION');
  const regRecords = records.filter((r) => r.operationalVector === 'REGULATORY_PATHWAYS');
  const ecoRecords = records.filter((r) => r.operationalVector === 'ECOSYSTEM_MOMENTUM');

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
          {/* core/ (Technical Evolution) */}
          <div>
            <div 
              onClick={() => {
                toggleFolder('core');
                onFilterByVector(selectedVector === 'TECHNICAL_EVOLUTION' ? 'ALL' : 'TECHNICAL_EVOLUTION');
              }}
              className={`flex items-center justify-between px-1.5 py-1 rounded cursor-pointer transition ${
                selectedVector === 'TECHNICAL_EVOLUTION' 
                  ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60' 
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                {openFolders.core ? (
                  <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-slate-500 shrink-0" />
                )}
                {openFolders.core ? (
                  <FolderOpen className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                ) : (
                  <Folder className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                )}
                <span className="truncate">core/telemetry</span>
              </div>
              <span className="text-[9px] text-slate-500 ml-1">{techRecords.length}</span>
            </div>

            {openFolders.core && (
              <div className="ml-4 pl-1.5 border-l border-slate-800 space-y-0.5 mt-0.5">
                {techRecords.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => onSelectRecord(r)}
                    className="flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-blue-300 hover:bg-slate-800/40 cursor-pointer truncate"
                    title={r.sourceProvenance.documentRef}
                  >
                    <span className="truncate flex items-center gap-1">
                      <FileText className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                      {r.sourceProvenance.documentRef.toLowerCase()}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 ml-1"></span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* reg/ (Regulatory Pathways) */}
          <div>
            <div 
              onClick={() => {
                toggleFolder('reg');
                onFilterByVector(selectedVector === 'REGULATORY_PATHWAYS' ? 'ALL' : 'REGULATORY_PATHWAYS');
              }}
              className={`flex items-center justify-between px-1.5 py-1 rounded cursor-pointer transition ${
                selectedVector === 'REGULATORY_PATHWAYS' 
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' 
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                {openFolders.reg ? (
                  <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-slate-500 shrink-0" />
                )}
                {openFolders.reg ? (
                  <FolderOpen className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Folder className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">reg/filings</span>
              </div>
              <span className="text-[9px] text-slate-500 ml-1">{regRecords.length}</span>
            </div>

            {openFolders.reg && (
              <div className="ml-4 pl-1.5 border-l border-slate-800 space-y-0.5 mt-0.5">
                {regRecords.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => onSelectRecord(r)}
                    className="flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-emerald-300 hover:bg-slate-800/40 cursor-pointer truncate"
                    title={r.sourceProvenance.documentRef}
                  >
                    <span className="truncate flex items-center gap-1">
                      <FileText className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                      {r.sourceProvenance.documentRef.toLowerCase()}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-1"></span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* momentum/ (Ecosystem Momentum) */}
          <div>
            <div 
              onClick={() => {
                toggleFolder('momentum');
                onFilterByVector(selectedVector === 'ECOSYSTEM_MOMENTUM' ? 'ALL' : 'ECOSYSTEM_MOMENTUM');
              }}
              className={`flex items-center justify-between px-1.5 py-1 rounded cursor-pointer transition ${
                selectedVector === 'ECOSYSTEM_MOMENTUM' 
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60' 
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                {openFolders.momentum ? (
                  <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-slate-500 shrink-0" />
                )}
                {openFolders.momentum ? (
                  <FolderOpen className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                ) : (
                  <Folder className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                )}
                <span className="truncate">momentum/sec</span>
              </div>
              <span className="text-[9px] text-slate-500 ml-1">{ecoRecords.length}</span>
            </div>

            {openFolders.momentum && (
              <div className="ml-4 pl-1.5 border-l border-slate-800 space-y-0.5 mt-0.5">
                {ecoRecords.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => onSelectRecord(r)}
                    className="flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-purple-300 hover:bg-slate-800/40 cursor-pointer truncate"
                    title={r.sourceProvenance.documentRef}
                  >
                    <span className="truncate flex items-center gap-1">
                      <FileText className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                      {r.sourceProvenance.documentRef.toLowerCase()}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 ml-1"></span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          {records.slice(0, 5).map((rec, idx) => {
            const isRejected = rec.prNoiseFilter.verificationStatus === 'REJECTED_PR_CHATTER';
            const accentBorder = rec.operationalVector === 'TECHNICAL_EVOLUTION'
              ? 'border-blue-500/50'
              : rec.operationalVector === 'REGULATORY_PATHWAYS'
              ? 'border-emerald-500/50'
              : 'border-purple-500/50';

            return (
              <div
                key={rec.id}
                onClick={() => onSelectRecord(rec)}
                className={`border-l-2 ${accentBorder} pl-2.5 py-0.5 hover:bg-slate-900/50 rounded-r cursor-pointer transition`}
              >
                <div className="flex items-center justify-between text-[9px] mb-1">
                  <span className="text-emerald-400 font-bold">
                    {new Date(rec.sourceProvenance.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-slate-500">
                    commit_{rec.sourceProvenance.commitHash.slice(0, 7)}
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
