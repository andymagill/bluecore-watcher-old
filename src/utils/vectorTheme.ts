import { Cpu, Scale, TrendingUp, HelpCircle, LucideIcon } from 'lucide-react';
import { OperationalVector } from '../types';

export interface VectorTheme {
  vector: OperationalVector;
  label: string;
  icon: LucideIcon;
  /** e.g. "text-blue-400" — column headers, folder icons, filter-tab accents. */
  accentText: string;
  /** e.g. "border-blue-500/50" — the sidebar evidence-log left border accent. */
  accentBorder: string;
  /** e.g. "bg-blue-400" — small status dots. */
  accentDot: string;
  /** Badge combo used by ModularGridView's per-column record-count pill. */
  columnBadge: string;
  /** Badge combo used by DeltaDetailModal / EvidenceTimeline vector tags. */
  detailBadge: string;
  /** Badge combo used by the sidebar's selected-folder state. */
  sidebarSelected: string;
  /** e.g. "hover:text-blue-300" — sidebar file-tree row hover accent. */
  hoverText: string;
}

const THEMES: Record<OperationalVector, VectorTheme> = {
  TECHNICAL_EVOLUTION: {
    vector: 'TECHNICAL_EVOLUTION',
    label: 'Technical Evolution',
    icon: Cpu,
    accentText: 'text-blue-400',
    accentBorder: 'border-blue-500/50',
    accentDot: 'bg-blue-400',
    columnBadge: 'bg-blue-900/40 text-blue-300 border-blue-800/60',
    detailBadge: 'text-blue-300 bg-blue-950/80 border-blue-800',
    sidebarSelected: 'bg-blue-950/80 text-blue-300 border border-blue-800/60',
    hoverText: 'hover:text-blue-300',
  },
  REGULATORY_PATHWAYS: {
    vector: 'REGULATORY_PATHWAYS',
    label: 'Regulatory Pathways',
    icon: Scale,
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-500/50',
    accentDot: 'bg-emerald-400',
    columnBadge: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/60',
    detailBadge: 'text-emerald-300 bg-emerald-950/80 border-emerald-800',
    sidebarSelected: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60',
    hoverText: 'hover:text-emerald-300',
  },
  ECOSYSTEM_MOMENTUM: {
    vector: 'ECOSYSTEM_MOMENTUM',
    label: 'Ecosystem Momentum',
    icon: TrendingUp,
    accentText: 'text-purple-400',
    accentBorder: 'border-purple-500/50',
    accentDot: 'bg-purple-400',
    columnBadge: 'bg-purple-900/40 text-purple-300 border-purple-800/60',
    detailBadge: 'text-purple-300 bg-purple-950/80 border-purple-800',
    sidebarSelected: 'bg-purple-950/80 text-purple-300 border border-purple-800/60',
    hoverText: 'hover:text-purple-300',
  },
};

/** Neutral theme for a vector tag outside the three known values (e.g. malformed imported state). */
const UNKNOWN_THEME: VectorTheme = {
  vector: 'TECHNICAL_EVOLUTION',
  label: 'Unclassified',
  icon: HelpCircle,
  accentText: 'text-slate-400',
  accentBorder: 'border-slate-500/50',
  accentDot: 'bg-slate-400',
  columnBadge: 'bg-slate-900/40 text-slate-300 border-slate-800/60',
  detailBadge: 'text-slate-300 bg-slate-950/80 border-slate-800',
  sidebarSelected: 'bg-slate-950/80 text-slate-300 border border-slate-800/60',
  hoverText: 'hover:text-slate-300',
};

/**
 * Resolves the presentation theme for an operational vector.
 *
 * Falls back to a neutral "Unclassified" theme instead of throwing on an unrecognized tag —
 * previously each of the four call sites did its own inline `{ ... }[vector]` object literal
 * lookup with no fallback, so a vector tag from imported or malformed state (see
 * `parseStateLog`) crashed on `.icon` access deep in JSX.
 */
export function getVectorTheme(vector: OperationalVector): VectorTheme {
  return THEMES[vector] ?? UNKNOWN_THEME;
}
