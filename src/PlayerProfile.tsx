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
import { getPlayerAge } from './lib/utils';
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
  const [verticalSubFilter, setVerticalSubFilter] = useState<'all' | 'cmj_arms' | 'cmj_no_arms' | 'sj' | 'approach'>('all');
  const [editingRecord, setEditingRecord] = useState<JumpMeasurement | null>(null);
  const [editForm, setEditForm] = useState({
    id: '',
    test_type: 'cmj',
    created_at: '',
    jump_height_cm: '',
    flight_time_sec: '',
    contact_time_sec: '',
    rsi_score: '',
    box_height_cm: '',
    takeoff_velocity_ms: '',
    peak_power_watts: '',
    clean_weight_kg: '',
    reps_count: '1',
    week_number: '1',
    notes: '',
  });
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
    return getPlayerAge(activePlayer);
  }, [activePlayer]);

  const isFemale = activePlayer.gender === 'female';

  // Jump and Strength Segregations
  const cmjJumps = useMemo(() => playerHistory.filter(h => h.test_type === 'cmj' || h.test_type === 'cmj_arms' || h.test_type === 'standard'), [playerHistory]);
  const cmjNoArmsJumps = useMemo(() => playerHistory.filter(h => h.test_type === 'cmj_no_arms' || h.test_type === 'cmj_no_arm'), [playerHistory]);
  const sjNoArmsJumps = useMemo(() => playerHistory.filter(h => h.test_type === 'sj_no_arms' || h.test_type === 'sj' || h.test_type === 'sj_arms'), [playerHistory]);
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
  const bestRsiRecord = useMemo(() => {
    if (rsiJumps.length === 0) return null;
    return [...rsiJumps].sort((a, b) => (parseFloat(String(b.rsi_score)) || 0) - (parseFloat(String(a.rsi_score)) || 0))[0];
  }, [rsiJumps]);
  const latestRsiRecord = rsiJumps.length > 0 ? rsiJumps[rsiJumps.length - 1] : null;
  const maxRsi = useMemo(() => rsiJumps.length > 0 ? Math.max(...rsiJumps.map(j => parseFloat(String(j.rsi_score)) || 0)) : 0, [rsiJumps]);
  const rawGct = latestRsiRecord?.contact_time_sec || bestRsiRecord?.contact_time_sec;
  const gctNum = rawGct ? parseFloat(String(rawGct)) : 0;
  const gctMs = gctNum > 0 ? (gctNum >= 1 ? Math.round(gctNum) : Math.round(gctNum * 1000)) : 0;
  const gctSec = gctMs > 0 ? gctMs / 1000 : 0;
  const gctAnalysis = classifyGCT(gctSec);

  // Biomechanics Ratios (Arm Swing, EUR & Quadrant)
  const armSwingGain = maxCmj > 0 && maxCmjNoArms > 0 ? (((maxCmj - maxCmjNoArms) / maxCmjNoArms) * 100) : 0;
  // EUR is strictly defined as CMJ (No Arms) / Squat Jump (SJ) - both performed with hands on hips
  const eur = (maxSjNoArms > 0 && maxCmjNoArms > 0) ? (maxCmjNoArms / maxSjNoArms) : 0;
  const elasticityQuadrant = calculateElasticityQuadrant(maxCmjNoArms, maxSjNoArms, maxRsi > 0 ? maxRsi * 20 : 0);

  // CNS Readiness (14-day rolling baseline comparison)
  const baselineCmjHistory = cmjJumps.map(j => parseFloat(String(j.jump_height_cm)) || 0);
  const latestCmjVal = cmjJumps.length > 0 ? parseFloat(String(cmjJumps[cmjJumps.length - 1].jump_height_cm)) || 0 : maxCmj;
  const cnsReadiness = calculateCNSReadiness(latestCmjVal, baselineCmjHistory);
  const cnsScore = Math.max(0, Math.min(100, Math.round(100 - (cnsReadiness.percentDrop || 0))));

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
      const allVert = playerHistory.filter(h => 
        h.test_type === 'cmj' || 
        h.test_type === 'cmj_arms' || 
        h.test_type === 'standard' ||
        h.test_type === 'cmj_no_arms' || 
        h.test_type === 'cmj_no_arm' ||
        h.test_type === 'sj_no_arms' || 
        h.test_type === 'sj' || 
        h.test_type === 'sj_arms' || 
        h.test_type === 'approach' || 
        h.test_type === 'approach_jump'
      );
      if (verticalSubFilter === 'cmj_arms') {
        return allVert.filter(h => h.test_type === 'cmj' || h.test_type === 'cmj_arms' || h.test_type === 'standard');
      }
      if (verticalSubFilter === 'cmj_no_arms') {
        return allVert.filter(h => h.test_type === 'cmj_no_arms' || h.test_type === 'cmj_no_arm');
      }
      if (verticalSubFilter === 'sj') {
        return allVert.filter(h => h.test_type === 'sj_no_arms' || h.test_type === 'sj' || h.test_type === 'sj_arms');
      }
      if (verticalSubFilter === 'approach') {
        return allVert.filter(h => h.test_type === 'approach' || h.test_type === 'approach_jump');
      }
      return allVert;
    }
    if (historyFilter === 'rsi') {
      return playerHistory.filter(h => h.test_type === 'rsi');
    }
    if (historyFilter === 'strength') {
      return playerHistory.filter(h => h.test_type === 'full_squat' || h.test_type === 'bench_press' || h.test_type === 'power_clean' || parseFloat(String(h.clean_weight_kg)) > 0);
    }
    return playerHistory;
  }, [playerHistory, historyFilter, verticalSubFilter]);

  // Handle Record Delete (Instant Sync)
  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm(t.profile.deleteRecordConfirm)) return;
    await deleteMeasurement(id);
  };

  // Open Edit Modal with prefilled state
  const handleOpenEdit = (record: JumpMeasurement) => {
    setEditingRecord(record);
    const dateStr = record.created_at ? String(record.created_at).substring(0, 10) : new Date().toISOString().substring(0, 10);
    let gctStr = '';
    if (record.contact_time_sec != null) {
      const num = parseFloat(String(record.contact_time_sec));
      if (num > 0) {
        gctStr = num >= 1 ? String(Math.round(num)) : String(num);
      }
    }
    setEditForm({
      id: record.id,
      test_type: String(record.test_type || 'cmj').toLowerCase(),
      created_at: dateStr,
      jump_height_cm: record.jump_height_cm != null ? String(record.jump_height_cm) : '',
      flight_time_sec: record.flight_time_sec != null ? String(record.flight_time_sec) : '',
      contact_time_sec: gctStr,
      rsi_score: record.rsi_score != null ? String(record.rsi_score) : '',
      box_height_cm: record.box_height_cm != null ? String(record.box_height_cm) : '',
      takeoff_velocity_ms: record.takeoff_velocity_ms != null ? String(record.takeoff_velocity_ms) : '',
      peak_power_watts: record.peak_power_watts != null ? String(record.peak_power_watts) : '',
      clean_weight_kg: record.clean_weight_kg != null ? String(record.clean_weight_kg) : '',
      reps_count: record.reps_count != null ? String(record.reps_count) : '1',
      week_number: record.week_number != null ? String(record.week_number) : '1',
      notes: record.notes || '',
    });
  };

  // Handle Record Edit Save (Instant Sync)
  const handleSaveEditRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editForm.id) return;
    setIsEditSaving(true);
    try {
      const isRsi = editForm.test_type === 'rsi' || editForm.test_type === 'dj';
      const isStrength = editForm.test_type === 'full_squat' || editForm.test_type === 'bench_press' || editForm.test_type === 'power_clean';

      const payload: any = {
        test_type: editForm.test_type,
        created_at: editForm.created_at ? new Date(editForm.created_at).toISOString() : new Date().toISOString(),
        notes: editForm.notes || null,
      };

      if (isRsi) {
        const rawGct = parseFloat(editForm.contact_time_sec) || 0;
        const gctSec = rawGct >= 5 ? rawGct / 1000 : rawGct;
        payload.rsi_score = parseFloat(editForm.rsi_score) || null;
        payload.contact_time_sec = gctSec > 0 ? Number(gctSec.toFixed(4)) : null;
        payload.flight_time_sec = parseFloat(editForm.flight_time_sec) || null;
        payload.jump_height_cm = parseFloat(editForm.jump_height_cm) || null;
        payload.box_height_cm = parseFloat(editForm.box_height_cm) || null;
        payload.peak_power_watts = parseFloat(editForm.peak_power_watts) || null;
      } else if (isStrength) {
        const cleanWt = parseFloat(editForm.clean_weight_kg) || null;
        payload.clean_weight_kg = cleanWt;
        payload.reps_count = parseInt(editForm.reps_count) || 1;
        payload.week_number = parseInt(editForm.week_number) || 1;
        if (cleanWt && mass > 0) {
          payload.clean_bw_ratio = Number((cleanWt / mass).toFixed(2));
        }
      } else {
        // Vertical Jump
        payload.jump_height_cm = parseFloat(editForm.jump_height_cm) || null;
        payload.flight_time_sec = parseFloat(editForm.flight_time_sec) || null;
        payload.takeoff_velocity_ms = parseFloat(editForm.takeoff_velocity_ms) || null;
        payload.peak_power_watts = parseFloat(editForm.peak_power_watts) || null;
      }

      await updateMeasurement(editForm.id, payload);
      setEditingRecord(null);
    } catch (err) {
      console.error('Failed to save edited record:', err);
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
          ROW 1: 4 PRIMARY JUMP BENCHMARKS (SIDE-BY-SIDE HIGH-IMPACT BENTO CARDS)
      ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: CMJ with Arms */}
        <div className="bento-card flex flex-col justify-between border-t-2 border-t-[#D4FF00]">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold mb-2">
            <span className="flex items-center gap-1.5 text-white">
              <Activity size={14} className="text-[#D4FF00]" />
              {t.profile.cmjWithArms}
            </span>
            <span className="badge-volt text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
              {maxCmj > 0 ? (maxCmj * 0.393701).toFixed(1) : '0.0'} in
            </span>
          </div>

          <div className="my-2">
            <div className="text-4xl lg:text-5xl font-mono font-black text-[#D4FF00] tracking-tight tabular-nums">
              {maxCmj > 0 ? maxCmj.toFixed(1) : '—'}
              <span className="text-sm font-sans text-zinc-400 font-bold ml-1.5">cm</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center justify-between">
              <span>{t.profile.peakApproach}:</span>
              <strong className="text-white">{maxApproach > 0 ? `${maxApproach.toFixed(1)} cm` : '—'}</strong>
            </p>
          </div>

          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-[#D4FF00] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(15, (maxCmj / 95) * 100))}%` }}
            />
          </div>
        </div>

        {/* KPI 2: CMJ No Arms (Hands on Hips) */}
        <div className="bento-card flex flex-col justify-between border-t-2 border-t-[#D4FF00]">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold mb-2">
            <span className="flex items-center gap-1.5 text-white">
              <Zap size={14} className="text-[#D4FF00]" />
              {t.profile.cmjNoArms}
            </span>
            <span className="badge-volt text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
              {maxCmjNoArms > 0 ? (maxCmjNoArms * 0.393701).toFixed(1) : '0.0'} in
            </span>
          </div>

          <div className="my-2">
            <div className="text-4xl lg:text-5xl font-mono font-black text-white tracking-tight tabular-nums">
              {maxCmjNoArms > 0 ? maxCmjNoArms.toFixed(1) : '—'}
              <span className="text-sm font-sans text-zinc-400 font-bold ml-1.5">cm</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center justify-between">
              <span>{t.profile.armGain}:</span>
              <strong className={armSwingGain >= 10 ? 'text-[#10B981]' : armSwingGain > 0 ? 'text-[#D4FF00]' : 'text-zinc-400'}>
                {armSwingGain > 0 ? `+${armSwingGain.toFixed(1)}%` : '—'}
              </strong>
            </p>
          </div>

          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(15, (maxCmjNoArms / 90) * 100))}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Squat Jump (SJ - 90° Static) */}
        <div className="bento-card flex flex-col justify-between border-t-2 border-t-[#D4FF00]">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold mb-2">
            <span className="flex items-center gap-1.5 text-white">
              <Scale size={14} className="text-[#D4FF00]" />
              {t.profile.squatJump}
            </span>
            <span className="badge-volt text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
              {maxSjNoArms > 0 ? (maxSjNoArms * 0.393701).toFixed(1) : '0.0'} in
            </span>
          </div>

          <div className="my-2">
            <div className="text-4xl lg:text-5xl font-mono font-black text-white tracking-tight tabular-nums">
              {maxSjNoArms > 0 ? maxSjNoArms.toFixed(1) : '—'}
              <span className="text-sm font-sans text-zinc-400 font-bold ml-1.5">cm</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center justify-between">
              <span>{t.profile.eurRatio}:</span>
              <strong className="text-[#D4FF00]">
                {eur > 0 ? `${eur.toFixed(2)} (${eur > 1.15 ? (isEn ? 'Elastic' : 'مطاطي') : eur < 1.05 ? (isEn ? 'Strength' : 'عضلي') : (isEn ? 'Balanced' : 'متوازن')})` : '—'}
              </strong>
            </p>
          </div>

          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(15, (maxSjNoArms / 85) * 100))}%` }}
            />
          </div>
        </div>

        {/* KPI 4: Peak RSI (Drop Jump & Contact Time) */}
        <div className="bento-card flex flex-col justify-between border-t-2 border-t-[#D4FF00]">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold mb-2">
            <span className="flex items-center gap-1.5 text-white">
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
            <p className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center justify-between">
              <span>{t.profile.contactTime}:</span>
              <strong className="text-white">{gctMs > 0 ? `${gctMs} ms` : '—'}</strong>
            </p>
          </div>

          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden mt-2">
            <div
              className="bg-[#D4FF00] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(15, (maxRsi / 3.5) * 100))}%` }}
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          ROW 1.5: BIOMECHANICAL & NEUROMUSCULAR DIAGNOSTICS (CNS READINESS & F-V STATUS)
      ========================================================================= */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CNS Readiness Monitor */}
        <div className="bento-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121215] border border-[#27272A]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className={cnsReadiness.status === 'optimal' ? 'text-[#10B981]' : cnsReadiness.status === 'moderate_fatigue' ? 'text-[#F59E0B]' : 'text-[#F43F5E]'} />
              <span className="text-xs font-bold text-white">{t.profile.cnsReadiness}</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                cnsReadiness.status === 'optimal' ? 'badge-emerald' : cnsReadiness.status === 'moderate_fatigue' ? 'badge-amber' : 'badge-rose'
              }`}>
                {cnsReadiness.status === 'optimal' ? t.profile.optimalReadiness : cnsReadiness.status === 'moderate_fatigue' ? t.profile.moderateFatigue : t.profile.highFatigue}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 max-w-sm">
              {cnsReadiness.recommendationAr ? (isEn ? cnsReadiness.recommendationEn : cnsReadiness.recommendationAr) : cnsReadiness.advice}
            </p>
          </div>
          <div className="text-right sm:text-left flex sm:flex-col items-center sm:items-end gap-3 sm:gap-0">
            <div className={`text-3xl font-mono font-black tabular-nums ${
              cnsReadiness.status === 'optimal' ? 'text-[#10B981]' : cnsReadiness.status === 'moderate_fatigue' ? 'text-[#F59E0B]' : 'text-[#F43F5E]'
            }`}>
              {cnsScore}%
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              Drop vs 14d: {cnsReadiness.percentDrop > 0 ? `-${cnsReadiness.percentDrop}%` : '0%'}
            </span>
          </div>
        </div>

        {/* F-V Profile & Samozino Balance */}
        <div className="bento-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121215] border border-[#27272A]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[#FF5500]" />
              <span className="text-xs font-bold text-white">{t.profile.fvpStatus} (Samozino)</span>
              <span className="badge-blaze text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                EUR {eur > 0 ? eur.toFixed(2) : '—'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 max-w-sm">
              {eur > 1.15
                ? t.profile.velocityDeficit
                : (eur < 1.05 && eur > 0)
                  ? t.profile.forceDeficit
                  : eur >= 1.05
                    ? t.profile.balancedProfile
                    : (isEn ? 'Requires CMJ (No Arms) & SJ tests' : 'يتطلب تسجيل اختبار CMJ بدون أذرع و SJ')}
            </p>
          </div>
          <div className="text-right sm:text-left">
            <div className="text-sm font-bold text-white">
              {eur > 1.15
                ? t.profile.elasticDominant
                : (eur < 1.05 && eur > 0)
                  ? t.profile.strengthDominant
                  : eur >= 1.05
                    ? t.profile.wellBalanced
                    : (isEn ? 'Uncalibrated' : 'غير مكتمل')}
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              {eur > 1.15 ? 'Velocity Prioritized' : (eur < 1.05 && eur > 0) ? 'Force / Squat Prioritized' : eur >= 1.05 ? 'Optimal Balance' : '—'}
            </span>
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
                    {t.profile.elasticDominantDesc}
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
                    {t.profile.strengthDominantDesc}
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${
                  eur >= 1.05 && eur <= 1.15
                    ? 'bg-[#10B981]/10 border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{t.profile.wellBalanced}</span>
                    <span className="badge-emerald text-[10px] font-mono px-2 py-0.5 rounded">EUR 1.05 - 1.15</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {t.profile.wellBalancedDesc}
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
                    {t.profile.generalDeficitDesc}
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
              <span className="text-lg font-bold text-white">{totalTouchReachCm.toFixed(1)} cm</span>
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
                {vballClearanceCm >= 0 ? `+${vballClearanceCm.toFixed(1)} cm` : `${vballClearanceCm.toFixed(1)} cm`}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-zinc-400 block">{t.profile.dunkMargin}</span>
                <span className="text-[10px] text-zinc-500">Dunk Target: 315 cm</span>
              </div>
              <span className={`font-bold text-sm ${dunkMarginCm >= 0 ? 'text-[#D4FF00]' : 'text-[#F43F5E]'}`}>
                {dunkMarginCm >= 0 ? `+${dunkMarginCm.toFixed(1)} cm` : `${dunkMarginCm.toFixed(1)} cm`}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-zinc-400 block">{t.profile.rimMargin}</span>
                <span className="text-[10px] text-zinc-500">Rim Height: 305 cm</span>
              </div>
              <span className={`font-bold text-sm ${rimMarginCm >= 0 ? 'text-[#10B981]' : 'text-zinc-500'}`}>
                {rimMarginCm >= 0 ? `+${rimMarginCm.toFixed(1)} cm` : `${rimMarginCm.toFixed(1)} cm`}
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

          {/* Primary Filter Pills */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs font-bold flex-wrap">
            <button
              type="button"
              onClick={() => setHistoryFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${historyFilter === 'all' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.profile.filterAll}
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter('cmj')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${historyFilter === 'cmj' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.profile.filterCmj}
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter('rsi')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${historyFilter === 'rsi' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.profile.filterRsi}
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter('strength')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${historyFilter === 'strength' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.profile.filterStrength}
            </button>
          </div>
        </div>

        {/* Vertical Jump Specific Sub-Filter Pills */}
        {historyFilter === 'cmj' && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2.5 pb-1 border-t border-zinc-800/80 text-xs font-mono">
            <span className="text-[11px] text-zinc-400 font-bold mr-1 rtl:ml-1 rtl:mr-0">
              {isEn ? 'Filter Jump Type:' : 'تصفية نوع القفزة:'}
            </span>
            <button
              type="button"
              onClick={() => setVerticalSubFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                verticalSubFilter === 'all'
                  ? 'bg-white text-zinc-950 font-black shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {t.profile.subfilterAll}
            </button>
            <button
              type="button"
              onClick={() => setVerticalSubFilter('cmj_arms')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                verticalSubFilter === 'cmj_arms'
                  ? 'bg-[#D4FF00] text-[#09090B] font-black shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {t.profile.subfilterCmjArms}
            </button>
            <button
              type="button"
              onClick={() => setVerticalSubFilter('cmj_no_arms')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                verticalSubFilter === 'cmj_no_arms'
                  ? 'bg-[#D4FF00] text-[#09090B] font-black shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {t.profile.subfilterCmjNoArms}
            </button>
            <button
              type="button"
              onClick={() => setVerticalSubFilter('sj')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                verticalSubFilter === 'sj'
                  ? 'bg-[#D4FF00] text-[#09090B] font-black shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {t.profile.subfilterSquatJump}
            </button>
            <button
              type="button"
              onClick={() => setVerticalSubFilter('approach')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                verticalSubFilter === 'approach'
                  ? 'bg-[#D4FF00] text-[#09090B] font-black shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {t.profile.subfilterApproach}
            </button>
          </div>
        )}

        {/* History Table */}
        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                {historyFilter === 'rsi' ? (
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-3">{t.profile.testTypeCol}</th>
                    <th className="py-3 px-3 text-[#D4FF00] font-black">{t.profile.rsiScoreCol}</th>
                    <th className="py-3 px-3">{t.profile.contactTimeCol}</th>
                    <th className="py-3 px-3">{t.profile.flightTimeCol}</th>
                    <th className="py-3 px-3">{t.profile.jumpHeightCol}</th>
                    <th className="py-3 px-3">{t.profile.powerCol}</th>
                    <th className="py-3 px-3">{t.profile.dateCol}</th>
                    <th className="py-3 px-3 text-right rtl:text-left">{t.common.actions}</th>
                  </tr>
                ) : historyFilter === 'cmj' ? (
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-3">{t.profile.testTypeCol}</th>
                    <th className="py-3 px-3 text-[#D4FF00] font-black">{t.profile.jumpHeightCol}</th>
                    <th className="py-3 px-3">{t.profile.flightTimeCol}</th>
                    <th className="py-3 px-3">{t.profile.powerCol}</th>
                    <th className="py-3 px-3">{t.profile.dateCol}</th>
                    <th className="py-3 px-3 text-right rtl:text-left">{t.common.actions}</th>
                  </tr>
                ) : historyFilter === 'strength' ? (
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-3">{t.profile.testTypeCol}</th>
                    <th className="py-3 px-3 text-[#D4FF00] font-black">{t.profile.editCleanWeightLabel}</th>
                    <th className="py-3 px-3">{t.profile.repsCount}</th>
                    <th className="py-3 px-3">{t.profile.bwRatio}</th>
                    <th className="py-3 px-3">{t.profile.dateCol}</th>
                    <th className="py-3 px-3 text-right rtl:text-left">{t.common.actions}</th>
                  </tr>
                ) : (
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-3">{t.profile.testTypeCol}</th>
                    <th className="py-3 px-3">{t.profile.scoreCol}</th>
                    <th className="py-3 px-3">{t.profile.contactTimeCol}</th>
                    <th className="py-3 px-3">{t.profile.powerCol}</th>
                    <th className="py-3 px-3">{t.profile.dateCol}</th>
                    <th className="py-3 px-3 text-right rtl:text-left">{t.common.actions}</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {filteredHistory.slice().reverse().map((record) => {
                  const isRsiRec = record.test_type === 'rsi' || record.test_type === 'dj';
                  const isPr = (parseFloat(String(record.jump_height_cm)) === peakHeightCm && peakHeightCm > 0) ||
                               (parseFloat(String(record.rsi_score)) === maxRsi && maxRsi > 0);

                  const gctVal = record.contact_time_sec ? parseFloat(String(record.contact_time_sec)) : 0;
                  const displayGctMs = gctVal > 0 ? (gctVal >= 1 ? Math.round(gctVal) : Math.round(gctVal * 1000)) : 0;
                  const gctSecVal = gctVal > 0 && gctVal < 1 ? gctVal : (gctVal >= 1 ? gctVal / 1000 : 0);
                  const recordGctInfo = classifyGCT(gctSecVal);

                  // DEDICATED RSI ROW VIEW
                  if (historyFilter === 'rsi') {
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
                        <td className="py-3 px-3 font-black text-[#D4FF00] text-base tabular-nums">
                          {record.rsi_score ? Number(record.rsi_score).toFixed(2) : '—'}
                        </td>
                        <td className="py-3 px-3 text-zinc-300">
                          {displayGctMs > 0 ? (
                            <span className="flex items-center gap-1.5">
                              <span className="font-bold">{displayGctMs} ms</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded ${
                                recordGctInfo.classification === 'Fast SSC' ? 'badge-volt' : recordGctInfo.classification === 'Moderate SSC' ? 'badge-amber' : 'badge-rose'
                              }`}>
                                {recordGctInfo.classification}
                              </span>
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-3 text-zinc-300 tabular-nums font-bold">
                          {record.flight_time_sec ? `${Number(record.flight_time_sec).toFixed(3)} s` : '—'}
                        </td>
                        <td className="py-3 px-3 font-bold text-white tabular-nums">
                          {record.jump_height_cm ? `${Number(record.jump_height_cm).toFixed(1)} cm` : '—'}
                        </td>
                        <td className="py-3 px-3 text-zinc-400">
                          {record.peak_power_watts ? `${record.peak_power_watts} W` : '—'}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 text-[11px]">
                          {record.created_at ? String(record.created_at).substring(0, 10) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right rtl:text-left">
                          <div className="flex items-center justify-end rtl:justify-start gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(record)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                              title={t.common.edit}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
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
                  }

                  // DEDICATED VERTICAL JUMP ROW VIEW
                  if (historyFilter === 'cmj') {
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
                        <td className="py-3 px-3 font-black text-[#D4FF00] text-base tabular-nums">
                          {record.jump_height_cm ? `${Number(record.jump_height_cm).toFixed(1)} cm` : '—'}
                        </td>
                        <td className="py-3 px-3 text-zinc-300 tabular-nums font-bold">
                          {record.flight_time_sec ? `${Number(record.flight_time_sec).toFixed(3)} s` : '—'}
                        </td>
                        <td className="py-3 px-3 text-zinc-400">
                          {record.peak_power_watts ? `${record.peak_power_watts} W` : '—'}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 text-[11px]">
                          {record.created_at ? String(record.created_at).substring(0, 10) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right rtl:text-left">
                          <div className="flex items-center justify-end rtl:justify-start gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(record)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                              title={t.common.edit}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
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
                  }

                  // DEDICATED STRENGTH ROW VIEW
                  if (historyFilter === 'strength') {
                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-zinc-900/60 transition-colors"
                      >
                        <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                          <span className="uppercase">{record.test_type}</span>
                        </td>
                        <td className="py-3 px-3 font-black text-[#D4FF00] text-base tabular-nums">
                          {record.clean_weight_kg ? `${record.clean_weight_kg} kg` : '—'}
                        </td>
                        <td className="py-3 px-3 text-zinc-300 font-bold">
                          {record.reps_count || 1} reps
                        </td>
                        <td className="py-3 px-3 text-zinc-400">
                          {record.clean_bw_ratio ? `${record.clean_bw_ratio}x BW` : '—'}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 text-[11px]">
                          {record.created_at ? String(record.created_at).substring(0, 10) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right rtl:text-left">
                          <div className="flex items-center justify-end rtl:justify-start gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(record)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                              title={t.common.edit}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
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
                  }

                  // GENERAL "ALL TESTS" ROW VIEW
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
                      <td className="py-3 px-3 font-bold text-[#D4FF00] text-sm tabular-nums">
                        {isRsiRec ? (
                          <div className="flex flex-col">
                            <span className="font-black text-[#D4FF00]">
                              RSI: {record.rsi_score ? Number(record.rsi_score).toFixed(2) : '—'}
                            </span>
                            {record.jump_height_cm && (
                              <span className="text-[10px] text-zinc-400">
                                {Number(record.jump_height_cm).toFixed(1)} cm
                              </span>
                            )}
                          </div>
                        ) : record.jump_height_cm ? (
                          `${Number(record.jump_height_cm).toFixed(1)} cm`
                        ) : record.clean_weight_kg ? (
                          `${record.clean_weight_kg} kg`
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-zinc-300">
                        {displayGctMs > 0 ? (
                          <span className="flex items-center gap-1.5">
                            <span>{displayGctMs} ms</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded ${
                              recordGctInfo.classification === 'Fast SSC' ? 'badge-volt' : recordGctInfo.classification === 'Moderate SSC' ? 'badge-amber' : 'badge-rose'
                            }`}>
                              {recordGctInfo.classification}
                            </span>
                          </span>
                        ) : record.flight_time_sec ? (
                          `${Number(record.flight_time_sec).toFixed(3)} s`
                        ) : (
                          '—'
                        )}
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
                            type="button"
                            onClick={() => handleOpenEdit(record)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                            title={t.common.edit}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
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
          POWERFUL TELEMETRY EDIT RECORD MODAL (TYPE-SPECIFIC & DATE EDITING)
      ========================================================================= */}
      <AnimatePresence>
        {editingRecord && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bento-card bg-[#121215] border border-[#27272A] p-6 w-full max-w-lg rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Edit3 size={18} className="text-[#D4FF00]" />
                  <h3 className="font-heading font-bold text-white text-base">
                    {t.profile.editRecordTitle}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditRecord} className="space-y-4 font-sans text-xs">
                {/* ROW 1: TEST TYPE & TEST DATE (EDITABLE FOR ALL) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-mono text-[11px] font-bold">
                      {t.profile.editTestTypeLabel}
                    </label>
                    <select
                      value={editForm.test_type}
                      onChange={(e) => setEditForm({ ...editForm, test_type: e.target.value })}
                      className="glass-input w-full font-mono text-xs font-bold text-white bg-[#0A0B0F] border border-[#27272A] rounded-xl px-3 py-2.5 outline-none focus:border-[#D4FF00]"
                    >
                      <optgroup label={isEn ? "Vertical Jumps" : "الوثب الرأسي"}>
                        <option value="cmj">CMJ (with arms / بالأذرع)</option>
                        <option value="cmj_no_arms">CMJ (no arms / بدون أذرع)</option>
                        <option value="sj_no_arms">Squat Jump (SJ - 90° Static)</option>
                        <option value="approach">Approach Jump (قفزة اقتراب)</option>
                      </optgroup>
                      <optgroup label={isEn ? "Reactive Strength (RSI)" : "القوة التفاعلية (RSI)"}>
                        <option value="rsi">Drop Jump / RSI</option>
                      </optgroup>
                      <optgroup label={isEn ? "Maximum Strength 1RM" : "تمارين القوة القصوى 1RM"}>
                        <option value="full_squat">Full Squat (سكوات كامل)</option>
                        <option value="bench_press">Bench Press (بنش برس)</option>
                        <option value="power_clean">Power Clean (باور كلين)</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1 font-mono text-[11px] font-bold">
                      {t.profile.editDateLabel}
                    </label>
                    <input
                      type="date"
                      value={editForm.created_at}
                      onChange={(e) => setEditForm({ ...editForm, created_at: e.target.value })}
                      className="glass-input w-full font-mono text-xs text-white bg-[#0A0B0F] border border-[#27272A] rounded-xl px-3 py-2 outline-none focus:border-[#D4FF00]"
                      required
                    />
                  </div>
                </div>

                {/* DYNAMIC FIELDS: RSI MODE */}
                {(editForm.test_type === 'rsi' || editForm.test_type === 'dj') && (
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-[#D4FF00]/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#D4FF00] font-mono">
                        {isEn ? '⚡ RSI Reactive Strength Inputs' : '⚡ مدخلات قفزة الهبوط ومؤشر RSI'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Drop Box: {editForm.box_height_cm || '30'} cm
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editRsiScoreLabel}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="2.40"
                          value={editForm.rsi_score}
                          onChange={(e) => setEditForm({ ...editForm, rsi_score: e.target.value })}
                          className="glass-input w-full font-mono text-sm font-black text-[#D4FF00]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editContactTimeLabel}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 190 ms or 0.190"
                          value={editForm.contact_time_sec}
                          onChange={(e) => setEditForm({ ...editForm, contact_time_sec: e.target.value })}
                          className="glass-input w-full font-mono text-sm text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editFlightTimeLabel}
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="0.639"
                          value={editForm.flight_time_sec}
                          onChange={(e) => {
                            const ft = parseFloat(e.target.value);
                            const updated = { ...editForm, flight_time_sec: e.target.value };
                            if (ft > 0) {
                              updated.jump_height_cm = (1.22625 * Math.pow(ft, 2) * 100).toFixed(1);
                            }
                            setEditForm(updated);
                          }}
                          className="glass-input w-full font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editJumpHeightLabel}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="50.0"
                          value={editForm.jump_height_cm}
                          onChange={(e) => {
                            const h = parseFloat(e.target.value);
                            const updated = { ...editForm, jump_height_cm: e.target.value };
                            if (h > 0) {
                              updated.flight_time_sec = Math.sqrt((8 * (h / 100)) / 9.81).toFixed(3);
                            }
                            setEditForm(updated);
                          }}
                          className="glass-input w-full font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editBoxHeightLabel}
                        </label>
                        <input
                          type="number"
                          step="1"
                          placeholder="30"
                          value={editForm.box_height_cm}
                          onChange={(e) => setEditForm({ ...editForm, box_height_cm: e.target.value })}
                          className="glass-input w-full font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* Quick Recalculation Action Buttons */}
                    <div className="flex gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const h = parseFloat(editForm.jump_height_cm) || 0;
                          const rawCt = parseFloat(editForm.contact_time_sec) || 0;
                          const ctSec = rawCt >= 5 ? rawCt / 1000 : rawCt;
                          const hM = h >= 10 ? h / 100 : h;
                          if (hM > 0 && ctSec > 0) {
                            setEditForm(prev => ({ ...prev, rsi_score: (hM / ctSec).toFixed(2) }));
                          }
                        }}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[#D4FF00] font-mono text-[10px] font-bold cursor-pointer"
                      >
                        ⚡ {isEn ? 'Recalc RSI: Height(m) ÷ GCT(s)' : 'حساب: الارتفاع ÷ التلامس'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const ft = parseFloat(editForm.flight_time_sec) || 0;
                          const rawCt = parseFloat(editForm.contact_time_sec) || 0;
                          const ctSec = rawCt >= 5 ? rawCt / 1000 : rawCt;
                          if (ft > 0 && ctSec > 0) {
                            setEditForm(prev => ({ ...prev, rsi_score: (ft / ctSec).toFixed(2) }));
                          }
                        }}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-mono text-[10px] font-bold cursor-pointer"
                      >
                        ⚡ {isEn ? 'Recalc RSI: Flight(s) ÷ GCT(s)' : 'حساب: الطيران ÷ التلامس'}
                      </button>
                    </div>
                  </div>
                )}

                {/* DYNAMIC FIELDS: VERTICAL JUMP MODE */}
                {(editForm.test_type === 'cmj' || editForm.test_type === 'cmj_no_arms' || editForm.test_type === 'sj_no_arms' || editForm.test_type === 'approach') && (
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-mono">
                        {isEn ? '📈 Vertical Jump Kinematics' : '📈 قياسات الوثب الرأسي والكينماتيكا'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editJumpHeightLabel}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="65.0"
                          value={editForm.jump_height_cm}
                          onChange={(e) => {
                            const h = parseFloat(e.target.value);
                            const updated = { ...editForm, jump_height_cm: e.target.value };
                            if (h > 0) {
                              const ft = Math.sqrt((8 * (h / 100)) / 9.81);
                              updated.flight_time_sec = ft.toFixed(3);
                              updated.takeoff_velocity_ms = Math.sqrt(2 * 9.81 * (h / 100)).toFixed(2);
                              if (mass > 0) {
                                updated.peak_power_watts = Math.round(61.9 * h + 36.0 * mass - 1822).toString();
                              }
                            }
                            setEditForm(updated);
                          }}
                          className="glass-input w-full font-mono text-sm font-black text-[#D4FF00]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editFlightTimeLabel}
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="0.728"
                          value={editForm.flight_time_sec}
                          onChange={(e) => setEditForm({ ...editForm, flight_time_sec: e.target.value })}
                          className="glass-input w-full font-mono text-sm text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editTakeoffVelocityLabel}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="3.57"
                          value={editForm.takeoff_velocity_ms}
                          onChange={(e) => setEditForm({ ...editForm, takeoff_velocity_ms: e.target.value })}
                          className="glass-input w-full font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editPeakPowerLabel}
                        </label>
                        <input
                          type="number"
                          step="1"
                          placeholder="4800"
                          value={editForm.peak_power_watts}
                          onChange={(e) => setEditForm({ ...editForm, peak_power_watts: e.target.value })}
                          className="glass-input w-full font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* DYNAMIC FIELDS: MAXIMUM STRENGTH 1RM MODE */}
                {(editForm.test_type === 'full_squat' || editForm.test_type === 'bench_press' || editForm.test_type === 'power_clean') && (
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-mono">
                        {isEn ? '🏋️ Strength 1RM Parameters' : '🏋️ معايير القوة القصوى 1RM'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editCleanWeightLabel}
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          placeholder="140"
                          value={editForm.clean_weight_kg}
                          onChange={(e) => setEditForm({ ...editForm, clean_weight_kg: e.target.value })}
                          className="glass-input w-full font-mono text-sm font-black text-[#D4FF00]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editRepsCountLabel}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          placeholder="3"
                          value={editForm.reps_count}
                          onChange={(e) => setEditForm({ ...editForm, reps_count: e.target.value })}
                          className="glass-input w-full font-mono text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 block mb-1 font-mono text-[10px]">
                          {t.profile.editWeekNumberLabel}
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="4"
                          value={editForm.week_number}
                          onChange={(e) => setEditForm({ ...editForm, week_number: e.target.value })}
                          className="glass-input w-full font-mono text-sm text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* COACH NOTES */}
                <div>
                  <label className="text-zinc-400 block mb-1 font-mono text-[11px] font-bold">
                    {t.common.notes}
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder={isEn ? "Coaching observations, technique cues..." : "ملاحظات فنية أو توصيات تدريبية..."}
                    className="glass-input w-full h-20 text-xs text-white"
                  />
                </div>

                {/* SUBMIT BUTTONS */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isEditSaving}
                    className="btn-volt flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    {isEditSaving ? t.common.saving : t.common.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-bold cursor-pointer transition-colors"
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
