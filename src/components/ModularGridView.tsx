import React from 'react';
import { 
  OperationalDeltaRecord, 
  OperationalVector,
  GitCommitSnapshot 
} from '../types';
import { VectorMetricCards } from './VectorMetricCards';
import { getVectorMetrics } from '../utils/metricDrift';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  SearchX, 
  Plus,
  ArrowRight,
  FileText,
  Calendar,
  Layers,
  Activity,
  ExternalLink,
  Globe
} from 'lucide-react';

interface ModularGridViewProps {
  records: OperationalDeltaRecord[];
  commits: GitCommitSnapshot[];
  onSelectRecord: (record: OperationalDeltaRecord) => void;
  onResetFilters: () => void;
  selectedVector: OperationalVector | 'ALL';
}

export const ModularGridView: React.FC<ModularGridViewProps> = ({
  records,
  commits,
  onSelectRecord,
  onResetFilters,
  selectedVector,
}) => {
  // Group records strictly across the three operational vectors
  const technicalRecords = records.filter(r => r.operationalVector === 'TECHNICAL_EVOLUTION');
  const regulatoryRecords = records.filter(r => r.operationalVector === 'REGULATORY_PATHWAYS');
  const ecosystemRecords = records.filter(r => r.operationalVector === 'ECOSYSTEM_MOMENTUM');

  const showTechnical = selectedVector === 'ALL' || selectedVector === 'TECHNICAL_EVOLUTION';
  const showRegulatory = selectedVector === 'ALL' || selectedVector === 'REGULATORY_PATHWAYS';
  const showEcosystem = selectedVector === 'ALL' || selectedVector === 'ECOSYSTEM_MOMENTUM';

  return (
    <div className="w-full">
      {/* High Density 3-Column Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 bg-[#020617] border-b border-slate-800 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        
        {/* VECTOR 01: TECHNICAL EVOLUTION */}
        {showTechnical && (
          <VectorColumn
            vectorNumber="01"
            vector="TECHNICAL_EVOLUTION"
            title="Technical Evolution"
            subVectorsDescription="Berth 48 physical assets • SMR scaling metrics • Marine barge modifications • Subsea grid integration"
            headerColorClass="text-blue-400"
            badgeClass="bg-blue-900/40 text-blue-300 border-blue-800/60"
            records={technicalRecords}
            commits={commits}
            onSelectRecord={onSelectRecord}
            onResetFilters={onResetFilters}
          />
        )}

        {/* VECTOR 02: REGULATORY PATHWAYS */}
        {showRegulatory && (
          <VectorColumn
            vectorNumber="02"
            vector="REGULATORY_PATHWAYS"
            title="Regulatory Pathways"
            subVectorsDescription="Port of Long Beach compliance • MARAD frameworks • Early NRC indicators"
            headerColorClass="text-emerald-400"
            badgeClass="bg-emerald-900/40 text-emerald-300 border-emerald-800/60"
            records={regulatoryRecords}
            commits={commits}
            onSelectRecord={onSelectRecord}
            onResetFilters={onResetFilters}
          />
        )}

        {/* VECTOR 03: ECOSYSTEM MOMENTUM */}
        {showEcosystem && (
          <VectorColumn
            vectorNumber="03"
            vector="ECOSYSTEM_MOMENTUM"
            title="Ecosystem Momentum"
            subVectorsDescription="Capital structure updates • Executive talent acquisition • Corporate & maritime alliances"
            headerColorClass="text-purple-400"
            badgeClass="bg-purple-900/40 text-purple-300 border-purple-800/60"
            records={ecosystemRecords}
            commits={commits}
            onSelectRecord={onSelectRecord}
            onResetFilters={onResetFilters}
          />
        )}
      </div>
    </div>
  );
};

interface VectorColumnProps {
  vectorNumber: string;
  vector: OperationalVector;
  title: string;
  subVectorsDescription: string;
  headerColorClass: string;
  badgeClass: string;
  records: OperationalDeltaRecord[];
  commits: GitCommitSnapshot[];
  onSelectRecord: (record: OperationalDeltaRecord) => void;
  onResetFilters: () => void;
}

