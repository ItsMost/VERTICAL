import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3, Save, Printer, User, Trash2, Check, ChevronDown,
  Activity, Zap, Scale, Calendar, FileText, ArrowRight, Award, Plus, Layers
} from 'lucide-react';
import { useData } from './context/DataContext';
import AppLogo from './AppLogo';
import { classifyGCT } from './useJumpMechanics';

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

  // Entry Mode Selection: 'jump' | 'strength'
  const [entryMode, setEntryMode] = useState<'jump' | 'strength'>('jump');

  // Print Language & Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printLang, setPrintLang] = useState<'ar' | 'en'>(language === 'en' ? 'en' : 'ar');

  // Form State
  const [form, setForm] = useState({
    testType: 'cmj',
    created_at: new Date().toISOString().substring(0, 10),
    jumpHeightCm: '',
    flightTimeSec: '',
    contactTimeSec: '',
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
  const legLengthM = parseFloat(String(activePlayer?.leg_length_m)) || 1.0;

  // Live Math Calculations
  const jumpHeight = parseFloat(form.jumpHeightCm) || 0;
  const flightTime = parseFloat(form.flightTimeSec) || 0;
  const contactTime = parseFloat(form.contactTimeSec) || 0;
  const boxHeight = parseFloat(form.boxHeightCm) || 0;
  const addedLoad = parseFloat(form.addedLoadKg) || 0;
  const cleanWeight = parseFloat(form.cleanWeightKg) || 0;

  // Sayers Peak Power
  const peakPower = jumpHeight > 0 ? (61.9 * jumpHeight + 36.0 * weight - 1822) : 0;
  const relativePower = weight > 0 && peakPower > 0 ? peakPower / weight : 0;

  // RSI Calculation
  const calculatedRsi = flightTime > 0 && contactTime > 0 ? (flightTime / contactTime) : 0;
  const directRsi = parseFloat(form.rsiScoreDirect) || 0;
  const rsiScore = directRsi > 0 ? directRsi : calculatedRsi;

  // Auto conversion
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
        payload.contact_time_sec = contactTime > 0 ? contactTime.toFixed(4) : null;
        payload.box_height_cm = boxHeight > 0 ? boxHeight : null;
        payload.added_load_kg = addedLoad > 0 ? addedLoad : null;
        payload.peak_power_watts = peakPower > 0 ? peakPower.toFixed(0) : null;
        payload.mean_power_watts = peakPower > 0 ? (peakPower * 0.48).toFixed(0) : null;
        payload.rsi_score = rsiScore > 0 ? rsiScore.toFixed(3) : null;
      } else {
        // Strength mode
        payload.clean_weight_kg = cleanWeight > 0 ? cleanWeight : null;
        payload.reps_count = parseInt(form.repsCount) || 1;
        payload.week_number = parseInt(form.weekNumber) || 1;
        if (cleanWeight > 0 && weight > 0) {
          payload.clean_bw_ratio = (cleanWeight / weight).toFixed(2);
        }
      }

      // CENTRAL DATA REFRESH CALL (Instant In-Memory Parity + Supabase Sync)
      const res = await addMeasurement(payload);
      if (res) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        alert(language === 'en' ? '✅ Measurement logged and saved to athlete profile!' : '✅ تم حفظ القياس بنجاح في ملف اللاعب!');
        // Reset numeric inputs
        setForm(prev => ({
          ...prev,
          jumpHeightCm: '',
          flightTimeSec: '',
          contactTimeSec: '',
          rsiScoreDirect: '',
          cleanWeightKg: '',
          notes: ''
        }));
      } else {
        alert(language === 'en' ? 'Failed to save measurement. Please check athlete and values.' : 'تعذر حفظ القياس، يرجى التأكد من اختيار اللاعب وصحة الأرقام.');
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
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="bento-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-black text-white flex items-center gap-2">
            <Edit3 className="text-[#D4FF00]" size={22} />
            {t.manualEntry.title}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {t.manualEntry.subtitle}
          </p>
        </div>

        {/* Mode Switcher (Jump / Strength) */}
        <div className="flex items-center bg-zinc-900 p-1 rounded-2xl border border-zinc-800 text-xs font-bold font-mono">
          <button
            type="button"
            onClick={() => {
              setEntryMode('jump');
              setForm(prev => ({ ...prev, testType: 'cmj' }));
            }}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              entryMode === 'jump'
                ? 'bg-[#D4FF00] text-[#09090B] shadow-md font-black'
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
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              entryMode === 'strength'
                ? 'bg-[#D4FF00] text-[#09090B] shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers size={14} />
            <span>{t.manualEntry.strengthMode}</span>
          </button>
        </div>
      </div>

      {/* Main Entry Grid (Form + Live Math HUD) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* FORM CONTAINER (8 cols) */}
        <div className="lg:col-span-8 bento-card p-6">
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            
            {/* Top Row: Test Type & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-400 block mb-1 font-bold">
                  {entryMode === 'jump' ? t.manualEntry.testTypeLabel : t.manualEntry.strengthLiftLabel}
                </label>
                {entryMode === 'jump' ? (
                  <select
                    value={form.testType}
                    onChange={e => setForm({ ...form, testType: e.target.value })}
                    className="glass-input w-full font-bold bg-[#121215] text-white"
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
                    className="glass-input w-full font-bold bg-[#121215] text-white"
                  >
                    <option value="full_squat">Full Squat (سكوات كامل عميق)</option>
                    <option value="bench_press">Bench Press (بنش برس مستوي)</option>
                    <option value="power_clean">Power Clean (باور كلين انفجاري)</option>
                  </select>
                )}
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-bold">{t.manualEntry.dateLabel}</label>
                <input
                  type="date"
                  value={form.created_at}
                  onChange={e => setForm({ ...form, created_at: e.target.value })}
                  className="glass-input w-full font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* JUMP MODE SPECIFIC INPUTS */}
            {entryMode === 'jump' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-zinc-400 block mb-1 font-bold">{t.manualEntry.heightInput}</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 58.5"
                    value={form.jumpHeightCm}
                    onChange={e => handleInputChange('jumpHeightCm', e.target.value)}
                    className="glass-input w-full font-mono text-base font-bold text-[#D4FF00]"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-bold">{t.manualEntry.flightTimeInput}</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="e.g. 0.690"
                    value={form.flightTimeSec}
                    onChange={e => handleInputChange('flightTimeSec', e.target.value)}
                    className="glass-input w-full font-mono text-sm"
                  />
                </div>

                {form.testType === 'rsi' && (
                  <>
                    <div>
                      <label className="text-zinc-400 block mb-1 font-bold">{t.manualEntry.contactTimeInput}</label>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="e.g. 0.180"
                        value={form.contactTimeSec}
                        onChange={e => setForm({ ...form, contactTimeSec: e.target.value })}
                        className="glass-input w-full font-mono text-base font-bold text-[#D4FF00]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1 font-bold">{t.manualEntry.boxHeightInput}</label>
                      <input
                        type="number"
                        step="1"
                        value={form.boxHeightCm}
                        onChange={e => setForm({ ...form, boxHeightCm: e.target.value })}
                        className="glass-input w-full font-mono text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STRENGTH MODE SPECIFIC INPUTS */}
            {entryMode === 'strength' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-zinc-400 block mb-1 font-bold">{t.manualEntry.weightLiftedInput}</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 140"
                    value={form.cleanWeightKg}
                    onChange={e => setForm({ ...form, cleanWeightKg: e.target.value })}
                    className="glass-input w-full font-mono text-base font-bold text-[#D4FF00]"
                    required
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-bold">{t.manualEntry.repsCountLabel}</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={form.repsCount}
                    onChange={e => setForm({ ...form, repsCount: e.target.value })}
                    className="glass-input w-full font-mono text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-bold">{t.manualEntry.weekNumberLabel}</label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={form.weekNumber}
                    onChange={e => setForm({ ...form, weekNumber: e.target.value })}
                    className="glass-input w-full font-mono text-sm font-bold"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-zinc-400 block mb-1 font-bold">{t.manualEntry.notesLabel}</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional coaching observation..."
                className="glass-input w-full h-16 text-xs"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-volt w-full py-3.5 rounded-xl text-sm font-black shadow-lg flex items-center justify-center gap-2"
              >
                {isSaving ? <span className="animate-spin">⏳</span> : <Save size={16} />}
                <span>{isSaving ? t.common.saving : t.manualEntry.saveMeasurement}</span>
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-bold text-center text-xs animate-fade-in flex items-center justify-center gap-2">
                <Check size={16} />
                <span>{t.common.success} — Updated Dossier Instantly!</span>
              </div>
            )}
          </form>
        </div>

        {/* LIVE MATH HUD (4 cols) */}
        <div className="lg:col-span-4 bento-card p-6 space-y-4 font-mono text-xs">
          <div className="border-b border-zinc-800 pb-2">
            <h3 className="font-heading font-bold text-white text-sm">
              Live Biomechanical Readout
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans">
              Dynamic physical capacity estimations
            </p>
          </div>

          {entryMode === 'jump' ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                <span className="text-zinc-400">Jump Height:</span>
                <span className="text-base font-bold text-[#D4FF00]">
                  {jumpHeight > 0 ? `${jumpHeight.toFixed(1)} cm` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                <span className="text-zinc-400">Flight Duration:</span>
                <span className="text-sm font-bold text-white">
                  {flightTime > 0 ? `${flightTime.toFixed(3)} s` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                <span className="text-zinc-400">Sayers Peak Power:</span>
                <span className="text-sm font-bold text-white">
                  {peakPower > 0 ? `${Math.round(peakPower)} W` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                <span className="text-zinc-400">Relative Power:</span>
                <span className="text-sm font-bold text-[#D4FF00]">
                  {relativePower > 0 ? `${relativePower.toFixed(1)} W/kg` : '—'}
                </span>
              </div>
              {form.testType === 'rsi' && (
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                  <span className="text-zinc-400">RSI Score:</span>
                  <span className="text-base font-bold text-[#D4FF00]">
                    {rsiScore > 0 ? rsiScore.toFixed(2) : '—'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                <span className="text-zinc-400">Weight Lifted:</span>
                <span className="text-base font-bold text-[#D4FF00]">
                  {cleanWeight > 0 ? `${cleanWeight} kg` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                <span className="text-zinc-400">Bodyweight Ratio:</span>
                <span className="text-base font-bold text-[#FF5500]">
                  {cleanWeight > 0 && weight > 0 ? `${(cleanWeight / weight).toFixed(2)}x BW` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center">
                <span className="text-zinc-400">Estimated 1RM:</span>
                <span className="text-sm font-bold text-white">
                  {cleanWeight > 0 ? `${Math.round(cleanWeight * (1 + (parseInt(form.repsCount) || 1) / 30))} kg` : '—'}
                </span>
              </div>
            </div>
          )}

          {activePlayer && (
            <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-400 font-sans">
              Logging to active athlete: <strong className="text-white">{activePlayer.full_name}</strong> ({activePlayer.weight_kg} kg)
            </div>
          )}
        </div>
      </div>

      {/* RECENT LOGGED SESSION LIST (Filterable, Instant Delete) */}
      <div className="bento-card p-6 space-y-4">
        <h3 className="font-heading font-bold text-white text-base">
          {t.manualEntry.recentLoggedTitle} ({playerHistory.length})
        </h3>

        {playerHistory.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Metric / Score</th>
                  <th className="py-2.5 px-3">Contact (GCT)</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right rtl:text-left">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {playerHistory.slice(-8).reverse().map(record => {
                  const gct = record.contact_time_sec ? parseFloat(String(record.contact_time_sec)) : 0;
                  return (
                    <tr key={record.id} className="hover:bg-zinc-900/60">
                      <td className="py-2.5 px-3 font-bold text-white uppercase">
                        {record.test_type}
                      </td>
                      <td className="py-2.5 px-3 text-[#D4FF00] font-bold">
                        {record.jump_height_cm ? `${record.jump_height_cm} cm` : record.rsi_score ? record.rsi_score : record.clean_weight_kg ? `${record.clean_weight_kg} kg` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300">
                        {gct > 0 ? `${(gct * 1000).toFixed(0)} ms` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                        {record.created_at ? String(record.created_at).substring(0, 10) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right rtl:text-left">
                        <button
                          onClick={() => handleDeleteTest(record.id)}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title={t.common.delete}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-zinc-500 font-mono">
            {t.common.noData}
          </div>
        )}
      </div>
    </div>
  );
}
