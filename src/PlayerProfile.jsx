import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, TrendingUp, Clock, Zap, ArrowUpCircle, AlertCircle, BookOpen, X, Award, User, Scale, Calendar, Trophy, FileText, ChevronLeft, Target, Plus, Trash2, Edit3, ShieldCheck, Sparkles, Printer, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from './supabaseClient';
import AppLogo from './AppLogo';

export default function PlayerProfile({
  activePlayer,
  playerHistory = [],
  onHistoryChange = () => {},
  language = 'ar',
  onEditPlayer = () => {}
}) {
  const isEn = language === 'en';

  // Active Tab View: 'overview' | 'diagnostics' | 'history'
  const [activeTab, setActiveTab] = useState('overview');

  // Benchmark Modal State
  const [selectedMetric, setSelectedMetric] = useState(null);

  // Print Language & Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printLang, setPrintLang] = useState('ar');

  if (!activePlayer) {
    return (
      <div className="glass-panel p-12 text-center text-gray-400 space-y-4 hud-card">
        <User size={48} className="mx-auto text-cyan-400/40 animate-pulse" />
        <h3 className="text-lg font-black text-white">
          {isEn ? 'No Athlete Selected' : 'لم يتم اختيار أي لاعب'}
        </h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          {isEn ? 'Please select an athlete from the top roster bar to view their full biomechanical dossier.' : 'يرجى اختيار لاعب من قائمة اللاعبين بالأعلى لعرض ملف القياسات والتأهيل الكامل.'}
        </p>
      </div>
    );
  }

  // Anthropometrics
  const mass = parseFloat(activePlayer.weight_kg) || 72;
  const playerHeight = parseFloat(activePlayer.height_cm) || 178;
  const standingReach = parseFloat(activePlayer.standing_reach_cm) || Math.round(playerHeight * 1.32);
  const legLengthM = parseFloat(activePlayer.leg_length_m) || 1.0;
  const birthYear = parseInt(activePlayer.birth_year) || 2005;
  const currentYear = new Date().getFullYear();
  const age = Math.max(12, currentYear - birthYear);

  // Filter History Data by Jump Types
  const cmjJumps = playerHistory.filter(h => h.test_type === 'cmj' || h.test_type === 'cmj_arms');
  const cmjNoArmsJumps = playerHistory.filter(h => h.test_type === 'cmj_no_arms');
  const sjNoArmsJumps = playerHistory.filter(h => h.test_type === 'sj_no_arms');
  const rsiJumps = playerHistory.filter(h => h.test_type === 'rsi');
  const approachJumps = playerHistory.filter(h => h.test_type === 'approach' || h.test_type === 'approach_jump');
  const cleanJumps = playerHistory.filter(h => parseFloat(h.clean_weight_kg) > 0);

  // Peak Height Records
  const maxCmj = cmjJumps.length > 0 ? Math.max(...cmjJumps.map(j => parseFloat(j.jump_height_cm) || 0)) : 0;
  const maxCmjNoArms = cmjNoArmsJumps.length > 0 ? Math.max(...cmjNoArmsJumps.map(j => parseFloat(j.jump_height_cm) || 0)) : 0;
  const maxSjNoArms = sjNoArmsJumps.length > 0 ? Math.max(...sjNoArmsJumps.map(j => parseFloat(j.jump_height_cm) || 0)) : 0;
  const maxApproach = approachJumps.length > 0 ? Math.max(...approachJumps.map(j => parseFloat(j.jump_height_cm) || 0)) : 0;
  const maxClean = cleanJumps.length > 0 ? Math.max(...cleanJumps.map(j => parseFloat(j.clean_weight_kg) || 0)) : 0;

  // Active Peak Jump Height for Main Stats
  const heightCm = maxCmj > 0 ? maxCmj : (maxCmjNoArms > 0 ? maxCmjNoArms : (maxSjNoArms > 0 ? maxSjNoArms : 0));
  const heightInches = (heightCm * 0.393701).toFixed(1);

  // Best Jump Height overall (including approach)
  const bestJumpOverall = Math.max(heightCm, maxApproach);

  // Total Touch Reach = Standing Reach + Best Jump Height
  const totalTouchReachCm = standingReach + bestJumpOverall;

  // Volleyball Net Clearance KPI (Men Net: 243cm, Women Net: 224cm)
  const vballNetHeightCm = activePlayer.gender === 'female' ? 224 : 243;
  const vballClearanceCm = totalTouchReachCm - vballNetHeightCm;

  // Basketball Dunk Predictor KPI (Rim Height: 305cm, Need ~315cm for comfortable dunk)
  const basketballRimCm = 305;
  const dunkMarginCm = totalTouchReachCm - 315;
  const rimMarginCm = totalTouchReachCm - 305;

  // Latest Test Record
  const latestTest = playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;
  const flightTime = latestTest ? (parseFloat(latestTest.flight_time_sec) || 0) : (heightCm > 0 ? Math.sqrt((8 * (heightCm / 100)) / 9.81) : 0);

  // Sayers Peak Power (61.9 * H_cm + 36.0 * BW_kg - 1822)
  const sayersPeak = heightCm > 0 ? (61.9 * heightCm + 36.0 * mass - 1822) : 0;
  // Harman Peak Power (60.7 * H_cm + 45.3 * BW_kg - 2055)
  const harmanPeak = heightCm > 0 ? (60.7 * heightCm + 45.3 * mass - 2055) : 0;

  // Relative Power Density (W/kg)
  const relativePower = mass > 0 && sayersPeak > 0 ? (sayersPeak / mass) : 0;

  // Elastic Utilization Ratio (EUR = CMJ_no_arms / SJ_no_arms)
  const eur = maxSjNoArms > 0 && maxCmjNoArms > 0 ? (maxCmjNoArms / maxSjNoArms) : 0;

  // Arm Swing Contribution (%) = ((CMJ_arms - CMJ_no_arms) / CMJ_no_arms) * 100
  const armSwing = maxCmjNoArms > 0 && maxCmj > 0 ? (((maxCmj - maxCmjNoArms) / maxCmjNoArms) * 100) : 0;

  // Latest RSI Score
  const latestRsiRecord = rsiJumps.length > 0 ? rsiJumps[rsiJumps.length - 1] : null;
  const rsiScore = latestRsiRecord ? (parseFloat(latestRsiRecord.rsi_score) || 0) : 0;

  // Overall Biomechanical Rating Score (0 - 100%)
  const overallRating = Math.min(100, Math.max(40, Math.round((heightCm / 70) * 50 + (relativePower / 65) * 35 + (rsiScore > 0 ? (rsiScore / 2.5) * 15 : 10))));

  // Ratings Evaluators
  const getRatingBadge = (score) => {
    if (score >= 85) return { text: isEn ? 'Elite 👑' : 'نخبة 👑', color: 'text-[#00c9a7] bg-[#00c9a7]/10 border-[#00c9a7]/30' };
    if (score >= 70) return { text: isEn ? 'Excellent 🏆' : 'ممتاز 🏆', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30' };
    if (score >= 55) return { text: isEn ? 'Good ⭐' : 'جيد ⭐', color: 'text-blue-400 bg-blue-950/40 border-blue-500/30' };
    return { text: isEn ? 'Normal ⚡' : 'عادي ⚡', color: 'text-gray-400 bg-gray-900 border-gray-800' };
  };

  const activeRating = getRatingBadge(overallRating);

  // Delete Individual Measurement
  const handleDeleteTest = async (testId) => {
    if (!window.confirm(isEn ? 'Are you sure you want to delete this test measurement?' : 'هل أنت تأكد من رغبتك في حذف هذا القياس؟')) return;

    try {
      const { error } = await supabase.from('lab_jump_measurements').delete().eq('id', testId);
      if (error) throw error;

      onHistoryChange(playerHistory.filter(item => item.id !== testId));
    } catch (err) {
      console.error('Error deleting test:', err);
      alert(isEn ? 'Failed to delete test.' : 'حدث خطأ أثناء حذف القياس.');
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
            .printable-profile-sheet { display: none !important; }
          }
          @media print {
            body * { visibility: hidden !important; }
            .printable-profile-sheet, .printable-profile-sheet * { visibility: visible !important; }
            .printable-profile-sheet {
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

            .print-infographic-card-teal {
              border: 2px solid #99f6e4 !important;
              background-color: #f0fdfa !important;
            }

            .print-infographic-card-slate {
              border: 2px solid #cbd5e1 !important;
              background-color: #f8fafc !important;
            }

            .print-table-orange {
              width: 100% !important;
              border-collapse: collapse !important;
              border-radius: 12px !important;
              overflow: hidden !important;
              border: 1px solid #fed7aa !important;
            }

            .print-table-orange th {
              background-color: #ea580c !important;
              color: #ffffff !important;
              font-weight: 900 !important;
              padding: 10px !important;
              font-size: 11px !important;
            }

            .print-table-orange td {
              padding: 10px !important;
              border-bottom: 1px solid #ffedd5 !important;
              font-size: 11px !important;
              text-align: center !important;
            }

            .print-table-orange tr:nth-child(even) {
              background-color: #fff7ed !important;
            }
          }
        `
      }} />

      <div className="printable-profile-sheet font-sans" style={{ direction: printLang === 'en' ? 'ltr' : 'rtl' }}>
        
        {/* Infographic Header with Sporty Orange Accent */}
        <div className="print-orange-header flex justify-between items-center">
          <div className="flex items-center gap-4">
            <AppLogo size={50} showGlow={false} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">
                  {printLang === 'en' ? 'Athletic Performance & Biomechanics Lab' : 'مختبر الأداء الرياضي والميكانيكا الحيوية'}
                </h1>
                <span className="text-[10px] font-black px-2 py-0.5 bg-[#ea580c] text-white rounded-md">
                  INFOGRAPHIC PDF
                </span>
              </div>
              <p className="text-xs text-orange-700 font-bold mt-0.5">
                {printLang === 'en' ? 'Official Athlete Biomechanical Dossier & Jump Analytics' : 'تقرير الملف الحركي المعاير والتحليل البيوميكانيكي المتكامل للوثب'}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-700">
            <p><strong>{printLang === 'en' ? 'Report Date:' : 'تاريخ التقرير:'}</strong> {new Date().toLocaleDateString(printLang === 'en' ? 'en-US' : 'ar-EG')}</p>
            <p><strong>{printLang === 'en' ? 'Dossier ID:' : 'كود الملف:'}</strong> ATH-{activePlayer.id.substring(0, 6).toUpperCase()}</p>
          </div>
        </div>

        {/* Athlete Personal Specs Dossier */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl mb-6 shadow-md">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ea580c] text-white font-black flex items-center justify-center text-lg font-mono">
                {activePlayer.full_name ? activePlayer.full_name[0] : 'P'}
              </div>
              <div>
                <h2 className="text-lg font-black text-white">{activePlayer.full_name}</h2>
                <span className="text-[10px] text-orange-400 font-bold">{isEn ? 'Biomechanical Athlete Profile' : 'الملف البدني والحركي المعاير'}</span>
              </div>
            </div>
            <span className="text-xs font-black px-3 py-1 bg-[#ea580c] text-white rounded-xl">
              {overallRating}% BIO GRADE
            </span>
          </div>

          <div className="grid grid-cols-6 gap-3 text-xs text-center font-mono">
            <div className="bg-slate-800/80 p-2 rounded-xl">
              <span className="text-[9px] text-gray-400 font-sans block">{printLang === 'en' ? 'Age' : 'العمر'}</span>
              <strong className="text-white text-sm">{age} yrs</strong>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl">
              <span className="text-[9px] text-gray-400 font-sans block">{printLang === 'en' ? 'Weight' : 'الوزن'}</span>
              <strong className="text-white text-sm">{mass} kg</strong>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl">
              <span className="text-[9px] text-gray-400 font-sans block">{printLang === 'en' ? 'Height' : 'الطول'}</span>
              <strong className="text-white text-sm">{playerHeight} cm</strong>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl">
              <span className="text-[9px] text-gray-400 font-sans block">{printLang === 'en' ? 'Standing Reach' : 'المدى العمودي'}</span>
              <strong className="text-orange-400 text-sm">{standingReach} cm</strong>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl col-span-2">
              <span className="text-[9px] text-gray-400 font-sans block">{printLang === 'en' ? 'Total Touch Reach' : 'الوصول الأقصى باليد'}</span>
              <strong className="text-emerald-400 text-sm">{totalTouchReachCm} cm ({(totalTouchReachCm*0.393701).toFixed(1)}")</strong>
            </div>
          </div>
        </div>


        {/* 4 Major Sporty Orange Infographic Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          
          {/* Card 1: Max Vertical Jump */}
          <div className="print-infographic-card text-center">
            <span className="text-[10px] text-orange-800 font-black uppercase block mb-1">
              🚀 {printLang === 'en' ? 'Max Vertical Jump' : 'أقصى ارتقاء رأسي'}
            </span>
            <span className="text-3xl font-black text-orange-600 font-mono block">
              {heightCm > 0 ? `${heightCm.toFixed(1)}` : '—'} <span className="text-xs text-slate-700">cm</span>
            </span>
            <span className="text-[10px] font-bold text-slate-600 font-mono block mt-1">
              ({heightInches} inches)
            </span>
          </div>

          {/* Card 2: Hang Flight Time */}
          <div className="print-infographic-card print-infographic-card-slate text-center">
            <span className="text-[10px] text-slate-700 font-black uppercase block mb-1">
              ⏱️ {printLang === 'en' ? 'Hang Flight Time' : 'زمن الطيران المعلق'}
            </span>
            <span className="text-3xl font-black text-slate-900 font-mono block">
              {flightTime > 0 ? `${flightTime.toFixed(3)}` : '—'} <span className="text-xs text-slate-600">sec</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 font-mono block mt-1">
              {flightTime >= 0.68 ? 'Elite Hangtime 👑' : 'Normal Flight ⚡'}
            </span>
          </div>

          {/* Card 3: Relative Power Density */}
          <div className="print-infographic-card print-infographic-card-teal text-center">
            <span className="text-[10px] text-teal-800 font-black uppercase block mb-1">
              ⚡ {printLang === 'en' ? 'Relative Power' : 'الكثافة النسبية'}
            </span>
            <span className="text-3xl font-black text-teal-700 font-mono block">
              {relativePower > 0 ? `${relativePower.toFixed(1)}` : '—'} <span className="text-xs text-slate-600">W/kg</span>
            </span>
            <span className="text-[10px] font-bold text-teal-800 font-mono block mt-1">
              Sayers: {sayersPeak > 0 ? `${sayersPeak.toFixed(0)} W` : '—'}
            </span>
          </div>

          {/* Card 4: RSI Stiffness */}
          <div className="print-infographic-card text-center" style={{ backgroundColor: '#fffbebf0', borderColor: '#fde68a' }}>
            <span className="text-[10px] text-amber-800 font-black uppercase block mb-1">
              🎯 {printLang === 'en' ? 'RSI Stiffness Index' : 'مؤشر RSI الارتدادي'}
            </span>
            <span className="text-3xl font-black text-amber-600 font-mono block">
              {rsiScore > 0 ? `${rsiScore.toFixed(2)}` : '—'}
            </span>
            <span className="text-[10px] font-bold text-amber-800 font-mono block mt-1">
              {rsiScore >= 2.2 ? 'Tendon Stiffness 👑' : 'Normal SSC ⚡'}
            </span>
          </div>

        </div>


        {/* Sport Specific Clearance Infographic Showcase */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          
          {/* Volleyball Clearance Box */}
          <div className="border-2 border-orange-500 bg-orange-50/50 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-orange-900 block mb-1">
                🏐 {printLang === 'en' ? 'Volleyball Net Clearance:' : 'الارتفاع فوق شبكة الكرة الطائرة:'}
              </span>
              <span className="text-2xl font-black text-orange-600 font-mono">
                {vballClearanceCm > 0 ? `+${vballClearanceCm.toFixed(1)} cm` : '—'}
              </span>
              <span className="text-[10px] text-slate-700 font-bold block mt-0.5">
                ({(vballClearanceCm * 0.393701).toFixed(1)}" above {vballNetHeightCm} cm net)
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black px-2.5 py-1 bg-orange-600 text-white rounded-lg inline-block">
                {vballClearanceCm >= 30 ? 'Spike Clearance 👑' : 'Standard Clearance'}
              </span>
            </div>
          </div>

          {/* Basketball Dunk Box */}
          <div className="border-2 border-slate-800 bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-orange-400 block mb-1">
                🏀 {printLang === 'en' ? 'Basketball Dunk Predictor:' : 'قدرة وهيئة عمل الدانك (Dunk Status):'}
              </span>
              <span className="text-xl font-black text-white font-mono">
                {dunkMarginCm >= 0
                  ? (printLang === 'en' ? 'CAN DUNK EASILY 🏀🔥' : 'يستطيع عمل Dunk بسهولة! 🏀🔥')
                  : rimMarginCm >= 0
                    ? (printLang === 'en' ? 'CAN TOUCH RIM 🏀' : 'يستطيع لمس الحلقة! 🏀')
                    : (printLang === 'en' ? `Needs ${Math.abs(dunkMarginCm).toFixed(1)} cm` : `يحتاج ${Math.abs(dunkMarginCm).toFixed(1)} سم إضافية`)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                Reach {totalTouchReachCm} cm vs 305 cm rim
              </span>
            </div>
          </div>

        </div>


        {/* All Tests Comparison Table (Infographic Orange Style) */}
        <div className="mb-6">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
            📊 {printLang === 'en' ? 'Complete Biomechanical Tests Matrix' : 'مصفوفة جميع اختبارات الوثب والقدرة الميكانيكية المسجلة'}
          </h3>
          <table className="print-table-orange">
            <thead>
              <tr>
                <th style={{ textAlign: printLang === 'en' ? 'left' : 'right' }}>{printLang === 'en' ? 'Test Category' : 'نوع الاختبار'}</th>
                <th>{printLang === 'en' ? 'Height (cm)' : 'الارتفاع (سم)'}</th>
                <th>{printLang === 'en' ? 'Height (in)' : 'الارتفاع (إنش)'}</th>
                <th>{printLang === 'en' ? 'Flight Time (s)' : 'زمن الطيران'}</th>
                <th>{printLang === 'en' ? 'Peak Power (W)' : 'ذروة القدرة'}</th>
                <th>{printLang === 'en' ? 'Relative Power' : 'القدرة النسبية'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>
                  {printLang === 'en' ? 'CMJ (With Arms)' : 'قفزة الارتداد بأرجحة اليدين (CMJ)'}
                </td>
                <td className="font-mono font-black text-orange-600">{maxCmj > 0 ? `${maxCmj.toFixed(1)} cm` : '—'}</td>
                <td className="font-mono">{maxCmj > 0 ? `${(maxCmj * 0.393701).toFixed(1)}"` : '—'}</td>
                <td className="font-mono">{maxCmj > 0 ? `${Math.sqrt((8 * (maxCmj/100))/9.81).toFixed(3)} s` : '—'}</td>
                <td className="font-mono font-bold text-slate-900">{maxCmj > 0 ? `${(61.9 * maxCmj + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                <td className="font-mono font-bold text-emerald-700">{maxCmj > 0 && mass > 0 ? `${((61.9 * maxCmj + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
              </tr>
              <tr>
                <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>
                  {printLang === 'en' ? 'CMJ (No Arms)' : 'قفزة الارتداد بدون يدين (CMJ No Arms)'}
                </td>
                <td className="font-mono font-black text-orange-600">{maxCmjNoArms > 0 ? `${maxCmjNoArms.toFixed(1)} cm` : '—'}</td>
                <td className="font-mono">{maxCmjNoArms > 0 ? `${(maxCmjNoArms * 0.393701).toFixed(1)}"` : '—'}</td>
                <td className="font-mono">{maxCmjNoArms > 0 ? `${Math.sqrt((8 * (maxCmjNoArms/100))/9.81).toFixed(3)} s` : '—'}</td>
                <td className="font-mono font-bold text-slate-900">{maxCmjNoArms > 0 ? `${(61.9 * maxCmjNoArms + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                <td className="font-mono font-bold text-emerald-700">{maxCmjNoArms > 0 && mass > 0 ? `${((61.9 * maxCmjNoArms + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
              </tr>
              <tr>
                <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>
                  {printLang === 'en' ? 'Squat Jump (No Arms)' : 'قفزة الثبات بدون يدين (Squat Jump)'}
                </td>
                <td className="font-mono font-black text-orange-600">{maxSjNoArms > 0 ? `${maxSjNoArms.toFixed(1)} cm` : '—'}</td>
                <td className="font-mono">{maxSjNoArms > 0 ? `${(maxSjNoArms * 0.393701).toFixed(1)}"` : '—'}</td>
                <td className="font-mono">{maxSjNoArms > 0 ? `${Math.sqrt((8 * (maxSjNoArms/100))/9.81).toFixed(3)} s` : '—'}</td>
                <td className="font-mono font-bold text-slate-900">{maxSjNoArms > 0 ? `${(61.9 * maxSjNoArms + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                <td className="font-mono font-bold text-emerald-700">{maxSjNoArms > 0 && mass > 0 ? `${((61.9 * maxSjNoArms + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
              </tr>
              <tr>
                <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>
                  {printLang === 'en' ? 'Approach Jump' : 'قفزة الاقتراب والركض (Approach Jump)'}
                </td>
                <td className="font-mono font-black text-orange-600">{maxApproach > 0 ? `${maxApproach.toFixed(1)} cm` : '—'}</td>
                <td className="font-mono">{maxApproach > 0 ? `${(maxApproach * 0.393701).toFixed(1)}"` : '—'}</td>
                <td className="font-mono">{maxApproach > 0 ? `${Math.sqrt((8 * (maxApproach/100))/9.81).toFixed(3)} s` : '—'}</td>
                <td className="font-mono font-bold text-slate-900">{maxApproach > 0 ? `${(61.9 * maxApproach + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                <td className="font-mono font-bold text-emerald-700">{maxApproach > 0 && mass > 0 ? `${((61.9 * maxApproach + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>


        {/* Biomechanical Diagnostic Callout Box with Sporty Orange Left Border */}
        <div className="border-r-8 border-[#ea580c] bg-[#fffaf0] p-4 rounded-xl mb-6 text-xs leading-relaxed font-mono">
          <p className="font-black text-slate-900 mb-1">
            🔬 {printLang === 'en' ? 'Biomechanical Diagnostic Critique & Recommendations:' : 'التشخيص البيوميكانيكي والتوصيات الحركية:'}
          </p>
          <p className="text-slate-800 font-medium">
            • {printLang === 'en'
                ? `Elastic Utilization Ratio (EUR): ${eur > 0 ? eur.toFixed(2) : 'N/A'}. Arm Swing Contribution: ${armSwing > 0 ? `+${armSwing.toFixed(1)}%` : 'N/A'}. Sayers Peak Power: ${sayersPeak > 0 ? sayersPeak.toFixed(0) : 'N/A'} Watts (${relativePower > 0 ? relativePower.toFixed(1) : 'N/A'} W/kg).`
                : `مؤشر الاستغلال المطاطي للأوتار (EUR): ${eur > 0 ? eur.toFixed(2) : 'غير متوفر'}. مساهمة أرجحة الذراعين: ${armSwing > 0 ? `+${armSwing.toFixed(1)}%` : 'غير متوفر'}. ذروة قدرة Sayers: ${sayersPeak > 0 ? sayersPeak.toFixed(0) : 'غير متوفر'} وات (${relativePower > 0 ? relativePower.toFixed(1) : 'غير متوفر'} W/kg).`}
          </p>
        </div>


        {/* Official Specialist Validation Signatures */}
        <div className="mt-8 flex justify-between items-center text-xs pt-6 border-t-2 border-slate-300">
          <div className="text-center w-52">
            <p className="font-black text-slate-900">{printLang === 'en' ? 'Biokinetic Specialist' : 'أخصائي القياس الحركي'}</p>
            <p className="text-xs text-orange-700 font-bold mt-1">{printLang === 'en' ? 'Mahmoud Ali' : 'محمود علي'}</p>
            <div className="h-8"></div>
            <p className="text-slate-400">....................................</p>
          </div>
          <div className="text-center w-52">
            <p className="font-black text-slate-900">{printLang === 'en' ? 'Assistant Biokinetic Specialist' : 'مساعد أخصائي القياس الحركي'}</p>
            <p className="text-xs text-orange-700 font-bold mt-1">{printLang === 'en' ? 'Mostafa Ali' : 'مصطفى علي'}</p>
            <div className="h-8"></div>
            <p className="text-slate-400">....................................</p>
          </div>
        </div>

      </div>


      {/* ======================================================== */}
      {/* SCREEN EXECUTIVE ATHLETE PROFILE COMMAND CENTER          */}
      {/* ======================================================== */}

      {/* 1. Executive Hero Dossier Header */}
      <div className="glass-panel p-6 border-l-4 border-l-blue-500 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6 hud-card">
        
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* App Logo & Athlete Initial Badge */}
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-[#00c9a7] flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/20 border border-blue-400/30 font-mono">
              {activePlayer.full_name ? activePlayer.full_name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'P'}
            </div>
            <div className="absolute -bottom-1 -right-1">
              <AppLogo size={26} showGlow={false} />
            </div>
          </div>

          <div className="text-center sm:text-right space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <h2 className="text-2xl font-black text-white">{activePlayer.full_name}</h2>
              <span className={`text-xs px-3 py-1 rounded-xl border font-black ${activeRating.color}`}>
                {activeRating.text}
              </span>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-gray-400 font-mono pt-1 flex-wrap">
              <span>{isEn ? 'Age:' : 'العمر:'} <strong className="text-white">{age}</strong></span>
              <span>•</span>
              <span>{isEn ? 'Weight:' : 'الوزن:'} <strong className="text-white">{mass} kg</strong></span>
              <span>•</span>
              <span>{isEn ? 'Height:' : 'الطول:'} <strong className="text-white">{playerHeight} cm</strong></span>
              <span>•</span>
              <span>{isEn ? 'Standing Reach:' : 'المدى العمودي:'} <strong className="text-cyan-400">{standingReach} cm</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onEditPlayer(activePlayer)}
            className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Edit3 size={16} />
            {isEn ? 'Edit Info' : 'تعديل البيانات'}
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Printer size={16} />
            {isEn ? 'Print Infographic PDF' : 'طباعة التقرير Infographic'}
          </button>
        </div>

      </div>


      {/* 2. Navigation Module Tabs */}
      <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
        {[
          { id: 'overview', nameAr: 'نظرة عامة والقياسات الرئيسية', nameEn: 'Core Metrics Overview', icon: Trophy },
          { id: 'diagnostics', nameAr: 'التشخيص الحركي ومنحنى FVP', nameEn: 'Biomechanical Diagnostics', icon: Activity },
          { id: 'history', nameAr: 'سجل القياسات الكامل والتطور', nameEn: 'Full Measurement History', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-black/30 text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {isEn ? tab.nameEn : tab.nameAr}
            </button>
          );
        })}
      </div>


      {/* TAB 1: CORE METRICS OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Executive 4 Core KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Max Jump Height */}
            <div
              onClick={() => setSelectedMetric({
                title: isEn ? 'Maximum CMJ Vertical Jump' : 'الارتقاء العمودي الأقصى (CMJ)',
                value: `${heightCm.toFixed(1)} cm (${heightInches}")`,
                desc: isEn ? 'Primary measurement of vertical explosive leg power.' : 'يقيس الارتفاع العمودي الأقصى لمركز ثقل الجسم خلال الوثبة العمودية مع أرجحة ذراعين.',
                benchmarks: [
                  { label: 'Elite 👑', value: '+34.0" (+86 cm)' },
                  { label: 'Excellent 🏆', value: '30.0" - 33.9" (76-85 cm)' },
                  { label: 'Good ⭐', value: '26.0" - 29.9" (66-75 cm)' }
                ]
              })}
              className="glass-panel p-5 hud-card space-y-3 hover:border-cyan-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{isEn ? 'Max Jump Height' : 'أقصى ارتقاء عمودي'}</span>
                <span className="p-2 bg-blue-500/10 text-cyan-400 rounded-xl group-hover:scale-110 transition-transform">
                  <ArrowUpCircle size={18} />
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-white font-mono">{heightCm > 0 ? heightCm.toFixed(1) : '—'}</span>
                <span className="text-xs text-gray-400 font-bold ml-1">cm</span>
                <span className="text-[10px] text-gray-500 font-mono block mt-0.5">({heightInches} in)</span>
              </div>
            </div>

            {/* KPI 2: Hang Flight Time */}
            <div
              onClick={() => setSelectedMetric({
                title: isEn ? 'Hang Flight Time' : 'زمن الطيران المعلق (Flight Time)',
                value: `${flightTime.toFixed(3)} s`,
                desc: isEn ? 'Airborne duration in seconds from takeoff to landing.' : 'الوقت المستغرق بالثواني منذ لحظة مغادرة القدمين للأرض حتى الهبوط.',
                benchmarks: [
                  { label: 'Elite 👑', value: '+0.75 s' },
                  { label: 'Excellent 🏆', value: '0.68 s - 0.74 s' },
                  { label: 'Good ⭐', value: '0.60 s - 0.67 s' }
                ]
              })}
              className="glass-panel p-5 hud-card space-y-3 hover:border-blue-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{isEn ? 'Hang Flight Time' : 'زمن الطيران المعلق'}</span>
                <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Clock size={18} />
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-white font-mono">{flightTime > 0 ? flightTime.toFixed(3) : '—'}</span>
                <span className="text-xs text-gray-400 font-bold ml-1">sec</span>
              </div>
            </div>

            {/* KPI 3: Power Density */}
            <div
              onClick={() => setSelectedMetric({
                title: isEn ? 'Relative Mechanical Power Density' : 'كثافة القدرة الميكانيكية النسبية',
                value: `${relativePower.toFixed(1)} W/kg`,
                desc: isEn ? 'Power output per kilogram of athlete body mass.' : 'القدرة الميكانيكية المتولدة مقسومة على وزن اللاعب الفعلي.',
                benchmarks: [
                  { label: 'Elite 👑', value: '+65.0 W/kg' },
                  { label: 'Excellent 🏆', value: '55.0 - 64.9 W/kg' },
                  { label: 'Good ⭐', value: '45.0 - 54.9 W/kg' }
                ]
              })}
              className="glass-panel p-5 hud-card space-y-3 hover:border-emerald-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{isEn ? 'Power Density' : 'الكثافة النسبية'}</span>
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Zap size={18} />
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-white font-mono">{relativePower > 0 ? relativePower.toFixed(1) : '—'}</span>
                <span className="text-xs text-gray-400 font-bold ml-1">W/kg</span>
              </div>
            </div>

            {/* KPI 4: RSI Stiffness Score */}
            <div
              onClick={() => setSelectedMetric({
                title: isEn ? 'Reactive Strength Index (RSI)' : 'مؤشر القوة التفاعلية (RSI)',
                value: `${rsiScore > 0 ? rsiScore.toFixed(2) : '—'}`,
                desc: isEn ? 'Ratio of flight time to ground contact time during drop jumps.' : 'يقيس صلابة الأوتار وكفاءة دورة التمدد والتقلص (SSC).',
                benchmarks: [
                  { label: 'Elite 👑', value: '+2.50' },
                  { label: 'Excellent 🏆', value: '2.00 - 2.49' },
                  { label: 'Good ⭐', value: '1.50 - 1.99' }
                ]
              })}
              className="glass-panel p-5 hud-card space-y-3 hover:border-yellow-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{isEn ? 'RSI Stiffness Index' : 'مؤشر RSI الارتدادي'}</span>
                <span className="p-2 bg-yellow-500/10 text-yellow-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Target size={18} />
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-white font-mono">{rsiScore > 0 ? rsiScore.toFixed(2) : '—'}</span>
                <span className="text-xs text-gray-400 font-bold ml-1">Index</span>
              </div>
            </div>

          </div>


          {/* VOLLEYBALL NET & BASKETBALL DUNK SPECIFIC KPIS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Volleyball Net Clearance Card */}
            <div className="glass-panel p-5 hud-card space-y-3 border-l-4 border-l-cyan-400">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏐</span>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    {isEn ? 'Volleyball Net Clearance' : 'ارتفاع الوصول فوق شبكة الكرة الطائرة'}
                  </h4>
                </div>
                <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                  {activePlayer.gender === 'female' ? 'Women Net (224cm)' : 'Men Net (243cm)'}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-2xl font-black text-cyan-400 font-mono">
                    {vballClearanceCm > 0 ? `+${vballClearanceCm.toFixed(1)} cm` : '—'}
                  </span>
                  <span className="text-xs text-gray-400 font-bold ml-1.5">
                    ({(vballClearanceCm * 0.393701).toFixed(1)}")
                  </span>
                </div>
                <div className="text-right text-[10px] font-mono text-gray-400">
                  <p>{isEn ? 'Total Reach:' : 'الوصول الأقصى:'} <strong className="text-white">{totalTouchReachCm} cm</strong></p>
                  <p>{isEn ? 'Net Height:' : 'ارتفاع الشبكة:'} <strong className="text-gray-300">{vballNetHeightCm} cm</strong></p>
                </div>
              </div>

              <p className="text-[11px] text-gray-300 font-medium leading-relaxed bg-black/30 p-2.5 rounded-xl border border-gray-850">
                {vballClearanceCm >= 40
                  ? (isEn ? 'Elite Volleyball Spike Reach! Exceptional clearance above block.' : 'ارتفاع استثنائي للكبس فوق الشبكة! يتجاوز حائط الصد بسهولة. 👑🏐')
                  : vballClearanceCm >= 20
                    ? (isEn ? 'Excellent Spike Clearance above net.' : 'ارتقاء ممتاز ومؤهل للضرب الساحلي بحرية فوق الشبكة. 🏆')
                    : (isEn ? 'Moderate Clearance above net.' : 'ارتقاء متوسط فوق الشبكة، ينصح بزيادة ارتقاء الاقتراب. ⚡')}
              </p>
            </div>


            {/* Basketball Dunk Predictor Card */}
            <div className="glass-panel p-5 hud-card space-y-3 border-l-4 border-l-yellow-500">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏀</span>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    {isEn ? 'Basketball Dunk Ability Predictor' : 'قدرة وهيئة عمل الدانك (Basketball Dunk Status)'}
                  </h4>
                </div>
                <span className="text-[9px] font-mono text-yellow-400 bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-500/30">
                  Official Rim (305cm)
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className={`text-xl font-black font-mono ${dunkMarginCm >= 0 ? 'text-[#00c9a7]' : 'text-yellow-400'}`}>
                    {dunkMarginCm >= 0
                      ? (isEn ? 'Can Dunk Easily! 🏀🔥' : 'يستطيع عمل Dunk بسهولة! 🏀🔥')
                      : rimMarginCm >= 0
                        ? (isEn ? 'Can Touch Rim! 🏀' : 'يستطيع لمس الحلقة! 🏀')
                        : (isEn ? `Needs ${Math.abs(dunkMarginCm).toFixed(1)} cm more` : `يحتاج ${Math.abs(dunkMarginCm).toFixed(1)} سم إضافية`)}
                  </span>
                </div>
                <div className="text-right text-[10px] font-mono text-gray-400">
                  <p>{isEn ? 'Total Touch:' : 'الوصول الأقصى:'} <strong className="text-white">{totalTouchReachCm} cm</strong></p>
                  <p>{isEn ? 'Rim Height:' : 'ارتفاع الحلقة:'} <strong className="text-gray-300">305 cm</strong></p>
                </div>
              </div>

              <p className="text-[11px] text-gray-300 font-medium leading-relaxed bg-black/30 p-2.5 rounded-xl border border-gray-850">
                {dunkMarginCm >= 0
                  ? (isEn ? `Cleared 315 cm dunk threshold by +${dunkMarginCm.toFixed(1)} cm (${(dunkMarginCm*0.393701).toFixed(1)}").` : `يتجاوز المعيار المطلوب للدانك المريح بـ +${dunkMarginCm.toFixed(1)} سم (${(dunkMarginCm*0.393701).toFixed(1)} إنش).`)
                  : rimMarginCm >= 0
                    ? (isEn ? `Touches 305 cm rim! Needs +${Math.abs(dunkMarginCm).toFixed(1)} cm more jump height for clean dunking.` : `يستطيع ملامسة الحلقة (305 سم) بحرية! يتطلب +${Math.abs(dunkMarginCm).toFixed(1)} سم إضافية للدانك المريح.`)
                    : (isEn ? `Standing reach ${standingReach}cm. Needs +${Math.abs(rimMarginCm).toFixed(1)} cm jump gain to reach rim.` : `المدى العمودي ${standingReach} سم. يحتاج زياده +${Math.abs(rimMarginCm).toFixed(1)} سم في القفز للوصول للحلقة.`)}
              </p>
            </div>

          </div>


          {/* COMPLETE ALL TESTS PERFORMANCE COMPARISON MATRIX TABLE */}
          <div className="glass-panel p-6 hud-card space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-cyan-400 rounded-xl">
                  <Trophy size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {isEn ? 'All Recorded Biomechanical Tests Breakdown' : 'مصفوفة جميع اختبارات الوثب والقوة المسجلة للاعب'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium">
                    {isEn ? 'Comprehensive breakdown of CMJ, Squat Jump, RSI, Approach Jump & Power Clean' : 'عرض شامل ومباشر لجميع اختبارات CMJ، والقفز بدون يدين، واختبار RSI والاقتراب'}
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-3 py-1 rounded-xl border border-cyan-500/30">
                {playerHistory.length} Total Tests
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-blue-950/40 text-blue-300 font-bold border-b border-gray-800">
                    <th className="p-3 text-right">{isEn ? 'Test Category' : 'نوع الاختبار'}</th>
                    <th className="p-3">{isEn ? 'Peak Height (cm)' : 'الارتفاع (سم)'}</th>
                    <th className="p-3">{isEn ? 'Height (in)' : 'الارتفاع (إنش)'}</th>
                    <th className="p-3">{isEn ? 'Flight Time (s)' : 'زمن الطيران'}</th>
                    <th className="p-3">{isEn ? 'Peak Power (W)' : 'ذروة القدرة'}</th>
                    <th className="p-3">{isEn ? 'Relative Power' : 'القدرة النسبية'}</th>
                    <th className="p-3">{isEn ? 'RSI / Clean' : 'الإنتاجية'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono text-gray-300">
                  
                  {/* CMJ Arms Row */}
                  <tr className="hover:bg-blue-600/10 transition-colors">
                    <td className="p-3 text-right font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      {isEn ? 'Countermovement Jump (Arms)' : 'قفزة الارتداد بأرجحة اليدين (CMJ)'}
                    </td>
                    <td className="p-3 text-cyan-400 font-black">{maxCmj > 0 ? `${maxCmj.toFixed(1)} cm` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxCmj > 0 ? `${(maxCmj * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxCmj > 0 ? `${Math.sqrt((8 * (maxCmj/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="p-3 text-blue-400 font-bold">{maxCmj > 0 ? `${(61.9 * maxCmj + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="p-3 text-emerald-400 font-bold">{maxCmj > 0 && mass > 0 ? `${((61.9 * maxCmj + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="p-3 text-gray-400 font-sans">{maxCmj > 0 ? 'Max Jump 👑' : '—'}</td>
                  </tr>

                  {/* CMJ No Arms Row */}
                  <tr className="hover:bg-blue-600/10 transition-colors">
                    <td className="p-3 text-right font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      {isEn ? 'Countermovement Jump (No Arms)' : 'قفزة الارتداد بدون يدين (CMJ No Arms)'}
                    </td>
                    <td className="p-3 text-cyan-400 font-black">{maxCmjNoArms > 0 ? `${maxCmjNoArms.toFixed(1)} cm` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxCmjNoArms > 0 ? `${(maxCmjNoArms * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxCmjNoArms > 0 ? `${Math.sqrt((8 * (maxCmjNoArms/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="p-3 text-blue-400 font-bold">{maxCmjNoArms > 0 ? `${(61.9 * maxCmjNoArms + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="p-3 text-emerald-400 font-bold">{maxCmjNoArms > 0 && mass > 0 ? `${((61.9 * maxCmjNoArms + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="p-3 text-gray-400 font-sans">{maxCmjNoArms > 0 ? 'SSC Test ⚡' : '—'}</td>
                  </tr>

                  {/* SJ No Arms Row */}
                  <tr className="hover:bg-blue-600/10 transition-colors">
                    <td className="p-3 text-right font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {isEn ? 'Squat Jump (No Arms)' : 'قفزة الثبات بدون يدين (Squat Jump)'}
                    </td>
                    <td className="p-3 text-cyan-400 font-black">{maxSjNoArms > 0 ? `${maxSjNoArms.toFixed(1)} cm` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxSjNoArms > 0 ? `${(maxSjNoArms * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxSjNoArms > 0 ? `${Math.sqrt((8 * (maxSjNoArms/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="p-3 text-blue-400 font-bold">{maxSjNoArms > 0 ? `${(61.9 * maxSjNoArms + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="p-3 text-emerald-400 font-bold">{maxSjNoArms > 0 && mass > 0 ? `${((61.9 * maxSjNoArms + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="p-3 text-gray-400 font-sans">{maxSjNoArms > 0 ? 'Concentric ⚡' : '—'}</td>
                  </tr>

                  {/* Drop Jump RSI Row */}
                  <tr className="hover:bg-blue-600/10 transition-colors">
                    <td className="p-3 text-right font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      {isEn ? 'Drop Jump (RSI Index)' : 'اختبار السقوط الارتدادي (Drop Jump RSI)'}
                    </td>
                    <td className="p-3 text-cyan-400 font-black">{latestRsiRecord ? `${parseFloat(latestRsiRecord.jump_height_cm).toFixed(1)} cm` : '—'}</td>
                    <td className="p-3 text-gray-300">{latestRsiRecord ? `${(parseFloat(latestRsiRecord.jump_height_cm) * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="p-3 text-gray-300">{latestRsiRecord ? `${parseFloat(latestRsiRecord.flight_time_sec).toFixed(3)} s` : '—'}</td>
                    <td className="p-3 text-blue-400 font-bold">—</td>
                    <td className="p-3 text-emerald-400 font-bold">—</td>
                    <td className="p-3 text-yellow-400 font-bold">{rsiScore > 0 ? `RSI ${rsiScore.toFixed(2)}` : '—'}</td>
                  </tr>

                  {/* Approach Jump Row */}
                  <tr className="hover:bg-blue-600/10 transition-colors">
                    <td className="p-3 text-right font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      {isEn ? 'Approach Jump (Volleyball/Basketball)' : 'قفزة الاقتراب والركض (Approach Jump)'}
                    </td>
                    <td className="p-3 text-cyan-400 font-black">{maxApproach > 0 ? `${maxApproach.toFixed(1)} cm` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxApproach > 0 ? `${(maxApproach * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxApproach > 0 ? `${Math.sqrt((8 * (maxApproach/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="p-3 text-blue-400 font-bold">{maxApproach > 0 ? `${(61.9 * maxApproach + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="p-3 text-emerald-400 font-bold">{maxApproach > 0 && mass > 0 ? `${((61.9 * maxApproach + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="p-3 text-purple-400 font-bold">{maxApproach > 0 ? 'Max Velocity 🚀' : '—'}</td>
                  </tr>

                  {/* Clean 1RM Row */}
                  {maxClean > 0 && (
                    <tr className="hover:bg-blue-600/10 transition-colors">
                      <td className="p-3 text-right font-sans font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {isEn ? 'Power Clean 1RM' : 'رفعة الكلين القصوى (Power Clean 1RM)'}
                      </td>
                      <td className="p-3 text-emerald-400 font-black" colSpan={4}>{maxClean} kg</td>
                      <td className="p-3 text-emerald-400 font-bold">{mass > 0 ? `${(maxClean/mass).toFixed(2)}x BW` : '—'}</td>
                      <td className="p-3 text-emerald-400 font-bold">1RM Strength 🏋️</td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
          </div>


          {/* Historical Trend Chart (Jump Height Progress) */}
          <div className="glass-panel p-6 hud-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-cyan-400" />
                {isEn ? 'Athlete Vertical Jump Performance Timeline' : 'منحنى تطور الأداء والارتقاء العمودي عبر الزمن'}
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2.5 py-0.5 rounded border border-cyan-500/30">
                {playerHistory.length} Recorded Tests
              </span>
            </div>

            {playerHistory.length > 0 ? (
              <div className="w-full h-64 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={playerHistory.map((h, i) => ({
                    date: new Date(h.created_at).toLocaleDateString('ar-EG'),
                    height: parseFloat(h.jump_height_cm) || 0,
                    power: parseFloat(h.peak_power_watts) || 0
                  }))}>
                    <defs>
                      <linearGradient id="colorHeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                    <Area type="monotone" dataKey="height" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorHeight)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 font-bold text-xs border border-dashed border-gray-800 rounded-2xl">
                {isEn ? 'No timeline history available for this athlete.' : 'لا توجد بيانات تاريخية متاحة لعرض منحنى التطور.'}
              </div>
            )}
          </div>

        </div>
      )}


      {/* TAB 2: BIOMECHANICAL DIAGNOSTICS */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Elastic Utilization Ratio (EUR) Card */}
            <div className="glass-panel p-6 hud-card space-y-4">
              <h3 className="text-sm font-black text-white border-b border-gray-800 pb-2">
                {isEn ? 'Elastic Utilization Ratio (EUR)' : 'مؤشر الاستغلال المطاطي للأوتار (EUR)'}
              </h3>
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-sans">{isEn ? 'Countermovement Jump (No Arms):' : 'قفزة الارتداد (CMJ No Arms):'}</span>
                  <span className="text-white font-bold">{maxCmjNoArms > 0 ? `${maxCmjNoArms.toFixed(1)} cm` : '—'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-sans">{isEn ? 'Squat Jump (No Arms):' : 'قفزة الثبات (Squat Jump):'}</span>
                  <span className="text-white font-bold">{maxSjNoArms > 0 ? `${maxSjNoArms.toFixed(1)} cm` : '—'}</span>
                </div>
                <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl flex items-center justify-between pt-2">
                  <span className="text-xs text-blue-300 font-sans font-bold">{isEn ? 'EUR Score:' : 'معامل EUR:'}</span>
                  <span className="text-lg font-black text-cyan-400">{eur > 0 ? eur.toFixed(2) : '—'}</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                💡 {eur >= 1.05 && eur <= 1.15
                    ? (isEn ? 'Balanced tendon elasticity and muscular power drive.' : 'توازن مثالي ومثمر بين القوة العضلية ومطاطية الأوتار.')
                    : eur < 1.05
                      ? (isEn ? 'Tendon SSC Deficit: Athlete relies heavily on raw muscle concentric force.' : 'عجز في مطاطية الأوتار: اللاعب يعتمد تماماً على القوة العضلية الصافية.')
                      : (isEn ? 'Force Deficit: Highly reactive tendons but lacks raw concentric muscle force.' : 'عجز في القوة العضلية: اللاعب مطاطي ولكن يفتقر للقوة الانقباضية الصافية.')}
              </p>
            </div>

            {/* Arm Swing Contribution Card */}
            <div className="glass-panel p-6 hud-card space-y-4">
              <h3 className="text-sm font-black text-white border-b border-gray-800 pb-2">
                {isEn ? 'Arm Swing Contribution Ratio' : 'نسبة مساهمة الذراعين الحركية (Arm Swing)'}
              </h3>
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-sans">{isEn ? 'CMJ With Arm Swing:' : 'قفزة الارتداد بأرجحة اليدين:'}</span>
                  <span className="text-white font-bold">{maxCmj > 0 ? `${maxCmj.toFixed(1)} cm` : '—'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-sans">{isEn ? 'CMJ Without Arm Swing:' : 'قفزة الارتداد بدون يدين:'}</span>
                  <span className="text-white font-bold">{maxCmjNoArms > 0 ? `${maxCmjNoArms.toFixed(1)} cm` : '—'}</span>
                </div>
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between pt-2">
                  <span className="text-xs text-emerald-300 font-sans font-bold">{isEn ? 'Arm Swing Contribution:' : 'نسبة المساهمة:'}</span>
                  <span className="text-lg font-black text-emerald-400">{armSwing > 0 ? `+${armSwing.toFixed(1)}%` : '—'}</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                💡 {armSwing >= 10 && armSwing <= 15
                    ? (isEn ? 'Optimal motor coordination between lower and upper body.' : 'تنسيق حركي مثالي ونقل ممتاز للزخم بين الذراعين والساقين.')
                    : armSwing > 15
                      ? (isEn ? 'High Arm Swing Dependence: Compensating for leg strength deficit.' : 'اعتماد مفرط على أرجحة اليدين للتعويض عن ضعف عضلات الأرجل.')
                      : (isEn ? 'Low Arm Swing Usage: Sub-optimal momentum transfer.' : 'مساهمة منخفضة لليدين: ضع تماسك الزخم الحركي.')}
              </p>
            </div>

          </div>

        </div>
      )}


      {/* TAB 3: FULL HISTORY MATRIX */}
      {activeTab === 'history' && (
        <div className="glass-panel p-6 hud-card space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-sm font-black text-white">
              {isEn ? 'Athlete Measurement & Testing History Log' : 'سجل القياسات الكامل للاعب'}
            </h3>
            <span className="text-xs font-mono font-bold text-cyan-400">{playerHistory.length} Tests</span>
          </div>

          {playerHistory.length === 0 ? (
            <div className="text-center py-10 text-gray-500 font-bold text-xs">
              {isEn ? 'No measurements logged yet.' : 'لا توجد قياسات مسجلة لهذا اللاعب حتى الآن.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-blue-950/40 text-blue-300 font-bold border-b border-gray-800">
                    <th className="p-3">{isEn ? 'Date' : 'التاريخ'}</th>
                    <th className="p-3">{isEn ? 'Category' : 'نوع الاختبار'}</th>
                    <th className="p-3">{isEn ? 'Height' : 'الارتفاع'}</th>
                    <th className="p-3">{isEn ? 'Flight Time' : 'زمن الطيران'}</th>
                    <th className="p-3">{isEn ? 'Peak Power' : 'ذروة القدرة'}</th>
                    <th className="p-3">{isEn ? 'RSI' : 'RSI'}</th>
                    <th className="p-3">{isEn ? 'Actions' : 'إجراءات'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono text-gray-300">
                  {playerHistory.map((jump, idx) => (
                    <tr key={jump.id || idx} className="hover:bg-blue-600/10 transition-colors">
                      <td className="p-3 text-gray-400">{new Date(jump.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="p-3 font-sans font-bold text-white uppercase">{jump.test_type}</td>
                      <td className="p-3 text-cyan-400 font-black">{parseFloat(jump.jump_height_cm) > 0 ? `${parseFloat(jump.jump_height_cm).toFixed(1)} cm` : '—'}</td>
                      <td className="p-3 text-gray-300">{parseFloat(jump.flight_time_sec) > 0 ? `${parseFloat(jump.flight_time_sec).toFixed(3)} s` : '—'}</td>
                      <td className="p-3 text-blue-400 font-bold">{parseFloat(jump.peak_power_watts) > 0 ? `${parseFloat(jump.peak_power_watts).toFixed(0)} W` : '—'}</td>
                      <td className="p-3 text-yellow-400 font-bold">{parseFloat(jump.rsi_score) > 0 ? parseFloat(jump.rsi_score).toFixed(2) : '—'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteTest(jump.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* Metric Detail Benchmark Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 space-y-4 hud-card border-blue-500/30 relative">
            <button
              onClick={() => setSelectedMetric(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-black text-white">{selectedMetric.title}</h3>
            <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl">
              <span className="text-2xl font-black text-cyan-400 font-mono">{selectedMetric.value}</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-medium">{selectedMetric.desc}</p>

            {selectedMetric.benchmarks && (
              <div className="space-y-1.5 pt-2">
                <h4 className="text-xs font-bold text-gray-400">{isEn ? 'Normative Tiers:' : 'المستويات المعيارية:'}</h4>
                <div className="space-y-1 text-xs">
                  {selectedMetric.benchmarks.map((b, i) => (
                    <div key={i} className="flex justify-between p-2 bg-black/30 rounded-lg font-mono">
                      <span className="text-gray-300 font-sans">{b.label}</span>
                      <span className="text-cyan-400 font-bold">{b.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


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