const VectorColumn: React.FC<VectorColumnProps> = ({
  vectorNumber,
  vector,
  title,
  subVectorsDescription,
  headerColorClass,
  badgeClass,
  records,
  commits,
  onSelectRecord,
  onResetFilters,
}) => {
  const metrics = getVectorMetrics(vector, records, commits);

  return (
    <div className="p-3.5 flex flex-col min-h-[520px]">
      {/* High Density Column Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <h2 className={`text-xs font-bold uppercase tracking-tight font-mono-code ${headerColorClass}`}>
            Vector {vectorNumber}: {title}
          </h2>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono-code ${badgeClass}`}>
          {records.length} {records.length === 1 ? 'RECORD' : 'RECORDS'}
        </span>
      </div>

      <p className="text-[10px] text-slate-400 font-mono-code mb-3 truncate" title={subVectorsDescription}>
        {subVectorsDescription}
      </p>

      {/* Metric Cards & Automated Drift Indicators */}
      <VectorMetricCards vector={vector} metrics={metrics} />

      {/* Column Record Cards Header */}
      <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400 mb-2 px-0.5">
        <span className="uppercase tracking-wider font-semibold">Accessioned Operational Records</span>
      </div>

      {/* Column Record Cards */}
      <div className="space-y-3 flex-1 flex flex-col">
        {records.length === 0 ? (
          /* High Density Zero-State Card */
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 border-dashed text-center my-auto">
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-2">
              <SearchX className="h-4 w-4" />
            </div>
            <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider mb-1">
              Zero Operational Deltas
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-3 font-mono-code leading-relaxed">
              No verifiable document changes or engineering updates have been accessioned into Vector {vectorNumber} under current filters.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={onResetFilters}
                className="px-2.5 py-1 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono-code border border-slate-700 transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onSelect={() => onSelectRecord(record)}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface RecordCardProps {
  record: OperationalDeltaRecord;
  onSelect: () => void;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, onSelect }) => {
  const isRejected = record.prNoiseFilter.verificationStatus === 'REJECTED_PR_CHATTER';
  const isVerified = record.prNoiseFilter.verificationStatus === 'VERIFIED_DELTA';

  return (
    <div
      onClick={onSelect}
      className={`bg-slate-900/70 border border-slate-800 rounded-lg p-3 hover:border-blue-500/60 hover:bg-slate-800/40 transition group cursor-pointer shadow-sm ${
        isRejected ? 'bg-rose-950/10 border-rose-900/40 hover:border-rose-700/60' : ''
      }`}
    >
      {/* Top Meta: Sub-Vector Tag & Verification Status */}
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wide truncate max-w-[180px]">
          {record.subVector}
        </span>
        {isVerified ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-mono-code flex items-center gap-1">
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
            VERIFIED DELTA
          </span>
        ) : isRejected ? (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 font-mono-code flex items-center gap-1">
            <ShieldAlert className="h-2.5 w-2.5 text-rose-400" />
            NOISE PURGED
          </span>
        ) : (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono-code flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
            PENDING
          </span>
        )}
      </div>

      {/* Card Operational Headline */}
      <h3 className="text-xs font-bold text-slate-100 mb-2 leading-snug group-hover:text-blue-300 transition font-mono-code line-clamp-2">
        {record.headline}
      </h3>

      {/* Operational Delta Summary */}
      <div className="text-[11px] text-slate-300 leading-relaxed font-sans mb-3 bg-slate-950/40 p-2 rounded border border-slate-800/60">
        <p className="line-clamp-2">
          {record.verifiableDelta}
        </p>
      </div>

      {/* Key Telemetry & Quantitative Metrics */}
      {record.keyMetrics && record.keyMetrics.length > 0 && (
        <div className="mb-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {record.keyMetrics.map((metric, idx) => (
              <div 
                key={idx}
                className="bg-slate-950/80 border border-slate-800/90 rounded px-2 py-1 flex flex-col"
              >
                <span className="text-[9px] font-mono-code text-slate-400 truncate uppercase">
                  {metric.label}
                </span>
                <span className="text-[11px] font-mono-code font-bold text-slate-100 truncate">
                  {metric.value} {metric.unit ? <span className="text-[9px] text-slate-400 font-normal">{metric.unit}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Milestone / Critical Path */}
      {record.nextMilestone && record.nextMilestone.targetDate !== 'N/A' && (
        <div className="mb-2.5 flex items-center justify-between text-[10px] font-mono-code bg-blue-950/20 border border-blue-900/30 rounded px-2 py-1 text-slate-300">
          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="h-3 w-3 text-blue-400 shrink-0" />
            <span className="truncate">{record.nextMilestone.title}</span>
          </div>
          <span className="text-blue-300 font-bold ml-1 shrink-0">
            {record.nextMilestone.targetDate}
          </span>
        </div>
      )}

      {/* Verifiable Provenance Footer */}
      <div className="pt-2 border-t border-slate-800/60 text-[10px] font-mono-code text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate max-w-[210px]">
            {record.sourceProvenance.sourcePublisher ? (
              <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold text-[9px] truncate">
                {record.sourceProvenance.sourcePublisher}
              </span>
            ) : (
              <span className="truncate text-slate-400">
                {record.sourceProvenance.documentRef}
              </span>
            )}
          </div>

          {record.sourceProvenance.externalUrl && (
            <a
              href={record.sourceProvenance.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[9px] text-cyan-400 hover:text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-900/40 transition shrink-0"
              title="Open verified external source"
            >
              <span>Source</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        <div className="flex items-center justify-between text-[9px] text-slate-500">
          <div className="flex items-center gap-1 truncate max-w-[190px]">
            <FileText className="h-2.5 w-2.5 text-slate-500 shrink-0" />
            <span className="truncate" title={record.sourceProvenance.filePath}>
              {record.sourceProvenance.filePath}
            </span>
          </div>
          <div className="flex items-center gap-1 text-blue-400 font-semibold shrink-0">
            <span>{record.sourceProvenance.commitHash ? record.sourceProvenance.commitHash.slice(0, 7) : 'git'}</span>
            <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>
      </div>
    </div>
  );
};
