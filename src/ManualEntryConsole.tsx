import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3, Save, Printer, User, Trash2, Check,
  Activity, Zap, Scale, Calendar, FileText, Layers,
  Calculator, CheckCircle2, Info, Gauge, ArrowRightLeft
} from 'lucide-react';
import { useData } from './context/DataContext';
import AppLogo from './AppLogo';
import { classifyGCT, calculateRSI } from './useJumpMechanics';

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
    testType: 'cmj',
    created_at: new Date().toISOString().substring(0, 10),
    jumpHeightCm: '',
    flightTimeSec: '',
    contactTimeInput: '', // Can be ms (e.g. 180) or seconds (e.g. 0.180)
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
  const weight = parseFloat(String(activePlayer?.weight_kg)) || 72;
  const heightCm = parseFloat(String(activePlayer?.height_cm)) || 178;

  // Live Math Inputs
  const jumpHeight = parseFloat(form.jumpHeightCm) || 0;
  const flightTime = parseFloat(form.flightTimeSec) || 0;
  const cleanWeight = parseFloat(form.cleanWeightKg) || 0;
  const addedLoad = parseFloat(form.addedLoadKg) || 0;
  const boxHeight = parseFloat(form.boxHeightCm) || 0;

  // Contact Time Normalization: Automatically detects seconds (e.g. 0.180) vs milliseconds (e.g. 180)
  const rawContact = parseFloat(form.contactTimeInput) || 0;
  const contactTimeSec = rawContact > 5 ? rawContact / 1000 : rawContact;
  const contactTimeMs = rawContact > 5 ? Math.round(rawContact) : Math.round(rawContact * 1000);
  const gctAnalysis = useMemo(() => classifyGCT(contactTimeSec), [contactTimeSec]);

  // Sayers Peak Power Formula: 61.9 * H(cm) + 36.0 * BW(kg) - 1822
  const peakPower = jumpHeight > 0 ? (61.9 * jumpHeight + 36.0 * weight - 1822) : 0;
  const relativePower = weight > 0 && peakPower > 0 ? peakPower / weight : 0;

  // Precise RSI Calculation based on selected mode
  const { finalRsi, rsiFormulaDisplay } = useMemo(() => {
    if (form.testType !== 'rsi') {
      return { finalRsi: 0, rsiFormulaDisplay: '' };
    }

    if (rsiMode === 'direct') {
      const val = parseFloat(form.rsiScoreDirect) || 0;
      return {
        finalRsi: val > 0 ? Number(val.toFixed(2)) : 0,
        rsiFormulaDisplay: val > 0 ? `${isAr ? 'قيمة مباشرة' : 'Direct Score'}: ${val.toFixed(2)}` : ''
      };
    } else if (rsiMode === 'auto_height') {
      // Standard Bosco / Vald / Flanagan method: Jump Height (m) / Contact Time (s)
      const heightM = jumpHeight > 1.5 ? jumpHeight / 100 : (jumpHeight > 0 ? jumpHeight : 0);
      if (heightM > 0 && contactTimeSec > 0) {
        const val = heightM / contactTimeSec;
        return {
          finalRsi: Number(val.toFixed(2)),
          rsiFormulaDisplay: `${heightM.toFixed(3)} m ÷ ${contactTimeSec.toFixed(3)} s = ${val.toFixed(2)}`
        };
      }
      return { finalRsi: 0, rsiFormulaDisplay: 'H(m) ÷ GCT(s)' };
    } else {
      // Flight Time / Contact Time method
      if (flightTime > 0 && contactTimeSec > 0) {
        const val = flightTime / contactTimeSec;
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
        const ft = Math.sqrt((8 * (h / 100)) / 9.81);
        updated.flightTimeSec = ft.toFixed(3);
      } else {
        updated.flightTimeSec = '';
      }
    } else if (field === 'flightTimeSec') {
      const ft = parseFloat(value);
      if (ft > 0) {
        const h = 1.22625 * Math.pow(ft, 2) * 100;
        updated.jumpHeightCm = h.toFixed(1);
      }
    }

    setForm(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) {
      alert(t.hud.selectAthlete);
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
        payload.peak_power_watts = peakPower > 0 ? peakPower.toFixed(0) : null;
        payload.mean_power_watts = peakPower > 0 ? (peakPower * 0.48).toFixed(0) : null;

        if (form.testType === 'rsi') {
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
        alert(isEn ? '✅ Measurement logged and saved to athlete profile!' : '✅ تم حفظ القياس بنجاح وتحديث ملف اللاعب فورياً!');
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
        alert(isEn ? 'Failed to save measurement. Please check athlete and values.' : 'تعذر حفظ القياس، يرجى التأكد من اختيار اللاعب وصحة الأرقام.');
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
    <div className={`space-y-6 animate-fade-in ${isAr ? 'text-right' : 'text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* =========================================================================
          TOP COMMAND HEADER & MODE SWITCHER
      ========================================================================= */}
      <div className="bg-[#101218] border border-[#1E2330] p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#D4FF00]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center text-[#D4FF00]">
              <Edit3 size={18} />
            </div>
            <span>{t.manualEntry.title}</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {t.manualEntry.subtitle}
          </p>
        </div>

        {/* Mode Switcher (Jump / Strength) */}
        <div className="flex items-center bg-[#090A0E] p-1.5 rounded-2xl border border-[#1E2330] text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setEntryMode('jump');
              setForm(prev => ({ ...prev, testType: 'cmj' }));
            }}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              entryMode === 'jump'
                ? 'bg-[#D4FF00] text-[#090A0E] shadow-[0_2px_12px_rgba(212,255,0,0.3)] font-black'
                : 'text-zinc-400 hover:text-white'
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
                ? 'bg-[#D4FF00] text-[#090A0E] shadow-[0_2px_12px_rgba(212,255,0,0.3)] font-black'
                : 'text-zinc-400 hover:text-white'
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
        <div className="lg:col-span-8 bg-[#101218] border border-[#1E2330] p-6 rounded-3xl shadow-xl">
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
                    className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] transition-all"
                  >
                    <option value="cmj">CMJ (Countermovement Jump with Arms)</option>
                    <option value="cmj_no_arms">CMJ (No Arms / Hands on Hips)</option>
                    <option value="sj_no_arms">Squat Jump (SJ - From Static 90°)</option>
                    <option value="approach">Approach / Spike Jump (Max Dynamic)</option>
                    <option value="rsi">Drop Jump / RSI (Reactive Strength)</option>
                  </select>
                ) : (
                  <select
                    value={form.testType}
                    onChange={e => setForm({ ...form, testType: e.target.value })}
                    className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] transition-all"
                  >
                    <option value="full_squat">Full Squat (سكوات كامل عميق)</option>
                    <option value="bench_press">Bench Press (بنش برس مستوي)</option>
                    <option value="power_clean">Power Clean (باور كلين انفجاري)</option>
                  </select>
                )}
              </div>

              <div>
                <label className="text-zinc-300 block mb-1.5 font-bold">{t.manualEntry.dateLabel}</label>
                <input
                  type="date"
                  value={form.created_at}
                  onChange={e => setForm({ ...form, created_at: e.target.value })}
                  className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2.5 text-white font-mono font-bold outline-none focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] transition-all"
                  required
                />
              </div>
            </div>

            {/* =========================================================================
                RSI DEDICATED CONFIGURATION BLOCK (WHEN TEST TYPE IS RSI)
            ========================================================================= */}
            {entryMode === 'jump' && form.testType === 'rsi' && (
              <div className="bg-[#151822] border border-[#272F42] p-4 sm:p-5 rounded-2xl space-y-4">
                
                {/* Method / Direct Toggle Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#272F42]">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Zap size={16} className="text-[#D4FF00]" />
                    <span>{t.manualEntry.rsiModeToggle}</span>
                  </div>

                  {/* 3-way mode switch */}
                  <div className="flex items-center bg-[#090A0E] p-1 rounded-xl border border-[#272F42] text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setRsiMode('direct')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        rsiMode === 'direct'
                          ? 'bg-[#D4FF00] text-[#090A0E] font-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t.manualEntry.rsiModeDirect}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsiMode('auto_height')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        rsiMode === 'auto_height'
                          ? 'bg-[#D4FF00] text-[#090A0E] font-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t.manualEntry.rsiModeAutoHeight}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsiMode('auto_flight')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        rsiMode === 'auto_flight'
                          ? 'bg-[#D4FF00] text-[#090A0E] font-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t.manualEntry.rsiModeAutoFlight}
                    </button>
                  </div>
                </div>

                {/* DIRECT RSI INPUT FIELD */}
                {rsiMode === 'direct' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="bg-[#090A0E] p-3.5 rounded-2xl border border-[#D4FF00]/40">
                      <label className="text-[#D4FF00] block mb-1 font-black text-xs flex items-center justify-between">
                        <span>{t.manualEntry.rsiDirectInput}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Score (e.g. 2.40)</span>
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
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {isAr ? 'أدخل رقم RSI الصادر من بساط القفز أو التطبيق مباشرة' : 'Direct index output from jump mat / telemetry device'}
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
                          placeholder={isAr ? "مثال: 180 أو 0.180" : "e.g. 180 ms or 0.180 s"}
                          value={form.contactTimeInput}
                          onChange={e => setForm({ ...form, contactTimeInput: e.target.value })}
                          className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2.5 text-white font-mono tabular-nums text-sm font-bold outline-none focus:border-[#D4FF00]"
                        />
                        <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-zinc-500 text-[11px] font-mono pointer-events-none">
                          {contactTimeMs > 0 ? `${contactTimeMs} ms` : 'ms / s'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {isAr ? 'يدعم كتابة الثواني (0.180) أو المللي ثانية (180) تلقائياً' : 'Accepts both seconds (0.180) and milliseconds (180)'}
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
                        className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2 text-white font-mono tabular-nums text-sm font-bold outline-none focus:border-[#D4FF00]"
                      />
                      <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2 text-zinc-500 text-[11px] font-mono pointer-events-none">cm</span>
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
                        className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2 text-white font-mono tabular-nums text-sm outline-none focus:border-[#D4FF00]"
                      />
                      <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2 text-zinc-500 text-[11px] font-mono pointer-events-none">sec</span>
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
                        className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2 text-white font-mono tabular-nums text-sm outline-none focus:border-[#D4FF00]"
                      />
                      <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2 text-zinc-500 text-[11px] font-mono pointer-events-none">cm</span>
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
                        placeholder="0.180 or 180"
                        value={form.contactTimeInput}
                        onChange={e => setForm({ ...form, contactTimeInput: e.target.value })}
                        className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2.5 text-white font-mono tabular-nums text-sm font-bold outline-none focus:border-[#D4FF00]"
                        required
                      />
                      <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-zinc-500 text-[11px] font-mono pointer-events-none">
                        {contactTimeMs > 0 ? `${contactTimeMs} ms` : 'ms / s'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                STANDARD JUMP MODE INPUTS (CMJ, SQUAT JUMP, APPROACH)
            ========================================================================= */}
            {entryMode === 'jump' && form.testType !== 'rsi' && (
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
                      className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2.5 text-[#D4FF00] font-mono tabular-nums text-base font-bold outline-none focus:border-[#D4FF00] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                    <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-zinc-500 text-xs font-mono pointer-events-none">cm</span>
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
                      className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2.5 text-white font-mono tabular-nums text-sm outline-none focus:border-[#D4FF00] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-zinc-500 text-xs font-mono pointer-events-none">sec</span>
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
                      className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2.5 text-[#D4FF00] font-mono tabular-nums text-base font-bold outline-none focus:border-[#D4FF00]"
                      required
                    />
                    <span className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-zinc-500 text-xs font-mono pointer-events-none">kg</span>
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
                    className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2.5 text-white font-mono tabular-nums text-sm font-bold outline-none focus:border-[#D4FF00]"
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
                    className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl px-3.5 py-2.5 text-white font-mono tabular-nums text-sm font-bold outline-none focus:border-[#D4FF00]"
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
                placeholder={isAr ? "ملاحظات وتوجيهات تدريبية اختيارية..." : "Optional coaching observations..."}
                className="w-full bg-[#0A0B0F] border border-[#1E2330] rounded-xl p-3 text-white text-xs outline-none focus:border-[#D4FF00] h-18 resize-none"
              />
            </div>

            {/* High-Impact Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 px-6 rounded-xl font-black text-sm text-[#090A0E] bg-gradient-to-r from-[#D4FF00] via-[#E2FF33] to-[#B8E600] shadow-[0_4px_20px_-2px_rgba(212,255,0,0.3)] hover:shadow-[0_6px_28px_rgba(212,255,0,0.45)] hover:scale-[1.008] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={18} className="text-[#090A0E]" />
                )}
                <span>{isSaving ? t.common.saving : t.manualEntry.saveMeasurement}</span>
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-bold text-center text-xs animate-fade-in flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>{t.common.success} — Updated Dossier Instantly!</span>
              </div>
            )}
          </form>
        </div>

        {/* =========================================================================
            LIVE MATH HUD (4 cols) — HIGH DENSITY TELEMETRY READOUT
        ========================================================================= */}
        <div className="lg:col-span-4 bg-[#101218] border border-[#1E2330] p-6 rounded-3xl shadow-xl space-y-4 font-mono text-xs">
          <div className="border-b border-[#1E2330] pb-3">
            <h3 className="font-heading font-black text-white text-sm flex items-center gap-2">
              <Gauge size={16} className="text-[#D4FF00]" />
              {isAr ? 'شاشة القراءات البيوميكانيكية المباشرة' : 'Live Biomechanical Readout'}
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
              {isAr ? 'تحليل فوري للمؤشرات قبل اعتماد الحفظ' : 'Instant telemetry validation before recording'}
            </p>
          </div>

          {entryMode === 'jump' ? (
            <div className="space-y-3">
              
              {/* RSI SPECIALIZED HUD CARD */}
              {form.testType === 'rsi' ? (
                <div className="bg-[#151822] border border-[#272F42] p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-bold">{isAr ? 'مؤشر RSI النهائي:' : 'Active RSI Score:'}</span>
                    <span className="text-2xl font-black text-[#D4FF00] tabular-nums">
                      {finalRsi > 0 ? finalRsi.toFixed(2) : '—'}
                    </span>
                  </div>

                  {rsiFormulaDisplay && (
                    <div className="text-[10px] text-zinc-400 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 font-mono">
                      {rsiFormulaDisplay}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <span className="text-zinc-400">{isAr ? 'زمن التلامس (GCT):' : 'Contact Time (GCT):'}</span>
                    <span className="text-white font-bold">
                      {contactTimeMs > 0 ? `${contactTimeMs} ms` : '—'}
                    </span>
                  </div>

                  {contactTimeSec > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">{isAr ? 'تصنيف الاستطالة:' : 'SSC Zone:'}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        gctAnalysis.classification === 'Fast SSC'
                          ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                          : gctAnalysis.classification === 'Moderate SSC'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}>
                        {gctAnalysis.classification}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#090A0E] border border-[#1E2330] flex justify-between items-center">
                  <span className="text-zinc-400">{isAr ? 'ارتفاع الوثب:' : 'Jump Height:'}</span>
                  <span className="text-lg font-black text-[#D4FF00] tabular-nums">
                    {jumpHeight > 0 ? `${jumpHeight.toFixed(1)} cm` : '—'}
                  </span>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-[#090A0E] border border-[#1E2330] flex justify-between items-center">
                <span className="text-zinc-400">{isAr ? 'زمن الطيران:' : 'Flight Duration:'}</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {flightTime > 0 ? `${flightTime.toFixed(3)} s` : '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#090A0E] border border-[#1E2330] flex justify-between items-center">
                <span className="text-zinc-400">{isAr ? 'القدرة القصوى (Sayers):' : 'Sayers Peak Power:'}</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {peakPower > 0 ? `${Math.round(peakPower)} W` : '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#090A0E] border border-[#1E2330] flex justify-between items-center">
                <span className="text-zinc-400">{isAr ? 'القدرة النسبية:' : 'Relative Power:'}</span>
                <span className="text-sm font-bold text-[#D4FF00] tabular-nums">
                  {relativePower > 0 ? `${relativePower.toFixed(1)} W/kg` : '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#090A0E] border border-[#1E2330] flex justify-between items-center">
                <span className="text-zinc-400">{isAr ? 'الوزن المرفوع:' : 'Weight Lifted:'}</span>
                <span className="text-lg font-black text-[#D4FF00] tabular-nums">
                  {cleanWeight > 0 ? `${cleanWeight} kg` : '—'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#090A0E] border border-[#1E2330] flex justify-between items-center">
                <span className="text-zinc-400">{isAr ? 'مضاعف وزن الجسم:' : 'Bodyweight Multiplier:'}</span>
                <span className="text-sm font-bold text-white tabular-nums">
                  {cleanWeight > 0 && weight > 0 ? `${(cleanWeight / weight).toFixed(2)}x BW` : '—'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#090A0E] border border-[#1E2330] flex justify-between items-center">
                <span className="text-zinc-400">{isAr ? 'التكرارات:' : 'Reps:'}</span>
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
        <div className="bg-[#101218] border border-[#1E2330] p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1E2330] pb-3 mb-4">
            <h3 className="font-heading font-black text-white text-sm flex items-center gap-2">
              <Calendar size={16} className="text-[#D4FF00]" />
              {t.manualEntry.recentLoggedTitle}
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">
              Total: {playerHistory.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono" style={{ textAlign: isAr ? 'right' : 'left' }}>
              <thead>
                <tr className="border-b border-[#1E2330] text-zinc-400 text-[10px] uppercase">
                  <th className="py-2.5 px-3">{t.profile.testTypeCol}</th>
                  <th className="py-2.5 px-3">{t.profile.scoreCol}</th>
                  <th className="py-2.5 px-3">{t.profile.contactTimeCol}</th>
                  <th className="py-2.5 px-3">{t.profile.dateCol}</th>
                  <th className="py-2.5 px-3 text-center">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {playerHistory.slice(-5).reverse().map((record) => {
                  const gct = record.contact_time_sec ? parseFloat(String(record.contact_time_sec)) : 0;
                  const gctMs = gct > 0 ? (gct >= 1 ? Math.round(gct) : Math.round(gct * 1000)) : 0;
                  return (
                    <tr key={record.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 text-white font-bold uppercase">{record.test_type}</td>
                      <td className="py-2.5 px-3 text-[#D4FF00] font-black">
                        {record.jump_height_cm ? `${record.jump_height_cm} cm` : record.rsi_score ? `RSI: ${record.rsi_score}` : record.clean_weight_kg ? `${record.clean_weight_kg} kg` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300">
                        {gctMs > 0 ? `${gctMs} ms` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                        {record.created_at ? String(record.created_at).substring(0, 10) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteTest(record.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
