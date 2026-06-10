import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, TrendingUp, Clock, Zap, ArrowUpCircle, AlertCircle, BookOpen, X, ShieldAlert, Award, User, Scale, Calendar, Trophy, FileText, ChevronLeft, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PlayerProfile({ activePlayer, playerHistory }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, biomechanics, critique, history
  const [showBenchmarks, setShowBenchmarks] = useState(false);

  if (!activePlayer) return null;

  const latestJump = playerHistory && playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;

  // Age calculation
  const currentYear = new Date().getFullYear();
  const birthYear = activePlayer.date_of_birth ? parseInt(activePlayer.date_of_birth.substring(0, 4)) : currentYear;
  const age = currentYear - birthYear;

  // Load physical parameters from localStorage
  const playerHeight = localStorage.getItem(`player_height_${activePlayer.id}`) || '—';
  const playerStandingReach = localStorage.getItem(`standing_reach_${activePlayer.id}`) || '—';
  const standingReachNum = parseFloat(playerStandingReach);

  // Dynamic Benchmarking Engine
  const evaluateMetric = (type, value) => {
    if (!value || isNaN(value)) return { text: 'غير متوفر', color: 'text-gray-400', bg: 'bg-gray-700', progress: 0, range: '' };

    const isFemale = activePlayer.gender === 'female';
    const isYouth = age < 17;
    const youthFactor = isYouth ? 0.85 : 1.0;

    if (type === 'jump_in') {
      let elite = (isFemale ? 26 : 34) * youthFactor;
      let excellent = (isFemale ? 22 : 30) * youthFactor;
      let good = (isFemale ? 18 : 26) * youthFactor;
      let fair = (isFemale ? 15 : 22) * youthFactor;

      if (value < fair) return { text: 'تحت المتوسط ⚠️', color: 'text-red-400', bg: '#ef4444', progress: 25, range: `المعدل الجيد: +${good.toFixed(1)}"` };
      if (value < good) return { text: 'مقبول ⚡', color: 'text-orange-400', bg: '#f97316', progress: 45, range: `المعدل الجيد: +${good.toFixed(1)}"` };
      if (value < excellent) return { text: 'جيد ⭐', color: 'text-teal-400', bg: '#14b8a6', progress: 65, range: `الممتاز: +${excellent.toFixed(1)}"` };
      if (value < elite) return { text: 'ممتاز 🏆', color: 'text-emerald-400', bg: '#10b981', progress: 85, range: `النخبة: +${elite.toFixed(1)}"` };
      return { text: 'نخبة أولمبية 👑', color: 'text-cyan-400', bg: '#06b6d4', progress: 100, range: `أعلى من ${elite.toFixed(1)}"` };
    }
    
    if (type === 'flight_time') {
      let elite = (isFemale ? 0.65 : 0.75) * youthFactor;
      let excellent = (isFemale ? 0.58 : 0.68) * youthFactor;
      let good = (isFemale ? 0.52 : 0.60) * youthFactor;
      
      if (value < good) return { text: 'تلامس بطيء', color: 'text-red-400', bg: '#ef4444', progress: 40, range: `الهدف: +${excellent.toFixed(2)}s` };
      if (value < excellent) return { text: 'جيد ⚡', color: 'text-teal-400', bg: '#14b8a6', progress: 65, range: `الهدف: +${excellent.toFixed(2)}s` };
      if (value < elite) return { text: 'ممتاز ⭐', color: 'text-emerald-400', bg: '#10b981', progress: 85, range: `النخبة: +${elite.toFixed(2)}s` };
      return { text: 'تحليق نخبة 👑', color: 'text-cyan-400', bg: '#06b6d4', progress: 100, range: `أطول من ${elite.toFixed(2)}s` };
    }

    if (type === 'relative_power') {
      let elite = (isFemale ? 52 : 65) * youthFactor;
      let excellent = (isFemale ? 45 : 55) * youthFactor;
      let good = (isFemale ? 38 : 45) * youthFactor;

      if (value < good) return { text: 'قدرة منخفضة', color: 'text-red-400', bg: '#ef4444', progress: 30, range: `المعدل الجيد: +${good.toFixed(1)} W/kg` };
      if (value < excellent) return { text: 'جيد ⚡', color: 'text-teal-400', bg: '#14b8a6', progress: 60, range: `المعدل الممتاز: +${excellent.toFixed(1)} W/kg` };
      if (value < elite) return { text: 'ممتاز ⭐', color: 'text-emerald-400', bg: '#10b981', progress: 85, range: `النخبة: +${elite.toFixed(1)} W/kg` };
      return { text: 'قدرة متفجرة 👑', color: 'text-cyan-400', bg: '#06b6d4', progress: 100, range: `أعلى من ${elite.toFixed(1)} W/kg` };
    }

    return { text: '', color: '', bg: '', progress: 0, range: '' };
  };

  const chartData = playerHistory
    .filter(j => j.test_type === 'standard' || j.test_type === 'rsi')
    .map((jump, index) => ({
      name: `T${index + 1}`,
      heightInches: parseFloat((jump.jump_height_cm * 0.393701).toFixed(1)),
      heightCm: parseFloat(jump.jump_height_cm),
      date: new Date(jump.created_at).toLocaleDateString('ar-EG')
    }));

  const heightCm = latestJump ? parseFloat(latestJump.jump_height_cm) : 0;
  const heightInches = parseFloat((heightCm * 0.393701).toFixed(1));
  const flightTime = latestJump ? parseFloat(latestJump.flight_time_sec) : 0;
  const velocity = latestJump ? parseFloat(latestJump.takeoff_velocity_ms) : 0;
  const peakPower = latestJump ? parseFloat(latestJump.peak_power_watts) : 0;
  const meanPower = latestJump ? parseFloat(latestJump.mean_power_watts) : 0;
  const relativePower = activePlayer.weight_kg > 0 ? parseFloat((peakPower / activePlayer.weight_kg).toFixed(1)) : 0;

  const evalHeight = evaluateMetric('jump_in', heightInches);
  const evalFlight = evaluateMetric('flight_time', flightTime);
  const evalPower = evaluateMetric('relative_power', relativePower);

  // Sayers & Harman biomechanical models
  const mass = activePlayer.weight_kg;
  const sayersPeak = 60.7 * heightCm + 45.3 * mass - 2055;
  const harmanPeak = 61.9 * heightCm + 36.0 * mass - 1822;
  const harmanMean = 21.2 * heightCm + 23.0 * mass - 1393;

  // Max touch reach (Standing reach + jump height)
  const maxReachCmj = (standingReachNum && heightCm) ? (standingReachNum + heightCm).toFixed(0) : null;
  
  // Calculate average of history to check performance trend
  const cmjHistory = playerHistory.filter(j => j.test_type === 'standard');
  const avgHistoryCm = cmjHistory.length > 1 
    ? cmjHistory.slice(0, -1).reduce((sum, j) => sum + parseFloat(j.jump_height_cm), 0) / (cmjHistory.length - 1)
    : heightCm;
  const trendPct = heightCm - avgHistoryCm;

  // Calculate overall rating (Biomechanical Score)
  const overallRating = Math.round((evalHeight.progress + evalFlight.progress + evalPower.progress) / 3);

  const maxRsi = playerHistory ? playerHistory.reduce((max, j) => {
    const val = parseFloat(j.rsi_score) || 0;
    return val > max ? val : max;
  }, 0) : 0;

  const tabs = [
    { id: 'overview', name: 'الملخص الحركي', icon: Trophy },
    { id: 'biomechanics', name: 'النماذج الحركية والقدرة', icon: Zap },
    { id: 'critique', name: 'التشخيص ونقاط التطوير', icon: Target },
    { id: 'history', name: 'سجل القياسات الكامل', icon: FileText }
  ];

  return (
    <div className="space-y-6 text-right relative" style={{ direction: "rtl" }}>
      
      {/* Inject custom printable CSS styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Hide screen-only components */
          header, nav, .floating-dock, button, .tabs-container, .screen-only {
            display: none !important;
          }
          
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Cairo', sans-serif !important;
          }

          /* Show print report and format beautifully */
          .print-report-sheet {
            display: block !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 30px !important;
            border: 2px solid #000000 !important;
            border-radius: 12px !important;
          }

          .print-header {
            border-bottom: 3px double #000000 !important;
            padding-bottom: 15px !important;
            margin-bottom: 25px !important;
          }
          
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }

          .print-table th, .print-table td {
            border: 1px solid #999999 !important;
            padding: 8px !important;
            text-align: center !important;
          }

          .print-table th {
            background-color: #f3f4f6 !important;
            color: #000000 !important;
          }

          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
          }
        }
      `}} />

      {/* ======================================================== */}
      {/* SCREEN VIEW (HIDDEN ON PRINT)                           */}
      {/* ======================================================== */}
      <div className="screen-only space-y-6">
        
        {/* Modern Athlete Passport Header */}
        <div className="glass-panel p-6 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6 relative overflow-hidden transition-all duration-300">
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center gap-5 z-10">
            {/* Athlete Initial Badge */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white text-3xl font-black shadow-[0_0_20px_rgba(6,182,212,0.35)] border border-cyan-400/30 font-mono">
              {activePlayer.full_name ? activePlayer.full_name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'P'}
            </div>
            
            <div className="text-center sm:text-right">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mb-1.5">
                <h2 className="text-3xl font-black text-white leading-none">{activePlayer.full_name}</h2>
                {overallRating >= 85 ? (
                  <span className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] px-2.5 py-1 rounded-xl font-black flex items-center gap-1">
                    <Award size={12} /> تصنيف النخبة
                  </span>
                ) : overallRating >= 70 ? (
                  <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-1 rounded-xl font-black flex items-center gap-1">
                    <Award size={12} /> تصنيف ممتاز
                  </span>
                ) : (
                  <span className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-[10px] px-2.5 py-1 rounded-xl font-black flex items-center gap-1">
                    <Award size={12} /> تصنيف متوسط
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs font-bold">
                مستوى القياس المعياري لـ {activePlayer.gender === 'female' ? 'السيدات' : 'الرجال'} | {age} عاماً | لاعب منتخب جمهورية مصر العربية 🇪🇬
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 z-10 shrink-0">
            <button onClick={() => setShowBenchmarks(true)} className="px-4 py-3 bg-slate-900/80 hover:bg-slate-800 text-gray-300 border border-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs cursor-pointer shadow-md">
              <BookOpen size={14} className="text-cyan-400" /> الجداول المعيارية
            </button>
            <button onClick={() => window.print()} className="px-5 py-3 btn-orange-gradient rounded-xl font-black flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] text-xs cursor-pointer shadow-lg">
              <Download size={14} /> تصدير تقرير PDF
            </button>
          </div>
        </div>

        {/* Physical Attributes Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111827]/40 border border-gray-800/80 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0"><Scale size={18} /></div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold block mb-0.5">الوزن الحالي</span>
              <span className="text-sm font-black text-white font-mono">{activePlayer.weight_kg} <span className="text-[10px] text-gray-500">kg</span></span>
            </div>
          </div>
          <div className="bg-[#111827]/40 border border-gray-800/80 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0"><Calendar size={18} /></div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold block mb-0.5">العمر الحقيقي</span>
              <span className="text-sm font-black text-white font-mono">{age} <span className="text-[10px] text-gray-500">سنة</span></span>
            </div>
          </div>
          <div className="bg-[#111827]/40 border border-gray-800/80 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0"><User size={18} /></div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold block mb-0.5">طول القامة</span>
              <span className="text-sm font-black text-white font-mono">{playerHeight} <span className="text-[10px] text-gray-500">cm</span></span>
            </div>
          </div>
          <div className="bg-[#111827]/40 border border-gray-800/80 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0"><Target size={18} /></div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold block mb-0.5">الوصول من الثبات</span>
              <span className="text-sm font-black text-white font-mono">{playerStandingReach} <span className="text-[10px] text-gray-500">cm</span></span>
            </div>
          </div>
        </div>

        {/* Tab Selection Header */}
        <div className="tabs-container flex border-b border-gray-800/80 bg-[#111827]/25 p-1 rounded-2xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer
                  ${isActive 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 shadow-md scale-[1.01]' 
                    : 'text-gray-400 hover:text-white'}`}
              >
                <Icon size={16} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        {!latestJump ? (
          <div className="glass-panel p-16 text-center border border-gray-800/60 shadow-xl rounded-3xl flex flex-col items-center justify-center">
            <AlertCircle size={56} className="text-yellow-500 mb-4 opacity-40 animate-pulse" />
            <h3 className="text-xl font-bold text-white mb-2">لا توجد قفزات مسجلة حتى الآن</h3>
            <p className="text-gray-400 text-xs max-w-sm mx-auto leading-relaxed">
              قم بإجراء قياسات حركية أو مؤشر RSI للاعب لتوليد التقارير الميكانيكية المعيارية هنا.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                {/* Visual Cockpit Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Radial Bio-Score Ring Card */}
                  <div className="glass-panel p-6 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
                    <h3 className="text-sm font-bold text-gray-400 mb-6">الكفاءة البيوميكانيكية العامة</h3>
                    
                    <div className="relative w-36 h-36 flex items-center justify-center bg-black/10 rounded-full border border-gray-800/30 mb-6">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="42" 
                          fill="none" 
                          stroke="url(#radialBioGrad)" 
                          strokeWidth="6" 
                          strokeDasharray="263.89"
                          strokeDashoffset={263.89 - (263.89 * overallRating) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                        <defs>
                          <linearGradient id="radialBioGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#14b8a6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                        <span className="text-3xl font-black text-white font-mono leading-none">{overallRating}%</span>
                        <span className="text-[9px] text-gray-500 font-extrabold uppercase mt-1">BIO GRADE</span>
                      </div>
                    </div>

                    <p className={`text-sm font-extrabold mb-1.5 ${evalHeight.color}`}>{evalHeight.text}</p>
                    <p className="text-[10px] text-gray-450 leading-relaxed max-w-[200px]">
                      مستوى اللياقة الميكانيكية للارتقاء بناءً على وزن اللاعب وزمن الطيران.
                    </p>
                  </div>

                  {/* Core Metric Visual Cards */}
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
                    
                    {/* Gauge Card: Jump Height */}
                    <div className="bg-[#111827]/30 border border-gray-850 p-5 rounded-3xl flex flex-col justify-between hover:border-cyan-500/30 transition-colors">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-gray-400 font-bold">الوثبة الانفجارية القصوى</span>
                          <span className="text-cyan-400 bg-cyan-950/20 border border-cyan-800/30 text-[9px] px-2 py-0.5 rounded-lg font-bold">CMJ</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mb-1.5">
                          <span className="text-4xl font-black text-white font-mono">{heightInches}</span>
                          <span className="text-gray-400 font-bold text-xs">إنش</span>
                          <span className="text-gray-500 text-xs font-mono mr-1.5">({heightCm} cm)</span>
                        </div>
                        <p className={`text-xs font-bold ${evalHeight.color}`}>{evalHeight.text}</p>
                      </div>
                      
                      <div className="mt-4">
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: `${evalHeight.progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-gray-500 mt-2 font-mono">
                          <span>0</span>
                          <span>الهدف: {evalHeight.range.split(':').pop() || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gauge Card: Flight Time */}
                    <div className="bg-[#111827]/30 border border-gray-850 p-5 rounded-3xl flex flex-col justify-between hover:border-cyan-500/30 transition-colors">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-gray-400 font-bold">زمن الطيران المعلق</span>
                          <span className="text-teal-400 bg-teal-950/20 border border-teal-800/30 text-[9px] px-2 py-0.5 rounded-lg font-bold">Flight</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mb-1.5">
                          <span className="text-4xl font-black text-white font-mono">{flightTime.toFixed(3)}</span>
                          <span className="text-gray-400 font-bold text-xs">ثانية</span>
                        </div>
                        <p className={`text-xs font-bold ${evalFlight.color}`}>{evalFlight.text}</p>
                      </div>
                      
                      <div className="mt-4">
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${evalFlight.progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-gray-500 mt-2 font-mono">
                          <span>0</span>
                          <span>{evalFlight.range}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gauge Card: Power Density */}
                    <div className="bg-[#111827]/30 border border-gray-850 p-5 rounded-3xl flex flex-col justify-between hover:border-cyan-500/30 transition-colors">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-gray-400 font-bold">كثافة القدرة الميكانيكية</span>
                          <span className="text-purple-400 bg-purple-950/20 border border-purple-800/30 text-[9px] px-2 py-0.5 rounded-lg font-bold">W/kg</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mb-1.5">
                          <span className="text-4xl font-black text-white font-mono">{relativePower > 0 ? relativePower : (harmanPeak / mass).toFixed(1)}</span>
                          <span className="text-gray-400 font-bold text-xs">W/kg</span>
                        </div>
                        <p className={`text-xs font-bold ${evalPower.color}`}>{evalPower.text}</p>
                      </div>
                      
                      <div className="mt-4">
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500" style={{ width: `${evalPower.progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-gray-500 mt-2 font-mono">
                          <span>0</span>
                          <span>{evalPower.range}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Additional Volleyball/Basketball Specific KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-black/25 border border-gray-800/60 p-4 rounded-2xl text-center">
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">الوصول الأقصى للارتقاء 🏐</span>
                    <span className="text-2xl font-black text-cyan-400 font-mono">{maxReachCmj || '—'} <span className="text-xs text-gray-500">سم</span></span>
                  </div>
                  <div className="bg-black/25 border border-gray-800/60 p-4 rounded-2xl text-center">
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">مؤشر الإنجاز البدني للوثب</span>
                    <span className="text-2xl font-black text-white font-mono">{heightCm.toFixed(1)} <span className="text-xs text-gray-500">سم</span></span>
                  </div>
                  <div className="bg-black/25 border border-gray-800/60 p-4 rounded-2xl text-center">
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">مقارنة بأداء الجولة السابقة</span>
                    <span className={`text-2xl font-black font-mono flex items-center justify-center gap-1.5 ${trendPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trendPct >= 0 ? `+${trendPct.toFixed(1)}` : trendPct.toFixed(1)} 
                      <span className="text-xs">{trendPct >= 0 ? '📈' : '📉'}</span>
                    </span>
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 2: BIOMECHANICS & MODELS */}
            {activeTab === 'biomechanics' && (
              <motion.div key="biomechanics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Sayers & Harman calculations */}
                  <div className="glass-panel p-5 shadow-lg flex flex-col justify-between">
                    <h4 className="text-base font-black text-white mb-4 border-b border-gray-800/80 pb-2.5 flex items-center gap-2">
                      <Zap className="text-cyan-400" size={16} /> نماذج القدرة الميكانيكية للارتقاء (Mechanical Power Models)
                    </h4>
                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between items-center bg-black/15 p-3.5 rounded-xl border border-gray-850">
                        <div>
                          <span className="font-extrabold text-white block">Sayers Peak Power</span>
                          <span className="text-[9px] text-gray-500">مبني على وزن الجسم وارتفاع الوثب</span>
                        </div>
                        <span className="font-mono font-black text-white text-base">{sayersPeak > 0 ? sayersPeak.toFixed(0) : '0'} <span className="text-xs text-gray-500 font-normal">Watt</span></span>
                      </div>
                      <div className="flex justify-between items-center bg-black/15 p-3.5 rounded-xl border border-gray-850">
                        <div>
                          <span className="font-extrabold text-white block">Harman Peak Power</span>
                          <span className="text-[9px] text-gray-500">النموذج الذهبي لقياس القدرة المتفجرة القصوى</span>
                        </div>
                        <span className="font-mono font-black text-white text-base">{harmanPeak > 0 ? harmanPeak.toFixed(0) : '0'} <span className="text-xs text-gray-500 font-normal">Watt</span></span>
                      </div>
                      <div className="flex justify-between items-center bg-black/15 p-3.5 rounded-xl border border-gray-850">
                        <div>
                          <span className="font-extrabold text-white block">Harman Mean Power</span>
                          <span className="text-[9px] text-gray-500">متوسط القدرة المنتجة خلال كامل زمن التحليق</span>
                        </div>
                        <span className="font-mono font-black text-white text-base">{harmanMean > 0 ? harmanMean.toFixed(0) : '0'} <span className="text-xs text-gray-500 font-normal">Watt</span></span>
                      </div>
                      <div className="flex justify-between items-center bg-black/15 p-3.5 rounded-xl border border-gray-850">
                        <div>
                          <span className="font-extrabold text-cyan-455 block">سرعة الانطلاق عند الإقلاع (Takeoff V)</span>
                          <span className="text-[9px] text-gray-500">السرعة المتجهة لحظة مغادرة القدمين للأرض</span>
                        </div>
                        <span className="font-mono font-black text-cyan-400 text-base">{velocity > 0 ? velocity.toFixed(2) : Math.sqrt(2 * 9.81 * (heightCm/100)).toFixed(2)} <span className="text-xs text-gray-500 font-normal">m/s</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Gradient Area Chart */}
                  <div className="glass-panel p-5 shadow-lg flex flex-col justify-between">
                    <h4 className="text-base font-black text-white mb-4 border-b border-gray-800/80 pb-2.5 flex items-center gap-2">
                      <TrendingUp className="text-cyan-400" size={16} /> منحنى تقدم ارتفاع الوثب للاعب (cm)
                    </h4>
                    <div className="h-56 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                          <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickMargin={5} />
                          <YAxis stroke="#6b7280" fontSize={11} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff', textAlign: 'right' }} />
                          <Area type="monotone" dataKey="heightCm" name="الارتفاع (Cm)" stroke="#06b6d4" strokeWidth={3.5} fillOpacity={1} fill="url(#chartGradient)" dot={{ fill: '#06b6d4', r: 5, strokeWidth: 2, stroke: '#030712' }} activeDot={{ r: 7 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {/* TAB 3: CRITIQUE & TRAINING ADVICE */}
            {activeTab === 'critique' && (
              <motion.div key="critique" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                <div className="glass-panel p-6 shadow-lg text-right">
                  <h4 className="text-lg font-black text-white mb-4 border-b border-gray-800/80 pb-2.5 flex items-center gap-2">
                    🔬 التقييم العضلي العصبي ونقاط التطوير الموجهة
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Strengths Card */}
                    <div className="bg-emerald-950/15 border border-emerald-500/25 p-5 rounded-2xl">
                      <h5 className="font-extrabold text-emerald-400 mb-3 flex items-center gap-2">
                        <span>🌟 نقاط القوة والتميز الحركي</span>
                      </h5>
                      <p className="text-xs text-gray-300 leading-relaxed space-y-2.5">
                        {((relativePower || (harmanPeak / mass)) >= 50) 
                          ? "• يتمتع اللاعب بكفاءة توليد طاقة انفجارية قوية وممتازة بالنسبة لوزنه الحالي. هذا يدعم بقوة سرعة ارتداده الرأسي وقدرته على الارتقاء بسرعة." 
                          : "• يتميز اللاعب باستقرار حركي جيد وتوازن هيكلي واضح خلال مرحلة الثبات والنزول القرفصائي التحضيري."}
                        <br /><br />
                        {maxRsi >= 2.2 
                          ? "• يظهر مؤشر القوة التفاعلية (RSI) كفاءة عالية جداً للأوتار وصلابة ممتازة بمفصل الكاحل، مما يساعد على اختصار زمن الاحتكاك بالأرض وتحويل القوة الأفقية لقوة دافعة رأسية." 
                          : "• يُظهر تماسكاً جيداً أثناء مراحل الهبوط والامتصاص العضلي، مما يقلل بشكل ملموس من احتمالية إصابات الرباط الصليبي."}
                      </p>
                    </div>

                    {/* Development Points Card */}
                    <div className="bg-amber-950/15 border border-amber-500/25 p-5 rounded-2xl">
                      <h5 className="font-extrabold text-amber-400 mb-3 flex items-center gap-2">
                        <span>⚡ خطة تطوير القدرة والانفجارية</span>
                      </h5>
                      <p className="text-xs text-gray-300 leading-relaxed space-y-2.5">
                        {((relativePower || (harmanPeak / mass)) < 50) 
                          ? "• يوصى بشدة ببرنامج لزيادة القوة المطلقة للجزء السفلي (Squats & Hex-Bar Deadlifts) بهدف تحسين إنتاج القوة الابتدائية القصوى للارتقاء." 
                          : "• لزيادة التطوير وتخطي عجز الأداء، يفضل تفعيل تدريبات القوة البالستية وحمل المقاومة الانفجارية لضمان الحفاظ على مستويات القدرة العالية."}
                        <br /><br />
                        {maxRsi < 2.0 
                          ? "• هناك عجز تفاعلي في الكاحل (Ankle Stiffness deficit). يجب التركيز على تمرينات البلايومترك السريع (Pogo jumps و Jump rope) لتقليص زمن الاحتكاك بالأرض وزيادة معدل الارتداد." 
                          : "• يوصى بالتركيز على تكنيك ميكانيكا الذراعين وتنسيق حركة الصعود لضمان استغلال الزخم الزاوي ونقل القوة الرأسية لارتفاع أفضل."}
                      </p>
                    </div>

                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 4: COMPLETE HISTORY LOG */}
            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="glass-panel p-5 shadow-lg overflow-hidden">
                <h4 className="text-base font-black text-white mb-4 border-b border-gray-800/80 pb-2.5">سجل قياسات اللاعب الكاملة</h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-450 font-black">
                        <th className="pb-3 text-right">التاريخ</th>
                        <th className="pb-3 text-center">نوع الاختبار</th>
                        <th className="pb-3 text-center">الارتفاع (cm)</th>
                        <th className="pb-3 text-center">زمن الطيران (s)</th>
                        <th className="pb-3 text-center">زمن التلامس (s)</th>
                        <th className="pb-3 text-center">القدرة القصوى (W)</th>
                        <th className="pb-3 text-center">مؤشر RSI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerHistory.slice().reverse().map((jump) => (
                        <tr key={jump.id} className="border-b border-gray-850 hover:bg-black/10 transition-colors">
                          <td className="py-3.5 font-mono text-gray-400">{new Date(jump.created_at).toLocaleDateString('ar-EG')}</td>
                          <td className="py-3.5 text-center font-bold text-cyan-400">{jump.test_type === 'rsi' ? 'Drop Jump (RSI)' : 'Standard CMJ'}</td>
                          <td className="py-3.5 text-center font-mono font-black text-white">{parseFloat(jump.jump_height_cm).toFixed(1)}</td>
                          <td className="py-3.5 text-center font-mono text-gray-300">{parseFloat(jump.flight_time_sec).toFixed(3)}</td>
                          <td className="py-3.5 text-center font-mono text-gray-300">{jump.contact_time_sec ? parseFloat(jump.contact_time_sec).toFixed(3) : '—'}</td>
                          <td className="py-3.5 text-center font-mono text-gray-300">{jump.peak_power_watts && parseFloat(jump.peak_power_watts) > 0 ? parseFloat(jump.peak_power_watts).toFixed(0) : '—'}</td>
                          <td className="py-3.5 text-center font-mono font-black text-teal-400">{jump.rsi_score ? parseFloat(jump.rsi_score).toFixed(2) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}

      </div>

      {/* ======================================================== */}
      {/* PRINT-ONLY A4 REPORT SHEET (HIDDEN ON SCREEN)             */}
      {/* ======================================================== */}
      <div className="hidden print-report-sheet text-right" style={{ display: 'none', direction: 'rtl' }}>
        
        {/* Report Official Banner */}
        <div className="print-header text-center flex justify-between items-center pb-5 mb-5 border-b-2 border-black">
          <div className="text-right">
            <h1 className="text-2xl font-black text-black">مختبر الأداء الرياضي والميكانيكا الحيوية 🧪</h1>
            <p className="text-xs text-gray-700">تقرير قياسات الأداء الحركي والارتقاء المتكامل</p>
          </div>
          <div className="text-left text-xs font-mono text-gray-600">
            <p>تاريخ استخراج التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
            <p>المشرف: رئيس الجهاز الفني</p>
          </div>
        </div>

        {/* Athlete specs */}
        <div className="bg-gray-100 p-4 rounded-xl border border-gray-300 mb-6">
          <h3 className="text-sm font-black text-black mb-3">بيانات اللاعب الشخصية والبدنية</h3>
          <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-xs">
            <div><strong className="text-gray-700">الاسم الكامل:</strong> {activePlayer.full_name}</div>
            <div><strong className="text-gray-700">الوزن:</strong> {activePlayer.weight_kg} كجم</div>
            <div><strong className="text-gray-700">العمر:</strong> {age} سنوات</div>
            <div><strong className="text-gray-700">النوع:</strong> {activePlayer.gender === 'female' ? 'أنثى' : 'ذكر'}</div>
            <div><strong className="text-gray-700">طول القامة:</strong> {playerHeight} سم</div>
            <div><strong className="text-gray-700">الوصول من الثبات:</strong> {playerStandingReach} سم</div>
          </div>
        </div>

        {/* Core numbers */}
        <div className="mb-6">
          <h3 className="text-sm font-black text-black mb-3">نتائج قياسات الاختبار الأخير</h3>
          <table className="print-table text-xs">
            <thead>
              <tr>
                <th>ارتفاع الوثب (سم)</th>
                <th>ارتفاع الوثب (إنش)</th>
                <th>زمن الطيران المعلق (ثانية)</th>
                <th>كثافة القدرة الميكانيكية (W/kg)</th>
                <th>أقصى ارتفاع للوصول (سم)</th>
                <th>مؤشر RSI الأقصى</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold">{heightCm.toFixed(1)}</td>
                <td className="font-bold">{heightInches}</td>
                <td>{flightTime.toFixed(3)}</td>
                <td>{relativePower > 0 ? relativePower : (harmanPeak / mass).toFixed(1)}</td>
                <td className="font-bold text-blue-800">{maxReachCmj || '—'}</td>
                <td className="font-bold text-cyan-800">{maxRsi > 0 ? maxRsi.toFixed(2) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mechanical equations */}
        <div className="mb-6">
          <h3 className="text-sm font-black text-black mb-3">تقديرات القدرة الانفجارية (Mechanical Power)</h3>
          <div className="print-grid text-xs">
            <div className="border border-gray-300 p-3 rounded-lg bg-gray-50">
              <p className="font-bold mb-1">Sayers Peak Power (القدرة القصوى)</p>
              <p className="text-lg font-mono font-black text-black">{sayersPeak.toFixed(0)} <span className="text-xs font-normal">وات</span></p>
            </div>
            <div className="border border-gray-300 p-3 rounded-lg bg-gray-50">
              <p className="font-bold mb-1">Harman Peak Power (القدرة القصوى)</p>
              <p className="text-lg font-mono font-black text-black">{harmanPeak.toFixed(0)} <span className="text-xs font-normal">وات</span></p>
            </div>
          </div>
        </div>

        {/* Critique and Recommendations */}
        <div className="mb-8">
          <h3 className="text-sm font-black text-black mb-3">التشخيص والتوصيات الميكانيكية الحيوية</h3>
          <div className="print-grid text-xs">
            <div className="border border-gray-300 p-3 rounded-lg">
              <p className="font-black text-emerald-800 mb-1">🌟 نقاط التميز الحركي:</p>
              <p className="leading-relaxed text-gray-700">
                {((relativePower || (harmanPeak / mass)) >= 50) 
                  ? "يمتلك اللاعب طاقة انفجارية قوية ومعدلات قدرة ممتازة بالنسبة لوزنه الحركي الحالي. ويدعم ذلك سرعة ارتداده الرأسي وقدرته على الارتقاء السريع." 
                  : "يتميز اللاعب باستقرار حركي جيد جداً وثبات واضح أثناء مراحل النزول القرفصائي والتحضير للارتقاء."}
              </p>
            </div>
            <div className="border border-gray-300 p-3 rounded-lg">
              <p className="font-black text-amber-800 mb-1">⚡ نقاط التطوير البدني المستهدفة:</p>
              <p className="leading-relaxed text-gray-700">
                {((relativePower || (harmanPeak / mass)) < 50) 
                  ? "يوصى بتدريب القوة القصوى للأطراف السفلية (تمارين القرفصاء والرفعة المميتة) لزيادة قدرته العامة." 
                  : "يوصى ببرنامج بلايومترك مكثف لزيادة مرونة الكاحل والأوتار، وتقليل زمن احتكاك القدم بالأرض."}
              </p>
            </div>
          </div>
        </div>

        {/* Validation signatures */}
        <div className="mt-12 flex justify-between items-center text-xs pt-8 border-t border-dashed border-gray-400">
          <div className="text-center w-48">
            <p className="font-bold text-gray-800">توقيع أخصائي القياس الحركي</p>
            <div className="h-16"></div>
            <p className="text-gray-500">....................................</p>
          </div>
          <div className="text-center w-48">
            <p className="font-bold text-gray-800">اعتماد رئيس الجهاز الفني</p>
            <div className="h-16"></div>
            <p className="text-gray-500">....................................</p>
          </div>
        </div>

      </div>

      {/* Benchmarks Modal Dialogue */}
      <AnimatePresence>
        {showBenchmarks && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div initial={{ scale: 0.93, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 15 }} className="glass-panel p-6 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative text-right">
              <button onClick={() => setShowBenchmarks(false)} className="absolute top-4 left-4 p-2 bg-slate-900 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-full transition-colors cursor-pointer border border-gray-850"><X size={20}/></button>
              
              <div className="text-center mb-6">
                <BookOpen size={40} className="mx-auto text-cyan-400 mb-2" />
                <h2 className="text-2xl font-black text-white">الجداول المعيارية للأداء الرياضي</h2>
                <p className="text-gray-400 text-sm">مستندة لبيانات الميكانيكا الحيوية الرياضية للشباب والكبار</p>
              </div>

              <div className="space-y-6">
                
                {/* Men Table */}
                <div className="bg-black/20 p-4 rounded-2xl border border-slate-800">
                  <h3 className="text-lg font-bold text-cyan-400 mb-3 border-b border-slate-800 pb-2">معايير الرجال (18+ سنة)</h3>
                  <div className="grid grid-cols-4 text-center text-xs font-bold text-gray-450 mb-2">
                    <div>التقييم</div><div>الارتفاع (cm)</div><div>الطيران (s)</div><div>القدرة (W/kg)</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-4 text-center items-center bg-cyan-950/20 p-2 rounded-xl border border-cyan-500/30"><span className="text-cyan-400 font-bold">نخبة عالمية</span><span>85+</span><span>0.75+</span><span>65+</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-teal-500 font-bold">ممتاز</span><span>76 - 84</span><span>0.68 - 0.74</span><span>55 - 64</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-teal-400 font-bold">جيد</span><span>66 - 75</span><span>0.60 - 0.67</span><span>45 - 54</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-gray-400 font-bold">مقبول</span><span>55 - 65</span><span>0.55 - 0.59</span><span>38 - 44</span></div>
                  </div>
                </div>

                {/* Women Table */}
                <div className="bg-black/20 p-4 rounded-2xl border border-slate-800">
                  <h3 className="text-lg font-bold text-cyan-400 mb-3 border-b border-slate-800 pb-2">معايير السيدات (18+ سنة)</h3>
                  <div className="grid grid-cols-4 text-center text-xs font-bold text-gray-455 mb-2">
                    <div>التقييم</div><div>الارتفاع (cm)</div><div>الطيران (s)</div><div>القدرة (W/kg)</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-4 text-center items-center bg-cyan-950/20 p-2 rounded-xl border border-cyan-500/30"><span className="text-cyan-400 font-bold">نخبة عالمية</span><span>66+</span><span>0.65+</span><span>52+</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-teal-500 font-bold">ممتاز</span><span>56 - 65</span><span>0.58 - 0.64</span><span>45 - 51</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-teal-400 font-bold">جيد</span><span>46 - 55</span><span>0.52 - 0.57</span><span>38 - 44</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-gray-400 font-bold">مقبول</span><span>38 - 45</span><span>0.48 - 0.51</span><span>32 - 37</span></div>
                  </div>
                </div>

                {/* Egyptian volleyball club benchmarks */}
                <div className="bg-black/20 p-4 rounded-2xl border border-orange-500/30">
                  <h3 className="text-lg font-bold text-orange-400 mb-3 border-b border-orange-500/20 pb-2">🏐 معايير الأندية المصرية - الكرة الطائرة</h3>
                  <div className="grid grid-cols-5 text-center text-xs font-bold text-gray-450 mb-2">
                    <div>النادي</div><div>نخبة (Elite)</div><div>ممتاز</div><div>جيد</div><div>مقبول</div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="grid grid-cols-5 text-center items-center bg-red-950/15 p-2 rounded-xl border border-red-500/20"><span className="text-red-400 font-bold">الأهلي</span><span>+34" (86+)</span><span>30"-33"</span><span>26"-29"</span><span>22"-25"</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-white/[0.02] p-2 rounded-xl border border-gray-750"><span className="text-white font-bold">الزمالك</span><span>+34" (86+)</span><span>30"-33"</span><span>26"-29"</span><span>22"-25"</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-blue-950/15 p-2 rounded-xl border border-blue-500/20"><span className="text-blue-400 font-bold">سموحة</span><span>+32" (81+)</span><span>28"-31"</span><span>24"-27"</span><span>20"-23"</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-yellow-950/15 p-2 rounded-xl border border-yellow-500/20"><span className="text-yellow-400 font-bold">سبورتنج</span><span>+32" (81+)</span><span>28"-31"</span><span>24"-27"</span><span>20"-23"</span></div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 text-center">* معايير السيدات (18+): نخبة: +26" (66+) | ممتاز: 22"-25" | جيد: 18"-21"</p>
                </div>

                <div className="bg-cyan-950/10 border border-cyan-500/30 p-4 rounded-xl flex gap-2">
                  <ShieldAlert className="text-cyan-455 shrink-0" size={18} />
                  <div>
                     <p className="text-xs text-cyan-400 font-bold mb-0.5">معايير الناشئين والناشئات (أقل من 17 سنة):</p>
                     <p className="text-xs text-gray-405 leading-relaxed">يقوم المحرك تلقائياً بتخفيض الحدود المعيارية السابقة بنسبة 15% لملاءمة معدلات التطور البدني والفسيولوجي لسن اللاعب المحدد. ينطبق هذا على جميع الأندية والمنتخبات أعلاه.</p>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}