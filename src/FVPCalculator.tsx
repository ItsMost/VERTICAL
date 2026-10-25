import React, { useState, useEffect } from 'react';
import { 
  LineChart, Zap, TrendingUp, AlertCircle, Info, CheckCircle, 
  Activity, ArrowLeftRight 
} from 'lucide-react';
import { useData } from './context/DataContext';
import type { Player } from './types/athletics';

// Animated counter helper
const AnimatedCounter = ({ value, duration = 1000, decimals = 1 }: { value: string | number; duration?: number; decimals?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(String(value)) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    const startTime = performance.now();
    const updateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad
      setCount(start + easeProgress * (end - start));
      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };
    requestAnimationFrame(updateCount);
  }, [value, duration]);
  return <span className="font-mono tabular-nums">{count.toFixed(decimals)}</span>;
};

// Heuristic Force-Time presets generator
const generateDemoForceData = (type: string, mass: number, samplingRate: number = 1000): number[] => {
  const dt = 1 / samplingRate;
  const BW = mass * 9.81;
  const data: number[] = [];
  
  const totalPoints = Math.round(2.2 * samplingRate);
  
  let peakForceFactor = 2.6; 
  let propulsionDuration = 0.25; 
  let brakingDuration = 0.20;
  let unweightingDuration = 0.30;
  let flightDuration = 0.45; 
  let timeToPeakFactor = 0.6; 
  
  if (type === 'low_rfd') {
    peakForceFactor = 2.4;
    propulsionDuration = 0.40;
    brakingDuration = 0.30;
    timeToPeakFactor = 0.85; 
  } else if (type === 'low_force') {
    peakForceFactor = 1.6;
    propulsionDuration = 0.28;
    brakingDuration = 0.25;
    timeToPeakFactor = 0.5;
  }

  const quietPoints = Math.round(0.5 * samplingRate);
  const unweightPoints = Math.round(unweightingDuration * samplingRate);
  const brakePoints = Math.round(brakingDuration * samplingRate);
  const propPoints = Math.round(propulsionDuration * samplingRate);
  const flightPoints = Math.round(flightDuration * samplingRate);

  for (let i = 0; i < totalPoints; i++) {
    let force = BW;
    const noise = (Math.random() - 0.5) * 8; 

    if (i < quietPoints) {
      force = BW + noise;
    } else if (i < quietPoints + unweightPoints) {
      const p = (i - quietPoints) / unweightPoints;
      force = BW - (BW * 0.45 * Math.sin(p * Math.PI)) + noise;
    } else if (i < quietPoints + unweightPoints + brakePoints) {
      const p = (i - (quietPoints + unweightPoints)) / brakePoints;
      force = (BW * 0.55) + ((peakForceFactor * BW - BW * 0.55) * p) + noise;
    } else if (i < quietPoints + unweightPoints + brakePoints + propPoints) {
      const p = (i - (quietPoints + unweightPoints + brakePoints)) / propPoints;
      const peakF = peakForceFactor * BW;
      if (p <= timeToPeakFactor) {
        force = peakF - ((peakF - BW) * (1 - p / timeToPeakFactor) * 0.2) + noise;
      } else {
        const fallP = (p - timeToPeakFactor) / (1 - timeToPeakFactor);
        force = peakF * (1 - fallP) + noise;
      }
    } else if (i < quietPoints + unweightPoints + brakePoints + propPoints + flightPoints) {
      force = 0; 
    } else {
      const p = (i - (quietPoints + unweightPoints + brakePoints + propPoints + flightPoints)) / 200;
      if (p <= 1) {
        force = (BW * 3.5 * Math.sin(p * Math.PI)) + noise;
      } else {
        force = BW + noise;
      }
    }
    data.push(Math.round(Math.max(0, force)));
  }
  
  return data;
};

interface FVPCalculatorProps {
  activePlayer?: Player | null;
  selectedPlayerId?: string;
  language?: string;
}

