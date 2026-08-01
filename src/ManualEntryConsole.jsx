import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Save, Printer, User, Trash2, ShieldCheck, Sparkles, Check, ChevronDown, Activity, Zap, Scale, Calendar, FileText, ArrowRight, Award, Plus, Target } from 'lucide-react';
import { supabase } from './supabaseClient';
import AppLogo from './AppLogo';

export default function ManualEntryConsole({
  players = [],
  selectedPlayerId = '',
  onSelectPlayer = () => {},
  activePlayer = null,
  playerHistory = [],
  onHistoryChange = () => {},
  language = 'ar'
}) {
  const isEn = language === 'en';

  // Entry Mode Selection: 'jump' | 'strength'
  const [entryMode, setEntryMode] = useState('jump');

  // Print Language & Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printLang, setPrintLang] = useState('ar');

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

  // Reset or initialize form defaults
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      created_at: new Date().toISOString().substring(0, 10)
    }));
  }, [selectedPlayerId]);

  // Derived Player Metrics
  const weight = parseFloat(activePlayer?.weight_kg) || 72;
  const heightCm = parseFloat(activePlayer?.height_cm) || 178;
  const legLengthM = parseFloat(activePlayer?.leg_length_m) || 1.0;

  // Live Math Calculations
  const jumpHeight = parseFloat(form.jumpHeightCm) || 0;
  const flightTime = parseFloat(form.flightTimeSec) || 0;
  const contactTime = parseFloat(form.contactTimeSec) || 0;
  const boxHeight = parseFloat(form.boxHeightCm) || 0;
  const addedLoad = parseFloat(form.addedLoadKg) || 0;
  const cleanWeight = parseFloat(form.cleanWeightKg) || 0;

  // Peak Power Formula (Sayers Model: 61.9 * H_cm + 36.0 * BW_kg - 1822)
  const peakPower = jumpHeight > 0 ? (61.9 * jumpHeight + 36.0 * weight - 1822) : 0;
  const relativePower = weight > 0 && peakPower > 0 ? peakPower / weight : 0;

  // RSI Score (Calculated from flight/contact time OR Direct Input from OVR JUMP)
  const calculatedRsi = flightTime > 0 && contactTime > 0 ? flightTime / contactTime : 0;
  const directRsi = parseFloat(form.rsiScoreDirect) || 0;
  const rsiScore = directRsi > 0 ? directRsi : calculatedRsi;

  // Takeoff Ground Reaction Force (GRF)
  const pushDistanceM = legLengthM * 0.45;
  const takeoffForceN = jumpHeight > 0 ? weight * 9.81 * ((jumpHeight / 100) / pushDistanceM + 1) : 0;
  const takeoffForceBW = weight > 0 ? takeoffForceN / (weight * 9.81) : 0;

  // Clean BW Ratio
  const cleanBwRatio = weight > 0 && cleanWeight > 0 ? cleanWeight / weight : 0;

  // Handle Input Changes with Smart Auto-Calculations
  const handleInputChange = (field, value) => {
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

  // Quick Preset Handlers
  const applyJumpPreset = (cm) => {
    const ft = Math.sqrt((8 * (cm / 100)) / 9.81);
    setForm(prev => ({
      ...prev,
      jumpHeightCm: cm.toString(),
      flightTimeSec: ft.toFixed(3)
    }));
  };

  const applyCleanPreset = (kg) => {
    setForm(prev => ({
      ...prev,
      cleanWeightKg: kg.toString()
    }));
  };

  // Save to Supabase DB
  const handleSaveToDatabase = async () => {
    if (!selectedPlayerId) {
      alert(isEn ? 'Please select an active athlete first!' : 'يرجى اختيار اللاعب أولاً من القائمة!');
      return;
    }

    if (jumpHeight === 0 && cleanWeight === 0 && rsiScore === 0) {
      alert(isEn ? 'Please enter valid test metrics!' : 'يرجى إدخال أرقام القياس أولاً!');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      let createdAtIso;
      try {
        createdAtIso = form.created_at ? new Date(form.created_at).toISOString() : new Date().toISOString();
      } catch (e) {
        createdAtIso = new Date().toISOString();
      }

      const weekNum = parseInt(form.weekNumber) || 1;
      const repsNum = parseInt(form.repsCount) || 1;

      // Auto strength details note if empty
      let defaultNotes = form.notes && form.notes.trim() ? form.notes.trim() : null;
      if (!defaultNotes && cleanWeight > 0) {
        const est1RM = (cleanWeight * (1 + 0.0333 * repsNum)).toFixed(1);
        defaultNotes = `📅 الأسبوع ${weekNum} • ${cleanWeight}kg × ${repsNum} تكرارات (1RM ≈ ${est1RM}kg)`;
      }

      const payload = {
        player_id: selectedPlayerId,
        test_type: form.testType,
        created_at: createdAtIso,
        jump_height_cm: jumpHeight > 0 ? parseFloat(jumpHeight.toFixed(1)) : 0,
        flight_time_sec: flightTime > 0 ? parseFloat(flightTime.toFixed(3)) : 0,
        takeoff_velocity_ms: flightTime > 0 ? parseFloat(((9.81 * flightTime) / 2).toFixed(2)) : 0,
        mean_power_watts: peakPower > 0 ? parseFloat((peakPower / 2.1).toFixed(0)) : 0,
        peak_power_watts: peakPower > 0 ? parseFloat(peakPower.toFixed(0)) : 0,
        mean_force_newtons: takeoffForceN > 0 ? parseFloat(takeoffForceN.toFixed(0)) : 0,
        contact_time_sec: contactTime > 0 ? parseFloat(contactTime.toFixed(3)) : null,
        rsi_score: rsiScore > 0 ? parseFloat(rsiScore.toFixed(2)) : null,
        box_height_cm: form.testType === 'rsi' && boxHeight > 0 ? boxHeight : null,
        added_load_kg: addedLoad > 0 ? addedLoad : 0,
        clean_weight_kg: cleanWeight > 0 ? cleanWeight : 0,
        clean_bw_ratio: cleanBwRatio > 0 ? parseFloat(cleanBwRatio.toFixed(2)) : 0,
        week_number: weekNum,
        reps_count: repsNum,
        notes: defaultNotes
      };

      const { data, error } = await supabase.from('lab_jump_measurements').insert([payload]).select();

      if (error) throw error;

      if (data && data.length > 0) {
        onHistoryChange([...playerHistory, data[0]]);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving measurement:', err);
      alert(isEn ? `Failed to save measurement: ${err.message || 'Check connection.'}` : `تعذر حفظ القياس اليدوي: ${err.message || 'يرجى التحقق من الاتصال.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Test Measurement
  const handleDeleteTest = async (testId) => {
    if (!window.confirm(isEn ? 'Are you sure you want to delete this test measurement?' : 'هل أنت تأكد من رغبتك في حذف هذا الاختبار المعتمد؟')) return;

    try {
      const { error } = await supabase.from('lab_jump_measurements').delete().eq('id', testId);
      if (error) throw error;

      onHistoryChange(playerHistory.filter(item => item.id !== testId));
    } catch (err) {
      console.error('Error deleting test:', err);
      alert(isEn ? 'Failed to delete test record.' : 'حدث خطأ أثناء حذف الاختبار.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* SPORTY ORANGE INFOGRAPHIC PRINT REPORT SHEET             */}
      {/* ======================================================== */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media screen {
            .printable-manual-sheet { display: none !important; }
          }
          @media print {
            body * { visibility: hidden !important; }
            .printable-manual-sheet, .printable-manual-sheet * { visibility: visible !important; }
            .printable-manual-sheet {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
              color: #0f172a !important;
              padding: 28px !important;
              box-sizing: border-box !important;
            }

            .print-orange-header {
              border-bottom: 4px solid #ea580c !important;
              padding-bottom: 16px !important;
              margin-bottom: 20px !important;
            }

            .print-infographic-card {
              border: 2px solid #fdba74 !important;
              background-color: #fffaf0 !important;
              border-radius: 16px !important;
              padding: 16px !important;
              box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.05) !important;
            }
          }
        `
      }} />

      <div className="printable-manual-sheet font-sans" style={{ direction: printLang === 'en' ? 'ltr' : 'rtl' }}>
        {/* Infographic Header */}
        <div className="print-orange-header flex justify-between items-center">
          <div className="flex items-center gap-4">
            <AppLogo size={50} showGlow={false} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">
                  {printLang === 'en' ? 'Athletic Performance & Biomechanics Lab' : 'مختبر الأداء الرياضي والميكانيكا الحيوية'}
                </h1>
                <span className="text-[10px] font-black px-2 py-0.5 bg-[#ea580c] text-white rounded-md">
                  MANUAL ENTRY INFOGRAPHIC
                </span>
              </div>
              <p className="text-xs text-orange-700 font-bold mt-0.5">
                {printLang === 'en' ? 'Official Biomechanical Test Entry Report' : 'تقرير قياس الأداء الحركي والارتقاء (إدخال يدوي)'}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-700">
            <p><strong>{printLang === 'en' ? 'Date:' : 'التاريخ:'}</strong> {form.created_at}</p>
            <p><strong>{printLang === 'en' ? 'Method:' : 'طريقة القياس:'}</strong> Calibrated HUD Terminal</p>
          </div>
        </div>

        {/* Athlete Personal Specs */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl mb-6 shadow-md">
          <h3 className="font-black text-orange-400 mb-2 text-xs uppercase tracking-wider">
            {printLang === 'en' ? 'Athlete Profile' : 'بيانات اللاعب الشخصية'}
          </h3>
          <div className="grid grid-cols-4 gap-4 text-xs font-mono">
            <p><strong>{printLang === 'en' ? 'Name:' : 'الاسم:'}</strong> <span className="text-white">{activePlayer?.full_name || '—'}</span></p>
            <p><strong>{printLang === 'en' ? 'Weight:' : 'الوزن:'}</strong> <span className="text-white">{weight} kg</span></p>
            <p><strong>{printLang === 'en' ? 'Height:' : 'الطول:'}</strong> <span className="text-white">{heightCm} cm</span></p>
            <p><strong>{printLang === 'en' ? 'Category:' : 'الفئة:'}</strong> <span className="text-orange-400 font-bold">{form.testType.toUpperCase()}</span></p>
          </div>
        </div>

        {/* Infographic Metric Cards Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="print-infographic-card text-center">
            <span className="text-[10px] text-orange-800 font-black uppercase block mb-1">
              🚀 {printLang === 'en' ? 'Jump Height' : 'ارتفاع القفز'}
            </span>
            <span className="text-3xl font-black text-orange-600 font-mono block">
              {jumpHeight > 0 ? `${jumpHeight} cm` : '—'}
            </span>
            <span className="text-[10px] font-bold text-slate-600 font-mono block mt-1">
              ({(jumpHeight * 0.393701).toFixed(1)} inches)
            </span>
          </div>

          <div className="print-infographic-card text-center" style={{ backgroundColor: '#f0fdfa', borderColor: '#99f6e4' }}>
            <span className="text-[10px] text-teal-800 font-black uppercase block mb-1">
              ⏱️ {printLang === 'en' ? 'Flight Time' : 'زمن الطيران'}
            </span>
            <span className="text-3xl font-black text-teal-700 font-mono block">
              {flightTime > 0 ? `${flightTime} s` : '—'}
            </span>
            <span className="text-[10px] font-bold text-teal-800 font-mono block mt-1">
              Airborne Duration
            </span>
          </div>

          <div className="print-infographic-card text-center" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>
            <span className="text-[10px] text-slate-800 font-black uppercase block mb-1">
              ⚡ {printLang === 'en' ? 'Peak Power Output' : 'ذروة القدرة الميكانيكية'}
            </span>
            <span className="text-3xl font-black text-slate-900 font-mono block">
              {peakPower > 0 ? `${peakPower.toFixed(0)} W` : '—'}
            </span>
            <span className="text-[10px] font-bold text-slate-600 font-mono block mt-1">
              ({relativePower > 0 ? `${relativePower.toFixed(1)} W/kg` : '—'})
            </span>
          </div>
        </div>

        {/* Diagnostic Callout Box - Concise for PDF as requested */}
        <div className="border-r-8 border-[#ea580c] bg-[#fffaf0] p-4 rounded-xl mb-6 text-xs leading-relaxed font-mono">
          <p className="font-black text-slate-900 mb-1">
            🔬 {printLang === 'en' ? 'Takeoff Kinematics & Force Diagnostics:' : 'التشخيص الحركي:'}
          </p>
          <p className="text-slate-800 font-bold">
            • {printLang === 'en'
                ? `RSI Index: ${rsiScore > 0 ? rsiScore.toFixed(2) : 'N/A'}. Takeoff Force: ${takeoffForceN > 0 ? `${takeoffForceN.toFixed(0)} N` : 'N/A'}.`
                : `مؤشر القوة التفاعلية RSI: ${rsiScore > 0 ? rsiScore.toFixed(2) : 'غير متوفر'}. قوة الدفع: ${takeoffForceN > 0 ? `${takeoffForceN.toFixed(0)} نيوتن` : 'غير متوفر'}.`}
          </p>
        </div>

        {/* Validation Signatures */}
        <div className="mt-8 flex justify-between items-center text-xs pt-6 border-t-2 border-slate-300">
          <div className="text-center w-52">
            <p className="font-black text-slate-900">{printLang === 'en' ? 'Biokinetic Specialist' : 'أخصائي القياس الحركي'}</p>
            <p className="text-xs text-orange-700 font-bold mt-1">{printLang === 'en' ? 'Mahmoud Ali' : 'محمود علي'}</p>
            <div className="h-8"></div>
            <p className="text-slate-400">....................................</p>
          </div>
          <div className="text-center w-52">
            <p className="font-black text-slate-900">{printLang === 'en' ? 'Assistant Specialist' : 'مساعد أخصائي القياس'}</p>
            <p className="text-xs text-orange-700 font-bold mt-1">{printLang === 'en' ? 'Mostafa Ali' : 'مصطفى علي'}</p>
            <div className="h-8"></div>
            <p className="text-slate-400">....................................</p>
          </div>
        </div>
      </div>


      {/* ======================================================== */}
      {/* SCREEN CONTROL HUD                                       */}
      {/* ======================================================== */}

      {/* 1. Header & Active Athlete Selection Bar */}
      <div className="glass-panel p-6 border-l-4 border-l-cyan-500 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 hud-card">
        <div className="flex items-center gap-4">
          <AppLogo size={46} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">
                {isEn ? 'Manual Biomechanical Entry Terminal' : 'محطة الإدخال والتسجيل اليدوي المعاير'}
              </h2>
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[9px] px-2.5 py-0.5 rounded-full font-mono font-bold">
                Smart HUD v2.5
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              {isEn ? 'Instant kinetic calculations & calibrated jump logging' : 'حسابات ميكانيكية فورية وحفظ الاختبارات في ملف اللاعب المسجل'}
            </p>
          </div>
        </div>

        {/* Active Athlete Badge (Synced with Top Header) */}
        <div className="flex items-center gap-3 bg-cyan-950/40 border border-cyan-500/30 px-4 py-2.5 rounded-2xl shadow-lg shadow-cyan-500/10">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 font-black flex items-center justify-center text-xs font-mono border border-cyan-500/40">
            {activePlayer?.full_name ? activePlayer.full_name[0] : <User size={16} />}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-400 font-bold uppercase">{isEn ? 'Active Athlete:' : 'اللاعب الحالي:'}</span>
            <span className="text-sm font-black text-white">
              {activePlayer?.full_name || (isEn ? 'No Athlete Selected' : 'لم يتم اختيار لاعب')}
            </span>
          </div>
        </div>
      </div>


      {/* 2. Dual Mode Entry Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form Panel (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 space-y-6 hud-card">
          
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEntryMode('jump')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  entryMode === 'jump'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-black/30 text-gray-400 hover:text-white'
                }`}
              >
                <Activity size={16} />
                {isEn ? 'Vertical Jump Engine' : 'Vertical Jump Tests'}
              </button>

              <button
                onClick={() => setEntryMode('strength')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  entryMode === 'strength'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-black/30 text-gray-400 hover:text-white'
                }`}
              >
                <Zap size={16} />
                {isEn ? 'Strength & 1RM Engine' : 'Strength & Power Clean 1RM'}
              </button>
            </div>

            <span className="text-[10px] font-mono text-gray-400">
              {form.created_at}
            </span>
          </div>


          {/* JUMP MODE FORM */}
          {entryMode === 'jump' ? (
            <div className="space-y-4">
              
              {/* Test Type Select - Always English Test Names as requested */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  {isEn ? 'Jump Test Category' : 'نوع اختبار الوثب (Test Category)'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'cmj', label: 'CMJ (Arms)' },
                    { id: 'cmj_no_arms', label: 'CMJ (No Arms)' },
                    { id: 'sj_no_arms', label: 'Squat Jump (SJ)' },
                    { id: 'rsi', label: 'Drop Jump (RSI)' },
                    { id: 'approach', label: 'Approach Jump 🚀' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, testType: item.id }))}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        form.testType === item.id
                          ? 'bg-blue-600/20 border-blue-500 text-cyan-400 font-black'
                          : 'bg-black/30 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <span className="text-xs block font-bold font-mono">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Jump Height Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-300">
                    {form.testType === 'approach'
                      ? (isEn ? 'Approach Jump Height (cm)' : 'ارتفاع الارتقاء الحركي بالخطوتين (Approach Jump cm)')
                      : (isEn ? 'Jump Height (cm)' : 'ارتفاع القفزة العمودية (Jump Height cm)')}
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono">Auto-calculates flight time</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  placeholder="مثال: 68.5"
                  value={form.jumpHeightCm}
                  onChange={(e) => handleInputChange('jumpHeightCm', e.target.value)}
                  className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-white font-mono font-bold text-lg focus:border-cyan-500 outline-none transition-all"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-gray-500 font-bold">{isEn ? 'Presets:' : 'اختصارات سريعة:'}</span>
                  {[45, 55, 65, 75, 85].map(cm => (
                    <button
                      key={cm}
                      type="button"
                      onClick={() => applyJumpPreset(cm)}
                      className="px-2.5 py-1 bg-gray-900 hover:bg-blue-600/30 border border-gray-800 rounded-lg text-[10px] font-mono text-gray-300 transition-all"
                    >
                      {cm} cm
                    </button>
                  ))}
                </div>
              </div>

              {/* Flight Time & Contact Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">
                    {isEn ? 'Flight Time (sec)' : 'زمن الطيران (Flight Time s)'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.670"
                    value={form.flightTimeSec}
                    onChange={(e) => handleInputChange('flightTimeSec', e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded-xl p-2.5 text-white font-mono text-sm focus:border-cyan-500 outline-none"
                  />
                </div>

                {form.testType === 'rsi' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-yellow-400">
                      {isEn ? 'Ground Contact Time (sec)' : 'زمن التلامس الأرضي (Contact Time s)'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.220"
                      value={form.contactTimeSec}
                      onChange={(e) => handleInputChange('contactTimeSec', e.target.value)}
                      className="w-full bg-black/40 border border-yellow-500/40 rounded-xl p-2.5 text-white font-mono text-sm focus:border-yellow-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* BOX HEIGHT & DIRECT RSI INPUT FOR DROP JUMP / RSI */}
              {form.testType === 'rsi' && (
                <div className="space-y-3 pt-2 bg-yellow-950/20 p-4 border border-yellow-500/30 rounded-2xl">
                  {/* Box Height Input */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-yellow-400 flex items-center gap-1.5">
                        📦 {isEn ? 'Drop Jump Box Height (cm)' : 'ارتفاع البوكس (Box Height cm)'}
                      </label>
                      <span className="text-[10px] text-yellow-300 font-mono">Plyometric Box</span>
                    </div>
                    <input
                      type="number"
                      placeholder="مثال: 30"
                      value={form.boxHeightCm}
                      onChange={(e) => setForm(prev => ({ ...prev, boxHeightCm: e.target.value }))}
                      className="w-full bg-black/60 border border-yellow-500/40 rounded-xl p-2.5 text-yellow-300 font-mono font-bold text-sm focus:border-yellow-400 outline-none"
                    />
                    {/* Box Height Presets */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-gray-500 font-bold">{isEn ? 'Box Presets:' : 'ارتفاعات البوكس:'}</span>
                      {[20, 30, 40, 50, 60].map(cm => (
                        <button
                          key={cm}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, boxHeightCm: cm.toString() }))}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                            form.boxHeightCm === cm.toString()
                              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 font-black'
                              : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          {cm} cm
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direct RSI Input */}
                  <div className="space-y-1.5 pt-2 border-t border-yellow-500/20">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-yellow-400 flex items-center gap-1.5">
                        <Target size={14} />
                        {isEn ? 'Direct RSI Score Input (OVR JUMP Device)' : 'إدخال مؤشر RSI المباشر (جهاز OVR JUMP)'}
                      </label>
                      <span className="text-[9px] text-yellow-300 font-mono bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/30">OVR JUMP</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="مثال: 2.15"
                      value={form.rsiScoreDirect}
                      onChange={(e) => setForm(prev => ({ ...prev, rsiScoreDirect: e.target.value }))}
                      className="w-full bg-black/60 border border-yellow-500/60 rounded-xl p-2.5 text-yellow-300 font-mono font-black text-lg focus:border-yellow-400 outline-none"
                    />
                    <p className="text-[10px] text-yellow-200/80 font-sans">
                      💡 {isEn ? 'If measuring with OVR JUMP device, enter the direct RSI output score here.' : 'إذا كنت تقيس بجهاز OVR JUMP، أدخل قيمة الـ RSI الظاهرة على الجهاز مباشرة هنا.'}
                    </p>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* STRENGTH & CLEAN / SQUAT / BENCH MODE FORM */
            <div className="space-y-4">
              
              {/* Strength Exercise Selector */}
              <div>
                <label className="text-xs font-bold text-emerald-400 block mb-1.5">
                  {isEn ? 'Strength Exercise Category (1RM)' : 'نوع تمرين القوة والتأهيل (1RM Category)'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'full_squat', label: 'Full Squat 🏋️‍♂️' },
                    { id: 'bench_press', label: 'Bench Press 💪' },
                    { id: 'power_clean', label: 'Power Clean ⚡' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, testType: item.id }))}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        form.testType === item.id || (item.id === 'power_clean' && (form.testType === 'cmj' || form.testType === 'rsi'))
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 font-black'
                          : 'bg-black/30 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <span className="text-xs block font-bold font-mono">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {/* Weight Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-400">
                    {form.testType === 'full_squat'
                      ? (isEn ? 'Lift Weight (kg)' : 'الوزن المرفوع (kg)')
                      : form.testType === 'bench_press'
                        ? (isEn ? 'Bench Press Weight (kg)' : 'وزن تمرين بنش بريس (kg)')
                        : (isEn ? 'Power Clean Weight (kg)' : 'وزن رفعة كلين (kg)')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="مثال: 120"
                    value={form.cleanWeightKg}
                    onChange={(e) => handleInputChange('cleanWeightKg', e.target.value)}
                    className="w-full bg-black/40 border border-emerald-500/40 rounded-xl p-3 text-white font-mono font-bold text-lg focus:border-emerald-500 outline-none"
                  />

                  {/* Clean / Squat Barbell Presets */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-gray-500 font-bold">{isEn ? 'Barbell Load:' : 'أوزان البار:'}</span>
                    {[60, 80, 100, 120, 140].map(kg => (
                      <button
                        key={kg}
                        type="button"
                        onClick={() => applyCleanPreset(kg)}
                        className="px-2.5 py-1 bg-gray-900 hover:bg-emerald-600/30 border border-gray-800 rounded-lg text-[10px] font-mono text-gray-300 transition-all"
                      >
                        {kg} kg
                      </button>
                    ))}
                  </div>
                </div>

                {/* Repetitions (Reps Count) Input */}
                <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Target size={14} />
                      {isEn ? 'Repetitions Performed (Reps)' : 'عدد العدات والتكرارات المنفذة بالوزن (Reps)'}
                    </label>
                    <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {form.repsCount} {isEn ? 'reps' : 'عدات'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={form.repsCount}
                      onChange={(e) => setForm(prev => ({ ...prev, repsCount: e.target.value }))}
                      className="w-24 bg-black/40 border border-emerald-500/40 rounded-xl p-2.5 text-white font-mono font-bold text-base focus:border-emerald-500 outline-none text-center"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap flex-1">
                      {[1, 3, 5, 8, 10, 12].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, repsCount: r.toString() }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                            form.repsCount === r.toString()
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-black shadow-sm'
                              : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          {r} {isEn ? 'reps' : 'عدات'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Weekly Block / Microcycle Selector */}
                <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Calendar size={14} />
                      {isEn ? 'Weekly Block / Microcycle (Week #)' : 'رقم الأسبوع التدريبي (Weekly Block)'}
                    </label>
                    <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {isEn ? `Week ${form.weekNumber}` : `الأسبوع ${form.weekNumber}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={form.weekNumber}
                      onChange={(e) => setForm(prev => ({ ...prev, weekNumber: e.target.value }))}
                      className="w-24 bg-black/40 border border-emerald-500/40 rounded-xl p-2.5 text-white font-mono font-bold text-base focus:border-emerald-500 outline-none text-center"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap flex-1">
                      {[1, 2, 3, 4, 5, 6, 8, 12].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, weekNumber: w.toString() }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                            form.weekNumber === w.toString()
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-black shadow-sm'
                              : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          {isEn ? `W${w}` : `الأسبوع ${w}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bodyweight Ratio & Estimated 1RM Live Calculation Card */}
                {parseFloat(form.cleanWeightKg) > 0 && (
                  <div className="p-3 bg-gradient-to-r from-emerald-950/80 via-black to-slate-950 border border-emerald-500/40 rounded-2xl font-mono space-y-2 shadow-lg">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                      <span className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                        🏋️ {isEn ? 'Strength Telemetry Summary:' : 'ملخص حمل وأداة القوة:'}
                      </span>
                      <span className="text-[11px] font-black text-emerald-400">
                        {isEn ? `Week ${form.weekNumber}` : `الأسبوع ${form.weekNumber}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-black/60 p-2 rounded-xl border border-emerald-500/30">
                        <span className="text-[9px] text-gray-400 block font-bold mb-0.5">{isEn ? 'RELATIVE LOAD' : 'نسبة وزن الجسم'}</span>
                        <span className="font-black text-emerald-400 text-sm block">
                          {activePlayer?.weight_kg > 0 ? (parseFloat(form.cleanWeightKg) / parseFloat(activePlayer.weight_kg)).toFixed(2) : 0}x BW
                        </span>
                      </div>

                      <div className="bg-black/60 p-2 rounded-xl border border-emerald-500/30">
                        <span className="text-[9px] text-gray-400 block font-bold mb-0.5">{isEn ? 'ESTIMATED 1RM' : 'تقدير الـ 1RM الأقصى'}</span>
                        <span className="font-black text-amber-300 text-sm block">
                          {(parseFloat(form.cleanWeightKg) * (1 + 0.0333 * (parseInt(form.repsCount) || 1))).toFixed(1)} kg
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}


          {/* Optional Test Notes */}
          <div className="pt-2 border-t border-gray-800/80">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5 mb-1.5">
              📝 {isEn ? 'Measurement Notes & Context (Optional)' : 'ملاحظات وتفاصيل القياس (اختياري)'}
            </label>
            <input
              type="text"
              placeholder={isEn ? 'e.g. After heavy leg day, excellent attempt, returning from injury...' : 'مثال: بعد تمرين أثقال شاق، أفضل محاولة، عائد من راحة سلبيّة...'}
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-black/40 border border-gray-800 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:border-cyan-500 outline-none transition-all"
            />
          </div>

          {/* Save & Print Action Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-800">
            <button
              onClick={handleSaveToDatabase}
              disabled={isSaving}
              className="w-full sm:flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Activity className="animate-spin" size={16} /> : <Save size={16} />}
              {isEn ? 'Save Measurement to Athlete Dossier' : 'حفظ القياس في ملف اللاعب المعاير'}
            </button>

            <button
              onClick={() => {
                setPrintLang(language);
                setIsPrintModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-500/20"
            >
              <Printer size={16} />
              {isEn ? 'Print Infographic PDF' : 'طباعة تقرير Infographic'}
            </button>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold flex items-center gap-2">
              <Check size={16} />
              {isEn ? 'Measurement successfully saved to athlete dossier!' : 'تم حفظ القياس بنجاح وتسجيله في ملف اللاعب!'}
            </div>
          )}

        </div>


        {/* Right Live Physics Engine Panel (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-6 space-y-4 hud-card flex flex-col justify-between">
          
          <div className="border-b border-gray-800 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400" />
              {isEn ? 'Live Kinematic Calculator Engine' : 'محرك الحسابات الميكانيكية اللحظي'}
            </h3>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
              Live Realtime
            </span>
          </div>

          <div className="space-y-3 font-mono">
            {/* Peak Power Card */}
            <div className="p-3.5 bg-black/40 border border-gray-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold font-sans block">Sayers Peak Power:</span>
                <span className="text-lg font-black text-cyan-400">{peakPower > 0 ? `${peakPower.toFixed(0)} W` : '—'}</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                {relativePower > 0 ? `${relativePower.toFixed(1)} W/kg` : '—'}
              </span>
            </div>

            {/* Takeoff Force Card */}
            <div className="p-3.5 bg-black/40 border border-gray-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold font-sans block">Takeoff Force (GRF):</span>
                <span className="text-base font-black text-white">{takeoffForceN > 0 ? `${takeoffForceN.toFixed(0)} N` : '—'}</span>
              </div>
              <span className="text-xs font-bold text-blue-400 bg-blue-950/30 px-2.5 py-1 rounded-lg border border-blue-500/20">
                {takeoffForceBW > 0 ? `${takeoffForceBW.toFixed(2)} BW` : '—'}
              </span>
            </div>

            {/* RSI Score Card */}
            {form.testType === 'rsi' && (
              <div className="p-3.5 bg-yellow-950/20 border border-yellow-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-yellow-400 font-bold font-sans block">RSI Stiffness Index:</span>
                  <span className="text-lg font-black text-yellow-400">{rsiScore > 0 ? rsiScore.toFixed(2) : '—'}</span>
                </div>
                <span className="text-[10px] font-bold text-yellow-300 bg-yellow-950/50 px-2 py-0.5 rounded">
                  {rsiScore >= 2.2 ? 'Elite 👑' : rsiScore >= 1.5 ? 'Good ⭐' : 'Normal ⚡'}
                </span>
              </div>
            )}

            {/* Clean BW Ratio Card */}
            {cleanWeight > 0 && (
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold font-sans block">Clean 1RM / BW Ratio:</span>
                  <span className="text-lg font-black text-emerald-400">{cleanBwRatio > 0 ? `${cleanBwRatio.toFixed(2)}x BW` : '—'}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/50 px-2 py-0.5 rounded">
                  {cleanBwRatio >= 1.4 ? 'Elite 👑' : 'Good ⭐'}
                </span>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl text-[10px] text-blue-300 font-semibold leading-relaxed">
            💡 {isEn ? 'All biomechanical formulas use Harman & Sayers equations calibrated for elite athletic testing.' : 'تستخدم المعادلة الحسابية نموذج Sayers و Harman المعاير دولياً لاختبارات الأداء الحركي.'}
          </div>

        </div>

      </div>


      {/* 3. Interactive Measurements History Log Matrix */}
      <div className="glass-panel p-6 hud-card space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-cyan-400 border border-blue-500/20">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isEn ? 'Recorded Measurements History Log' : 'سجل القياسات اليدوية واختبارات اللاعب الحالية'}
              </h3>
              <p className="text-[11px] text-gray-400 font-semibold">
                {isEn ? 'All recorded manual tests for the selected athlete' : 'عرض كامل الاختبارات المعتمدة المسجلة للاعب المختار في النظام'}
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-500/30">
            {playerHistory.length} {isEn ? 'Tests Saved' : 'اختبار مسجل'}
          </span>
        </div>

        {playerHistory.length === 0 ? (
          <div className="text-center py-10 text-gray-500 border border-dashed border-gray-800 rounded-2xl p-6">
            <Activity size={32} className="mx-auto text-cyan-500/40 mb-2 animate-pulse" />
            <p className="text-xs font-bold text-gray-400">
              {isEn ? 'No measurements recorded for this athlete yet.' : 'لا توجد قياسات يدوية مسجلة لهذا اللاعب حتى الآن.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-blue-950/40 text-blue-300 font-bold border-b border-gray-800">
                  <th className="p-3">{isEn ? 'Date' : 'التاريخ'}</th>
                  <th className="p-3">{isEn ? 'Category' : 'نوع الاختبار'}</th>
                  <th className="p-3">{isEn ? 'Jump Height' : 'ارتفاع القفز'}</th>
                  <th className="p-3">{isEn ? 'Flight Time' : 'زمن الطيران'}</th>
                  <th className="p-3">{isEn ? 'Peak Power' : 'ذروة القدرة'}</th>
                  <th className="p-3">{isEn ? 'Relative Power' : 'القدرة النسبية'}</th>
                  <th className="p-3">{isEn ? 'Strength & Load' : 'حمل القوة والأسبوع (Load & Reps)'}</th>
                  <th className="p-3">{isEn ? 'Actions' : 'إجراءات'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono text-gray-300">
                {playerHistory.map((jump, idx) => {
                  const hCm = parseFloat(jump.jump_height_cm) || 0;
                  const fSec = parseFloat(jump.flight_time_sec) || 0;
                  const pWatts = parseFloat(jump.peak_power_watts) || 0;
                  const rWatts = weight > 0 && pWatts > 0 ? (pWatts / weight).toFixed(1) : '—';
                  const cleanKg = parseFloat(jump.clean_weight_kg) || 0;
                  const reps = jump.reps_count || 1;
                  const week = jump.week_number || 1;

                  return (
                    <tr key={jump.id || idx} className="hover:bg-blue-600/10 transition-colors">
                      <td className="p-3 text-gray-400">{new Date(jump.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="p-3 font-sans font-bold text-white uppercase">{jump.test_type}</td>
                      <td className="p-3 text-cyan-400 font-black">{hCm > 0 ? `${hCm} cm` : '—'}</td>
                      <td className="p-3 text-gray-300">{fSec > 0 ? `${fSec} s` : '—'}</td>
                      <td className="p-3 text-blue-400 font-bold">{pWatts > 0 ? `${pWatts} W` : '—'}</td>
                      <td className="p-3 text-emerald-400 font-bold">{rWatts !== '—' ? `${rWatts} W/kg` : '—'}</td>
                      <td className="p-3 text-yellow-400 font-bold">
                        {cleanKg > 0 ? (
                          <div className="flex flex-col items-center">
                            <span>{cleanKg} kg</span>
                            <span className="text-[10px] text-amber-300 font-sans bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 mt-0.5">
                              الأسبوع {week} • {reps} {reps > 2 ? 'تكرارات' : 'تكرار'}
                            </span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteTest(jump.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete test record"
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
        )}
      </div>


      {/* Print Language Selection Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 space-y-6 hud-card border-orange-500/30">
            <div className="flex items-center gap-3">
              <AppLogo size={36} />
              <div>
                <h3 className="text-base font-black text-white">
                  {isEn ? 'Print Infographic PDF Report' : 'طباعة التقرير Infographic PDF'}
                </h3>
                <p className="text-xs text-gray-400">
                  {isEn ? 'Select language for printable report' : 'اختر لغة طباعة التقرير المستخرج'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setPrintLang('ar');
                  setIsPrintModalOpen(false);
                  setTimeout(() => window.print(), 200);
                }}
                className="p-4 bg-orange-950/40 hover:bg-orange-600/30 border border-orange-500/40 rounded-xl text-center transition-all cursor-pointer"
              >
                <span className="text-sm font-black text-white block">العربية (Arabic)</span>
                <span className="text-[10px] text-orange-400 block mt-1">تقرير برتقالي عالي التباين</span>
              </button>

              <button
                onClick={() => {
                  setPrintLang('en');
                  setIsPrintModalOpen(false);
                  setTimeout(() => window.print(), 200);
                }}
                className="p-4 bg-cyan-950/40 hover:bg-cyan-600/30 border border-cyan-500/40 rounded-xl text-center transition-all cursor-pointer"
              >
                <span className="text-sm font-black text-white block">English</span>
                <span className="text-[10px] text-cyan-400 block mt-1">English Infographic Report</span>
              </button>
            </div>

            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-400 text-xs font-bold rounded-xl"
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
