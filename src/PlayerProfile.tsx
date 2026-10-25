import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Zap, TrendingUp, Clock, Scale, Calendar, Trophy,
  FileText, Plus, Trash2, Edit3, ShieldCheck, Sparkles, Printer,
  Activity, X, ChevronRight, ChevronLeft, Target, Award, User,
  CheckCircle2, AlertTriangle, ArrowUpRight, BarChart3, Layers
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from './context/DataContext';
import AppLogo from './AppLogo';
import MotionGraphicVideoModal from './components/MotionGraphicVideoModal';
import { classifyGCT, calculateElasticityQuadrant, calculateCNSReadiness } from './useJumpMechanics';
import type { JumpMeasurement } from './types/athletics';

interface PlayerProfileProps {
  onEditPlayer?: (player: any) => void;
  onNavigateTab?: (tab: string) => void;
}

export default function PlayerProfile({ onEditPlayer, onNavigateTab }: PlayerProfileProps) {
  const {
    activePlayer,
    playerHistory,
    deleteMeasurement,
    updateMeasurement,
    language,
    t,
  } = useData();

  const isEn = language === 'en';

  // Sub-tabs in Bento Main Visualizer
  const [activeVisualizerTab, setActiveVisualizerTab] = useState<'progression' | 'elasticity' | 'strength' | 'radar'>('progression');
  
  // History Filter & Edit States
  const [historyFilter, setHistoryFilter] = useState<'all' | 'cmj' | 'rsi' | 'strength'>('all');
  const [editingRecord, setEditingRecord] = useState<JumpMeasurement | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);

  // Export / Print Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [includeStrengthInPrint, setIncludeStrengthInPrint] = useState(true);
  const [isMotionVideoOpen, setIsMotionVideoOpen] = useState(false);

  if (!activePlayer) {
    return (
      <div className="bento-card p-12 text-center text-zinc-400 space-y-4 max-w-xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-[#D4FF00]">
          <User size={32} />
        </div>
        <h3 className="text-xl font-heading font-bold text-white">
          {t.profile.noAthleteTitle}
        </h3>
        <p className="text-sm text-zinc-400 max-w-sm mx-auto">
          {t.profile.noAthleteDesc}
        </p>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('team')}
            className="btn-volt px-5 py-2.5 rounded-xl text-xs font-bold mt-2"
          >
            {t.roster.title}
          </button>
        )}
      </div>
    );
  }

  // Anthropometrics
  const mass = parseFloat(String(activePlayer.weight_kg)) || 72;
  const playerHeight = parseFloat(String(activePlayer.height_cm)) || 178;
  const standingReach = parseFloat(String(activePlayer.standing_reach_cm)) || Math.round(playerHeight * 1.32);
  const legLengthM = parseFloat(String(activePlayer.leg_length_m)) || 1.0;

  // Accurate dynamic age calculation
  const age = useMemo(() => {
    if (activePlayer.birth_year) {
      return Math.max(1, new Date().getFullYear() - Number(activePlayer.birth_year));
    }
    return 20;
  }, [activePlayer]);

  const isFemale = activePlayer.gender === 'female';

  // Jump and Strength Segregations
  const cmjJumps = useMemo(() => playerHistory.filter(h => h.test_type === 'cmj' || h.test_type === 'cmj_arms'), [playerHistory]);
  const cmjNoArmsJumps = useMemo(() => playerHistory.filter(h => h.test_type === 'cmj_no_arms'), [playerHistory]);
  const sjNoArmsJumps = useMemo(() => playerHistory.filter(h => h.test_type === 'sj_no_arms'), [playerHistory]);
  const rsiJumps = useMemo(() => playerHistory.filter(h => h.test_type === 'rsi'), [playerHistory]);
  const approachJumps = useMemo(() => playerHistory.filter(h => h.test_type === 'approach' || h.test_type === 'approach_jump'), [playerHistory]);
  
  const fullSquatRecords = useMemo(() => playerHistory.filter(h => h.test_type === 'full_squat'), [playerHistory]);
  const benchPressRecords = useMemo(() => playerHistory.filter(h => h.test_type === 'bench_press'), [playerHistory]);
  const powerCleanRecords = useMemo(() => playerHistory.filter(h => h.test_type === 'power_clean' || (parseFloat(String(h.clean_weight_kg)) > 0 && h.test_type !== 'full_squat' && h.test_type !== 'bench_press')), [playerHistory]);

  // Peak Jump & Strength Records
  const maxCmj = useMemo(() => cmjJumps.length > 0 ? Math.max(...cmjJumps.map(j => parseFloat(String(j.jump_height_cm)) || 0)) : 0, [cmjJumps]);
  const maxCmjNoArms = useMemo(() => cmjNoArmsJumps.length > 0 ? Math.max(...cmjNoArmsJumps.map(j => parseFloat(String(j.jump_height_cm)) || 0)) : 0, [cmjNoArmsJumps]);
  const maxSjNoArms = useMemo(() => sjNoArmsJumps.length > 0 ? Math.max(...sjNoArmsJumps.map(j => parseFloat(String(j.jump_height_cm)) || 0)) : 0, [sjNoArmsJumps]);
  const maxApproach = useMemo(() => approachJumps.length > 0 ? Math.max(...approachJumps.map(j => parseFloat(String(j.jump_height_cm)) || 0)) : 0, [approachJumps]);

  const maxFullSquat = useMemo(() => fullSquatRecords.length > 0 ? Math.max(...fullSquatRecords.map(j => parseFloat(String(j.clean_weight_kg)) || 0)) : 0, [fullSquatRecords]);
  const maxBenchPress = useMemo(() => benchPressRecords.length > 0 ? Math.max(...benchPressRecords.map(j => parseFloat(String(j.clean_weight_kg)) || 0)) : 0, [benchPressRecords]);
  const maxPowerClean = useMemo(() => powerCleanRecords.length > 0 ? Math.max(...powerCleanRecords.map(j => parseFloat(String(j.clean_weight_kg)) || 0)) : 0, [powerCleanRecords]);

  // Overall Peak Jump Height
  const peakHeightCm = maxCmj > 0 ? maxCmj : (maxCmjNoArms > 0 ? maxCmjNoArms : (maxSjNoArms > 0 ? maxSjNoArms : 0));
  const peakHeightInches = (peakHeightCm * 0.393701).toFixed(1);

  // Peak RSI and Contact Time
  const latestRsiRecord = rsiJumps.length > 0 ? rsiJumps[rsiJumps.length - 1] : null;
  const maxRsi = useMemo(() => rsiJumps.length > 0 ? Math.max(...rsiJumps.map(j => parseFloat(String(j.rsi_score)) || 0)) : 0, [rsiJumps]);
  const latestGctSec = latestRsiRecord?.contact_time_sec ? parseFloat(String(latestRsiRecord.contact_time_sec)) : 0;
  const gctAnalysis = classifyGCT(latestGctSec);

  // Biomechanics Ratios (EUR & Quadrant)
  const eur = maxSjNoArms > 0 && maxCmjNoArms > 0 ? (maxCmjNoArms / maxSjNoArms) : (maxSjNoArms > 0 && maxCmj > 0 ? (maxCmj / maxSjNoArms) : 0);
  const elasticityQuadrant = calculateElasticityQuadrant(maxCmj, maxSjNoArms, maxRsi > 0 ? maxRsi * 20 : 0);

  // CNS Readiness (14-day rolling baseline comparison)
  const baselineCmjHistory = cmjJumps.map(j => parseFloat(String(j.jump_height_cm)) || 0);
  const latestCmjVal = cmjJumps.length > 0 ? parseFloat(String(cmjJumps[cmjJumps.length - 1].jump_height_cm)) || 0 : maxCmj;
  const cnsReadiness = calculateCNSReadiness(latestCmjVal, baselineCmjHistory);

  // Power Calculation (Sayers Peak)
  const sayersPeak = peakHeightCm > 0 ? (61.9 * peakHeightCm + 36.0 * mass - 1822) : 0;
  const relativePower = mass > 0 && sayersPeak > 0 ? (sayersPeak / mass) : 0;

  // Touch Reach & Projections
  const totalTouchReachCm = standingReach + Math.max(peakHeightCm, maxApproach);
  const vballNetHeightCm = isFemale ? 224 : 243;
  const vballClearanceCm = totalTouchReachCm - vballNetHeightCm;
  const dunkMarginCm = totalTouchReachCm - 315;
  const rimMarginCm = totalTouchReachCm - 305;

  // Progression Chart Dataset
  const chartData = useMemo(() => {
    return playerHistory
      .filter(h => parseFloat(String(h.jump_height_cm)) > 0)
      .map((h, i) => {
        const height = parseFloat(String(h.jump_height_cm)) || 0;
        const pwr = parseFloat(String(h.peak_power_watts)) || (61.9 * height + 36.0 * mass - 1822);
        return {
          session: `${i + 1}`,
          date: h.created_at ? String(h.created_at).substring(5, 10) : `#${i + 1}`,
          height: Number(height.toFixed(1)),
          power: Math.round(pwr),
          testType: String(h.test_type || 'cmj').toUpperCase(),
        };
      });
  }, [playerHistory, mass]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'cmj') {
      return playerHistory.filter(h => h.test_type === 'cmj' || h.test_type === 'cmj_arms' || h.test_type === 'cmj_no_arms' || h.test_type === 'sj_no_arms' || h.test_type === 'approach');
    }
    if (historyFilter === 'rsi') {
      return playerHistory.filter(h => h.test_type === 'rsi');
    }
    if (historyFilter === 'strength') {
      return playerHistory.filter(h => h.test_type === 'full_squat' || h.test_type === 'bench_press' || h.test_type === 'power_clean' || parseFloat(String(h.clean_weight_kg)) > 0);
    }
    return playerHistory;
  }, [playerHistory, historyFilter]);

  // Handle Record Delete (Instant Sync)
  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm(t.profile.deleteRecordConfirm)) return;
    await deleteMeasurement(id);
  };

  // Handle Record Edit Save (Instant Sync)
  const handleSaveEditRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsEditSaving(true);
    try {
      await updateMeasurement(editingRecord.id, {
        jump_height_cm: editingRecord.jump_height_cm,
        rsi_score: editingRecord.rsi_score,
        contact_time_sec: editingRecord.contact_time_sec,
        clean_weight_kg: editingRecord.clean_weight_kg,
        reps_count: editingRecord.reps_count,
        week_number: editingRecord.week_number,
        notes: editingRecord.notes,
      });
      setEditingRecord(null);
    } finally {
      setIsEditSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* =========================================================================
          HERO ATHLETE BANNER (BENTO INDUSTRIAL HEADER)
      ========================================================================= */}
      <section className="bento-card relative bg-[#121215] border border-[#27272A] p-6 lg:p-8 rounded-3xl overflow-hidden shadow-2xl">
        {/* Subtle Diagonal Technical Pattern Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(#D4FF0008_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Athlete Identity */}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-[#D4FF00] text-[#09090B] font-mono font-black text-3xl flex items-center justify-center shadow-[0_0_25px_rgba(212,255,0,0.35)] shrink-0 select-none">
              {activePlayer.full_name ? activePlayer.full_name.charAt(0).toUpperCase() : 'A'}
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl lg:text-3xl font-heading font-black text-white tracking-tight">
                  {activePlayer.full_name}
                </h1>
                <span className="badge-volt text-[10px] font-mono font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {activePlayer.gender === 'female' ? t.common.female : t.common.male} • {age} {t.common.years || 'yrs'}
                </span>
                {activePlayer.is_favorite && (
                  <span className="badge-blaze text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                    ★ FAVORITE
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                {t.profile.athleteDossier} • ID: <span className="font-mono text-zinc-300">{String(activePlayer.id).slice(0, 8)}</span>
              </p>

              {/* Anthropometrics Quick Pills */}
              <div className="flex items-center gap-2 mt-3 flex-wrap font-mono text-xs">
                <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1 rounded-lg">
                  <strong className="text-zinc-400">{t.profile.massKg}</strong> {mass} kg
                </span>
                <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1 rounded-lg">
                  <strong className="text-zinc-400">{t.profile.statureCm}</strong> {playerHeight} cm
                </span>
                <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1 rounded-lg">
                  <strong className="text-zinc-400">{t.profile.reachCm}</strong> {standingReach} cm
                </span>
                <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1 rounded-lg">
                  <strong className="text-zinc-400">{t.profile.legLengthM}</strong> {legLengthM} m
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsMotionVideoOpen(true)}
              className="btn-volt px-4 py-2.5 text-xs rounded-xl shadow-lg"
              title={t.profile.exportCard}
            >
              <Sparkles size={15} />
              <span>{t.profile.exportCard}</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title={t.profile.printReportTitle}
            >
              <Printer size={15} />
              <span className="hidden sm:inline">{t.common.print}</span>
            </button>

            {onEditPlayer && (
              <button
                onClick={() => onEditPlayer(activePlayer)}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title={t.profile.editAthlete}
              >
                <Edit3 size={15} />
                <span className="hidden sm:inline">{t.common.edit}</span>
              </button>
            )}

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('manual')}
                className="bg-[#FF5500] hover:bg-[#ff6a1f] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                title={t.profile.newTest}
              >
                <Plus size={15} />
                <span>{t.profile.newTest}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          ROW 1: 4 HIGH-IMPACT BENTO KPI TILES (ACID VOLT MONOSPACE READOUTS)
      ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Peak CMJ Height */}
        <div className="bento-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Activity size={14} className="text-[#D4FF00]" />
              {t.profile.peakCmj}
            </span>
            <span className="badge-volt text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
              {peakHeightInches} in
            </span>
          </div>

          <div className="my-2">
            <div className="text-4xl lg:text-5xl font-mono font-black text-[#D4FF00] tracking-tight tabular-nums">
              {peakHeightCm > 0 ? peakHeightCm.toFixed(1) : '—'}
              <span className="text-sm font-sans text-zinc-400 font-bold ml-1.5">cm</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-1">
              Approach PR: <strong className="text-white">{maxApproach > 0 ? `${maxApproach.toFixed(1)} cm` : '—'}</strong>
            </p>
          </div>

          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-[#D4FF00] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(15, (peakHeightCm / 80) * 100))}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Peak RSI (Reactive Strength Index) */}
        <div className="bento-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-[#D4FF00]" />
              {t.profile.peakRsi}
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              gctAnalysis.classification === 'Fast SSC' ? 'badge-volt' : gctAnalysis.classification === 'Moderate SSC' ? 'badge-amber' : 'badge-rose'
            }`}>
              {gctAnalysis.classification}
            </span>
          </div>

          <div className="my-2">
            <div className="text-4xl lg:text-5xl font-mono font-black text-[#D4FF00] tracking-tight tabular-nums">
              {maxRsi > 0 ? maxRsi.toFixed(2) : '—'}
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-1">
              {t.profile.contactTime}: <strong className="text-white">{latestGctSec > 0 ? `${(latestGctSec * 1000).toFixed(0)} ms` : '—'}</strong>
            </p>
          </div>

          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-[#D4FF00] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(15, (maxRsi / 3.2) * 100))}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Force-Velocity Profile Status (Samozino) */}
        <div className="bento-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <BarChart3 size={14} className="text-[#FF5500]" />
              {t.profile.fvpStatus}
            </span>
            <span className="badge-blaze text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
              SAMOZINO
            </span>
          </div>

          <div className="my-2">
            <div className="text-xl lg:text-2xl font-mono font-black text-white tracking-tight">
              {eur > 1.15 ? t.profile.elasticDominant : eur < 1.05 && eur > 0 ? t.profile.strengthDominant : t.profile.wellBalanced}
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-1">
              EUR Ratio: <strong className="text-[#D4FF00]">{eur > 0 ? eur.toFixed(2) : '—'}</strong>
            </p>
          </div>

          <div className="text-[10px] text-zinc-400 font-sans border-t border-zinc-800/80 pt-2 mt-2 truncate">
            {eur > 1.15 ? t.profile.velocityDeficit : eur < 1.05 && eur > 0 ? t.profile.forceDeficit : t.profile.balancedProfile}
          </div>
        </div>

        {/* KPI 4: CNS Readiness & Fatigue Monitor */}
        <div className="bento-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className={cnsReadiness.status === 'optimal' ? 'text-[#10B981]' : cnsReadiness.status === 'moderate_fatigue' ? 'text-[#F59E0B]' : 'text-[#F43F5E]'} />
              {t.profile.cnsReadiness}
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              cnsReadiness.status === 'optimal' ? 'badge-emerald' : cnsReadiness.status === 'moderate_fatigue' ? 'badge-amber' : 'badge-rose'
            }`}>
              {cnsReadiness.status === 'optimal' ? t.profile.optimalReadiness : cnsReadiness.status === 'moderate_fatigue' ? t.profile.moderateFatigue : t.profile.highFatigue}
            </span>
          </div>

          <div className="my-2">
            <div className={`text-4xl lg:text-5xl font-mono font-black tracking-tight tabular-nums ${
              cnsReadiness.status === 'optimal' ? 'text-[#10B981]' : cnsReadiness.status === 'moderate_fatigue' ? 'text-[#F59E0B]' : 'text-[#F43F5E]'
            }`}>
              {cnsReadiness.score}%
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-1">
              Drop vs 14d Baseline: <strong className="text-white">{cnsReadiness.dropPercent > 0 ? `-${cnsReadiness.dropPercent}%` : '0%'}</strong>
            </p>
          </div>

          <div className="text-[10px] text-zinc-400 font-sans border-t border-zinc-800/80 pt-2 mt-2 truncate">
            {cnsReadiness.advice}
          </div>
        </div>
      </section>

      {/* =========================================================================
          ROW 2: ASYMMETRIC 2-COLUMN SPLIT (8 COLS MAIN VISUALIZER / 4 COLS SIDEBAR)
      ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* MAIN COLUMN (8 cols): Tabbed Telemetry Visualizer */}
        <div className="lg:col-span-8 bento-card p-6 flex flex-col gap-6">
          
          {/* Sub-Tabs Navigation Rail */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveVisualizerTab('progression')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeVisualizerTab === 'progression'
                    ? 'bg-[#D4FF00] text-[#09090B] shadow-sm font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <TrendingUp size={14} />
                <span>{t.profile.progressionTab}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveVisualizerTab('elasticity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeVisualizerTab === 'elasticity'
                    ? 'bg-[#D4FF00] text-[#09090B] shadow-sm font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Zap size={14} />
                <span>{t.profile.elasticityTab}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveVisualizerTab('strength')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeVisualizerTab === 'strength'
                    ? 'bg-[#D4FF00] text-[#09090B] shadow-sm font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers size={14} />
                <span>{t.profile.strengthTab}</span>
              </button>
            </div>

            <span className="text-[11px] font-mono text-zinc-500 font-bold">
              {playerHistory.length} Total Sessions
            </span>
          </div>

          {/* TAB 1: PROGRESSION CHART */}
          {activeVisualizerTab === 'progression' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-heading">
                    {t.profile.jumpHeightTrend}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Chronological progression across testing sessions
                  </p>
                </div>
                <div className="text-xs font-mono text-[#D4FF00] font-bold">
                  Peak: {peakHeightCm.toFixed(1)} cm
                </div>
              </div>

              {chartData.length > 1 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="voltArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4FF00" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#D4FF00" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis dataKey="date" stroke="#71717A" fontSize={11} tickLine={false} />
                      <YAxis stroke="#71717A" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#121215',
                          borderColor: '#27272A',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="height"
                        stroke="#D4FF00"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#voltArea)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-center text-xs text-zinc-500 font-mono">
                  {t.common.noData} (Requires at least 2 sessions to render progression trend)
                </div>
              )}

              {/* Power Metrics Quick Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-800 font-mono text-xs">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Sayers Peak Power</span>
                  <span className="text-white font-bold text-sm">{Math.round(sayersPeak)} W</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Relative Power</span>
                  <span className="text-[#D4FF00] font-bold text-sm">{relativePower.toFixed(1)} W/kg</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 col-span-2 sm:col-span-1">
                  <span className="text-zinc-500 block text-[10px]">Approach Advantage</span>
                  <span className="text-[#FF5500] font-bold text-sm">
                    {maxApproach > peakHeightCm ? `+${(maxApproach - peakHeightCm).toFixed(1)} cm` : '0 cm'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ELASTICITY VS STRENGTH (EUR QUADRANT) */}
          {activeVisualizerTab === 'elasticity' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white font-heading">
                  {t.profile.eurTitle}
                </h3>
                <p className="text-xs text-zinc-400">
                  {t.profile.eurFormula}
                </p>
              </div>

              {/* 4 Quadrants Interactive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                <div className={`p-4 rounded-2xl border transition-all ${
                  eur > 1.15
                    ? 'bg-[#D4FF00]/10 border-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.15)]'
                    : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{t.profile.elasticDominant}</span>
                    <span className="badge-volt text-[10px] font-mono px-2 py-0.5 rounded">EUR &gt; 1.15</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    High tendon compliance and stretch recoil. Athlete needs heavy slow resistance (F0) to balance strength.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${
                  eur < 1.05 && eur > 0
                    ? 'bg-[#FF5500]/10 border-[#FF5500] shadow-[0_0_15px_rgba(255,85,0,0.15)]'
                    : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{t.profile.strengthDominant}</span>
                    <span className="badge-blaze text-[10px] font-mono px-2 py-0.5 rounded">EUR &lt; 1.05</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    High contractile muscular force but deficient stretch-shortening recoil. Athlete needs elastic plyometrics.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${
                  eur >= 1.05 && eur <= 1.15
                    ? 'bg-[#10B981]/10 border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{t.profile.wellBalanced}</span>
                    <span className="badge-emerald text-[10px] font-mono px-2 py-0.5 rounded">EUR 1.08 - 1.15</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Optimal harmony between muscle cross-sectional force and tendon stiffness recoil.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${
                  eur === 0
                    ? 'bg-zinc-800/40 border-zinc-700'
                    : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{t.profile.generalDeficit}</span>
                    <span className="text-[10px] font-mono text-zinc-500">Uncalibrated</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Log both CMJ (no arms) and Squat Jump (SJ) tests to calculate full elasticity profile.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STRENGTH 1RM BENCHMARKS */}
          {activeVisualizerTab === 'strength' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-heading">
                    {t.profile.strength1rmTitle}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Maximal absolute and relative strength benchmarks
                  </p>
                </div>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('manual')}
                    className="btn-volt px-3 py-1 text-xs rounded-lg font-bold"
                  >
                    + Log 1RM
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bento-card bg-zinc-900/60 p-4 border border-zinc-800">
                  <span className="text-xs font-bold text-zinc-400 block mb-1">
                    {t.profile.fullSquat1rm}
                  </span>
                  <div className="text-3xl font-mono font-black text-[#D4FF00]">
                    {maxFullSquat > 0 ? `${maxFullSquat} kg` : '—'}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 mt-1 block">
                    {t.profile.bwRatio} <strong className="text-white">{maxFullSquat > 0 ? `${(maxFullSquat / mass).toFixed(2)}x` : '—'}</strong>
                  </span>
                </div>

                <div className="bento-card bg-zinc-900/60 p-4 border border-zinc-800">
                  <span className="text-xs font-bold text-zinc-400 block mb-1">
                    {t.profile.benchPress1rm}
                  </span>
                  <div className="text-3xl font-mono font-black text-[#D4FF00]">
                    {maxBenchPress > 0 ? `${maxBenchPress} kg` : '—'}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 mt-1 block">
                    {t.profile.bwRatio} <strong className="text-white">{maxBenchPress > 0 ? `${(maxBenchPress / mass).toFixed(2)}x` : '—'}</strong>
                  </span>
                </div>

                <div className="bento-card bg-zinc-900/60 p-4 border border-zinc-800">
                  <span className="text-xs font-bold text-zinc-400 block mb-1">
                    {t.profile.powerClean1rm}
                  </span>
                  <div className="text-3xl font-mono font-black text-[#D4FF00]">
                    {maxPowerClean > 0 ? `${maxPowerClean} kg` : '—'}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 mt-1 block">
                    {t.profile.bwRatio} <strong className="text-white">{maxPowerClean > 0 ? `${(maxPowerClean / mass).toFixed(2)}x` : '—'}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR COLUMN (4 cols): Capacity Radar & Sport Margins */}
        <div className="lg:col-span-4 bento-card p-6 flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-bold text-white font-heading">
              {t.profile.radarTitle}
            </h3>
            <p className="text-xs text-zinc-400">
              Vertical reach projections and sport-specific margins
            </p>
          </div>

          {/* Reach Totals */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 font-mono">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Total Touch Reach:</span>
              <span className="text-lg font-bold text-white">{totalTouchReachCm} cm</span>
            </div>
            <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
              <div
                className="bg-[#D4FF00] h-full rounded-full"
                style={{ width: `${Math.min(100, (totalTouchReachCm / 360) * 100)}%` }}
              />
            </div>
          </div>

          {/* Volleyball & Basketball Specific Telemetry */}
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-zinc-400 block">{t.profile.volleyballClearance}</span>
                <span className="text-[10px] text-zinc-500">Net: {vballNetHeightCm} cm</span>
              </div>
              <span className={`font-bold text-sm ${vballClearanceCm >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                {vballClearanceCm >= 0 ? `+${vballClearanceCm} cm` : `${vballClearanceCm} cm`}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-zinc-400 block">{t.profile.dunkMargin}</span>
                <span className="text-[10px] text-zinc-500">Dunk Target: 315 cm</span>
              </div>
              <span className={`font-bold text-sm ${dunkMarginCm >= 0 ? 'text-[#D4FF00]' : 'text-[#F43F5E]'}`}>
                {dunkMarginCm >= 0 ? `+${dunkMarginCm} cm` : `${dunkMarginCm} cm`}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-zinc-400 block">{t.profile.rimMargin}</span>
                <span className="text-[10px] text-zinc-500">Rim Height: 305 cm</span>
              </div>
              <span className={`font-bold text-sm ${rimMarginCm >= 0 ? 'text-[#10B981]' : 'text-zinc-500'}`}>
                {rimMarginCm >= 0 ? `+${rimMarginCm} cm` : `${rimMarginCm} cm`}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ROW 3: MODERNIZED TEST HISTORY & SESSION LOG (FILTERABLE BENTO TABLE)
      ========================================================================= */}
      <section className="bento-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-white font-heading">
              {t.profile.testHistoryTitle}
            </h3>
            <p className="text-xs text-zinc-400">
              Filterable session history with real-time editing and deletion
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
            <button
              onClick={() => setHistoryFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${historyFilter === 'all' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.profile.filterAll}
            </button>
            <button
              onClick={() => setHistoryFilter('cmj')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${historyFilter === 'cmj' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.profile.filterCmj}
            </button>
            <button
              onClick={() => setHistoryFilter('rsi')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${historyFilter === 'rsi' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.profile.filterRsi}
            </button>
            <button
              onClick={() => setHistoryFilter('strength')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${historyFilter === 'strength' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.profile.filterStrength}
            </button>
          </div>
        </div>

        {/* History Table */}
        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="py-3 px-3">{t.profile.testTypeCol}</th>
                  <th className="py-3 px-3">{t.profile.scoreCol}</th>
                  <th className="py-3 px-3">{t.profile.contactTimeCol}</th>
                  <th className="py-3 px-3">{t.profile.powerCol}</th>
                  <th className="py-3 px-3">{t.profile.dateCol}</th>
                  <th className="py-3 px-3 text-right rtl:text-left">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {filteredHistory.slice().reverse().map((record) => {
                  const isPr = (parseFloat(String(record.jump_height_cm)) === peakHeightCm && peakHeightCm > 0) ||
                               (parseFloat(String(record.rsi_score)) === maxRsi && maxRsi > 0);

                  const gctVal = record.contact_time_sec ? parseFloat(String(record.contact_time_sec)) : 0;
                  const recordGctInfo = classifyGCT(gctVal);

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-zinc-900/60 transition-colors ${isPr ? 'bg-[#D4FF00]/5' : ''}`}
                    >
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <span className="uppercase">{record.test_type}</span>
                        {isPr && (
                          <span className="badge-blaze text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                            PR
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#D4FF00] text-sm">
                        {record.jump_height_cm ? `${record.jump_height_cm} cm` : record.rsi_score ? record.rsi_score : record.clean_weight_kg ? `${record.clean_weight_kg} kg` : '—'}
                      </td>
                      <td className="py-3 px-3 text-zinc-300">
                        {gctVal > 0 ? (
                          <span className="flex items-center gap-1.5">
                            <span>{(gctVal * 1000).toFixed(0)} ms</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded ${
                              recordGctInfo.classification === 'Fast SSC' ? 'badge-volt' : recordGctInfo.classification === 'Moderate SSC' ? 'badge-amber' : 'badge-rose'
                            }`}>
                              {recordGctInfo.classification}
                            </span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-3 text-zinc-400">
                        {record.peak_power_watts ? `${record.peak_power_watts} W` : record.reps_count ? `${record.reps_count} reps` : '—'}
                      </td>
                      <td className="py-3 px-3 text-zinc-400 text-[11px]">
                        {record.created_at ? String(record.created_at).substring(0, 10) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right rtl:text-left">
                        <div className="flex items-center justify-end rtl:justify-start gap-1">
                          <button
                            onClick={() => setEditingRecord(record)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                            title={t.common.edit}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                            title={t.common.delete}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-500 font-mono">
            {t.common.noData}
          </div>
        )}
      </section>

      {/* =========================================================================
          EDIT RECORD MODAL
      ========================================================================= */}
      <AnimatePresence>
        {editingRecord && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bento-card bg-[#121215] border border-[#27272A] p-6 w-full max-w-md rounded-2xl shadow-2xl relative"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                <h3 className="font-heading font-bold text-white text-base">
                  {t.profile.editRecordTitle}
                </h3>
                <button
                  onClick={() => setEditingRecord(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditRecord} className="space-y-3 font-sans text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1 font-mono text-[11px]">{t.profile.scoreCol} (Jump Height cm / RSI / Weight kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.jump_height_cm || editingRecord.rsi_score || editingRecord.clean_weight_kg || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingRecord({
                        ...editingRecord,
                        jump_height_cm: val,
                        rsi_score: val,
                        clean_weight_kg: val,
                      });
                    }}
                    className="glass-input w-full font-mono text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-mono text-[11px]">{t.profile.contactTimeCol} (Contact Time in seconds, e.g. 0.180)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingRecord.contact_time_sec || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, contact_time_sec: e.target.value })}
                    className="glass-input w-full font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-mono text-[11px]">{t.common.notes}</label>
                  <textarea
                    value={editingRecord.notes || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                    className="glass-input w-full h-20 text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isEditSaving}
                    className="btn-volt flex-1 py-2.5 rounded-xl font-bold"
                  >
                    {isEditSaving ? t.common.saving : t.common.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          PRINT / PDF OPTIONS MODAL
      ========================================================================= */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bento-card bg-[#121215] border border-[#27272A] p-6 w-full max-w-md rounded-2xl shadow-2xl relative"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                <h3 className="font-heading font-bold text-white text-base">
                  {t.profile.printReportTitle}
                </h3>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStrengthInPrint}
                    onChange={(e) => setIncludeStrengthInPrint(e.target.checked)}
                    className="accent-[#D4FF00] w-4 h-4"
                  />
                  <div>
                    <span className="text-white font-bold block">{t.profile.includeStrengthOption}</span>
                    <span className="text-[11px] text-zinc-400">Full Squat, Bench Press, Power Clean</span>
                  </div>
                </label>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setIsPrintModalOpen(false);
                      window.print();
                    }}
                    className="btn-volt flex-1 py-2.5 rounded-xl font-bold"
                  >
                    {t.profile.generatePdf}
                  </button>
                  <button
                    onClick={() => setIsPrintModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MOTION GRAPHIC VIDEO MODAL (60 FPS CANVAS SOCIAL CARD)
      ========================================================================= */}
      {isMotionVideoOpen && (
        <MotionGraphicVideoModal
          player={activePlayer}
          stats={{
            heightCm: peakHeightCm > 0 ? peakHeightCm.toFixed(1) : '—',
            flightTime: '—',
            takeoffVelocity: '—',
            harmanPeakPower: sayersPeak.toFixed(0),
            meanPower: (sayersPeak * 0.48).toFixed(0),
            peakVelocity: '—',
            rsiScore: maxRsi > 0 ? maxRsi.toFixed(2) : '—',
          }}
          onClose={() => setIsMotionVideoOpen(false)}
        />
      )}
    </div>
  );
}
