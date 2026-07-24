import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Activity, Zap, Save, Printer, ArrowUpCircle, Scale, ShieldCheck, Dumbbell, Award, HelpCircle, X, Download, Trash2, Calendar, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function ManualEntryConsole({ 
  activePlayer, 
  selectedPlayerId, 
  onSaveSuccess, 
  language = 'ar',
  playerHistory = [] 
}) {
  const isEn = language === 'en';

  const [form, setForm] = useState({
    testType: 'cmj_arms',
    created_at: new Date().toISOString().substring(0, 10),
    jumpHeightCm: '',
    flightTimeSec: '',
    contactTimeSec: '',
    cleanWeightKg: '',
    addedLoadKg: '',
    legUsed: 'both',
    customNotes: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  // Print modal states for Infographic PDF Report
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printLang, setPrintLang] = useState(language);
  const [printStep, setPrintStep] = useState(1);
  const [printWithInfographics, setPrintWithInfographics] = useState(true);

  const handlePrintLanguageSelect = (lang) => {
    setPrintLang(lang);
    setPrintStep(2);
  };

  const handlePrintReportFinal = (withInfographics) => {
    setPrintWithInfographics(withInfographics);
    setIsPrintModalOpen(false);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setPrintStep(1);
      }, 1000);
    }, 300);
  };


  // Sync player data when activePlayer changes
  const weight = parseFloat(activePlayer?.weight_kg) || 72;
  const legLength = parseFloat(activePlayer?.leg_length_m) || 1.0;
  const playerHeight = parseFloat(activePlayer?.height_cm) || 180;

  // Bi-directional live calculations
  const handleInputChange = (field, val) => {
    let updated = { ...form, [field]: val };

    const calcFlightTime = (hCm) => Math.sqrt((8 * (parseFloat(hCm) / 100)) / 9.81);
    const calcHeight = (fSec) => 1.22625 * Math.pow(parseFloat(fSec), 2) * 100;

    if (field === 'jumpHeightCm') {
      const h = parseFloat(val);
      if (h > 0) {
        updated.flightTimeSec = calcFlightTime(h).toFixed(3);
      } else {
        updated.flightTimeSec = '';
      }
    } else if (field === 'flightTimeSec') {
      const ft = parseFloat(val);
      if (ft > 0) {
        updated.jumpHeightCm = calcHeight(ft).toFixed(1);
      } else {
        updated.jumpHeightCm = '';
      }
    }

    setForm(updated);
  };

  // Calculated metrics
  const jumpHeight = parseFloat(form.jumpHeightCm) || 0;
  const flightTime = parseFloat(form.flightTimeSec) || 0;
  const contactTime = parseFloat(form.contactTimeSec) || 0;
  const cleanWeight = parseFloat(form.cleanWeightKg) || 0;
  const addedLoad = parseFloat(form.addedLoadKg) || 0;

  const totalMass = weight + addedLoad;
  const harmanPower = (jumpHeight > 0 && totalMass > 0) ? (61.9 * jumpHeight + 36.0 * totalMass - 1822) : 0;
  const sayersPower = (jumpHeight > 0 && totalMass > 0) ? (60.7 * jumpHeight + 45.3 * totalMass - 2055) : 0;
  const peakPower = harmanPower > 0 ? harmanPower : (sayersPower > 0 ? sayersPower : 0);
  const relativePower = (peakPower > 0 && weight > 0) ? (peakPower / weight) : 0;

  const pushDistance = legLength * 0.45;
  const takeoffForceN = (jumpHeight > 0 && totalMass > 0) 
    ? (totalMass * 9.81 * ((jumpHeight / 100) / pushDistance + 1)) 
    : 0;
  const takeoffForceBW = (takeoffForceN > 0 && weight > 0) ? (takeoffForceN / (weight * 9.81)) : 0;

  const rsiScore = (jumpHeight > 0 && contactTime > 0) ? ((jumpHeight / 100) / contactTime) : 0;
  const cleanBwRatio = (cleanWeight > 0 && weight > 0) ? (cleanWeight / weight) : 0;

  const handleSave = async () => {
    if (!selectedPlayerId) {
      alert(isEn ? "Please select an athlete first." : "الرجاء اختيار لاعب أولاً.");
      return;
    }
    if (jumpHeight <= 0 && cleanWeight <= 0) {
      alert(isEn ? "Please enter a jump height or clean weight." : "الرجاء إدخال ارتفاع القفزة أو وزن الكلين.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        player_id: selectedPlayerId,
        test_type: form.testType,
        jump_height_cm: jumpHeight > 0 ? jumpHeight.toFixed(1) : 0,
        flight_time_sec: flightTime > 0 ? flightTime.toFixed(3) : 0,
        contact_time_sec: contactTime > 0 ? contactTime.toFixed(3) : null,
        rsi_score: rsiScore > 0 ? rsiScore.toFixed(2) : null,
        takeoff_velocity_ms: jumpHeight > 0 ? Math.sqrt(2 * 9.81 * (jumpHeight / 100)).toFixed(2) : 0,
        mean_power_watts: peakPower > 0 ? (peakPower / 2.1).toFixed(0) : 0,
        peak_power_watts: peakPower > 0 ? peakPower.toFixed(0) : 0,
        mean_force_newtons: takeoffForceN > 0 ? takeoffForceN.toFixed(0) : 0,
        leg_used: form.legUsed,
        created_at: form.created_at ? new Date(form.created_at).toISOString() : new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('lab_jump_measurements')
        .insert([payload])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        if (onSaveSuccess) onSaveSuccess(data[0]);
        alert(isEn ? "✅ Measurement saved successfully!" : "✅ تم حفظ القياس اليدوي بنجاح في سجل اللاعب!");
      }
    } catch (err) {
      alert((isEn ? "Error saving measurement: " : "خطأ في حفظ القياس: ") + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`space-y-6 ${isEn ? 'text-left' : 'text-right'}`} style={{ direction: isEn ? 'ltr' : 'rtl' }}>
      
      {/* Printable CSS Rules */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-manual-sheet, .printable-manual-sheet * {
            visibility: visible !important;
          }
          .printable-manual-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 25px !important;
            font-family: 'Cairo', sans-serif !important;
          }
          .screen-only-manual {
            display: none !important;
          }
        }
      `}} />

      {/* ================= SCREEN VIEW ================= */}
      <div className="screen-only-manual space-y-6">
        
        {/* Header Title Card */}
        <div className="glass-panel p-6 metallic-glass-border hud-card flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-500 flex items-center justify-center text-white text-2xl shadow-lg border border-blue-400/40 shrink-0">
              <Edit3 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                {isEn ? 'Manual Data Entry & Clean Assessment' : 'شاشة الإدخال اليدوي الحُر ورفعات الكلين'}
              </h2>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                {isEn 
                  ? 'Input jump heights, flight times, contact times & Power Clean weights with instant physics calculations.'
                  : 'إدخال كامل الأرقام يدوياً مع حسابات فورية للأوتار، القدرة الانفجارية، ورفعة الكلين.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-black/40 hover:bg-blue-600/20 text-blue-400 border border-blue-800/40 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Printer size={16} />
              <span>{isEn ? 'Print Report' : 'طباعة التقرير PDF'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 btn-orange-gradient text-xs font-black flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Save size={16} />
              <span>{isSaving ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Save to Athlete Record' : 'حفظ القياس في سجل اللاعب')}</span>
            </button>
          </div>
        </div>

        {/* Athlete Info Banner */}
        <div className="bg-black/30 border border-gray-800 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold">{isEn ? 'Selected Athlete:' : 'اللاعب المختار:'}</span>
            <span className="font-black text-white bg-blue-950/60 px-3 py-1 rounded-xl border border-blue-500/30 text-sm">
              {activePlayer ? activePlayer.full_name : (isEn ? 'No Athlete Selected' : 'لم يتم اختيار لاعب')}
            </span>
          </div>

          <div className="flex items-center gap-6 font-mono text-gray-300">
            <span>{isEn ? 'Weight:' : 'الوزن:'} <strong className="text-blue-400">{weight} kg</strong></span>
            <span>{isEn ? 'Height:' : 'القامة:'} <strong className="text-blue-400">{playerHeight} cm</strong></span>
            <span>{isEn ? 'Leg Length:' : 'طول الرجل:'} <strong className="text-blue-400">{legLength.toFixed(2)} m</strong></span>
          </div>
        </div>

        {/* Input Controls Grid */}
        <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
          
          {/* Left Column: Manual Form Fields */}
          <div className="w-full glass-panel p-6 metallic-glass-border hud-card space-y-5">
            <h3 className="font-black text-sm text-blue-400 border-b border-gray-800 pb-2.5 flex items-center gap-2">
              <Activity size={18} /> {isEn ? 'Manual Measurement Inputs' : 'مدخلات الأرقام والقياسات اليدوية'}
            </h3>

            {/* Test Type Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs text-gray-400 font-bold">{isEn ? 'Test Category / Tag:' : 'نوع القياس أو القفزة:'}</label>
              <select
                value={form.testType}
                onChange={(e) => handleInputChange('testType', e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-gray-800 p-3 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-bold"
              >
                <option value="sj_no_arms" className="bg-gray-900 text-white">Squat Jump - SJ (بدون يدين)</option>
                <option value="cmj_no_arms" className="bg-gray-900 text-white">Countermovement Jump - CMJ (بدون يدين)</option>
                <option value="sj_arms" className="bg-gray-900 text-white">Squat Jump - SJ (باليدين)</option>
                <option value="cmj_arms" className="bg-gray-900 text-white">Countermovement Jump - CMJ (باليدين)</option>
                <option value="approach" className="bg-gray-900 text-white">Approach Jump (قفزة اقتراب)</option>
                <option value="rsi" className="bg-gray-900 text-white">Drop Jump / RSI (الوثب الساقط)</option>
                <option value="clean" className="bg-gray-900 text-white">🏋️‍♂️ Power Clean / Clean (رفعة الكلين)</option>
                <option value="loaded_jump" className="bg-gray-900 text-white">🏋️‍♂️ Loaded Jump (قفزة بأوزان)</option>
              </select>
            </div>

            {/* Test Date & Leg Used */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">{isEn ? 'Measurement Date:' : 'تاريخ القياس:'}</label>
                <input
                  type="date"
                  value={form.created_at}
                  onChange={(e) => handleInputChange('created_at', e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-gray-800 p-2.5 text-xs text-white rounded-xl outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">{isEn ? 'Leg Used:' : 'الرجل المستخدمة:'}</label>
                <select
                  value={form.legUsed}
                  onChange={(e) => handleInputChange('legUsed', e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-gray-800 p-2.5 text-xs text-white rounded-xl outline-none font-bold"
                >
                  <option value="both" className="bg-gray-900 text-white">{isEn ? 'Both Legs' : 'كلا الرجلين (Both)'}</option>
                  <option value="right" className="bg-gray-900 text-white">{isEn ? 'Right Leg' : 'الرجل اليمنى (Right)'}</option>
                  <option value="left" className="bg-gray-900 text-white">{isEn ? 'Left Leg' : 'الرجل اليسرى (Left)'}</option>
                </select>
              </div>
            </div>

            {/* Dynamic Input Fields Based on Test Category */}
            {form.testType === 'clean' ? (
              /* CLEAN LIFT ONLY INPUTS */
              <div className="space-y-4">
                <div className="bg-emerald-950/20 p-5 rounded-lg border border-emerald-500/30 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-emerald-400 font-extrabold flex items-center gap-1.5">
                      <Dumbbell size={18} /> {isEn ? 'Clean / Power Clean Weight (kg):' : 'وزن رفعة الكلين (Power Clean 1RM kg):'}
                    </label>
                    <span className="text-[10px] text-emerald-500 font-mono font-bold">Clean 1RM</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="مثال: 95"
                    value={form.cleanWeightKg}
                    onChange={(e) => handleInputChange('cleanWeightKg', e.target.value)}
                    className="w-full bg-black/40 border border-emerald-500/40 p-3.5 text-base text-white font-mono font-black rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                  />
                </div>

                {/* Barbell Weight Quick Presets */}
                <div className="space-y-1.5 pt-2">
                  <label className="block text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                    ⚡ {isEn ? 'Quick Barbell Weight Presets:' : 'إضافة أوزان البار السريعة:'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[20, 40, 60, 80, 100, 120].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => handleInputChange('cleanWeightKg', w.toString())}
                        className="px-3 py-1.5 bg-blue-950/40 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-mono font-black transition-all cursor-pointer"
                      >
                        +{w} kg
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-gray-400 font-bold">{isEn ? 'Added Barbell Load (kg if any):' : 'الوزن الإضافي للبار (كجم إن وجد):'}</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="مثال: 5"
                    value={form.addedLoadKg}
                    onChange={(e) => handleInputChange('addedLoadKg', e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-gray-800 p-3 text-xs text-white rounded-xl outline-none font-mono"
                  />
                </div>
              </div>
            ) : (
              /* JUMP MEASUREMENT INPUTS */
              <div className="space-y-4">
                {/* Jump Height & Flight Time (Bi-directional Sync) */}
                <div className="grid grid-cols-2 gap-4 bg-blue-950/20 p-4 rounded-lg border border-blue-500/20">
                  <div>
                    <label className="block text-xs text-blue-400 font-extrabold mb-1">
                      📏 {isEn ? 'Jump Height (cm):' : 'ارتفاع القفزة (سم):'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="مثال: 48.5"
                      value={form.jumpHeightCm}
                      onChange={(e) => handleInputChange('jumpHeightCm', e.target.value)}
                      className="w-full bg-black/40 border border-blue-500/40 p-3 text-sm text-white font-mono font-black rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-blue-400 font-extrabold mb-1">
                      ⏱️ {isEn ? 'Flight Time (s):' : 'زمن الطيران (ثانية):'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="مثال: 0.628"
                      value={form.flightTimeSec}
                      onChange={(e) => handleInputChange('flightTimeSec', e.target.value)}
                      className="w-full bg-black/40 border border-blue-500/40 p-3 text-sm text-white font-mono font-black rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Ground Contact Time ONLY for Drop Jump / RSI */}
                {form.testType === 'rsi' && (
                  <div className="bg-cyan-950/20 p-4 rounded-lg border border-cyan-500/25 space-y-2">
                    <label className="block text-xs text-cyan-400 font-extrabold">
                      ⚡ {isEn ? 'Ground Contact Time (s):' : 'زمن التلامس مع الأرض (ثانية):'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="مثال: 0.190"
                      value={form.contactTimeSec}
                      onChange={(e) => handleInputChange('contactTimeSec', e.target.value)}
                      className="w-full bg-black/40 border border-cyan-500/40 p-3 text-sm text-white font-mono font-black rounded-xl outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                )}

                {/* Added Load ONLY for Loaded Jumps */}
                {form.testType === 'loaded_jump' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs text-gray-400 font-bold">{isEn ? 'Added Barbell Load (kg):' : 'الوزن الإضافي للقفزة (كجم):'}</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="مثال: 20"
                      value={form.addedLoadKg}
                      onChange={(e) => handleInputChange('addedLoadKg', e.target.value)}
                      className="w-full bg-[var(--bg-input)] border border-gray-800 p-2.5 text-xs text-white rounded-xl outline-none font-mono"
                    />
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Column: Live Telemetry & Calculations Cockpit */}
          <div className="w-full space-y-5">
            
            {/* Live Metrics Cockpit Card */}
            <div className="glass-panel p-6 metallic-glass-border hud-card space-y-5">
              

              <h3 className="font-black text-sm text-blue-400 border-b border-gray-800 pb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-2"><Zap size={18} /> {isEn ? 'Live Biomechanical Physics Output' : 'مخرجات الفيزياء والميكانيكا الحيوية الحية'}</span>
                <span className="text-[9px] font-mono bg-blue-950/80 px-2 py-0.5 rounded text-blue-300 border border-blue-500/30">Auto Engine v2.0</span>
              </h3>

              {/* Dynamic Live Telemetry Grid */}
              {form.testType === 'clean' ? (
                /* CLEAN LIFT TELEMETRY CARDS */
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-950/30 p-4 rounded-lg border border-emerald-500/40 space-y-1">
                    <span className="text-[10px] text-emerald-400 font-bold block">{isEn ? 'Clean / Bodyweight Ratio:' : 'نسبة الكلين لوزن الجسم:'}</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      {cleanBwRatio > 0 ? `${cleanBwRatio.toFixed(2)}x` : '—'} <span className="text-xs text-gray-400 font-sans">BW</span>
                    </div>
                    <span className="text-[9px] text-gray-400 block font-mono">
                      {cleanWeight > 0 ? `${cleanWeight} kg 1RM` : (isEn ? 'Enter Clean weight' : 'أدخل وزن الكلين')}
                    </span>
                  </div>

                  <div className="bg-black/40 p-4 rounded-lg border border-gray-800 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block">{isEn ? 'Total Lift Mass:' : 'إجمالي حمولة الرفعة:'}</span>
                    <div className="text-2xl font-black text-white font-mono">
                      {(cleanWeight + addedLoad) > 0 ? (cleanWeight + addedLoad) : '—'} <span className="text-xs text-gray-400 font-sans">kg</span>
                    </div>
                    <span className="text-[9px] text-gray-500 block font-mono">
                      {isEn ? `Athlete Mass: ${weight} kg` : `وزن اللاعب: ${weight} كجم`}
                    </span>
                  </div>
                </div>
              ) : form.testType === 'rsi' ? (
                /* RSI DROP JUMP TELEMETRY CARDS */
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-cyan-950/30 p-4 rounded-lg border border-cyan-500/40 space-y-1">
                    <span className="text-[10px] text-cyan-400 font-bold block">{isEn ? 'RSI Rebound Index:' : 'مؤشر القوة التفاعلية (RSI):'}</span>
                    <div className="text-2xl font-black text-cyan-400 font-mono">
                      {rsiScore > 0 ? rsiScore.toFixed(2) : '—'}
                    </div>
                    <span className="text-[9px] text-gray-400 block font-mono">
                      {contactTime > 0 ? `Tc: ${contactTime}s` : '—'}
                    </span>
                  </div>

                  <div className="bg-black/40 p-4 rounded-lg border border-gray-800 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block">{isEn ? 'Jump Height & Flight:' : 'ارتفاع القفزة والطيران:'}</span>
                    <div className="text-xl font-black text-blue-400 font-mono">
                      {jumpHeight > 0 ? `${jumpHeight} cm` : '—'}
                    </div>
                    <span className="text-[9px] text-gray-500 block font-mono">
                      {flightTime > 0 ? `Tf: ${flightTime}s` : '—'}
                    </span>
                  </div>
                </div>
              ) : (
                /* STANDARD VERTICAL JUMP TELEMETRY CARDS */
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-4 rounded-lg border border-gray-800 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block">{isEn ? 'Peak Power (Harman/Sayers):' : 'ذروة القدرة (الوات):'}</span>
                    <div className="text-xl font-black text-blue-400 font-mono">
                      {peakPower > 0 ? peakPower.toFixed(0) : '—'} <span className="text-xs text-gray-400 font-sans">W</span>
                    </div>
                    <span className="text-[9px] text-gray-500 block font-mono">
                      {relativePower > 0 ? `${relativePower.toFixed(1)} W/kg (${isEn ? 'Relative' : 'النسبية'})` : '—'}
                    </span>
                  </div>

                  <div className="bg-black/40 p-4 rounded-lg border border-gray-800 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block">{isEn ? 'Takeoff Force (GRF):' : 'قوة الدفع الأرضي:'}</span>
                    <div className="text-xl font-black text-cyan-400 font-mono">
                      {takeoffForceN > 0 ? takeoffForceN.toFixed(0) : '—'} <span className="text-xs text-gray-400 font-sans">N</span>
                    </div>
                    <span className="text-[9px] text-gray-500 block font-mono">
                      {takeoffForceBW > 0 ? `${takeoffForceBW.toFixed(2)} BW (${isEn ? 'Ratio' : 'مضاعف الوزن'})` : '—'}
                    </span>
                  </div>
                </div>
              )}

              {/* Clean Strength Evaluation Box */}
              {cleanWeight > 0 && (
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-lg space-y-2 text-xs">
                  <h4 className="font-black text-emerald-400 flex items-center gap-1.5">
                    🏋️‍♂️ {isEn ? 'Clean & Explosive Power Synergy' : 'مؤشر التوافق بين رفعة الكلين والقفز الانفجاري'}
                  </h4>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    {cleanBwRatio >= 1.5 ? (
                      isEn 
                        ? `👑 Elite Strength Rating (${cleanBwRatio.toFixed(2)}x BW). The athlete exhibits exceptional posterior chain force production.`
                        : `👑 مستوى نخبة ممتازة في القوة انفجارية (${cleanBwRatio.toFixed(2)} ضعف وزن الجسم). يمتلك اللاعب محرك قوة عضلية قوي جداً.`
                    ) : cleanBwRatio >= 1.2 ? (
                      isEn
                        ? `🏆 Advanced Strength Level (${cleanBwRatio.toFixed(2)}x BW). Good force capacity to support vertical leap drive.`
                        : `🏆 مستوى متقدم في القوة (${cleanBwRatio.toFixed(2)} ضعف وزن الجسم). القوة العضلية تدعم الارتقاء الرأسي بامتياز.`
                    ) : (
                      isEn
                        ? `⚡ Developing Strength Level (${cleanBwRatio.toFixed(2)}x BW). Increasing Clean 1RM will directly improve takeoff power.`
                        : `⚡ مستوى تطويري في رفعة الكلين (${cleanBwRatio.toFixed(2)} ضعف وزن الجسم). زيادة وزن الكلين ستنعكس فوراً على زيادة القوة الانفجارية للقفز.`
                    )}
                  </p>
                </div>
              )}

              {/* Live Action Buttons */}
              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-4 btn-orange-gradient font-black text-xs rounded-lg shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save size={18} />
                  <span>{isSaving ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Save Measurement to Database' : 'حفظ القياس في سجل اللاعب')}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="w-full py-3.5 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/40 text-blue-300 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={16} />
                  <span>{isEn ? 'Print Official Assessment Sheet (PDF)' : 'طباعة التقرير الفني والميكانيكي (PDF)'}</span>
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ================= PRINTABLE A4 SHEET (STRICTLY HIDDEN ON SCREEN) ================= */}
      <div className="printable-manual-sheet text-black space-y-6">
        
        {/* Printable Header */}
        <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4" style={{ direction: isEn ? 'ltr' : 'rtl' }}>
          <div>
            <h1 className="text-xl font-black text-black">
              {isEn ? 'Sports Performance & Biomechanics Lab' : 'مختبر الأداء الرياضي والميكانيكا الحيوية'}
            </h1>
            <p className="text-xs text-gray-700 font-bold">
              {isEn ? 'Official Manual Measurement & Clean Assessment Report' : 'تقرير القياسات اليدوية ورفعات الكلين الرسمية'}
            </p>
          </div>
          <div className="text-right text-[10px] font-mono text-gray-800">
            <p>{isEn ? 'Date:' : 'التاريخ:'} {form.created_at}</p>
            <p>{isEn ? 'Method:' : 'طريقة القياس:'} Manual Input Console</p>
          </div>
        </div>

        {/* Athlete Specs Block */}
        <div className="border border-gray-400 p-4 rounded-xl space-y-2 bg-gray-50 text-xs">
          <h3 className="font-bold text-black border-b border-gray-300 pb-1">
            👤 {isEn ? 'Athlete Physical Profile' : 'بيانات اللاعب والأنثروبوميتري'}
          </h3>
          <div className="grid grid-cols-4 gap-4 font-mono text-xs">
            <p><strong>{isEn ? 'Name:' : 'الاسم:'}</strong> {activePlayer?.full_name || 'Athlete'}</p>
            <p><strong>{isEn ? 'Weight:' : 'الوزن:'}</strong> {weight} kg</p>
            <p><strong>{isEn ? 'Height:' : 'القامة:'}</strong> {playerHeight} cm</p>
            <p><strong>{isEn ? 'Leg Length:' : 'طول الرجل:'}</strong> {legLength.toFixed(2)} m</p>
          </div>
        </div>

        {/* Measurements Matrix Table */}
        <div className="space-y-2">
          <h3 className="font-bold text-xs text-black border-b border-black pb-1">
            📊 {isEn ? 'Manual Biomechanical & Strength Metrics' : 'مصفوفة النتائج اليدوية والقدرة الميكانيكية'}
          </h3>

          <table className="w-full border-collapse border border-black text-xs text-center">
            <thead>
              <tr className="bg-gray-200 font-bold">
                <th className="border border-black p-2">{isEn ? 'Test Category' : 'نوع الاختبـار'}</th>
                <th className="border border-black p-2">{isEn ? 'Jump Height' : 'ارتفاع القفز'}</th>
                <th className="border border-black p-2">{isEn ? 'Flight Time' : 'زمن الطيران'}</th>
                <th className="border border-black p-2">{isEn ? 'Peak Power' : 'ذروة القدرة'}</th>
                <th className="border border-black p-2">{isEn ? 'Relative Power' : 'القدرة النسبية'}</th>
                <th className="border border-black p-2">{isEn ? 'Clean Weight' : 'وزن الكلين'}</th>
                <th className="border border-black p-2">{isEn ? 'Clean/BW Ratio' : 'نسبة الكلين'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 font-bold">{form.testType.toUpperCase()}</td>
                <td className="border border-black p-2 font-mono">{jumpHeight > 0 ? `${jumpHeight} cm` : '—'}</td>
                <td className="border border-black p-2 font-mono">{flightTime > 0 ? `${flightTime} s` : '—'}</td>
                <td className="border border-black p-2 font-mono">{peakPower > 0 ? `${peakPower.toFixed(0)} W` : '—'}</td>
                <td className="border border-black p-2 font-mono">{relativePower > 0 ? `${relativePower.toFixed(1)} W/kg` : '—'}</td>
                <td className="border border-black p-2 font-mono font-bold">{cleanWeight > 0 ? `${cleanWeight} kg` : '—'}</td>
                <td className="border border-black p-2 font-mono font-bold">{cleanBwRatio > 0 ? `${cleanBwRatio.toFixed(2)}x BW` : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detailed Physics Summary */}
        <div className="border border-gray-400 p-4 rounded-xl space-y-2 text-xs bg-gray-50">
          <h3 className="font-bold text-black border-b border-gray-300 pb-1">
            🔬 {isEn ? 'Biomechanical Physics & Force Diagnostic' : 'التشخيص الميكانيكي الحيوي والدفع الأرضي'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <p>• {isEn ? 'Takeoff Force (GRF):' : 'قوة الدفع لحظة الإقلاع:'} <strong>{takeoffForceN > 0 ? `${takeoffForceN.toFixed(0)} N (${takeoffForceBW.toFixed(2)} BW)` : 'N/A'}</strong></p>
            <p>• {isEn ? 'Reactive Index (RSI):' : 'مؤشر القوة التفاعلية:'} <strong>{rsiScore > 0 ? rsiScore.toFixed(2) : 'N/A'}</strong></p>
            <p>• {isEn ? 'Power Model:' : 'نموذج المعادلة:'} Harman & Sayers Equations</p>
            <p>• {isEn ? 'Added Load:' : 'الأوزان الإضافية:'} {addedLoad > 0 ? `${addedLoad} kg` : '0 kg'}</p>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* LIVE RECORDED TESTS LOG MATRIX TABLE                     */}
      {/* ======================================================== */}
      <div className="glass-panel p-6 metallic-glass-border hud-card space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isEn ? 'Recorded Measurements Log & History' : 'سجل القياسات اليدوية واختبارات اللاعب الحالية'}
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
            <Activity size={36} className="mx-auto text-blue-500/40 mb-2 animate-pulse" />
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
                  <th className="p-3">{isEn ? 'Test Category' : 'نوع الاختبار'}</th>
                  <th className="p-3">{isEn ? 'Jump Height' : 'ارتفاع القفز'}</th>
                  <th className="p-3">{isEn ? 'Flight Time' : 'زمن الطيران'}</th>
                  <th className="p-3">{isEn ? 'Peak Power' : 'ذروة القدرة'}</th>
                  <th className="p-3">{isEn ? 'Relative Power' : 'القدرة النسبية'}</th>
                  <th className="p-3">{isEn ? 'RSI Index' : 'مؤشر RSI'}</th>
                  <th className="p-3">{isEn ? 'Actions' : 'إجراءات'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono text-gray-300">
                {playerHistory.map((jump, idx) => {
                  const hCm = parseFloat(jump.jump_height_cm) || 0;
                  const fSec = parseFloat(jump.flight_time_sec) || 0;
                  const pWatts = parseFloat(jump.peak_power_watts) || 0;
                  const rWatts = weight > 0 && pWatts > 0 ? (pWatts / weight).toFixed(1) : '—';
                  const rsi = parseFloat(jump.rsi_score) || 0;

                  return (
                    <tr key={jump.id || idx} className="hover:bg-blue-600/10 transition-colors">
                      <td className="p-3 text-gray-400">{new Date(jump.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="p-3 font-sans font-bold text-white uppercase">{jump.test_type}</td>
                      <td className="p-3 text-cyan-400 font-black">{hCm > 0 ? `${hCm} cm` : '—'}</td>
                      <td className="p-3 text-gray-300">{fSec > 0 ? `${fSec} s` : '—'}</td>
                      <td className="p-3 text-blue-400 font-bold">{pWatts > 0 ? `${pWatts} W` : '—'}</td>
                      <td className="p-3 text-emerald-400 font-bold">{rWatts !== '—' ? `${rWatts} W/kg` : '—'}</td>
                      <td className="p-3 text-amber-400 font-bold">{rsi > 0 ? rsi.toFixed(2) : '—'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => setIsPrintModalOpen(true)}
                          className="px-2.5 py-1 bg-blue-950/40 hover:bg-blue-600/30 text-blue-300 rounded-lg text-[10px] font-sans font-bold transition-all border border-blue-500/20 cursor-pointer"
                        >
                          🖨️ {isEn ? 'Print PDF' : 'طباعة PDF'}
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

      {/* ======================================================== */}
      {/* 2-STEP INFOGRAPHICS PDF PRINT SELECTION MODAL            */}
      {/* ======================================================== */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel p-6 max-w-md w-full metallic-glass-border hud-card space-y-5 relative">
            <button 
              onClick={() => { setIsPrintModalOpen(false); setPrintStep(1); }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            {printStep === 1 ? (
              <div className="space-y-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                  <Printer size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">اختر لغة تقرير الـ PDF الرسمية</h3>
                  <p className="text-xs text-gray-400 mt-1">اختر اللغة المطلوبة لطباعة تقرير القياس اليدوي للاعب</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => handlePrintLanguageSelect('ar')}
                    className="p-4 bg-blue-950/50 hover:bg-blue-600/30 border border-blue-500/40 rounded-xl text-white font-black text-sm transition-all cursor-pointer flex flex-col items-center gap-1"
                  >
                    <span>🇸🇦 العربية (Arabic)</span>
                    <span className="text-[10px] text-blue-300 font-normal">تقرير عربي معتمد</span>
                  </button>
                  <button
                    onClick={() => handlePrintLanguageSelect('en')}
                    className="p-4 bg-blue-950/50 hover:bg-blue-600/30 border border-blue-500/40 rounded-xl text-white font-black text-sm transition-all cursor-pointer flex flex-col items-center gap-1"
                  >
                    <span>🇬🇧 الإنجليزية (English)</span>
                    <span className="text-[10px] text-blue-300 font-normal">Official English PDF</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">اختر نمط التقرير البيوميكانيكي</h3>
                  <p className="text-xs text-gray-400 mt-1">اختر التنسيق البصري للطباعة المعتمدة</p>
                </div>
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => handlePrintReportFinal(true)}
                    className="w-full p-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-95 text-white font-black text-sm rounded-xl transition-all cursor-pointer flex items-center justify-between shadow-lg"
                  >
                    <div className="text-right">
                      <span className="block">📊 تقرير الإنفوجرافيك الملون (Infographic Report)</span>
                      <span className="text-[10px] text-cyan-200 font-normal block">يتضمن ألوان النخبة، العدادات، والتشخيص البصري</span>
                    </div>
                    <ChevronRight size={18} />
                  </button>

                  <button
                    onClick={() => handlePrintReportFinal(false)}
                    className="w-full p-3.5 bg-slate-900/80 hover:bg-slate-800 text-gray-300 border border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>📄 التقرير الرقمي المبسط (Standard Sheet)</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
