import React, { useState, useEffect, useMemo } from 'react';
import { toast } from './components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3, Save, Printer, User, Trash2, Check,
  Activity, Zap, Scale, Calendar, FileText, Layers,
  Calculator, CheckCircle2, Info, Gauge, ArrowRightLeft
} from 'lucide-react';
import { useData } from './context/DataContext';
import AppLogo from './AppLogo';
import { classifyGCT } from './useJumpMechanics';
import { TEST_TYPES, normalizeTestType, supportsStandingJumpModels } from './lib/testTypes';
import { sayersPeakPowerW, samozinoMeanPowerW, samozinoMeanForceN, takeoffVelocityFromJumpHeight, flightTimeFromJumpHeight, jumpHeightFromFlightTime, rsiFromHeight, rsiFromFlightTime, resolveHpo } from './lib/biomechanics';

interface ManualEntryConsoleProps {
  activePlayer?: any;
  selectedPlayerId?: string;
  language?: string;
  playerHistory?: any[];
  onSaveSuccess?: (data: any) => void;
}

export default function ManualEntryConsole({
  activePlayer: propActivePlayer,
  selectedPlayerId: propSelectedPlayerId,
  language: propLanguage,
}: ManualEntryConsoleProps) {
  const {
    activePlayer: contextActivePlayer,
    selectedPlayerId: contextSelectedPlayerId,
    playerHistory,
    addMeasurement,
    deleteMeasurement,
    t,
    language: contextLanguage,
  } = useData();

  const activePlayer = propActivePlayer || contextActivePlayer;
  const selectedPlayerId = propSelectedPlayerId || contextSelectedPlayerId;
  const language = propLanguage || contextLanguage;
  const isEn = language === 'en';
  const isAr = language === 'ar';

  // Entry Mode Selection: 'jump' | 'strength'
  const [entryMode, setEntryMode] = useState<'jump' | 'strength'>('jump');

  // RSI Specific Calculation / Entry Mode
  // 'direct' = User inputs exact RSI number (e.g. 2.40)
  // 'auto_height' = Jump Height (m) / Contact Time (s)
  // 'auto_flight' = Flight Time (s) / Contact Time (s)
  const [rsiMode, setRsiMode] = useState<'direct' | 'auto_height' | 'auto_flight'>('direct');

  // Form State
  const [form, setForm] = useState({
    testType: 'cmj_arms',
    created_at: new Date().toISOString().substring(0, 10),
    jumpHeightCm: '',
    flightTimeSec: '',
    contactTimeInput: '', // milliseconds
    rsiScoreDirect: '',
    boxHeightCm: '30',
    addedLoadKg: '',
    cleanWeightKg: '',
    cleanBwRatio: '',
    weekNumber: '1',
    repsCount: '1',
    notes: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      created_at: new Date().toISOString().substring(0, 10)
    }));
  }, [selectedPlayerId]);

  // Derived Player Metrics
  const weight = parseFloat(String(activePlayer?.weight_kg)) || 0;

  // Live Math Inputs
  const jumpHeight = parseFloat(form.jumpHeightCm) || 0;
  const flightTime = parseFloat(form.flightTimeSec) || 0;
  const cleanWeight = parseFloat(form.cleanWeightKg) || 0;
  const addedLoad = parseFloat(form.addedLoadKg) || 0;
  const boxHeight = parseFloat(form.boxHeightCm) || 0;

  // Contact time is always entered in milliseconds
  const contactTimeMs = parseFloat(form.contactTimeInput) || 0;
  const contactTimeSec = contactTimeMs / 1000;
  const gctAnalysis = useMemo(() => classifyGCT(contactTimeSec), [contactTimeSec]);

  // Sayers et al. (1999) peak power
  const peakPower = sayersPeakPowerW(jumpHeight, weight) ?? 0;
  const relativePower = weight > 0 && peakPower > 0 ? peakPower / weight : 0;

  // Precise RSI Calculation based on selected mode
  const { finalRsi, rsiFormulaDisplay } = useMemo(() => {
    if (normalizeTestType(form.testType) !== TEST_TYPES.DROP_JUMP) {
      return { finalRsi: 0, rsiFormulaDisplay: '' };
    }

    if (rsiMode === 'direct') {
      const val = parseFloat(form.rsiScoreDirect) || 0;
      return {
        finalRsi: val > 0 ? Number(val.toFixed(2)) : 0,
        rsiFormulaDisplay: val > 0 ? `${t.ui.meDirectScore}: ${val.toFixed(2)}` : ''
      };
    } else if (rsiMode === 'auto_height') {
      // Standard Bosco / Vald / Flanagan method: Jump Height (m) / Contact Time (s)
      const heightM = jumpHeight / 100;
      const val = rsiFromHeight(heightM, contactTimeSec);
      if (val !== null) {
        return {
          finalRsi: Number(val.toFixed(2)),
          rsiFormulaDisplay: `${heightM.toFixed(3)} m ÷ ${contactTimeSec.toFixed(3)} s = ${val.toFixed(2)}`
        };
      }
      return { finalRsi: 0, rsiFormulaDisplay: 'H(m) ÷ GCT(s)' };
    } else {
      // Flight Time / Contact Time method
      const val = rsiFromFlightTime(flightTime, contactTimeSec);
      if (val !== null) {
        return {
          finalRsi: Number(val.toFixed(2)),
          rsiFormulaDisplay: `${flightTime.toFixed(3)} s ÷ ${contactTimeSec.toFixed(3)} s = ${val.toFixed(2)}`
        };
      }
      return { finalRsi: 0, rsiFormulaDisplay: 'FT(s) ÷ GCT(s)' };
    }
  }, [form.testType, rsiMode, form.rsiScoreDirect, jumpHeight, flightTime, contactTimeSec, isAr]);

  // Auto conversion between Jump Height and Flight Time
  const handleInputChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };

    if (field === 'jumpHeightCm') {
      const h = parseFloat(value);
      if (h > 0) {
        updated.flightTimeSec = flightTimeFromJumpHeight(h / 100)!.toFixed(3);
      } else {
        updated.flightTimeSec = '';
      }
    } else if (field === 'flightTimeSec') {
      const ft = parseFloat(value);
      if (ft > 0) {
        updated.jumpHeightCm = (jumpHeightFromFlightTime(ft)! * 100).toFixed(1);
      }
    }

    setForm(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) {
      toast.info(t.hud.selectAthlete);
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        player_id: selectedPlayerId,
        test_type: form.testType,
        created_at: form.created_at ? new Date(form.created_at).toISOString() : new Date().toISOString(),
        notes: form.notes || null,
      };

      if (entryMode === 'jump') {
        payload.jump_height_cm = jumpHeight > 0 ? jumpHeight.toFixed(2) : null;
        payload.flight_time_sec = flightTime > 0 ? flightTime.toFixed(4) : null;
        payload.box_height_cm = boxHeight > 0 ? boxHeight : null;
        payload.added_load_kg = addedLoad > 0 ? addedLoad : null;
        // Derived values: Sayers peak power; Samozino mean force/power with the player's hPO
        const hM = jumpHeight / 100;
        const { hpoM } = resolveHpo(activePlayer);
        // Sayers / Samozino only describe standing SJ/CMJ, not approach or drop jumps
        const standing = supportsStandingJumpModels(form.testType);
        const meanPower = standing && hpoM ? samozinoMeanPowerW(weight + addedLoad, hM, hpoM) : null;
        const meanForce = standing && hpoM ? samozinoMeanForceN(weight + addedLoad, hM, hpoM) : null;
        const vTO = takeoffVelocityFromJumpHeight(hM);
        payload.peak_power_watts = !standing || addedLoad > 0 || !(peakPower > 0) ? null : peakPower.toFixed(0);
        payload.mean_power_watts = meanPower !== null ? meanPower.toFixed(0) : null;
        payload.mean_force_newtons = meanForce !== null ? meanForce.toFixed(2) : null;
        payload.takeoff_velocity_ms = vTO !== null ? vTO.toFixed(2) : null;

        if (normalizeTestType(form.testType) === TEST_TYPES.DROP_JUMP) {
          payload.contact_time_sec = contactTimeSec > 0 ? contactTimeSec.toFixed(4) : null;
          payload.rsi_score = finalRsi > 0 ? finalRsi.toFixed(2) : null;
        }
      } else {
        // Strength mode
        payload.clean_weight_kg = cleanWeight > 0 ? cleanWeight : null;
        payload.reps_count = parseInt(form.repsCount) || 1;
        payload.week_number = parseInt(form.weekNumber) || 1;
        if (cleanWeight > 0 && weight > 0) {
          payload.clean_bw_ratio = (cleanWeight / weight).toFixed(2);
        }
      }

      // CENTRAL DATA REFRESH CALL (Instant in-memory sync across the app!)
      const res = await addMeasurement(payload);
      if (res) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        toast.success(t.ui.meMeasurementLoggedAndSaved);
        // Reset numeric inputs
        setForm(prev => ({
          ...prev,
          jumpHeightCm: '',
          flightTimeSec: '',
          contactTimeInput: '',
          rsiScoreDirect: '',
          cleanWeightKg: '',
          notes: ''
        }));
      } else {
        toast.error(t.ui.meFailedToSaveMeasurement);
      }
    } catch (err) {
      console.error('Error saving measurement in ManualEntryConsole:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!window.confirm(t.common.confirmDelete)) return;
    await deleteMeasurement(testId);
  };

  return (
    <div className={`space-y-6 animate-fade-in text-start`}>
      
      {/* =========================================================================
          TOP COMMAND HEADER & MODE SWITCHER
      ========================================================================= */}
      <div className="bg-surface border border-border p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
              <Edit3 size={18} />
            </div>
            <span>{t.manualEntry.title}</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            {t.manualEntry.subtitle}
          </p>
        </div>

        {/* Mode Switcher (Jump / Strength) */}
        <div className="flex items-center bg-bg p-1.5 rounded-2xl border border-border text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setEntryMode('jump');
              setForm(prev => ({ ...prev, testType: 'cmj_arms' }));
            }}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              entryMode === 'jump'
                ? 'bg-accent text-accent-ink shadow-[0_2px_12px_rgba(217,119,87,0.3)] font-black'
                : 'text-muted hover:text-accent-ink'
            }`}
          >
            <Activity size={14} />
            <span>{t.manualEntry.jumpMode}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMode('strength');
              setForm(prev => ({ ...prev, testType: 'full_squat' }));
            }}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              entryMode === 'strength'
                ? 'bg-accent text-accent-ink shadow-[0_2px_12px_rgba(217,119,87,0.3)] font-black'
                : 'text-muted hover:text-accent-ink'
            }`}
          >
            <Layers size={14} />
            <span>{t.manualEntry.strengthMode}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN WORKSTATION GRID (FORM 8 COLS + LIVE HUD 4 COLS)
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* FORM CONTAINER (8 cols) */}
        <div className="lg:col-span-8 bg-surface border border-border p-6 rounded-3xl shadow-xl">
          <form onSubmit={handleSave} className="space-y-5 text-xs">
            
            {/* Top Row: Test Type & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-300 block mb-1.5 font-bold">
                  {entryMode === 'jump' ? t.manualEntry.testTypeLabel : t.manualEntry.strengthLiftLabel}
                </label>
                {entryMode === 'jump' ? (
                  <select
                    value={form.testType}
                    onChange={e => setForm({ ...form, testType: e.target.value })}
                    className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  >
                    <option value="cmj_arms">{t.testTypes.cmj_arms}</option>
                    <option value="cmj_no_arms">{t.testTypes.cmj_no_arms}</option>
                    <option value="sj_no_arms">{t.testTypes.sj_no_arms}</option>
                    <option value="sj_arms">{t.testTypes.sj_arms}</option>
                    <option value="approach">{t.testTypes.approach}</option>
                    <option value="rsi">{t.testTypes.rsi}</option>
                  </select>
                ) : (
                  <select
                    value={form.testType}
                    onChange={e => setForm({ ...form, testType: e.target.value })}
                    className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  >
                    <option value="full_squat">{t.testTypes.full_squat}</option>
                    <option value="bench_press">{t.testTypes.bench_press}</option>
                    <option value="power_clean">{t.testTypes.power_clean}</option>
                  </select>
                )}
              </div>

              <div>
                <label className="text-zinc-300 block mb-1.5 font-bold">{t.manualEntry.dateLabel}</label>
                <input
                  type="date"
                  value={form.created_at}
                  onChange={e => setForm({ ...form, created_at: e.target.value })}
                  className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-white font-mono font-bold outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  required
                />
              </div>
            </div>

            {/* =========================================================================
                RSI DEDICATED CONFIGURATION BLOCK (WHEN TEST TYPE IS RSI)
            ========================================================================= */}
            {entryMode === 'jump' && normalizeTestType(form.testType) === TEST_TYPES.DROP_JUMP && (
              <div className="bg-surface border border-border p-4 sm:p-5 rounded-2xl space-y-4">
                
                {/* Method / Direct Toggle Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Zap size={16} className="text-accent" />
                    <span>{t.manualEntry.rsiModeToggle}</span>
                  </div>

                  {/* 3-way mode switch */}
                  <div className="flex items-center bg-bg p-1 rounded-xl border border-border text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setRsiMode('direct')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        rsiMode === 'direct'
                          ? 'bg-accent text-accent-ink font-black shadow-sm'
                          : 'text-muted hover:text-accent-ink'
                      }`}
                    >
                      {t.manualEntry.rsiModeDirect}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsiMode('auto_height')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        rsiMode === 'auto_height'
                          ? 'bg-accent text-accent-ink font-black shadow-sm'
                          : 'text-muted hover:text-accent-ink'
                      }`}
                    >
                      {t.manualEntry.rsiModeAutoHeight}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsiMode('auto_flight')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        rsiMode === 'auto_flight'
                          ? 'bg-accent text-accent-ink font-black shadow-sm'
                          : 'text-muted hover:text-accent-ink'
                      }`}
                    >
                      {t.manualEntry.rsiModeAutoFlight}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-2 font-mono">
                    {rsiMode === 'direct'
                      ? (t.ui.meDirectManualEntryOf)
                      : rsiMode === 'auto_height'
                        ? (t.ui.meValdForcedecksStandardJump)
                        : (t.ui.meContactMatMyjumpStandard)}
                  </p>
                </div>

                {/* DIRECT RSI INPUT FIELD */}
                {rsiMode === 'direct' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="bg-bg p-3.5 rounded-2xl border border-accent/40">
                      <label className="text-accent block mb-1 font-black text-xs flex items-center justify-between">
                        <span>{t.manualEntry.rsiDirectInput}</span>
                        <span className="text-[10px] text-muted font-normal">Score (e.g. 2.40)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="2.40"
                        value={form.rsiScoreDirect}
                        onChange={e => setForm({ ...form, rsiScoreDirect: e.target.value })}
                        className="w-full bg-transparent text-white font-mono tabular-nums text-2xl font-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        required={rsiMode === 'direct'}
                      />
                      <p className="text-[10px] text-faint mt-1">
                        {t.ui.meDirectIndexOutputFrom}
                      </p>
                    </div>

                    <div>
                      <label className="text-zinc-300 block mb-1 font-bold">
                        {t.manualEntry.contactTimeInput}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          placeholder="180" min="1" inputMode="decimal"
                          value={form.contactTimeInput}
                          onChange={e => setForm({ ...form, contactTimeInput: e.target.value })}
                          className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-white font-mono tabular-nums text-sm font-bold outline-none focus:border-accent"
                        />
                        <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-faint text-[11px] font-mono pointer-events-none">
                          {contactTimeMs > 0 ? `${(contactTimeMs / 1000).toFixed(3)} s` : 'ms'}
                        </span>
                      </div>
                      <p className="text-[10px] text-faint mt-1">
                        {t.ui.meAcceptsBothSeconds0}
                      </p>
                    </div>
                  </div>
                )}

                {/* COMMON JUMP INPUTS FOR RSI */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-zinc-300 block mb-1 font-bold">{t.manualEntry.heightInput}</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="23.2"
                        value={form.jumpHeightCm}
                        onChange={e => handleInputChange('jumpHeightCm', e.target.value)}
                        className="w-full bg-bg border border-border rounded-xl px-3.5 py-2 text-white font-mono tabular-nums text-sm font-bold outline-none focus:border-accent"
                      />
                      <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2 text-faint text-[11px] font-mono pointer-events-none">cm</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-300 block mb-1 font-bold">{t.manualEntry.flightTimeInput}</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.435"
                        value={form.flightTimeSec}
                        onChange={e => handleInputChange('flightTimeSec', e.target.value)}
                        className="w-full bg-bg border border-border rounded-xl px-3.5 py-2 text-white font-mono tabular-nums text-sm outline-none focus:border-accent"
                      />
                      <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2 text-faint text-[11px] font-mono pointer-events-none">sec</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-300 block mb-1 font-bold">{t.manualEntry.boxHeightInput}</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        value={form.boxHeightCm}
                        onChange={e => setForm({ ...form, boxHeightCm: e.target.value })}
                        className="w-full bg-bg border border-border rounded-xl px-3.5 py-2 text-white font-mono tabular-nums text-sm outline-none focus:border-accent"
                      />
                      <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2 text-faint text-[11px] font-mono pointer-events-none">cm</span>
                    </div>
                  </div>
                </div>

                {/* For auto_height or auto_flight, also show contact time here */}
                {rsiMode !== 'direct' && (
                  <div>
                    <label className="text-zinc-300 block mb-1 font-bold">
                      {t.manualEntry.contactTimeInput}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        placeholder="180" min="1" inputMode="decimal"
                        value={form.contactTimeInput}
                        onChange={e => setForm({ ...form, contactTimeInput: e.target.value })}
                        className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-white font-mono tabular-nums text-sm font-bold outline-none focus:border-accent"
                        required
                      />
                      <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-faint text-[11px] font-mono pointer-events-none">
                        {contactTimeMs > 0 ? `${(contactTimeMs / 1000).toFixed(3)} s` : 'ms'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                STANDARD JUMP MODE INPUTS (CMJ, SQUAT JUMP, APPROACH)
            ========================================================================= */}
            {entryMode === 'jump' && normalizeTestType(form.testType) !== TEST_TYPES.DROP_JUMP && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-bold">{t.manualEntry.heightInput}</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 58.5"
                      value={form.jumpHeightCm}
                      onChange={e => handleInputChange('jumpHeightCm', e.target.value)}
                      className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-accent font-mono tabular-nums text-base font-bold outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                    <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-faint text-xs font-mono pointer-events-none">cm</span>
                  </div>
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1.5 font-bold">{t.manualEntry.flightTimeInput}</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="e.g. 0.690"
                      value={form.flightTimeSec}
                      onChange={e => handleInputChange('flightTimeSec', e.target.value)}
                      className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-white font-mono tabular-nums text-sm outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-faint text-xs font-mono pointer-events-none">sec</span>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                STRENGTH MODE SPECIFIC INPUTS (1RM SQUAT, BENCH, CLEAN)
            ========================================================================= */}
            {entryMode === 'strength' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-bold">{t.manualEntry.weightLiftedInput}</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 140"
                      value={form.cleanWeightKg}
                      onChange={e => setForm({ ...form, cleanWeightKg: e.target.value })}
                      className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-accent font-mono tabular-nums text-base font-bold outline-none focus:border-accent"
                      required
                    />
                    <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-faint text-xs font-mono pointer-events-none">kg</span>
                  </div>
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-bold">{t.manualEntry.repsCountLabel}</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={form.repsCount}
                    onChange={e => setForm({ ...form, repsCount: e.target.value })}
                    className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-white font-mono tabular-nums text-sm font-bold outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 block mb-1.5 font-bold">{t.manualEntry.weekNumberLabel}</label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={form.weekNumber}
                    onChange={e => setForm({ ...form, weekNumber: e.target.value })}
                    className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-white font-mono tabular-nums text-sm font-bold outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}

            {/* Coach Notes */}
            <div>
              <label className="text-zinc-300 block mb-1.5 font-bold">{t.manualEntry.notesLabel}</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder={t.ui.meOptionalCoachingObservations}
                className="w-full bg-bg border border-border rounded-xl p-3 text-white text-xs outline-none focus:border-accent h-18 resize-none"
              />
            </div>

            {/* High-Impact Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 px-6 rounded-xl font-black text-sm text-accent-ink bg-gradient-to-r from-accent via-accent to-accent shadow-[0_4px_20px_-2px_rgba(217,119,87,0.3)] hover:shadow-[0_6px_28px_rgba(217,119,87,0.45)] hover:scale-[1.008] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={18} className="text-accent-ink" />
                )}
                <span>{isSaving ? t.common.saving : t.manualEntry.saveMeasurement}</span>
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success font-bold text-center text-xs animate-fade-in flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>{t.common.success} — Updated Dossier Instantly!</span>
              </div>
            )}
          </form>
        </div>

        {/* =========================================================================
            LIVE MATH HUD (4 cols) — HIGH DENSITY TELEMETRY READOUT
        ========================================================================= */}
        <div className="lg:col-span-4 bg-surface border border-border p-6 rounded-3xl shadow-xl space-y-4 font-mono text-xs">
          <div className="border-b border-border pb-3">
            <h3 className="font-heading font-black text-white text-sm flex items-center gap-2">
              <Gauge size={16} className="text-accent" />
              {t.ui.meLiveBiomechanicalReadout}
            </h3>
            <p className="text-[11px] text-muted font-sans mt-0.5">
              {t.ui.meInstantTelemetryValidationBefore}
            </p>
          </div>

          {entryMode === 'jump' ? (
            <div className="space-y-3">
              
              {/* RSI SPECIALIZED HUD CARD */}
              {normalizeTestType(form.testType) === TEST_TYPES.DROP_JUMP ? (
                <div className="bg-surface border border-border p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted font-bold">{t.ui.meActiveRsiScore}</span>
                    <span className="text-2xl font-black text-accent tabular-nums">
                      {finalRsi > 0 ? finalRsi.toFixed(2) : '—'}
                    </span>
                  </div>

                  {rsiFormulaDisplay && (
                    <div className="text-[10px] text-muted bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 font-mono">
                      {rsiFormulaDisplay}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <span className="text-muted">{t.ui.meContactTimeGct}</span>
                    <span className="text-white font-bold">
                      {contactTimeMs > 0 ? `${contactTimeMs} ms` : '—'}
                    </span>
                  </div>

                  {contactTimeSec > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted">{t.ui.meSscZone}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        gctAnalysis.category === 'elite_fast'
                          ? 'bg-success/20 text-success border border-success/40'
                          : gctAnalysis.category === 'moderate'
                          ? 'bg-warning/20 text-warning border border-warning/40'
                          : 'bg-danger/20 text-danger border border-danger/40'
                      }`}>
                        {isEn ? gctAnalysis.labelEn : gctAnalysis.labelAr}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-bg border border-border flex justify-between items-center">
                  <span className="text-muted">{t.ui.meJumpHeight}</span>
                  <span className="text-lg font-black text-accent tabular-nums">
                    {jumpHeight > 0 ? `${jumpHeight.toFixed(1)} cm` : '—'}
                  </span>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-bg border border-border flex justify-between items-center">
                <span className="text-muted">{t.ui.meFlightDuration}</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {flightTime > 0 ? `${flightTime.toFixed(3)} s` : '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg border border-border flex justify-between items-center">
                <span className="text-muted">{t.ui.meSayersPeakPower}</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {peakPower > 0 ? `${Math.round(peakPower)} W` : '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-bg border border-border flex justify-between items-center">
                <span className="text-muted">{t.ui.meRelativePower}</span>
                <span className="text-sm font-bold text-accent tabular-nums">
                  {relativePower > 0 ? `${relativePower.toFixed(1)} W/kg` : '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-bg border border-border flex justify-between items-center">
                <span className="text-muted">{t.ui.meWeightLifted}</span>
                <span className="text-lg font-black text-accent tabular-nums">
                  {cleanWeight > 0 ? `${cleanWeight} kg` : '—'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-bg border border-border flex justify-between items-center">
                <span className="text-muted">{t.ui.meBodyweightMultiplier}</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {cleanWeight > 0 && weight > 0 ? `${(cleanWeight / weight).toFixed(2)}x BW` : '—'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-bg border border-border flex justify-between items-center">
                <span className="text-muted">{t.ui.meReps}</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {form.repsCount} reps
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          RECENT LOGGED MEASUREMENTS TABLE FOR ACTIVE ATHLETE
      ========================================================================= */}
      {playerHistory && playerHistory.length > 0 && (
        <div className="bg-surface border border-border p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h3 className="font-heading font-black text-white text-sm flex items-center gap-2">
              <Calendar size={16} className="text-accent" />
              {t.manualEntry.recentLoggedTitle}
            </h3>
            <span className="text-[11px] font-mono text-muted">
              Total: {playerHistory.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono" style={{ textAlign: isAr ? 'right' : 'left' }}>
              <thead>
                <tr className="border-b border-border text-muted text-[10px] uppercase">
                  <th className="py-2.5 px-3">{t.profile.testTypeCol}</th>
                  <th className="py-2.5 px-3">{t.profile.scoreCol}</th>
                  <th className="py-2.5 px-3">{t.profile.contactTimeCol}</th>
                  <th className="py-2.5 px-3">{t.profile.dateCol}</th>
                  <th className="py-2.5 px-3 text-center">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {playerHistory.slice(-5).reverse().map((record) => {
                  const gct = record.contact_time_sec ? parseFloat(String(record.contact_time_sec)) : 0;
                  const gctMs = gct > 0 ? (gct >= 1 ? Math.round(gct) : Math.round(gct * 1000)) : 0;
                  return (
                    <tr key={record.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 text-white font-bold uppercase">{record.test_type}</td>
                      <td className="py-2.5 px-3 text-accent font-black">
                        {record.jump_height_cm ? `${record.jump_height_cm} cm` : record.rsi_score ? `RSI: ${record.rsi_score}` : record.clean_weight_kg ? `${record.clean_weight_kg} kg` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300">
                        {gctMs > 0 ? `${gctMs} ms` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-muted text-[11px]">
                        {record.created_at ? String(record.created_at).substring(0, 10) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteTest(record.id)}
                          className="p-1.5 rounded-lg text-faint hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