export default function FVPCalculator({ activePlayer: propPlayer, language: propLang }: FVPCalculatorProps) {
  const { activePlayer: ctxPlayer, language: ctxLang, t } = useData();
  const activePlayer = propPlayer || ctxPlayer;
  const language = propLang || ctxLang;
  const isAr = language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'fvp' | 'ftc'>('fvp');

  // ==========================================
  // STATE FOR FORCE-TIME CURVE (FTC) ANALYSIS
  // ==========================================
  const [athleteMass, setAthleteMass] = useState<number | string>(activePlayer?.weight_kg || 75);
  const [samplingRate, setSamplingRate] = useState<number | string>(1000);
  const [rawForceInput, setRawForceInput] = useState('');
  const [ftcResult, setFtcResult] = useState<any>(null);

  useEffect(() => {
    if (activePlayer?.weight_kg) {
      setAthleteMass(activePlayer.weight_kg);
    }
  }, [activePlayer]);

  const loadPreset = (type: string) => {
    const mass = parseFloat(String(athleteMass)) || 75;
    const rate = parseFloat(String(samplingRate)) || 1000;
    const data = generateDemoForceData(type, mass, rate);
    setRawForceInput(data.join(', '));
  };

  const handleFTCAnalyze = () => {
    const mass = parseFloat(String(athleteMass));
    const rate = parseFloat(String(samplingRate));
    if (!mass || mass <= 0) {
      return alert(isAr ? 'الرجاء إدخال كتلة اللاعب بشكل صحيح' : 'Please enter a valid athlete mass (kg)');
    }
    if (!rate || rate <= 0) {
      return alert(isAr ? 'الرجاء إدخال معدل أخذ العينات بشكل صحيح' : 'Please enter a valid sampling rate (Hz)');
    }

    const forceArray: number[] = [];
    if (!rawForceInput.trim()) {
      return alert(isAr ? 'الرجاء إدخال قيم القوة أو اختيار نموذج تجريبي' : 'Please enter force values or load a preset model');
    }
    
    const parts = rawForceInput.split(/[\s,;\n]+/);
    for (const part of parts) {
      const val = parseFloat(part);
      if (!isNaN(val)) forceArray.push(val);
    }

    if (forceArray.length < 50) {
      return alert(isAr ? 'البيانات المدخلة قصيرة جداً لتحليل بيوميكانيكي دقيق (الحد الأدنى 50 عينة)' : 'Data sample is too short for biomechanical analysis (min 50 samples)');
    }

    const BW = mass * 9.81;
    const peakForce = Math.max(...forceArray);
    const peakForceRel = peakForce / mass;
    const meanForce = forceArray.reduce((a, b) => a + b, 0) / forceArray.length;
    const meanForceRel = meanForce / mass;

    setFtcResult({
      peakForce: peakForce.toFixed(0),
      peakForceRel: peakForceRel.toFixed(1),
      meanForce: meanForce.toFixed(0),
      meanForceRel: meanForceRel.toFixed(1),
      samplingRate: rate,
      mass,
      BW: BW.toFixed(0),
    });
  };

  // ==========================================
  // STATE FOR SAMOZINO FVP (FORCE-VELOCITY PROFILE)
  // ==========================================
  const [jumps, setJumps] = useState([
    { weight: '0', flightTime: '0.62' },
    { weight: '15', flightTime: '0.54' },
    { weight: '30', flightTime: '0.46' },
    { weight: '45', flightTime: '0.38' },
  ]);

  const [fvpResult, setFvpResult] = useState<any>(null);

  const handleJumpChange = (index: number, field: string, value: string) => {
    const updated = [...jumps];
    (updated[index] as any)[field] = value;
    setJumps(updated);
  };

  const handleFVPAnalyze = () => {
    const mass = parseFloat(String(athleteMass)) || 75;
    const legLength = parseFloat(String(activePlayer?.leg_length_m)) || 1.0;
    const pushDistance = Math.max(0.2, (legLength > 2 ? legLength / 100 : legLength) * 0.45);
    const g = 9.80665;

    const points: { v: number; f: number; weight: number }[] = [];

    for (let i = 0; i < jumps.length; i++) {
      const extraWeight = parseFloat(jumps[i].weight) || 0;
      const ft = parseFloat(jumps[i].flightTime);

      if (!ft || ft <= 0) {
        return alert(isAr ? `يرجى إدخال زمن الطيران للمحاولة رقم ${i + 1} بشكل صحيح.` : `Please enter valid flight time for trial #${i + 1}`);
      }

      const h = 0.125 * g * Math.pow(ft, 2);
      const v_takeoff = Math.sqrt(2 * g * h);
      const mean_v = v_takeoff / 2;
      const totalMass = mass + extraWeight;
      const mean_f = totalMass * g * ((h / pushDistance) + 1);

      points.push({ v: mean_v, f: mean_f, weight: extraWeight });
    }

    const n = points.length;
    let sum_v = 0;
    let sum_f = 0;
    points.forEach((p) => { sum_v += p.v; sum_f += p.f; });
    const mean_v_all = sum_v / n;
    const mean_f_all = sum_f / n;

    let numerator = 0;
    let denominator = 0;
    points.forEach((p) => {
      numerator += (p.v - mean_v_all) * (p.f - mean_f_all);
      denominator += (p.v - mean_v_all) * (p.v - mean_v_all);
    });

    const slope = denominator !== 0 ? numerator / denominator : -50;
    const isDistorted = slope >= 0 || Number.isNaN(slope);
    const effectiveSlope = isDistorted ? -60 : slope;

    const F0 = Math.max(100, mean_f_all - effectiveSlope * mean_v_all);
    const V0 = Math.max(0.5, effectiveSlope < 0 ? -F0 / effectiveSlope : 2.5);
    const Pmax = (F0 * V0) / 4;
    const f0_rel = F0 / mass;

    // Optimal slope benchmark
    const Sopt_rel = -22.5;
    const Sopt = Sopt_rel * mass;
    const V0_opt = Math.max(1.0, 2 * Math.sqrt(Pmax / Math.abs(Sopt)));
    const F0_opt = Math.max(100, V0_opt * Math.abs(Sopt));
    const fvpIndex = Math.round((effectiveSlope / Sopt) * 100);

    let diagnosis = "";
    let advice = "";
    let color = "";

    if (fvpIndex < 85 || (V0 >= 3.0 && f0_rel < 28)) {
      diagnosis = isAr ? "عجز في القوة (High Force Deficit)" : "High Force Deficit";
      advice = isAr ? t.fvpConsole.highForceDeficitPresc : "Athlete exhibits high elastic velocity but lacks raw absolute force. Prioritize heavy slow resistance squatting (>85% 1RM).";
      color = "border-amber-500/40 bg-amber-500/10 text-amber-400";
    } else if (fvpIndex > 115 || (f0_rel >= 32 && V0 < 2.5)) {
      diagnosis = isAr ? "عجز في السرعة (Velocity Deficit)" : "Velocity Deficit";
      advice = isAr ? t.fvpConsole.highVelocityDeficitPresc : "Athlete has high structural strength but sluggish acceleration. Prioritize light ballistic squats and assisted plyometrics.";
      color = "border-[#FF5500]/40 bg-[#FF5500]/10 text-[#FF5500]";
    } else {
      diagnosis = isAr ? "ملف مثالي متوازن (Well-Balanced Elite)" : "Well-Balanced Elite";
      advice = isAr ? t.fvpConsole.balancedPresc : "Optimal neuromuscular balance between force and velocity. Continue comprehensive complex training.";
      color = "border-[#D4FF00]/40 bg-[#D4FF00]/10 text-[#D4FF00]";
    }

    setFvpResult({
      F0: F0.toFixed(0),
      V0: V0.toFixed(2),
      Pmax: Pmax.toFixed(0),
      f0_rel: f0_rel.toFixed(1),
      effectiveSlope: effectiveSlope.toFixed(1),
      Sopt: Sopt.toFixed(1),
      F0_opt: F0_opt.toFixed(0),
      V0_opt: V0_opt.toFixed(2),
      fvpIndex,
      diagnosis,
      advice,
      color,
      isDistorted,
    });
  };

  return (
    <div className={`p-4 md:p-6 text-white rounded-3xl border border-[#27272A] bg-[#121215] relative overflow-hidden shadow-2xl ${isAr ? 'text-right' : 'text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Subtle brand glow behind title */}
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#D4FF00]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Sub-tab selection */}
      <div className="flex justify-center gap-2 mb-6 bg-[#09090B] p-1.5 rounded-2xl border border-[#27272A] max-w-md mx-auto">
        <button
          onClick={() => setActiveSubTab('fvp')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'fvp'
              ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_15px_rgba(212,255,0,0.3)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <TrendingUp size={16} />
          {isAr ? 'منحنى القوة والسرعة (FVP Curve)' : 'Force-Velocity Profile'}
        </button>
        <button
          onClick={() => setActiveSubTab('ftc')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'ftc'
              ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_15px_rgba(212,255,0,0.3)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <LineChart size={16} />
          {isAr ? 'منحنى القوة والزمن (FTC Analysis)' : 'Force-Time Curve (FTC)'}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ================= TAB 1: FORCE-VELOCITY PROFILE (FVP) =================== */}
      {/* ========================================================================= */}
      {activeSubTab === 'fvp' && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl md:text-2xl font-black text-white flex items-center justify-center gap-2">
              <Zap className="text-[#D4FF00]" size={24} />
              {t.fvpConsole.title}
            </h3>
            <p className="text-zinc-400 text-xs mt-1.5 max-w-xl mx-auto">
              {t.fvpConsole.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-6">
            {jumps.map((jump, idx) => (
              <div key={idx} className="bg-[#18181B] p-4 rounded-2xl border border-[#27272A] text-center">
                <span className="text-xs font-black text-[#D4FF00] block mb-2">
                  {isAr ? `القفزة #${idx + 1}` : `Trial #${idx + 1}`}
                </span>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">{t.fvpConsole.loadTrial} (kg)</label>
                    <input
                      type="number"
                      value={jump.weight}
                      onChange={(e) => handleJumpChange(idx, 'weight', e.target.value)}
                      className="w-full bg-[#09090B] border border-[#27272A] p-2 text-white font-mono tabular-nums text-center rounded-xl text-xs outline-none focus:border-[#D4FF00]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">{isAr ? 'زمن الطيران (s)' : 'Flight Time (s)'}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={jump.flightTime}
                      onChange={(e) => handleJumpChange(idx, 'flightTime', e.target.value)}
                      className="w-full bg-[#09090B] border border-[#27272A] p-2 text-[#D4FF00] font-mono tabular-nums text-center rounded-xl text-xs outline-none focus:border-[#D4FF00]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mb-6">
            <button
              onClick={handleFVPAnalyze}
              className="px-10 py-3.5 bg-[#D4FF00] text-[#09090B] rounded-xl font-black text-sm shadow-[0_0_20px_rgba(212,255,0,0.3)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              📊 {isAr ? 'حساب ملف القوة والسرعة ومنحنى ساموزينو' : 'Compute Samozino F-V Profile & Curve'}
            </button>
          </div>

          {fvpResult && (
            <div className="space-y-6 border-t border-[#27272A] pt-6 animate-fade-in">
              {/* Automated Prescription Badge */}
              <div className={`p-6 rounded-2xl border ${fvpResult.color} shadow-lg text-center`}>
                <p className="text-xs font-bold opacity-80 mb-1">{t.fvpConsole.trainingPrescription}</p>
                <h4 className="text-2xl font-black mb-2 text-white">{fvpResult.diagnosis}</h4>
                <p className="text-xs opacity-90 max-w-xl mx-auto leading-relaxed">
                  💡 {fvpResult.advice}
                </p>
                <div className="mt-3 inline-block bg-black/50 px-3 py-1 rounded-full border border-white/10 font-mono tabular-nums text-xs font-bold text-white">
                  {t.fvpConsole.imbalancePercent}: {fvpResult.fvpIndex}% ({isAr ? 'المثالي = 100%' : 'Optimal = 100%'})
                </div>
              </div>

              {/* F-V Curve Plot SVG */}
              <div className="bg-[#18181B] p-6 rounded-2xl border border-[#27272A]">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
                  <h4 className="font-bold text-sm text-zinc-200">{t.fvpConsole.actualVsOptCurve}</h4>
                  <div className="flex gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-[#D4FF00]">
                      <span className="w-3.5 h-0.5 bg-[#D4FF00] inline-block" /> {isAr ? 'المنحنى الفعلي للرياضي' : 'Actual Athlete Curve'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[#10B981]">
                      <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#10B981] inline-block" /> {isAr ? 'المنحنى المثالي المستهدف' : 'Optimal Target Curve'}
                    </span>
                  </div>
                </div>

                <div className="relative h-64 flex items-end">
                  <div className="absolute left-2 top-2 text-[9px] text-zinc-500 font-bold font-mono">Force (N)</div>
                  <div className="absolute right-4 bottom-2 text-[9px] text-zinc-500 font-bold font-mono">Velocity (m/s)</div>

                  <svg className="w-full h-full" viewBox="0 0 500 220">
                    <line x1="40" y1="20" x2="40" y2="190" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                    <line x1="40" y1="190" x2="480" y2="190" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                    
                    {/* Grid Lines */}
                    <line x1="40" y1="105" x2="480" y2="105" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="260" y1="20" x2="260" y2="190" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,4" />

                    {/* Actual Curve (Acid Volt) */}
                    <line x1="40" y1="40" x2="420" y2="190" stroke="#D4FF00" strokeWidth="3" />
                    <circle cx="40" cy="40" r="5" fill="#D4FF00" />
                    <circle cx="420" cy="190" r="5" fill="#D4FF00" />

                    {/* Optimal Target Curve (Emerald Dashed) */}
                    <line x1="40" y1="65" x2="450" y2="190" stroke="#10B981" strokeWidth="2.5" strokeDasharray="6,4" />
                    <circle cx="40" cy="65" r="4" fill="#10B981" />
                    <circle cx="450" cy="190" r="4" fill="#10B981" />

                    <text x="50" y="45" fill="#D4FF00" fontSize="10" fontFamily="JetBrains Mono, monospace">F0: {fvpResult.F0} N</text>
                    <text x="360" y="180" fill="#D4FF00" fontSize="10" fontFamily="JetBrains Mono, monospace">V0: {fvpResult.V0} m/s</text>
                  </svg>
                </div>
              </div>

              {/* Numerical Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-[#18181B] p-4 rounded-2xl border-b-2 border-[#D4FF00] border border-[#27272A]">
                  <span className="block text-[11px] text-zinc-400 mb-1">{t.fvpConsole.f0Force} (F0)</span>
                  <span className="text-2xl font-black text-white font-mono tabular-nums">{fvpResult.F0} <span className="text-xs text-zinc-400 font-sans">N</span></span>
                  <span className="block text-[9px] text-[#D4FF00] mt-1 font-mono">({fvpResult.f0_rel} N/kg)</span>
                </div>
                <div className="bg-[#18181B] p-4 rounded-2xl border-b-2 border-[#FF5500] border border-[#27272A]">
                  <span className="block text-[11px] text-zinc-400 mb-1">{t.fvpConsole.v0Velocity} (V0)</span>
                  <span className="text-2xl font-black text-white font-mono tabular-nums">{fvpResult.V0} <span className="text-xs text-zinc-400 font-sans">m/s</span></span>
                </div>
                <div className="bg-[#18181B] p-4 rounded-2xl border-b-2 border-[#10B981] border border-[#27272A]">
                  <span className="block text-[11px] text-zinc-400 mb-1">{t.fvpConsole.pmaxPower} (Pmax)</span>
                  <span className="text-2xl font-black text-[#10B981] font-mono tabular-nums">{fvpResult.Pmax} <span className="text-xs text-zinc-400 font-sans">W</span></span>
                </div>
                <div className="bg-[#18181B] p-4 rounded-2xl border-b-2 border-zinc-500 border border-[#27272A]">
                  <span className="block text-[11px] text-zinc-400 mb-1">{t.fvpConsole.sfvSlope} (Sfv)</span>
                  <span className="text-2xl font-black text-white font-mono tabular-nums">{fvpResult.effectiveSlope}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= TAB 2: FORCE-TIME CURVE (FTC) ========================= */}
      {/* ========================================================================= */}
      {activeSubTab === 'ftc' && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl md:text-2xl font-black text-white flex items-center justify-center gap-2">
              <Activity className="text-[#D4FF00]" size={24} />
              {isAr ? 'تحليل منحنى القوة والزمن (FTC)' : 'Force-Time Curve Analysis (FTC)'}
            </h3>
            <p className="text-zinc-400 text-xs mt-1.5 max-w-xl mx-auto">
              {isAr ? 'تحليل إشارات القوة الخام ومعدل توليد القوة (RFD) ومراحل الكبح والارتقاء.' : 'Analyze raw telemetry force signals, rate of force development (RFD), and propulsion phases.'}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <button onClick={() => loadPreset('elite')} className="px-3 py-1.5 bg-[#18181B] hover:bg-zinc-800 text-[#D4FF00] border border-[#D4FF00]/30 rounded-xl text-xs font-bold cursor-pointer">
              {isAr ? 'نموذج رياضي نخبة ⚡' : 'Elite Athlete Preset ⚡'}
            </button>
            <button onClick={() => loadPreset('low_rfd')} className="px-3 py-1.5 bg-[#18181B] hover:bg-zinc-800 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold cursor-pointer">
              {isAr ? 'نموذج انفجارية منخفضة ⚠️' : 'Low RFD Preset ⚠️'}
            </button>
            <button onClick={() => loadPreset('low_force')} className="px-3 py-1.5 bg-[#18181B] hover:bg-zinc-800 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold cursor-pointer">
              {isAr ? 'نموذج قوة منخفضة 🛑' : 'Low Force Preset 🛑'}
            </button>
          </div>

          <div className="max-w-2xl mx-auto mb-4">
            <textarea
              value={rawForceInput}
              onChange={(e) => setRawForceInput(e.target.value)}
              placeholder={isAr ? "ضع قيم القوة هنا مفصولة بفواصل أو مسافات..." : "Paste raw force data values (separated by commas or spaces)..."}
              className="w-full h-28 bg-[#09090B] border border-[#27272A] p-3 text-white font-mono tabular-nums text-xs rounded-xl outline-none focus:border-[#D4FF00]"
            />
          </div>

          <div className="text-center">
            <button
              onClick={handleFTCAnalyze}
              className="px-10 py-3 bg-[#D4FF00] text-[#09090B] rounded-xl font-black text-xs shadow-lg cursor-pointer hover:bg-[#b8dd00]"
            >
              {isAr ? 'تحليل منحنى القوة والزمن 📈' : 'Run Force-Time Analysis 📈'}
            </button>
          </div>

          {ftcResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center max-w-3xl mx-auto border-t border-[#27272A] pt-6">
              <div className="bg-[#18181B] p-4 rounded-2xl border-b-2 border-[#D4FF00] border border-[#27272A]">
                <span className="block text-[11px] text-zinc-400 mb-1">{isAr ? 'ذروة القوة (Peak F)' : 'Peak Force'}</span>
                <span className="text-2xl font-black text-white font-mono tabular-nums">{ftcResult.peakForce} N</span>
                <span className="block text-[9px] text-[#D4FF00] font-mono">({ftcResult.peakForceRel} N/kg)</span>
              </div>
              <div className="bg-[#18181B] p-4 rounded-2xl border-b-2 border-[#FF5500] border border-[#27272A]">
                <span className="block text-[11px] text-zinc-400 mb-1">{isAr ? 'متوسط القوة' : 'Mean Force'}</span>
                <span className="text-2xl font-black text-white font-mono tabular-nums">{ftcResult.meanForce} N</span>
              </div>
              <div className="bg-[#18181B] p-4 rounded-2xl border-b-2 border-[#10B981] border border-[#27272A]">
                <span className="block text-[11px] text-zinc-400 mb-1">{isAr ? 'وزن الجسم المعياري' : 'Body Weight'}</span>
                <span className="text-2xl font-black text-[#10B981] font-mono tabular-nums">{ftcResult.BW} N</span>
              </div>
              <div className="bg-[#18181B] p-4 rounded-2xl border-b-2 border-zinc-500 border border-[#27272A]">
                <span className="block text-[11px] text-zinc-400 mb-1">{isAr ? 'معدل العينات' : 'Sampling Rate'}</span>
                <span className="text-2xl font-black text-white font-mono tabular-nums">{ftcResult.samplingRate} Hz</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
