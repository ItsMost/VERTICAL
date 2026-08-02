import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, TrendingUp, Clock, Zap, ArrowUpCircle, AlertCircle, BookOpen, X, Award, User, Scale, Calendar, Trophy, FileText, ChevronLeft, Target, Plus, Trash2, Edit3, ShieldCheck, Sparkles, Printer, Activity, Table, Monitor, Film, Video } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from './supabaseClient';
import AppLogo from './AppLogo';
import MotionGraphicVideoModal from './components/MotionGraphicVideoModal';

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

  // Benchmark Modal States
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);
  const [benchmarkGender, setBenchmarkGender] = useState(activePlayer?.gender || 'male');
  const [benchmarkCategory, setBenchmarkCategory] = useState('cmj'); // 'cmj' | 'rsi'

  // Print & Motion Graphic Video Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [includeStrengthInPrint, setIncludeStrengthInPrint] = useState(true);
  const [isMotionVideoOpen, setIsMotionVideoOpen] = useState(false);
  const [printLang, setPrintLang] = useState('ar');

  // History Filter, Chart Metric Selection & Edit Record State
  const [filterTestType, setFilterTestType] = useState('all');
  const [chartMetric, setChartMetric] = useState('cmj'); // 'cmj' | 'approach' | 'rsi' | 'power' | 'full_squat' | 'bench_press' | 'power_clean'
  const [editingRecord, setEditingRecord] = useState(null);
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState('table'); // 'table' | 'social_card'

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
  
  // Calculate dynamic accurate age from Supabase player fields (date_of_birth, birth_year, birth_date)
  const calculatePlayerAge = (player) => {
    if (!player) return 0;
    if (player.age && !isNaN(parseInt(player.age))) return parseInt(player.age);
    
    let year = null;
    if (player.date_of_birth) {
      year = parseInt(String(player.date_of_birth).substring(0, 4));
    } else if (player.birth_year && !isNaN(parseInt(player.birth_year))) {
      year = parseInt(player.birth_year);
    } else if (player.birth_date) {
      year = parseInt(String(player.birth_date).substring(0, 4));
    }

    if (year && !isNaN(year) && year > 1900) {
      return Math.max(1, new Date().getFullYear() - year);
    }
    return 0;
  };

  const age = calculatePlayerAge(activePlayer);
  const isFemale = activePlayer.gender === 'female';

  // Filter History Data by Jump Types
  const cmjJumps = playerHistory.filter(h => h.test_type === 'cmj' || h.test_type === 'cmj_arms');
  const cmjNoArmsJumps = playerHistory.filter(h => h.test_type === 'cmj_no_arms');
  const sjNoArmsJumps = playerHistory.filter(h => h.test_type === 'sj_no_arms');
  const rsiJumps = playerHistory.filter(h => h.test_type === 'rsi');
  const approachJumps = playerHistory.filter(h => h.test_type === 'approach' || h.test_type === 'approach_jump');
  const fullSquatRecords = playerHistory.filter(h => h.test_type === 'full_squat');
  const benchPressRecords = playerHistory.filter(h => h.test_type === 'bench_press');
  const powerCleanRecords = playerHistory.filter(h => h.test_type === 'power_clean' || (parseFloat(h.clean_weight_kg) > 0 && h.test_type !== 'full_squat' && h.test_type !== 'bench_press'));

  // Peak Height & Strength Records
  const maxCmj = cmjJumps.length > 0 ? Math.max(...cmjJumps.map(j => parseFloat(j.jump_height_cm) || 0)) : 0;
  const maxCmjNoArms = cmjNoArmsJumps.length > 0 ? Math.max(...cmjNoArmsJumps.map(j => parseFloat(j.jump_height_cm) || 0)) : 0;
  const maxSjNoArms = sjNoArmsJumps.length > 0 ? Math.max(...sjNoArmsJumps.map(j => parseFloat(j.jump_height_cm) || 0)) : 0;
  const maxApproach = approachJumps.length > 0 ? Math.max(...approachJumps.map(j => parseFloat(j.jump_height_cm) || 0)) : 0;
  
  const maxFullSquat = fullSquatRecords.length > 0 ? Math.max(...fullSquatRecords.map(j => parseFloat(j.clean_weight_kg) || 0)) : 0;
  const maxBenchPress = benchPressRecords.length > 0 ? Math.max(...benchPressRecords.map(j => parseFloat(j.clean_weight_kg) || 0)) : 0;
  const maxPowerClean = powerCleanRecords.length > 0 ? Math.max(...powerCleanRecords.map(j => parseFloat(j.clean_weight_kg) || 0)) : 0;

  // CMJ (Arms) Flight Time
  const bestCmjRecord = cmjJumps.length > 0 ? cmjJumps.reduce((prev, curr) => (parseFloat(curr.jump_height_cm) || 0) > (parseFloat(prev.jump_height_cm) || 0) ? curr : prev, cmjJumps[0]) : null;
  const cmjFlightTime = bestCmjRecord ? (parseFloat(bestCmjRecord.flight_time_sec) || 0) : (maxCmj > 0 ? Math.sqrt((8 * (maxCmj / 100)) / 9.81) : 0);

  // Active Peak Jump Height for Main Stats
  const heightCm = maxCmj > 0 ? maxCmj : (maxCmjNoArms > 0 ? maxCmjNoArms : (maxSjNoArms > 0 ? maxSjNoArms : 0));
  const heightInches = (heightCm * 0.393701).toFixed(1);

  // Best Jump Height overall (including approach)
  const bestJumpOverall = Math.max(heightCm, maxApproach);

  // Total Touch Reach = Standing Reach + Best Jump Height
  const totalTouchReachCm = standingReach + bestJumpOverall;

  // Volleyball Net Clearance KPI (Men Net: 243cm, Women Net: 224cm)
  const vballNetHeightCm = isFemale ? 224 : 243;
  const vballClearanceCm = totalTouchReachCm - vballNetHeightCm;

  // Basketball Dunk Predictor KPI (Rim Height: 305cm, Need ~315cm for comfortable dunk)
  const dunkMarginCm = totalTouchReachCm - 315;
  const rimMarginCm = totalTouchReachCm - 305;

  // Latest Test Record
  const latestTest = playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;
  const flightTime = latestTest ? (parseFloat(latestTest.flight_time_sec) || 0) : (heightCm > 0 ? Math.sqrt((8 * (heightCm / 100)) / 9.81) : 0);

  // Sayers Peak Power
  const sayersPeak = heightCm > 0 ? (61.9 * heightCm + 36.0 * mass - 1822) : 0;
  const relativePower = mass > 0 && sayersPeak > 0 ? (sayersPeak / mass) : 0;

  // Max Power overall from history
  const maxPower = playerHistory.length > 0
    ? Math.max(...playerHistory.map(j => parseFloat(j.peak_power_watts) || (parseFloat(j.jump_height_cm) > 0 ? (61.9 * parseFloat(j.jump_height_cm) + 36.0 * mass - 1822) : 0)))
    : sayersPeak;

  // Elastic Utilization Ratio (EUR = CMJ_no_arms / SJ_no_arms)
  const eur = maxSjNoArms > 0 && maxCmjNoArms > 0 ? (maxCmjNoArms / maxSjNoArms) : 0;

  // Concise Diagnostic Tag for PDF Print Report
  const pdfDiagnosticTag = eur > 1.15
    ? 'الاعتماد مطاطي ارتدادي'
    : eur < 1.05 && eur > 0
      ? 'الاعتماد عضلي انقباضي'
      : 'توازن مثالي بين العضلات والأوتار';

  // Arm Swing Contribution (%)
  const armSwing = maxCmjNoArms > 0 && maxCmj > 0 ? (((maxCmj - maxCmjNoArms) / maxCmjNoArms) * 100) : 0;

  // Latest RSI Score
  const latestRsiRecord = rsiJumps.length > 0 ? rsiJumps[rsiJumps.length - 1] : null;
  const rsiScore = latestRsiRecord ? (parseFloat(latestRsiRecord.rsi_score) || 0) : 0;

  // Max RSI overall from history
  const maxRsi = rsiJumps.length > 0
    ? Math.max(...rsiJumps.map(j => parseFloat(j.rsi_score) || 0))
    : rsiScore;

  // Overall Biomechanical Rating Score (0 - 100%)
  const overallRating = Math.min(100, Math.max(40, Math.round((heightCm / 70) * 50 + (relativePower / 65) * 35 + (rsiScore > 0 ? (rsiScore / 2.5) * 15 : 10))));

  // Ratings Evaluators
  const getRatingBadge = (score) => {
    if (score >= 85) return { text: isEn ? 'Elite 👑' : 'نخبة 👑', color: 'text-[#00c9a7] bg-[#00c9a7]/10 border-[#00c9a7]/30' };
    if (score >= 70) return { text: isEn ? 'Excellent 🏆' : 'ممتاز 🏆', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30' };
    if (score >= 55) return { text: isEn ? 'Good ⭐' : 'جيد ⭐', color: 'text-blue-400 bg-blue-950/40 border-blue-500/30' };
    return { text: isEn ? 'Normal ⚡' : 'عادي ⚡', color: 'text-gray-400 bg-gray-900 border-gray-800' };
  };

  // Helper function to evaluate test ratings for the PDF report (عالمي / ممتاز / جيد جداً / جيد)
  const getTestRatingTag = (hCm, relW) => {
    if (hCm >= 76.2 || relW >= 70) return { ar: 'عالمي خارق 👑', en: 'World Class 👑', bg: '#fef08a', text: '#854d0e' };
    if (hCm >= 70 || relW >= 60) return { ar: 'ممتاز 🏆', en: 'Elite 🏆', bg: '#dcfce7', text: '#15803d' };
    if (hCm >= 55 || relW >= 48) return { ar: 'جيد جداً ⭐', en: 'Very Good ⭐', bg: '#dbeafe', text: '#1d4ed8' };
    return { ar: 'جيد ⚡', en: 'Good ⚡', bg: '#fef3c7', text: '#b45309' };
  };

  const activeRating = getRatingBadge(overallRating);

  // NORMATIVE BENCHMARK TABLES DATA (Exact Image 1, 2, 3 values + Gender Norms)
  const maleRsiTable = [
    { tier: 'Tier 1 (Novice)', avg: '0.7 – 1.0', good: '1.0 – 1.4', adv: '1.4 – 1.8', elite: '1.8+' },
    { tier: 'Tier 2 (Intermediate)', avg: '1.2 – 1.6', good: '1.6 – 2.0', adv: '2.0 – 2.6', elite: '2.6+' },
    { tier: 'Tier 3 (Athletic)', avg: '1.8 – 2.2', good: '2.2 – 2.8', adv: '2.8 – 3.4', elite: '3.4+' },
    { tier: 'Tier 4 (Pro / Elite)', avg: '2.4 – 3.0', good: '3.0 – 3.6', adv: '3.6 – 4.0', elite: '4.0+' },
  ];

  const femaleRsiTable = [
    { tier: 'Tier 1 (Novice)', avg: '0.5 – 0.8', good: '0.8 – 1.1', adv: '1.1 – 1.4', elite: '1.4+' },
    { tier: 'Tier 2 (Intermediate)', avg: '1.0 – 1.3', good: '1.3 – 1.6', adv: '1.6 – 2.1', elite: '2.1+' },
    { tier: 'Tier 3 (Athletic)', avg: '1.4 – 1.8', good: '1.8 – 2.3', adv: '2.3 – 2.8', elite: '2.8+' },
    { tier: 'Tier 4 (Pro / Elite)', avg: '1.9 – 2.4', good: '2.4 – 2.9', adv: '2.9 – 3.3', elite: '3.3+' },
  ];

  const femaleCmjTable = [
    { tier: 'Tier 1 (Youth / Novice)', avg: '12.0 - 14.5 in (30.5 - 36.8 cm)', good: '14.5 - 16.5 in (36.8 - 41.9 cm)', adv: '16.5 - 18.5 in (41.9 - 47.0 cm)', elite: '18.5+ in (47.0+ cm)' },
    { tier: 'Tier 2 (Intermediate)', avg: '15.0 - 17.5 in (38.1 - 44.5 cm)', good: '17.5 - 19.5 in (44.5 - 49.5 cm)', adv: '19.5 - 21.5 in (49.5 - 54.6 cm)', elite: '21.5+ in (54.6+ cm)' },
    { tier: 'Tier 3 (Athletic)', avg: '17.5 - 20.0 in (44.5 - 50.8 cm)', good: '20.0 - 22.0 in (50.8 - 55.9 cm)', adv: '22.0 - 24.0 in (55.9 - 61.0 cm)', elite: '24.0+ in (61.0+ cm)' },
    { tier: 'Tier 4 (Collegiate / Elite)', avg: '20.0 - 22.0 in (50.8 - 55.9 cm)', good: '22.0 - 24.0 in (55.9 - 61.0 cm)', adv: '24.0 - 26.0 in (61.0 - 66.0 cm)', elite: '26.0"+ in (66.0+ cm) Elite 🏆' },
  ];

  const maleCmjTable = [
    { tier: 'Tier 1 (Youth / Novice)', avg: '12.0 - 15.0 in (30.5 - 38.1 cm)', good: '15.0 - 18.0 in (38.1 - 45.7 cm)', adv: '18.0 - 21.0 in (45.7 - 53.3 cm)', elite: '21.0+ in (53.3+ cm)' },
    { tier: 'Tier 2 (Intermediate)', avg: '16.0 - 19.0 in (40.6 - 48.3 cm)', good: '19.0 - 22.0 in (48.3 - 55.9 cm)', adv: '22.0 - 24.5 in (55.9 - 62.2 cm)', elite: '24.5+ in (62.2+ cm)' },
    { tier: 'Tier 3 (Athletic)', avg: '18.0 - 21.0 in (45.7 - 53.3 cm)', good: '21.0 - 24.0 in (53.3 - 61.0 cm)', adv: '24.0 - 26.5 in (61.0 - 67.3 cm)', elite: '26.5+ in (67.3+ cm)' },
    { tier: 'Tier 4 (Collegiate / Elite)', avg: '20.0 - 23.0 in (50.8 - 58.4 cm)', good: '23.0 - 26.0 in (58.4 - 66.0 cm)', adv: '26.0 - 28.5 in (66.0 - 72.4 cm)', elite: '30.0"+ in (76.2+ cm) World Class 👑' },
  ];

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

  // Update Individual Measurement Record in Supabase
  const handleUpdateTest = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    setIsEditingSaving(true);
    try {
      const hCm = parseFloat(editingRecord.jump_height_cm) || 0;
      const ft = parseFloat(editingRecord.flight_time_sec) || 0;
      const ct = parseFloat(editingRecord.contact_time_sec) || 0;
      const rsi = parseFloat(editingRecord.rsi_score) || (ft > 0 && ct > 0 ? ft / ct : 0);
      const cleanW = parseFloat(editingRecord.clean_weight_kg) || 0;

      const pPower = hCm > 0 ? (61.9 * hCm + 36.0 * mass - 1822) : 0;
      const vTakeoff = ft > 0 ? (9.81 * ft) / 2 : 0;
      const weekNum = parseInt(editingRecord.week_number) || 1;
      const repsNum = parseInt(editingRecord.reps_count) || 1;

      const payload = {
        test_type: editingRecord.test_type,
        jump_height_cm: hCm,
        flight_time_sec: ft,
        contact_time_sec: ct > 0 ? ct : null,
        rsi_score: rsi > 0 ? rsi : null,
        clean_weight_kg: cleanW,
        week_number: weekNum,
        reps_count: repsNum,
        peak_power_watts: pPower > 0 ? Math.round(pPower) : 0,
        takeoff_velocity_ms: vTakeoff > 0 ? parseFloat(vTakeoff.toFixed(2)) : 0
      };

      const { data, error } = await supabase
        .from('lab_jump_measurements')
        .update(payload)
        .eq('id', editingRecord.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const updatedList = playerHistory.map(item => item.id === editingRecord.id ? data[0] : item);
        onHistoryChange(updatedList);
        setEditingRecord(null);
      }
    } catch (err) {
      console.error('Error updating test record:', err);
      alert(isEn ? `Failed to update test: ${err.message}` : `حدث خطأ أثناء تعديل القياس: ${err.message}`);
    } finally {
      setIsEditingSaving(false);
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
                <span className="text-[10px] text-orange-400 font-bold">{isEn ? 'Biomechanical Athlete Profile' : 'بيانات الملف البدني والشخصي للاعب'}</span>
              </div>
            </div>
            <span className="text-xs font-black px-3 py-1 bg-[#ea580c] text-white rounded-xl">
              {overallRating}% BIO GRADE
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs text-center font-mono">
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <span className="text-[9px] text-gray-400 font-sans block font-bold uppercase">{printLang === 'en' ? 'Age' : 'العمر'}</span>
              <strong className="text-white text-base font-black">{age} {printLang === 'en' ? 'yrs' : 'سنة'}</strong>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <span className="text-[9px] text-gray-400 font-sans block font-bold uppercase">{printLang === 'en' ? 'Weight' : 'الوزن'}</span>
              <strong className="text-white text-base font-black">{mass} kg</strong>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <span className="text-[9px] text-gray-400 font-sans block font-bold uppercase">{printLang === 'en' ? 'Height' : 'الطول'}</span>
              <strong className="text-white text-base font-black">{playerHeight} cm</strong>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-orange-500/40 bg-orange-950/20">
              <span className="text-[9px] text-orange-400 font-sans block font-bold uppercase">{printLang === 'en' ? 'Bio Grade' : 'درجة التقييم'}</span>
              <strong className="text-orange-400 text-base font-black">{overallRating}%</strong>
            </div>
          </div>
        </div>

        {/* 4 Major Sporty Orange Infographic Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="print-infographic-card text-center">
            <span className="text-[10px] text-orange-800 font-black uppercase block mb-1">
              🚀 Max Vertical Jump (CMJ)
            </span>
            <span className="text-3xl font-black text-orange-600 font-mono block">
              {heightCm > 0 ? `${heightCm.toFixed(1)}` : '—'} <span className="text-xs text-slate-700">cm</span>
            </span>
            <span className="text-[10px] font-bold text-slate-600 font-mono block mt-1">
              ({heightInches} inches)
            </span>
          </div>

          <div className="print-infographic-card print-infographic-card-slate text-center">
            <span className="text-[10px] text-slate-700 font-black uppercase block mb-1">
              ⏱️ Flight Time
            </span>
            <span className="text-3xl font-black text-slate-900 font-mono block">
              {flightTime > 0 ? `${flightTime.toFixed(3)}` : '—'} <span className="text-xs text-slate-600">sec</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 font-mono block mt-1">
              {flightTime >= 0.68 ? 'Elite Hangtime 👑' : 'Normal Flight ⚡'}
            </span>
          </div>

          <div className="print-infographic-card print-infographic-card-teal text-center">
            <span className="text-[10px] text-teal-800 font-black uppercase block mb-1">
              ⚡ Relative Power
            </span>
            <span className="text-3xl font-black text-teal-700 font-mono block">
              {relativePower > 0 ? `${relativePower.toFixed(1)}` : '—'} <span className="text-xs text-slate-600">W/kg</span>
            </span>
            <span className="text-[10px] font-bold text-teal-800 font-mono block mt-1">
              Sayers: {sayersPeak > 0 ? `${sayersPeak.toFixed(0)} W` : '—'}
            </span>
          </div>

          <div className="print-infographic-card text-center" style={{ backgroundColor: '#fffbebf0', borderColor: '#fde68a' }}>
            <span className="text-[10px] text-amber-800 font-black uppercase block mb-1">
              🎯 RSI Index
            </span>
            <span className="text-3xl font-black text-amber-600 font-mono block">
              {rsiScore > 0 ? `${rsiScore.toFixed(2)}` : '—'}
            </span>
            <span className="text-[10px] font-bold text-amber-800 font-mono block mt-1">
              {rsiScore >= 2.2 ? 'Tendon Stiffness 👑' : 'Normal SSC ⚡'}
            </span>
          </div>
        </div>

        {/* All Tests Comparison Table WITH RATING CLASSIFICATION BADGES (ممتاز / جيد جداً / جيد) */}
        <div className="mb-6">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
            📊 {printLang === 'en' ? 'Complete Biomechanical Tests Matrix' : 'مصفوفة وتقييم جميع اختبارات الوثب والقدرة المسجلة'}
          </h3>
          <table className="print-table-orange">
            <thead>
              <tr>
                <th style={{ textAlign: printLang === 'en' ? 'left' : 'right' }}>{printLang === 'en' ? 'Test Category' : 'نوع الاختبار (Category)'}</th>
                <th>{printLang === 'en' ? 'Height (cm)' : 'الارتفاع (سم)'}</th>
                <th>{printLang === 'en' ? 'Height (in)' : 'الارتفاع (إنش)'}</th>
                <th>{printLang === 'en' ? 'Flight Time (s)' : 'زمن الطيران'}</th>
                <th>{printLang === 'en' ? 'Peak Power (W)' : 'ذروة القدرة'}</th>
                <th>{printLang === 'en' ? 'Relative Power' : 'القدرة النسبية'}</th>
                <th>{printLang === 'en' ? 'Rating' : 'التقييم المعياري'}</th>
              </tr>
            </thead>
            <tbody>
              {/* CMJ Arms */}
              {(() => {
                const r = getTestRatingTag(maxCmj, mass > 0 ? (61.9 * maxCmj + 36.0 * mass - 1822)/mass : 0);
                return (
                  <tr>
                    <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>CMJ (Arms)</td>
                    <td className="font-mono font-black text-orange-600">{maxCmj > 0 ? `${maxCmj.toFixed(1)} cm` : '—'}</td>
                    <td className="font-mono">{maxCmj > 0 ? `${(maxCmj * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="font-mono">{maxCmj > 0 ? `${Math.sqrt((8 * (maxCmj/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="font-mono font-bold text-slate-900">{maxCmj > 0 ? `${(61.9 * maxCmj + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="font-mono font-bold text-emerald-700">{maxCmj > 0 && mass > 0 ? `${((61.9 * maxCmj + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="font-bold">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black" style={{ backgroundColor: r.bg, color: r.text }}>
                        {printLang === 'en' ? r.en : r.ar}
                      </span>
                    </td>
                  </tr>
                );
              })()}

              {/* CMJ No Arms */}
              {(() => {
                const r = getTestRatingTag(maxCmjNoArms, mass > 0 ? (61.9 * maxCmjNoArms + 36.0 * mass - 1822)/mass : 0);
                return (
                  <tr>
                    <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>CMJ (No Arms)</td>
                    <td className="font-mono font-black text-orange-600">{maxCmjNoArms > 0 ? `${maxCmjNoArms.toFixed(1)} cm` : '—'}</td>
                    <td className="font-mono">{maxCmjNoArms > 0 ? `${(maxCmjNoArms * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="font-mono">{maxCmjNoArms > 0 ? `${Math.sqrt((8 * (maxCmjNoArms/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="font-mono font-bold text-slate-900">{maxCmjNoArms > 0 ? `${(61.9 * maxCmjNoArms + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="font-mono font-bold text-emerald-700">{maxCmjNoArms > 0 && mass > 0 ? `${((61.9 * maxCmjNoArms + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="font-bold">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black" style={{ backgroundColor: r.bg, color: r.text }}>
                        {printLang === 'en' ? r.en : r.ar}
                      </span>
                    </td>
                  </tr>
                );
              })()}

              {/* Squat Jump */}
              {(() => {
                const r = getTestRatingTag(maxSjNoArms, mass > 0 ? (61.9 * maxSjNoArms + 36.0 * mass - 1822)/mass : 0);
                return (
                  <tr>
                    <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>Squat Jump (SJ)</td>
                    <td className="font-mono font-black text-orange-600">{maxSjNoArms > 0 ? `${maxSjNoArms.toFixed(1)} cm` : '—'}</td>
                    <td className="font-mono">{maxSjNoArms > 0 ? `${(maxSjNoArms * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="font-mono">{maxSjNoArms > 0 ? `${Math.sqrt((8 * (maxSjNoArms/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="font-mono font-bold text-slate-900">{maxSjNoArms > 0 ? `${(61.9 * maxSjNoArms + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="font-mono font-bold text-emerald-700">{maxSjNoArms > 0 && mass > 0 ? `${((61.9 * maxSjNoArms + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="font-bold">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black" style={{ backgroundColor: r.bg, color: r.text }}>
                        {printLang === 'en' ? r.en : r.ar}
                      </span>
                    </td>
                  </tr>
                );
              })()}

              {/* Drop Jump RSI */}
              {(() => {
                const rsiVal = rsiScore;
                const r = rsiVal >= 2.2
                  ? { ar: 'ممتاز 🏆', en: 'Elite 🏆', bg: '#dcfce7', text: '#15803d' }
                  : rsiVal >= 1.6
                    ? { ar: 'جيد جداً ⭐', en: 'Very Good ⭐', bg: '#dbeafe', text: '#1d4ed8' }
                    : { ar: 'جيد ⚡', en: 'Good ⚡', bg: '#fef3c7', text: '#b45309' };
                return (
                  <tr>
                    <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>Drop Jump (RSI)</td>
                    <td className="font-mono font-black text-orange-600">{latestRsiRecord ? `${parseFloat(latestRsiRecord.jump_height_cm).toFixed(1)} cm` : '—'}</td>
                    <td className="font-mono">{latestRsiRecord ? `${(parseFloat(latestRsiRecord.jump_height_cm) * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="font-mono">{latestRsiRecord ? `${parseFloat(latestRsiRecord.flight_time_sec).toFixed(3)} s` : '—'}</td>
                    <td className="font-mono font-bold text-slate-900">—</td>
                    <td className="font-mono font-bold text-emerald-700">—</td>
                    <td className="font-bold">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black" style={{ backgroundColor: r.bg, color: r.text }}>
                        {printLang === 'en' ? r.en : r.ar}
                      </span>
                    </td>
                  </tr>
                );
              })()}

              {/* Approach Jump */}
              {(() => {
                const r = getTestRatingTag(maxApproach, mass > 0 ? (61.9 * maxApproach + 36.0 * mass - 1822)/mass : 0);
                return (
                  <tr>
                    <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>Approach Jump</td>
                    <td className="font-mono font-black text-orange-600">{maxApproach > 0 ? `${maxApproach.toFixed(1)} cm` : '—'}</td>
                    <td className="font-mono">{maxApproach > 0 ? `${(maxApproach * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="font-mono">{maxApproach > 0 ? `${Math.sqrt((8 * (maxApproach/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="font-mono font-bold text-slate-900">{maxApproach > 0 ? `${(61.9 * maxApproach + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="font-mono font-bold text-emerald-700">{maxApproach > 0 && mass > 0 ? `${((61.9 * maxApproach + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="font-bold">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black" style={{ backgroundColor: r.bg, color: r.text }}>
                        {printLang === 'en' ? r.en : r.ar}
                      </span>
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* Optional Strength & 1RM Performance Section in PDF */}
        {includeStrengthInPrint && (
          <div className="mb-6">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              🏋️ {printLang === 'en' ? 'Strength & Load Metrics (1RM & Weekly Reps Log)' : 'سجل أداء أقصى قوة وأوزان تمارين التأهيل (1RM & Reps)'}
            </h3>
            <table className="print-table-orange" style={{ borderColor: '#a7f3d0' }}>
              <thead>
                <tr style={{ backgroundColor: '#059669' }}>
                  <th style={{ textAlign: printLang === 'en' ? 'left' : 'right', backgroundColor: '#059669' }}>{printLang === 'en' ? 'Strength Exercise' : 'تمرين القوة (Exercise)'}</th>
                  <th style={{ backgroundColor: '#059669' }}>{printLang === 'en' ? 'Weight Lifted' : 'الوزن المرفوع (كجم)'}</th>
                  <th style={{ backgroundColor: '#059669' }}>{printLang === 'en' ? 'Relative BW Ratio' : 'نسبة وزن الجسم (xBW)'}</th>
                  <th style={{ backgroundColor: '#059669' }}>{printLang === 'en' ? 'Weekly Microcycle' : 'الأسبوع التدريبي'}</th>
                  <th style={{ backgroundColor: '#059669' }}>{printLang === 'en' ? 'Reps Count' : 'عدد التكرارات'}</th>
                </tr>
              </thead>
              <tbody>
                {/* Full Squat */}
                {(() => {
                  const record = playerHistory.find(r => r.test_type === 'full_squat');
                  const weight = record ? parseFloat(record.clean_weight_kg) || 0 : 0;
                  const bwRatio = mass > 0 && weight > 0 ? (weight / mass).toFixed(2) : '—';
                  return (
                    <tr>
                      <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>Full Squat 🏋️‍♂️</td>
                      <td className="font-mono font-black text-emerald-700">{weight > 0 ? `${weight} kg` : '—'}</td>
                      <td className="font-mono font-bold text-slate-900">{bwRatio !== '—' ? `${bwRatio}x BW` : '—'}</td>
                      <td className="font-mono text-slate-700">{record?.week_number ? `${printLang === 'en' ? 'Week' : 'الأسبوع'} ${record.week_number}` : '—'}</td>
                      <td className="font-mono text-slate-700">{record?.reps_count ? `${record.reps_count} ${printLang === 'en' ? 'reps' : 'عدات'}` : '—'}</td>
                    </tr>
                  );
                })()}

                {/* Bench Press */}
                {(() => {
                  const record = playerHistory.find(r => r.test_type === 'bench_press');
                  const weight = record ? parseFloat(record.clean_weight_kg) || 0 : 0;
                  const bwRatio = mass > 0 && weight > 0 ? (weight / mass).toFixed(2) : '—';
                  return (
                    <tr>
                      <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>Bench Press 💪</td>
                      <td className="font-mono font-black text-emerald-700">{weight > 0 ? `${weight} kg` : '—'}</td>
                      <td className="font-mono font-bold text-slate-900">{bwRatio !== '—' ? `${bwRatio}x BW` : '—'}</td>
                      <td className="font-mono text-slate-700">{record?.week_number ? `${printLang === 'en' ? 'Week' : 'الأسبوع'} ${record.week_number}` : '—'}</td>
                      <td className="font-mono text-slate-700">{record?.reps_count ? `${record.reps_count} ${printLang === 'en' ? 'reps' : 'عدات'}` : '—'}</td>
                    </tr>
                  );
                })()}

                {/* Power Clean */}
                {(() => {
                  const record = playerHistory.find(r => r.test_type === 'power_clean' || r.test_type === 'clean');
                  const weight = record ? parseFloat(record.clean_weight_kg) || 0 : 0;
                  const bwRatio = mass > 0 && weight > 0 ? (weight / mass).toFixed(2) : '—';
                  return (
                    <tr>
                      <td style={{ textAlign: printLang === 'en' ? 'left' : 'right', fontWeight: 'bold' }}>Power Clean ⚡</td>
                      <td className="font-mono font-black text-emerald-700">{weight > 0 ? `${weight} kg` : '—'}</td>
                      <td className="font-mono font-bold text-slate-900">{bwRatio !== '—' ? `${bwRatio}x BW` : '—'}</td>
                      <td className="font-mono text-slate-700">{record?.week_number ? `${printLang === 'en' ? 'Week' : 'الأسبوع'} ${record.week_number}` : '—'}</td>
                      <td className="font-mono text-slate-700">{record?.reps_count ? `${record.reps_count} ${printLang === 'en' ? 'reps' : 'عدات'}` : '—'}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* CONCISE DIAGNOSTIC CALLOUT IN PDF */}
        <div className="border-r-8 border-[#ea580c] bg-[#fffaf0] p-4 rounded-xl mb-6 text-xs leading-relaxed font-mono">
          <p className="font-black text-slate-900 mb-1">
            🔬 {printLang === 'en' ? 'Biomechanical Diagnostic:' : 'التشخيص الحركي:'}
          </p>
          <p className="text-slate-900 font-black text-sm">
            • {printLang === 'en' ? `Classification: ${eur > 1.15 ? 'Tendon Elasticity Dominant' : eur < 1.05 ? 'Muscular Concentric Force Dominant' : 'Optimal Muscle-Tendon Balance'}` : `نمط الاعتماد الحركي: ${pdfDiagnosticTag}`}
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
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => setIsBenchmarkModalOpen(true)}
            className="px-4 py-2.5 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-400 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            <Table size={16} />
            {isEn ? 'Normative Benchmarks Table' : 'المستويات المعيارية (Norms)'}
          </button>

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
          { id: 'diagnostics', nameAr: 'التشخيص الحركي ومنحنى FVP', nameEn: 'Biomechanical Diagnostics & FVP', icon: Activity },
          { id: 'history', nameAr: 'سجل القياسات الكامل والتطور', nameEn: 'Full Measurement History', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'btn-orange-gradient text-white shadow-lg'
                  : 'bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
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
          
          {/* Executive 4 Core KPI Cards matching Image 1 exact titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Max Vertical Jump (CMJ) */}
            <div
              onClick={() => {
                setBenchmarkCategory('cmj');
                setBenchmarkGender(activePlayer?.gender || 'male');
                setIsBenchmarkModalOpen(true);
              }}
              className="glass-panel p-5 hud-card space-y-3 hover:border-cyan-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 font-mono uppercase">Max Vertical Jump (CMJ)</span>
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

            {/* KPI 2: Flight Time */}
            <div
              onClick={() => setSelectedMetric({
                title: 'Flight Time',
                value: `${flightTime.toFixed(3)} s`,
                desc: 'Airborne duration in seconds from takeoff to landing.',
                benchmarks: [
                  { label: 'Elite 👑', value: '+0.75 s' },
                  { label: 'Excellent 🏆', value: '0.68 s - 0.74 s' },
                  { label: 'Good ⭐', value: '0.60 s - 0.67 s' }
                ]
              })}
              className="glass-panel p-5 hud-card space-y-3 hover:border-blue-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 font-mono uppercase">Flight Time</span>
                <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Clock size={18} />
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-white font-mono">{flightTime > 0 ? flightTime.toFixed(3) : '—'}</span>
                <span className="text-xs text-gray-400 font-bold ml-1">sec</span>
              </div>
            </div>

            {/* KPI 3: Relative Power Density (W/kg) */}
            <div
              onClick={() => setSelectedMetric({
                title: 'Relative Power Density (W/kg)',
                value: `${relativePower.toFixed(1)} W/kg`,
                desc: 'Power output per kilogram of athlete body mass.',
                benchmarks: [
                  { label: 'Elite 👑', value: '+65.0 W/kg' },
                  { label: 'Excellent 🏆', value: '55.0 - 64.9 W/kg' },
                  { label: 'Good ⭐', value: '45.0 - 54.9 W/kg' }
                ]
              })}
              className="glass-panel p-5 hud-card space-y-3 hover:border-emerald-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 font-mono uppercase">Relative Power Density</span>
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Zap size={18} />
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-white font-mono">{relativePower > 0 ? relativePower.toFixed(1) : '—'}</span>
                <span className="text-xs text-gray-400 font-bold ml-1">W/kg</span>
              </div>
            </div>

            {/* KPI 4: RSI Index */}
            <div
              onClick={() => {
                setBenchmarkCategory('rsi');
                setBenchmarkGender(activePlayer?.gender || 'male');
                setIsBenchmarkModalOpen(true);
              }}
              className="glass-panel p-5 hud-card space-y-3 hover:border-yellow-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 font-mono uppercase">RSI Index</span>
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

          {/* STRENGTH & APPROACH JUMP HIGHLIGHT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Approach Jump Card */}
            <div className="glass-panel p-4 hud-card space-y-2 border-l-4 border-l-orange-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-orange-400 font-mono uppercase">{isEn ? 'Approach Jump 🚀' : 'الارتقاء الحركي 🚀'}</span>
                <span className="text-[10px] text-gray-400 font-mono">Approach</span>
              </div>
              <div>
                <span className="text-2xl font-black text-white font-mono">{maxApproach > 0 ? `${maxApproach.toFixed(1)} cm` : '—'}</span>
                {maxApproach > 0 && (
                  <span className="text-[10px] text-orange-300 font-mono block">
                    {isEn ? `Touch: ${standingReach + maxApproach} cm` : `الوصول الكلي: ${standingReach + maxApproach} سم`}
                  </span>
                )}
              </div>
            </div>

            {/* Full Squat 1RM Card */}
            <div className="glass-panel p-4 hud-card space-y-2 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 font-mono uppercase">{isEn ? 'Full Squat 1RM 🏋️‍♂️' : 'الأسكوات الكامل 🏋️‍♂️'}</span>
                <span className="text-[10px] text-gray-400 font-mono">1RM</span>
              </div>
              <div>
                <span className="text-2xl font-black text-white font-mono">{maxFullSquat > 0 ? `${maxFullSquat} kg` : '—'}</span>
                {maxFullSquat > 0 && mass > 0 && (
                  <span className="text-[10px] text-emerald-300 font-mono block">
                    ({(maxFullSquat / mass).toFixed(2)} xBW)
                  </span>
                )}
              </div>
            </div>

            {/* Bench Press 1RM Card */}
            <div className="glass-panel p-4 hud-card space-y-2 border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-400 font-mono uppercase">{isEn ? 'Bench Press 1RM 💪' : 'البنش بريس 💪'}</span>
                <span className="text-[10px] text-gray-400 font-mono">1RM</span>
              </div>
              <div>
                <span className="text-2xl font-black text-white font-mono">{maxBenchPress > 0 ? `${maxBenchPress} kg` : '—'}</span>
                {maxBenchPress > 0 && mass > 0 && (
                  <span className="text-[10px] text-rose-300 font-mono block">
                    ({(maxBenchPress / mass).toFixed(2)} xBW)
                  </span>
                )}
              </div>
            </div>

            {/* Power Clean 1RM Card */}
            <div className="glass-panel p-4 hud-card space-y-2 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-400 font-mono uppercase">{isEn ? 'Power Clean 1RM ⚡' : 'رفعة الكلين ⚡'}</span>
                <span className="text-[10px] text-gray-400 font-mono">1RM</span>
              </div>
              <div>
                <span className="text-2xl font-black text-white font-mono">{maxPowerClean > 0 ? `${maxPowerClean} kg` : '—'}</span>
                {maxPowerClean > 0 && mass > 0 && (
                  <span className="text-[10px] text-amber-300 font-mono block">
                    ({(maxPowerClean / mass).toFixed(2)} xBW)
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* VOLLEYBALL NET & BASKETBALL DUNK KPIS IN APP SCREEN */}
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
                  {isFemale ? 'Women Net (224cm)' : 'Men Net (243cm)'}
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


          {/* COMPLETE ALL TESTS PERFORMANCE MATRIX TABLE */}
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
                    <th className="p-3 text-right">{isEn ? 'Test Category' : 'نوع الاختبار (Category)'}</th>
                    <th className="p-3">{isEn ? 'Peak Height (cm)' : 'الارتفاع (Jump Height)'}</th>
                    <th className="p-3">{isEn ? 'Height (in)' : 'الارتفاع (in)'}</th>
                    <th className="p-3">{isEn ? 'Flight Time (s)' : 'زمن الطيران (Flight Time)'}</th>
                    <th className="p-3">{isEn ? 'Peak Power (W)' : 'ذروة القدرة (Peak Power)'}</th>
                    <th className="p-3">{isEn ? 'Relative Power' : 'القدرة النسبية (W/kg)'}</th>
                    <th className="p-3">{isEn ? 'RSI / Status' : 'مؤشر الإنتاجية'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono text-gray-300">
                  <tr className="hover:bg-blue-600/10 transition-colors">
                    <td className="p-3 text-right font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      CMJ (Arms)
                    </td>
                    <td className="p-3 text-cyan-400 font-black">{maxCmj > 0 ? `${maxCmj.toFixed(1)} cm` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxCmj > 0 ? `${(maxCmj * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxCmj > 0 ? `${Math.sqrt((8 * (maxCmj/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="p-3 text-blue-400 font-bold">{maxCmj > 0 ? `${(61.9 * maxCmj + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="p-3 text-emerald-400 font-bold">{maxCmj > 0 && mass > 0 ? `${((61.9 * maxCmj + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="p-3 text-gray-400 font-sans">{maxCmj > 0 ? 'Max Jump 👑' : '—'}</td>
                  </tr>

                  <tr className="hover:bg-blue-600/10 transition-colors">
                    <td className="p-3 text-right font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      CMJ (No Arms)
                    </td>
                    <td className="p-3 text-cyan-400 font-black">{maxCmjNoArms > 0 ? `${maxCmjNoArms.toFixed(1)} cm` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxCmjNoArms > 0 ? `${(maxCmjNoArms * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxCmjNoArms > 0 ? `${Math.sqrt((8 * (maxCmjNoArms/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="p-3 text-blue-400 font-bold">{maxCmjNoArms > 0 ? `${(61.9 * maxCmjNoArms + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="p-3 text-emerald-400 font-bold">{maxCmjNoArms > 0 && mass > 0 ? `${((61.9 * maxCmjNoArms + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="p-3 text-gray-400 font-sans">{maxCmjNoArms > 0 ? 'SSC Test ⚡' : '—'}</td>
                  </tr>

                  <tr className="hover:bg-blue-600/10 transition-colors">
                    <td className="p-3 text-right font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Squat Jump (SJ)
                    </td>
                    <td className="p-3 text-cyan-400 font-black">{maxSjNoArms > 0 ? `${maxSjNoArms.toFixed(1)} cm` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxSjNoArms > 0 ? `${(maxSjNoArms * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxSjNoArms > 0 ? `${Math.sqrt((8 * (maxSjNoArms/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="p-3 text-blue-400 font-bold">{maxSjNoArms > 0 ? `${(61.9 * maxSjNoArms + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="p-3 text-emerald-400 font-bold">{maxSjNoArms > 0 && mass > 0 ? `${((61.9 * maxSjNoArms + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="p-3 text-gray-400 font-sans">{maxSjNoArms > 0 ? 'Concentric ⚡' : '—'}</td>
                  </tr>

                  <tr className="hover:bg-blue-600/10 transition-colors">
                    <td className="p-3 text-right font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      Drop Jump (RSI)
                    </td>
                    <td className="p-3 text-cyan-400 font-black">{latestRsiRecord ? `${parseFloat(latestRsiRecord.jump_height_cm).toFixed(1)} cm` : '—'}</td>
                    <td className="p-3 text-gray-300">{latestRsiRecord ? `${(parseFloat(latestRsiRecord.jump_height_cm) * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="p-3 text-gray-300">{latestRsiRecord ? `${parseFloat(latestRsiRecord.flight_time_sec).toFixed(3)} s` : '—'}</td>
                    <td className="p-3 text-blue-400 font-bold">—</td>
                    <td className="p-3 text-emerald-400 font-bold">—</td>
                    <td className="p-3 text-yellow-400 font-bold">{rsiScore > 0 ? `RSI ${rsiScore.toFixed(2)}` : '—'}</td>
                  </tr>

                  <tr className="hover:bg-blue-600/10 transition-colors">
                    <td className="p-3 text-right font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      Approach Jump
                    </td>
                    <td className="p-3 text-cyan-400 font-black">{maxApproach > 0 ? `${maxApproach.toFixed(1)} cm` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxApproach > 0 ? `${(maxApproach * 0.393701).toFixed(1)}"` : '—'}</td>
                    <td className="p-3 text-gray-300">{maxApproach > 0 ? `${Math.sqrt((8 * (maxApproach/100))/9.81).toFixed(3)} s` : '—'}</td>
                    <td className="p-3 text-blue-400 font-bold">{maxApproach > 0 ? `${(61.9 * maxApproach + 36.0 * mass - 1822).toFixed(0)} W` : '—'}</td>
                    <td className="p-3 text-emerald-400 font-bold">{maxApproach > 0 && mass > 0 ? `${((61.9 * maxApproach + 36.0 * mass - 1822)/mass).toFixed(1)} W/kg` : '—'}</td>
                    <td className="p-3 text-purple-400 font-bold">{maxApproach > 0 ? 'Max Velocity 🚀' : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>


          {/* Historical Trend Chart (Weekly Peak Metrics) */}
          <div className="glass-panel p-6 hud-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-cyan-400" />
                  {isEn ? 'Weekly Peak Form & Performance Trajectory' : 'منحنى تطور الأداء والجاهزية (أفضل رقم أسبوعي)'}
                </h3>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {isEn ? 'Plots the single best (peak) result per week to measure true weekly peak form' : 'يعرض أوج العطاء وأفضل قياس حققه اللاعب في كل أسبوع لتحديد نسبة الجاهزية والنشاط'}
                </p>
              </div>

              {/* Metric Dropdown Selector */}
              <div className="flex items-center gap-2 bg-black/60 border border-gray-800 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold">{isEn ? 'Chart Metric:' : 'القياس المعروض:'}</span>
                <select
                  value={chartMetric}
                  onChange={(e) => setChartMetric(e.target.value)}
                  className="bg-transparent text-xs font-bold text-cyan-400 outline-none cursor-pointer font-mono"
                >
                  <option value="cmj" className="bg-gray-900 text-white">CMJ Jump Height (cm)</option>
                  <option value="approach" className="bg-gray-900 text-white">Approach Jump (الارتقاء الحركي cm)</option>
                  <option value="rsi" className="bg-gray-900 text-white">RSI Score (مؤشر RSI)</option>
                  <option value="power" className="bg-gray-900 text-white">Peak Power (ذروة القدرة W)</option>
                  <option value="full_squat" className="bg-gray-900 text-white">Full Squat 1RM (أسكوات kg)</option>
                  <option value="bench_press" className="bg-gray-900 text-white">Bench Press 1RM (بنش بريس kg)</option>
                  <option value="power_clean" className="bg-gray-900 text-white">Power Clean 1RM (كلين kg)</option>
                </select>
              </div>
            </div>

            {(() => {
              // Group by week and get peak
              const getWeeklyPeakData = () => {
                let filtered = playerHistory;
                if (chartMetric === 'cmj') {
                  filtered = playerHistory.filter(r => r.test_type === 'cmj' || r.test_type === 'cmj_arms' || r.test_type === 'cmj_no_arms' || (!r.test_type && parseFloat(r.jump_height_cm) > 0));
                } else if (chartMetric === 'approach') {
                  filtered = playerHistory.filter(r => r.test_type === 'approach' || r.test_type === 'approach_jump');
                } else if (chartMetric === 'rsi') {
                  filtered = playerHistory.filter(r => r.test_type === 'rsi' || parseFloat(r.rsi_score) > 0);
                } else if (chartMetric === 'power') {
                  filtered = playerHistory.filter(r => parseFloat(r.peak_power_watts) > 0 || parseFloat(r.jump_height_cm) > 0);
                } else if (chartMetric === 'full_squat') {
                  filtered = playerHistory.filter(r => r.test_type === 'full_squat');
                } else if (chartMetric === 'bench_press') {
                  filtered = playerHistory.filter(r => r.test_type === 'bench_press');
                } else if (chartMetric === 'power_clean') {
                  filtered = playerHistory.filter(r => r.test_type === 'power_clean' || (parseFloat(r.clean_weight_kg) > 0 && r.test_type !== 'full_squat' && r.test_type !== 'bench_press'));
                }

                if (filtered.length === 0) return [];

                const getValue = (r) => {
                  if (chartMetric === 'rsi') return parseFloat(r.rsi_score) || 0;
                  if (chartMetric === 'power') return parseFloat(r.peak_power_watts) || (parseFloat(r.jump_height_cm) > 0 ? (61.9 * parseFloat(r.jump_height_cm) + 36.0 * mass - 1822) : 0);
                  if (chartMetric === 'full_squat' || chartMetric === 'bench_press' || chartMetric === 'power_clean') return parseFloat(r.clean_weight_kg) || 0;
                  return parseFloat(r.jump_height_cm) || 0;
                };

                const grouped = {};
                filtered.forEach(item => {
                  const val = getValue(item);
                  if (val <= 0) return;
                  const d = new Date(item.created_at);
                  if (isNaN(d.getTime())) return;
                  const startOfYear = new Date(d.getFullYear(), 0, 1);
                  const pastDays = (d - startOfYear) / 86400000;
                  const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
                  const wKey = `${d.getFullYear()}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;
                  
                  if (!grouped[wKey] || val > grouped[wKey].val) {
                    grouped[wKey] = {
                      weekKey: wKey,
                      displayWeek: isEn ? `W${weekNum} (${d.getDate()}/${d.getMonth()+1})` : `أسبوع ${weekNum} (${d.getDate()}/${d.getMonth()+1})`,
                      val: parseFloat(val.toFixed(2)),
                      unit: chartMetric === 'rsi' ? '' : (chartMetric === 'power' ? ' W' : (chartMetric.includes('squat') || chartMetric.includes('press') || chartMetric.includes('clean') ? ' kg' : ' cm')),
                      notes: item.notes || ''
                    };
                  }
                });

                return Object.values(grouped).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
              };

              const chartData = getWeeklyPeakData();

              if (chartData.length === 0) {
                return (
                  <div className="text-center py-10 text-gray-500 font-bold text-xs border border-dashed border-gray-800 rounded-2xl">
                    {isEn ? 'No test records available for the selected metric.' : 'لا توجد قياسات مسجلة لهذا النوع لعرض منحنى الأداء الأسبوعي.'}
                  </div>
                );
              }

              return (
                <div className="w-full h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="displayWeek" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} domain={['auto', 'auto']} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-3 shadow-2xl text-xs space-y-1.5 font-mono">
                                <p className="font-bold text-cyan-400">{data.displayWeek}</p>
                                <p className="text-white font-black text-sm">
                                  {data.val}{data.unit} <span className="text-[10px] text-orange-400 font-sans font-bold">(أفضل رقم بالمركز 🔥)</span>
                                </p>
                                {data.notes ? (
                                  <div className="pt-1.5 border-t border-gray-800 text-[11px] text-amber-300 font-sans font-medium flex items-start gap-1">
                                    <span>📝</span>
                                    <span>{data.notes}</span>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-gray-500 font-sans italic">{isEn ? 'No notes for this test' : 'لا توجد ملاحظات مضافة'}</p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="val" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorMetric)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </div>

        </div>
      )}


      {/* TAB 2: BIOMECHANICAL DIAGNOSTICS & DETAILED FVP SPECTRUM EXPLANATION IN APP */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          
          {/* Detailed Scientific FVP & Tendon Elasticity Explanation Card */}
          <div className="glass-panel p-6 hud-card space-y-4 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Activity size={18} className="text-orange-500" />
                  {isEn ? 'Detailed Biomechanical Diagnostic & FVP Spectrum' : 'التشخيص الحركي وشرح نمط الاعتماد (مطاطي أم عضلي)'}
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  {isEn ? 'Scientific breakdown of Elastic Utilization Ratio (EUR) & Force-Velocity Profile' : 'الشرح العلمي التفصيلي لمعامل EUR ونسبة مطاطية الأوتار إلى القوة العضلية'}
                </p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-xl border font-black ${
                eur > 1.15
                  ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30'
                  : eur < 1.05 && eur > 0
                    ? 'bg-orange-950/40 text-orange-400 border-orange-500/30'
                    : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
              }`}>
                {eur > 1.15
                  ? 'الاعتماد مطاطي ارتدادي (Tendon SSC Elasticity)'
                  : eur < 1.05 && eur > 0
                    ? 'الاعتماد عضلي انقباضي (Muscular Concentric Force)'
                    : 'توازن مثالي بين العضلات والأوتار (Optimal Balance)'}
              </span>
            </div>

            {/* Interactive Diagnostic Explanation Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                eur > 1.15 ? 'bg-cyan-950/30 border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'bg-black/30 border-gray-850 opacity-70'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <h4 className="text-xs font-black text-cyan-400">
                    الاعتماد مطاطي ارتدادي (EUR &gt; 1.15)
                  </h4>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                  <strong>متى يحدث؟</strong> عندما تكون قفزة CMJ أعلى بفارق ملحوظ من Squat Jump (أوتار الأرجل والأكيلس تمتلك مطاطية فائقة).
                </p>
                <div className="p-2 bg-black/40 rounded-xl text-[10px] text-cyan-200 border border-cyan-500/20 font-mono">
                  <strong>🎯 التوصية التدريبية:</strong> اللاعب يفتقر للقوة العضلية الانقباضية الصافية. يجب التركيز على التمارين الثقيلة (Heavy Squats & Deadlifts &gt;80% 1RM).
                </div>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                eur < 1.05 && eur > 0 ? 'bg-orange-950/30 border-orange-500/50 shadow-lg shadow-orange-500/10' : 'bg-black/30 border-gray-850 opacity-70'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏋️</span>
                  <h4 className="text-xs font-black text-orange-400">
                    الاعتماد عضلي انقباضي (EUR &lt; 1.05)
                  </h4>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                  <strong>متى يحدث؟</strong> عندما تكون قفزة CMJ متساوية تقريباً مع Squat Jump (اللاعب يعتمد بالكامل على قوة العضلات ولا يستغل مطاطية الأوتار).
                </p>
                <div className="p-2 bg-black/40 rounded-xl text-[10px] text-orange-200 border border-orange-500/20 font-mono">
                  <strong>🎯 التوصية التدريبية:</strong> التركيز فوراً على تمارين البلايومتركس السريع (Fast Pogo Jumps & Depth Jumps).
                </div>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 transition-all ${
                eur >= 1.05 && eur <= 1.15 ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'bg-black/30 border-gray-850 opacity-70'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  <h4 className="text-xs font-black text-emerald-400">
                    توازن مثالي (1.05 - 1.15)
                  </h4>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                  <strong>التوصيف العلمي:</strong> توافق وتنسيق حركي ممتاز بين توليد القوة من العضلات وتخزينها في الأوتار وإعادة إطلاقها.
                </p>
                <div className="p-2 bg-black/40 rounded-xl text-[10px] text-emerald-200 border border-emerald-500/20 font-mono">
                  <strong>🎯 التوصية التدريبية:</strong> الاستمرار في برنامج التدريب التكاملي المركب (Contrast Training).
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 hud-card space-y-4">
              <h3 className="text-sm font-black text-white border-b border-gray-800 pb-2">
                {isEn ? 'Elastic Utilization Ratio (EUR)' : 'مؤشر الاستغلال المطاطي للأوتار (EUR Index)'}
              </h3>
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-sans">CMJ (No Arms):</span>
                  <span className="text-white font-bold">{maxCmjNoArms > 0 ? `${maxCmjNoArms.toFixed(1)} cm` : '—'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-sans">Squat Jump (SJ):</span>
                  <span className="text-white font-bold">{maxSjNoArms > 0 ? `${maxSjNoArms.toFixed(1)} cm` : '—'}</span>
                </div>
                <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl flex items-center justify-between pt-2">
                  <span className="text-xs text-blue-300 font-sans font-bold">EUR Score:</span>
                  <span className="text-lg font-black text-cyan-400">{eur > 0 ? eur.toFixed(2) : '—'}</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 hud-card space-y-4">
              <h3 className="text-sm font-black text-white border-b border-gray-800 pb-2">
                {isEn ? 'Arm Swing Contribution Ratio' : 'نسبة مساهمة الذراعين الحركية (Arm Swing %)'}
              </h3>
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-sans">CMJ (Arms):</span>
                  <span className="text-white font-bold">{maxCmj > 0 ? `${maxCmj.toFixed(1)} cm` : '—'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-sans">CMJ (No Arms):</span>
                  <span className="text-white font-bold">{maxCmjNoArms > 0 ? `${maxCmjNoArms.toFixed(1)} cm` : '—'}</span>
                </div>
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between pt-2">
                  <span className="text-xs text-emerald-300 font-sans font-bold">Arm Swing Contribution:</span>
                  <span className="text-lg font-black text-emerald-400">{armSwing > 0 ? `+${armSwing.toFixed(1)}%` : '—'}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}


      {/* TAB 3: FULL HISTORY MATRIX & SOCIAL MEDIA HUD */}
      {activeTab === 'history' && (
        <div className="glass-panel p-6 hud-card space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>{isEn ? 'Athlete Measurement & Testing History Log' : 'سجل القياسات بيوميكانيكي عالي الدقة'}</span>
                <span className="text-[10px] font-mono font-black text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  HUD v3.0
                </span>
              </h3>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                {isEn ? 'Filter records by test type, edit entries, or switch to Social Media Story mode for quick screenshots' : 'تصفية وحفظ القياسات، مع إمكانية تحويل الواجهة لبطاقة تكنولوجية مجهزة للتصوير والنشر على السوشيال ميديا'}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
              {/* View Switcher: Table vs Social Media Story Card */}
              <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-gray-800">
                <button
                  type="button"
                  onClick={() => setHistoryViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${historyViewMode === 'table' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  📋 {isEn ? 'Table View' : 'جدول القياسات'}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryViewMode('social_card')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${historyViewMode === 'social_card' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  📸 {isEn ? 'Social Card' : 'بطاقة السوشيال'}
                </button>
              </div>

              {/* Motion Graphic Video Showcase Button */}
              <button
                type="button"
                onClick={() => setIsMotionVideoOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer border border-orange-400/40"
              >
                <Film size={16} />
                <span>🎬 {isEn ? 'Motion Graphic Video' : 'فيديو موشن جرافيك للّاعب'}</span>
              </button>

              {/* Category Filter Selector */}
              <div className="flex items-center gap-2 bg-black/50 border border-gray-800 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold">{isEn ? 'Filter:' : 'نوع القياس:'}</span>
                <select
                  value={filterTestType}
                  onChange={(e) => setFilterTestType(e.target.value)}
                  className="bg-transparent text-xs font-bold text-cyan-400 outline-none cursor-pointer"
                >
                  <option value="all" className="bg-gray-900 text-white">{isEn ? 'All Measurements (الكل)' : 'جميع القياسات (الكل)'}</option>
                  <option value="cmj" className="bg-gray-900 text-white">CMJ (Arms)</option>
                  <option value="cmj_no_arms" className="bg-gray-900 text-white">CMJ (No Arms)</option>
                  <option value="sj_no_arms" className="bg-gray-900 text-white">Squat Jump (SJ)</option>
                  <option value="rsi" className="bg-gray-900 text-white">Drop Jump (RSI)</option>
                  <option value="approach" className="bg-gray-900 text-white">Approach Jump (الارتقاء الحركي)</option>
                  <option value="full_squat" className="bg-gray-900 text-white">Full Squat (أسكوات كامل)</option>
                  <option value="bench_press" className="bg-gray-900 text-white">Bench Press (بنش بريس)</option>
                  <option value="power_clean" className="bg-gray-900 text-white">Power Clean (كلين)</option>
                </select>
              </div>
            </div>
          </div>

          {playerHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-bold text-xs space-y-2">
              <Activity size={32} className="mx-auto text-gray-600 animate-pulse" />
              <p>{isEn ? 'No measurements logged yet.' : 'لا توجد قياسات مسجلة لهذا اللاعب حتى الآن.'}</p>
            </div>
          ) : historyViewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-blue-950/40 text-blue-300 font-bold border-b border-gray-800">
                    <th className="p-3">{isEn ? 'Date' : 'التاريخ'}</th>
                    <th className="p-3">{isEn ? 'Category' : 'نوع الاختبار (Category)'}</th>
                    <th className="p-3">{isEn ? 'Result / Weight' : 'النتيجة / الوزن'}</th>
                    <th className="p-3">{isEn ? 'Flight Time' : 'زمن الطيران (Flight Time)'}</th>
                    <th className="p-3">{isEn ? 'Peak Power' : 'ذروة القدرة (Peak Power)'}</th>
                    <th className="p-3">{isEn ? 'RSI / Ratio' : 'RSI / النسب الحركية'}</th>
                    <th className="p-3">{isEn ? 'Actions' : 'إجراءات'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono text-gray-300">
                  {playerHistory
                    .filter(h => filterTestType === 'all' ? true : (filterTestType === 'cmj' ? (h.test_type === 'cmj' || h.test_type === 'cmj_arms') : h.test_type === filterTestType))
                    .map((jump, idx) => {
                      const isStrength = jump.test_type === 'full_squat' || jump.test_type === 'bench_press' || jump.test_type === 'power_clean' || parseFloat(jump.clean_weight_kg) > 0;
                      const strengthWeight = parseFloat(jump.clean_weight_kg) || 0;
                      const bwRatio = mass > 0 && strengthWeight > 0 ? (strengthWeight / mass).toFixed(2) : '—';
                      
                      let badgeLabel = jump.test_type ? jump.test_type.toUpperCase() : 'CMJ';
                      let badgeColor = 'bg-blue-950/60 text-cyan-400 border-cyan-500/30';
                      
                      if (jump.test_type === 'approach' || jump.test_type === 'approach_jump') {
                        badgeLabel = 'APPROACH 🚀';
                        badgeColor = 'bg-orange-950/60 text-orange-400 border-orange-500/30';
                      } else if (jump.test_type === 'full_squat') {
                        badgeLabel = 'FULL SQUAT 🏋️‍♂️';
                        badgeColor = 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30';
                      } else if (jump.test_type === 'bench_press') {
                        badgeLabel = 'BENCH PRESS 💪';
                        badgeColor = 'bg-rose-950/60 text-rose-400 border-rose-500/30';
                      } else if (jump.test_type === 'power_clean') {
                        badgeLabel = 'POWER CLEAN ⚡';
                        badgeColor = 'bg-amber-950/60 text-amber-400 border-amber-500/30';
                      } else if (jump.test_type === 'rsi') {
                        const boxStr = jump.box_height_cm ? ` (${jump.box_height_cm}cm)` : '';
                        badgeLabel = `DROP JUMP 🎯${boxStr}`;
                        badgeColor = 'bg-yellow-950/60 text-yellow-400 border-yellow-500/30';
                      }

                      return (
                        <tr key={jump.id || idx} className="hover:bg-blue-600/10 transition-colors">
                          <td className="p-3 text-gray-400">{new Date(jump.created_at).toLocaleDateString('ar-EG')}</td>
                          <td className="p-3 font-sans font-bold">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black border ${badgeColor}`}>
                              {badgeLabel}
                            </span>
                            {jump.notes && (
                              <div className="text-[10px] text-amber-300 font-normal font-sans mt-1 flex items-center justify-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30 max-w-[180px] mx-auto truncate" title={jump.notes}>
                                <span>📝</span>
                                <span className="truncate">{jump.notes}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-cyan-400 font-black">
                            {isStrength ? (
                              <div className="flex flex-col items-center">
                                <span className="text-emerald-400">{strengthWeight} kg</span>
                                <span className="text-[9px] text-amber-300 font-sans font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 mt-0.5">
                                  W{jump.week_number || 1} • {jump.reps_count || 1} {jump.reps_count > 1 ? 'reps' : 'rep'}
                                </span>
                              </div>
                            ) : parseFloat(jump.jump_height_cm) > 0 ? `${parseFloat(jump.jump_height_cm).toFixed(1)} cm` : '—'}
                          </td>
                          <td className="p-3 text-gray-300">{parseFloat(jump.flight_time_sec) > 0 ? `${parseFloat(jump.flight_time_sec).toFixed(3)} s` : '—'}</td>
                          <td className="p-3 text-blue-400 font-bold">{parseFloat(jump.peak_power_watts) > 0 ? `${parseFloat(jump.peak_power_watts).toFixed(0)} W` : '—'}</td>
                          <td className="p-3 text-yellow-400 font-bold">
                            {isStrength
                              ? `${bwRatio} xBW`
                              : parseFloat(jump.rsi_score) > 0 
                                ? `${parseFloat(jump.rsi_score).toFixed(2)}${jump.box_height_cm ? ` (📦 ${jump.box_height_cm}cm)` : ''}`
                                : '—'}
                          </td>
                          <td className="p-3 flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingRecord({ ...jump })}
                              title={isEn ? 'Edit Record' : 'تعديل القياس'}
                              className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTest(jump.id)}
                              title={isEn ? 'Delete Record' : 'حذف القياس'}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
          ) : (
            /* SOCIAL MEDIA STORY SNAPSHOT HUD CARD */
            <div className="max-w-xl mx-auto bg-gradient-to-b from-[#090e18] via-[#05070e] to-[#020306] border-2 border-cyan-500/40 rounded-3xl p-6 shadow-2xl shadow-cyan-500/20 relative space-y-6 overflow-hidden">
              {/* Corner Sci-Fi Accents */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-2xl rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/10 blur-2xl rounded-full pointer-events-none" />

              {/* Story Header */}
              <div className="flex justify-between items-center border-b border-cyan-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <AppLogo size={36} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black tracking-wider text-white">VERTICAL LAB</span>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-md border border-cyan-500/30">
                        OFFICIAL BIOMEX
                      </span>
                    </div>
                    <p className="text-[10px] text-cyan-400 font-bold">Biomechanical Performance Record</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-400 font-bold bg-slate-900 px-3 py-1 rounded-xl border border-gray-800">
                  {new Date().toLocaleDateString('ar-EG')}
                </span>
              </div>

              {/* Athlete Profile Card */}
              <div className="bg-slate-900/80 border border-cyan-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md font-mono">
                    {activePlayer.full_name ? activePlayer.full_name[0] : 'P'}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">{activePlayer.full_name}</h3>
                    <p className="text-xs text-cyan-400 font-bold font-mono">
                      {age} {isEn ? 'yrs' : 'سنة'} • {mass} kg • {playerHeight} cm
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">{isEn ? 'Athlete Dossier' : 'ملف اللاعب'}</span>
                  <span className="text-xs font-black text-cyan-400">ATH-{activePlayer.id?.substring(0, 6).toUpperCase()}</span>
                </div>
              </div>

              {/* Top 3 Best Performances Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950/90 border border-cyan-500/30 p-3 rounded-2xl">
                  <span className="text-[9px] text-gray-400 font-bold block uppercase mb-1">Max CMJ Height</span>
                  <span className="text-lg font-black text-cyan-300 font-mono block">
                    {maxCmj > 0 ? `${maxCmj.toFixed(1)} cm` : '—'}
                  </span>
                  <span className="text-[9px] font-bold text-cyan-400 font-mono">
                    ({maxCmj > 0 ? (maxCmj * 0.393701).toFixed(1) : 0}")
                  </span>
                </div>

                <div className="bg-slate-950/90 border border-blue-500/30 p-3 rounded-2xl">
                  <span className="text-[9px] text-gray-400 font-bold block uppercase mb-1">Flight Time (CMJ)</span>
                  <span className="text-lg font-black text-blue-400 font-mono block">
                    {cmjFlightTime > 0 ? `${cmjFlightTime.toFixed(3)} s` : '—'}
                  </span>
                  <span className="text-[9px] font-bold text-blue-300 font-mono">
                    (Air Time)
                  </span>
                </div>

                <div className="bg-slate-950/90 border border-yellow-500/30 p-3 rounded-2xl">
                  <span className="text-[9px] text-gray-400 font-bold block uppercase mb-1">Max RSI Index</span>
                  <span className="text-lg font-black text-yellow-400 font-mono block">
                    {maxRsi > 0 ? maxRsi.toFixed(2) : '—'}
                  </span>
                  <span className="text-[9px] font-bold text-yellow-300 font-mono">Elasticity</span>
                </div>
              </div>

              {/* Recent Measurements Timeline */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-2">
                  📊 {isEn ? 'Recent Telemetry Logs:' : 'آخر القياسات المسجلة:'}
                </span>

                {playerHistory
                  .filter(h => filterTestType === 'all' ? true : (filterTestType === 'cmj' ? (h.test_type === 'cmj' || h.test_type === 'cmj_arms') : h.test_type === filterTestType))
                  .slice(0, 5)
                  .map((jump, idx) => (
                    <div key={idx} className="bg-slate-900/60 border border-gray-800 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-cyan-950/50 text-cyan-400 rounded-md text-[10px] font-bold uppercase border border-cyan-500/30">
                          {jump.test_type}
                        </span>
                        <span className="text-white font-bold">
                          {parseFloat(jump.jump_height_cm) > 0 ? `${parseFloat(jump.jump_height_cm).toFixed(1)} cm` : '—'}
                        </span>
                      </div>
                      <span className="text-gray-400 text-[10px]">
                        {new Date(jump.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Watermark Footer */}
              <div className="border-t border-cyan-500/20 pt-3 text-center text-[9px] font-mono text-gray-500 flex justify-between items-center">
                <span>VERIFIED BIOMECHANICAL REPORT</span>
                <span className="text-cyan-400 font-bold">READY FOR STORY SHARE 📸</span>
              </div>
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


      {/* NORMATIVE BENCHMARKS FULL MATRIX MODAL (Exact Image 1, 2, 3 values) */}
      {isBenchmarkModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-3xl w-full p-6 space-y-6 hud-card border-cyan-500/40 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsBenchmarkModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-gray-900 border border-gray-800"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/30">
                <Table size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {isEn ? 'Official Athletic Normative Benchmarks Matrix' : 'المستويات المعيارية المعتمدة (Normative Benchmarks Matrix)'}
                </h3>
                <p className="text-xs text-gray-400 font-medium">
                  {isEn ? 'Exact calibrated tiers for CMJ and RSI performance' : 'مصفوفة التقييم المعياري للاختبارات بالإنش والسنتيمتر للرجال والنساء'}
                </p>
              </div>
            </div>

            {/* Selector Controls: Gender & Category */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-black/40 p-3 rounded-2xl border border-gray-850">
              
              {/* Category Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBenchmarkCategory('cmj')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    benchmarkCategory === 'cmj'
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                      : 'bg-gray-900 text-gray-400 hover:text-white'
                  }`}
                >
                  🚀 CMJ Jump Height
                </button>
                <button
                  onClick={() => setBenchmarkCategory('rsi')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    benchmarkCategory === 'rsi'
                      ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/20'
                      : 'bg-gray-900 text-gray-400 hover:text-white'
                  }`}
                >
                  🎯 RSI Index (Drop Jump)
                </button>
              </div>

              {/* Gender Selector */}
              <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-xl border border-gray-800">
                <button
                  onClick={() => setBenchmarkGender('male')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    benchmarkGender === 'male' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  👨 {isEn ? 'Male' : 'شباب / ذكور'}
                </button>
                <button
                  onClick={() => setBenchmarkGender('female')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    benchmarkGender === 'female' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  👩 {isEn ? 'Female' : 'بنات / إناث'}
                </button>
              </div>

            </div>

            {/* BENCHMARK TABLE DISPLAY */}
            <div className="overflow-x-auto border border-gray-800 rounded-2xl">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold border-b border-gray-800">
                    <th className="p-3 text-right">{isEn ? 'Athletic Tier' : 'المستوى التدريبي'}</th>
                    <th className="p-3 bg-red-950/40 text-red-400 border-x border-gray-800">Average (متوسط)</th>
                    <th className="p-3 bg-amber-950/40 text-amber-400 border-r border-gray-800">Good (جيد)</th>
                    <th className="p-3 bg-yellow-950/40 text-yellow-300 border-r border-gray-800">Advanced (متقدم)</th>
                    <th className="p-3 bg-emerald-950/40 text-emerald-400">Elite (نخبة)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80 font-mono text-gray-200">
                  {benchmarkCategory === 'rsi' ? (
                    (benchmarkGender === 'female' ? femaleRsiTable : maleRsiTable).map((row, idx) => (
                      <tr key={idx} className="hover:bg-cyan-950/20 transition-colors">
                        <td className="p-3 text-right font-sans font-bold text-white bg-slate-950/40">{row.tier}</td>
                        <td className="p-3 font-bold text-red-400 bg-red-950/10">{row.avg}</td>
                        <td className="p-3 font-bold text-amber-400 bg-amber-950/10">{row.good}</td>
                        <td className="p-3 font-bold text-yellow-300 bg-yellow-950/10">{row.adv}</td>
                        <td className="p-3 font-black text-emerald-400 bg-emerald-950/10">{row.elite}</td>
                      </tr>
                    ))
                  ) : (
                    (benchmarkGender === 'female' ? femaleCmjTable : maleCmjTable).map((row, idx) => (
                      <tr key={idx} className="hover:bg-cyan-950/20 transition-colors">
                        <td className="p-3 text-right font-sans font-bold text-white bg-slate-950/40">{row.tier}</td>
                        <td className="p-3 font-bold text-red-400 bg-red-950/10">{row.avg}</td>
                        <td className="p-3 font-bold text-amber-400 bg-amber-950/10">{row.good}</td>
                        <td className="p-3 font-bold text-yellow-300 bg-yellow-950/10">{row.adv}</td>
                        <td className="p-3 font-black text-emerald-400 bg-emerald-950/10">{row.elite}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-gray-400 font-mono leading-relaxed bg-black/40 p-3 rounded-xl border border-gray-850">
              💡 {benchmarkCategory === 'cmj'
                  ? (benchmarkGender === 'male'
                      ? 'تم معايرة جدول قفز الذراعين للرجال مع مراعاة السقف الأقصى (30.0 إنش / 76.2 سم).'
                      : 'جدول CMJ المعاير للإناث موضح بالإنش والسنتيمتر (1 إنش = 2.54 سم).')
                  : (benchmarkGender === 'female'
                      ? 'مؤشر RSI للإناث معاير علمياً بأقل بنسبة ~15-20% عن الذكور بسبب الاختلافات البيولوجية في صلابة الأوتار.'
                      : 'جدول مؤشر RSI المعاير للذكور مقسم على 4 مستويات أداء.')}
            </p>

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

            {/* Strength Tests Toggle Option */}
            <div className="space-y-2 bg-black/50 p-3.5 rounded-2xl border border-gray-800 text-right">
              <span className="text-xs font-bold text-gray-300 block">
                📋 {isEn ? 'PDF Content Options:' : 'محتوى وبنود التقرير المطلوب (PDF):'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIncludeStrengthInPrint(true)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    includeStrengthInPrint
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-black shadow-md'
                      : 'bg-slate-900 border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs block font-bold">🏋️ {isEn ? 'Full Report (+Strength)' : 'تقرير شامل (+قياسات القوة)'}</span>
                  <span className="text-[9px] text-emerald-400/80 block mt-0.5">يشمل الأسكوات، البنش، الكلين</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIncludeStrengthInPrint(false)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    !includeStrengthInPrint
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 font-black shadow-md'
                      : 'bg-slate-900 border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs block font-bold">🚀 {isEn ? 'Jumps Only (-Strength)' : 'قياسات القفز والأداء فقط'}</span>
                  <span className="text-[9px] text-cyan-400/80 block mt-0.5">بدون قياسات القوة البدنيه</span>
                </button>
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

      {/* Edit Measurement Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleUpdateTest} className="glass-panel max-w-md w-full p-6 space-y-4 hud-card border-cyan-500/40 relative">
            <button
              type="button"
              onClick={() => setEditingRecord(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <Edit3 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {isEn ? 'Edit Test Record' : 'تعديل بيانات القياس المسجل'}
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  ID: {editingRecord.id?.substring(0, 8)} • {new Date(editingRecord.created_at).toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-right">
              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">نوع الاختبار (Test Category):</label>
                <select
                  value={editingRecord.test_type}
                  onChange={(e) => setEditingRecord({ ...editingRecord, test_type: e.target.value })}
                  className="w-full bg-slate-900 border border-gray-800 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  <option value="cmj">CMJ (Arms)</option>
                  <option value="cmj_no_arms">CMJ (No Arms)</option>
                  <option value="sj_no_arms">Squat Jump (SJ)</option>
                  <option value="rsi">Drop Jump (RSI)</option>
                  <option value="approach">Approach Jump</option>
                  <option value="clean">Power Clean</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">ارتفاع الوثبة (Jump Height - cm):</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingRecord.jump_height_cm || ''}
                  onChange={(e) => {
                    const hCm = parseFloat(e.target.value) || 0;
                    const ft = hCm > 0 ? Math.sqrt((8 * (hCm / 100)) / 9.81) : 0;
                    setEditingRecord({
                      ...editingRecord,
                      jump_height_cm: e.target.value,
                      flight_time_sec: ft > 0 ? ft.toFixed(3) : editingRecord.flight_time_sec
                    });
                  }}
                  className="w-full bg-slate-900 border border-gray-800 rounded-xl p-2.5 text-xs font-mono font-bold text-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-bold mb-1">زمن الطيران (Flight Time - sec):</label>
                <input
                  type="number"
                  step="0.001"
                  value={editingRecord.flight_time_sec || ''}
                  onChange={(e) => {
                    const ft = parseFloat(e.target.value) || 0;
                    const hCm = ft > 0 ? (9.81 * ft * ft / 8) * 100 : 0;
                    setEditingRecord({
                      ...editingRecord,
                      flight_time_sec: e.target.value,
                      jump_height_cm: hCm > 0 ? hCm.toFixed(1) : editingRecord.jump_height_cm
                    });
                  }}
                  className="w-full bg-slate-900 border border-gray-800 rounded-xl p-2.5 text-xs font-mono font-bold text-blue-400"
                />
              </div>

              {editingRecord.test_type === 'rsi' && (
                <div>
                  <label className="block text-xs text-gray-400 font-bold mb-1">مؤشر RSI Index:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.rsi_score || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, rsi_score: e.target.value })}
                    className="w-full bg-slate-900 border border-gray-800 rounded-xl p-2.5 text-xs font-mono font-bold text-yellow-400"
                  />
                </div>
              )}

              {(editingRecord.test_type === 'clean' || editingRecord.test_type === 'full_squat' || editingRecord.test_type === 'bench_press' || editingRecord.test_type === 'power_clean') && (
                <div className="space-y-3 pt-1 border-t border-gray-800">
                  <div>
                    <label className="block text-xs text-gray-400 font-bold mb-1">الوزن المرفوع (Lift Weight - kg):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingRecord.clean_weight_kg || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, clean_weight_kg: e.target.value })}
                      className="w-full bg-slate-900 border border-gray-800 rounded-xl p-2.5 text-xs font-mono font-bold text-emerald-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1">رقم الأسبوع (Week #):</label>
                      <input
                        type="number"
                        min="1"
                        max="52"
                        value={editingRecord.week_number || 1}
                        onChange={(e) => setEditingRecord({ ...editingRecord, week_number: e.target.value })}
                        className="w-full bg-slate-900 border border-gray-800 rounded-xl p-2.5 text-xs font-mono font-bold text-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 font-bold mb-1">عدد التكرارات (Reps):</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={editingRecord.reps_count || 1}
                        onChange={(e) => setEditingRecord({ ...editingRecord, reps_count: e.target.value })}
                        className="w-full bg-slate-900 border border-gray-800 rounded-xl p-2.5 text-xs font-mono font-bold text-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isEditingSaving}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all"
              >
                {isEditingSaving ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Save Changes' : 'حفظ التعديلات')}
              </button>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2.5 bg-gray-900 text-gray-400 hover:text-white font-bold text-xs rounded-xl"
              >
                {isEn ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Motion Graphic Video Showcase Modal */}
      <MotionGraphicVideoModal
        activePlayer={activePlayer}
        playerHistory={playerHistory}
        isOpen={isMotionVideoOpen}
        onClose={() => setIsMotionVideoOpen(false)}
        language={language}
      />

    </div>
  );
}