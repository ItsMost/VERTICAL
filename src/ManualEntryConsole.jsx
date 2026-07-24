import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Save, Printer, User, Trash2, ShieldCheck, Sparkles, Check, ChevronDown, Activity, Zap, Scale, Calendar, FileText, ArrowRight, Award, Plus } from 'lucide-react';
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
    addedLoadKg: '',
    cleanWeightKg: '',
    cleanBwRatio: ''
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
  const addedLoad = parseFloat(form.addedLoadKg) || 0;
  const cleanWeight = parseFloat(form.cleanWeightKg) || 0;

  // Peak Power Formula (Sayers Model: 61.9 * H_cm + 36.0 * BW_kg - 1822)
  const peakPower = jumpHeight > 0 ? (61.9 * jumpHeight + 36.0 * weight - 1822) : 0;
  const relativePower = weight > 0 && peakPower > 0 ? peakPower / weight : 0;

  // RSI Score (Flight Time / Contact Time)
  const rsiScore = flightTime > 0 && contactTime > 0 ? flightTime / contactTime : 0;

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
        // Auto calculate flight time: t_f = sqrt(8 * h / 9.81)
        const ft = Math.sqrt((8 * (h / 100)) / 9.81);
        updated.flightTimeSec = ft.toFixed(3);
      } else {
        updated.flightTimeSec = '';
      }
    } else if (field === 'flightTimeSec') {
      const ft = parseFloat(value);
      if (ft > 0) {
        // Auto calculate height: h = 1.22625 * t_f^2 * 100
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

    if (jumpHeight === 0 && cleanWeight === 0) {
      alert(isEn ? 'Please enter valid jump height or clean weight!' : 'يرجى إدخال ارتفاع القفز أو وزن الكلين أولاً!');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        player_id: selectedPlayerId,
        test_type: form.testType,
        created_at: new Date(form.created_at).toISOString(),
        jump_height_cm: jumpHeight > 0 ? jumpHeight.toFixed(1) : 0,
        flight_time_sec: flightTime > 0 ? flightTime.toFixed(3) : 0,
        takeoff_velocity_ms: flightTime > 0 ? ((9.81 * flightTime) / 2).toFixed(2) : 0,
        mean_power_watts: peakPower > 0 ? (peakPower / 2.1).toFixed(0) : 0,
        peak_power_watts: peakPower > 0 ? peakPower.toFixed(0) : 0,
        mean_force_newtons: takeoffForceN > 0 ? takeoffForceN.toFixed(0) : 0,
        contact_time_sec: contactTime > 0 ? contactTime.toFixed(3) : null,
        rsi_score: rsiScore > 0 ? rsiScore.toFixed(2) : null,
        added_load_kg: addedLoad > 0 ? addedLoad : 0,
        clean_weight_kg: cleanWeight > 0 ? cleanWeight : 0,
        clean_bw_ratio: cleanBwRatio > 0 ? cleanBwRatio.toFixed(2) : 0
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
      alert(isEn ? 'Failed to save measurement. Check connection.' : 'تعذر حفظ القياس اليدوي. يرجى التحقق من الاتصال.');
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
      {/* PRINT REPORT SHEET (HIDDEN ON REGULAR SCREEN)           */}
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
              color: #000000 !important;
              padding: 24px !important;
            }
          }
        `
      }} />

      <div className="printable-manual-sheet font-sans" style={{ direction: printLang === 'en' ? 'ltr' : 'rtl' }}>
        {/* Printable Header */}
        <div className="flex justify-between items-center pb-4 mb-6 border-b-2 border-blue-600">
          <div className="flex items-center gap-3">
            <AppLogo size={44} showGlow={false} />
            <div>
              <h1 className="text-xl font-black text-blue-900">
                {printLang === 'en' ? 'Athletic Performance & Biomechanics Lab' : 'مختبر الأداء الرياضي والميكانيكا الحيوية'}
              </h1>
              <p className="text-xs text-gray-700 font-bold">
                {printLang === 'en' ? 'Official Biomechanical Test Entry Report' : 'تقرير قياس الأداء الحركي والارتقاء (إدخال يدوي)'}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] font-mono text-gray-800">
            <p>{printLang === 'en' ? 'Date:' : 'التاريخ:'} {form.created_at}</p>
            <p>{printLang === 'en' ? 'Method:' : 'طريقة القياس:'} Manual Calibrated HUD</p>
          </div>
        </div>

        {/* Printable Athlete Specs */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 mb-6 text-xs">
          <h3 className="font-black text-blue-900 mb-2">
            {printLang === 'en' ? 'Athlete Profile' : 'بيانات اللاعب الشخصية'}
          </h3>
          <div className="grid grid-cols-4 gap-4 text-slate-900 font-medium">
            <p><strong>{printLang === 'en' ? 'Name:' : 'الاسم:'}</strong> {activePlayer?.full_name || '—'}</p>
            <p><strong>{printLang === 'en' ? 'Weight:' : 'الوزن:'}</strong> {weight} kg</p>
            <p><strong>{printLang === 'en' ? 'Height:' : 'الطول:'}</strong> {heightCm} cm</p>
            <p><strong>{printLang === 'en' ? 'Test:' : 'الاختبار:'}</strong> {form.testType.toUpperCase()}</p>
          </div>
        </div>

        {/* Executive Metrics Grid for Print */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border-2 border-blue-600 p-4 rounded-xl text-center bg-blue-50/30">
            <span className="text-[10px] text-gray-600 font-bold block">{printLang === 'en' ? 'Jump Height' : 'ارتفاع القفز'}</span>
            <span className="text-2xl font-black text-blue-900 font-mono">{jumpHeight > 0 ? `${jumpHeight} cm` : '—'}</span>
          </div>

          <div className="border-2 border-slate-300 p-4 rounded-xl text-center bg-white">
            <span className="text-[10px] text-gray-600 font-bold block">{printLang === 'en' ? 'Flight Time' : 'زمن الطيران'}</span>
            <span className="text-2xl font-black text-slate-900 font-mono">{flightTime > 0 ? `${flightTime} s` : '—'}</span>
          </div>

          <div className="border-2 border-emerald-600 p-4 rounded-xl text-center bg-emerald-50/30">
            <span className="text-[10px] text-gray-600 font-bold block">{printLang === 'en' ? 'Peak Power' : 'ذروة القدرة'}</span>
            <span className="text-2xl font-black text-emerald-900 font-mono">{peakPower > 0 ? `${peakPower.toFixed(0)} W` : '—'}</span>
          </div>
        </div>

        {/* Validation Signatures */}
        <div className="mt-12 flex justify-between items-center text-xs pt-6 border-t border-dashed border-gray-400">
          <div className="text-center w-48">
            <p className="font-black text-gray-900">{printLang === 'en' ? 'Biokinetic Specialist' : 'أخصائي القياس الحركي'}</p>
            <p className="text-xs text-gray-800 mt-1 font-bold">{printLang === 'en' ? 'Mahmoud Ali' : 'محمود علي'}</p>
            <div className="h-8"></div>
            <p className="text-gray-400">....................................</p>
          </div>
          <div className="text-center w-48">
            <p className="font-black text-gray-900">{printLang === 'en' ? 'Assistant Specialist' : 'مساعد أخصائي القياس'}</p>
            <p className="text-xs text-gray-800 mt-1 font-bold">{printLang === 'en' ? 'Mostafa Ali' : 'مصطفى علي'}</p>
            <div className="h-8"></div>
            <p className="text-gray-400">....................................</p>
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

        {/* Athlete Quick Selector */}
        <div className="flex items-center gap-3 bg-black/40 border border-gray-800 p-2.5 rounded-2xl">
          <User className="text-cyan-400 shrink-0" size={18} />
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-400 font-bold uppercase">{isEn ? 'Active Athlete:' : 'اللاعب الحالي:'}</span>
            <select
              value={selectedPlayerId}
              onChange={(e) => onSelectPlayer(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-4"
            >
              <option value="" className="bg-gray-900 text-gray-400">{isEn ? '-- Select Athlete --' : '-- اختر لاعباً --'}</option>
              {players.map(p => (
                <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                  {p.full_name} ({p.weight_kg}kg)
                </option>
              ))}
            </select>
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
                {isEn ? 'Vertical Jump Engine' : 'اختبارات الوثب العمودي'}
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
                {isEn ? 'Strength & 1RM Engine' : 'أحمال الكلين والقوة (1RM)'}
              </button>
            </div>

            <span className="text-[10px] font-mono text-gray-400">
              {form.created_at}
            </span>
          </div>


          {/* JUMP MODE FORM */}
          {entryMode === 'jump' ? (
            <div className="space-y-4">
              
              {/* Test Type Select */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  {isEn ? 'Jump Test Category' : 'نوع اختبار الوثب العمودي'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cmj', nameAr: 'ارتداد باليدين (CMJ)', nameEn: 'CMJ (Arms)' },
                    { id: 'cmj_no_arms', nameAr: 'ارتداد بدون يدين', nameEn: 'CMJ (No Arms)' },
                    { id: 'sj_no_arms', nameAr: 'ثبات بدون يدين (SJ)', nameEn: 'Squat Jump (SJ)' },
                    { id: 'rsi', nameAr: 'ساقط ارتدادي (Drop Jump)', nameEn: 'Drop Jump (RSI)' },
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
                      <span className="text-xs block">{isEn ? item.nameEn : item.nameAr}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Jump Height Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-300">
                    {isEn ? 'Jump Height (cm)' : 'ارتفاع القفزة العمودية (سم)'}
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono">Auto-calculates flight time</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  placeholder="مثال: 55.5"
                  value={form.jumpHeightCm}
                  onChange={(e) => handleInputChange('jumpHeightCm', e.target.value)}
                  className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-white font-mono font-bold text-lg focus:border-cyan-500 outline-none transition-all"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-gray-500 font-bold">{isEn ? 'Presets:' : 'اختصارات سريعة:'}</span>
                  {[40, 50, 60, 70, 80].map(cm => (
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
                    {isEn ? 'Flight Time (sec)' : 'زمن الطيران (ثانية)'}
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
                      {isEn ? 'Ground Contact Time (sec)' : 'زمن التلامس الأرضي (ثانية)'}
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

            </div>
          ) : (
            /* STRENGTH & CLEAN MODE FORM */
            <div className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-400">
                  {isEn ? 'Power Clean 1RM (kg)' : 'وزن أقصى رفعة كلين (Power Clean 1RM)'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="مثال: 95"
                  value={form.cleanWeightKg}
                  onChange={(e) => handleInputChange('cleanWeightKg', e.target.value)}
                  className="w-full bg-black/40 border border-emerald-500/40 rounded-xl p-3 text-white font-mono font-bold text-lg focus:border-emerald-500 outline-none"
                />

                {/* Clean Barbell Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-gray-500 font-bold">{isEn ? 'Barbell Load:' : 'أوزان البار:'}</span>
                  {[60, 80, 100, 120].map(kg => (
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

            </div>
          )}


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
              className="w-full sm:w-auto px-5 py-3 bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Printer size={16} />
              {isEn ? 'Print PDF Report' : 'طباعة تقرير PDF'}
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
                <span className="text-[10px] text-gray-400 font-bold font-sans block">{isEn ? 'Sayers Peak Power:' : 'ذروة القدرة الميكانيكية:'}</span>
                <span className="text-lg font-black text-cyan-400">{peakPower > 0 ? `${peakPower.toFixed(0)} W` : '—'}</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                {relativePower > 0 ? `${relativePower.toFixed(1)} W/kg` : '—'}
              </span>
            </div>

            {/* Takeoff Force Card */}
            <div className="p-3.5 bg-black/40 border border-gray-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold font-sans block">{isEn ? 'Takeoff Ground Force (GRF):' : 'قوة الدفع لحظة الإقلاع:'}</span>
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
                  <span className="text-[10px] text-yellow-400 font-bold font-sans block">{isEn ? 'Reactive Strength Index (RSI):' : 'مؤشر القوة التفاعلية (RSI):'}</span>
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
                  <span className="text-[10px] text-emerald-400 font-bold font-sans block">{isEn ? 'Clean Bodyweight Ratio:' : 'نسبة رفع الكلين للوزن:'}</span>
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
                  <th className="p-3">{isEn ? 'Clean 1RM' : 'الكلين'}</th>
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

                  return (
                    <tr key={jump.id || idx} className="hover:bg-blue-600/10 transition-colors">
                      <td className="p-3 text-gray-400">{new Date(jump.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="p-3 font-sans font-bold text-white uppercase">{jump.test_type}</td>
                      <td className="p-3 text-cyan-400 font-black">{hCm > 0 ? `${hCm} cm` : '—'}</td>
                      <td className="p-3 text-gray-300">{fSec > 0 ? `${fSec} s` : '—'}</td>
                      <td className="p-3 text-blue-400 font-bold">{pWatts > 0 ? `${pWatts} W` : '—'}</td>
                      <td className="p-3 text-emerald-400 font-bold">{rWatts !== '—' ? `${rWatts} W/kg` : '—'}</td>
                      <td className="p-3 text-yellow-400 font-bold">{cleanKg > 0 ? `${cleanKg} kg` : '—'}</td>
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
          <div className="glass-panel max-w-md w-full p-6 space-y-6 hud-card border-blue-500/30">
            <div className="flex items-center gap-3">
              <AppLogo size={36} />
              <div>
                <h3 className="text-base font-black text-white">
                  {isEn ? 'Print Report Options' : 'خيارات طباعة التقرير اليدوي'}
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
                className="p-4 bg-blue-950/40 hover:bg-blue-600/30 border border-blue-500/40 rounded-xl text-center transition-all cursor-pointer"
              >
                <span className="text-sm font-black text-white block">العربية (Arabic)</span>
                <span className="text-[10px] text-gray-400 block mt-1">تقرير باللغة العربية</span>
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
                <span className="text-[10px] text-gray-400 block mt-1">English Report</span>
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
