import React, { useState, useEffect } from 'react';
import { 
  LineChart, Zap, TrendingUp, AlertCircle, Info, CheckCircle, 
  Activity, FileText, Sparkles, RefreshCw, Play, ArrowLeftRight 
} from 'lucide-react';
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
  return <span className="font-mono metric-num">{count.toFixed(decimals)}</span>;
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

export default function FVPCalculator({ activePlayer, language = 'ar' }: FVPCalculatorProps) {
  const [activeSubTab, setActiveSubTab] = useState<'ftc' | 'fvp'>('fvp');

  // ==========================================
  // STATE FOR FORCE-TIME CURVE (FTC) ANALYSIS
  // ==========================================
  const [athleteMass, setAthleteMass] = useState<number | string>(activePlayer?.weight_kg || 75);
  const [samplingRate, setSamplingRate] = useState<number | string>(1000);
  const [movementType, setMovementType] = useState('cmj');
  const [inputMode, setInputMode] = useState<'raw' | 'metrics'>('raw');
  const [rawForceInput, setRawForceInput] = useState('');
  
  const [metricPeakForce, setMetricPeakForce] = useState('');
  const [metricTimeToPeak, setMetricTimeToPeak] = useState('');
  const [metricFlightTime, setMetricFlightTime] = useState('');

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
    setInputMode('raw');
  };

  const handleFTCAnalyze = () => {
    const mass = parseFloat(String(athleteMass));
    const rate = parseFloat(String(samplingRate));
    if (!mass || mass <= 0) return alert('الرجاء إدخال كتلة اللاعب بشكل صحيح');
    if (!rate || rate <= 0) return alert('الرجاء إدخال معدل أخذ العينات بشكل صحيح');

    const forceArray: number[] = [];
    if (!rawForceInput.trim()) return alert('الرجاء إدخال قيم القوة أو اختيار لاعب تجريبي');
    
    const parts = rawForceInput.split(/[\s,;\n]+/);
    for (const part of parts) {
      const val = parseFloat(part);
      if (!isNaN(val)) forceArray.push(val);
    }

    if (forceArray.length < 50) {
      return alert('البيانات المدخلة قصيرة جداً لتحليل بيوميكانيكي دقيق (الحد الأدنى 50 عينة)');
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
  const [seasonPeriod, setSeasonPeriod] = useState('off_season');
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

      if (!ft || ft <= 0) return alert(`يرجى إدخال زمن الطيران للمحاولة رقم ${i + 1} بشكل صحيح.`);

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
      diagnosis = "عجز في القوة (High Force Deficit)";
      advice = "اللاعب يمتلك حركة مطاطية وسرعة فائقة ولكنه يفتقر للقوة المطلقة؛ أولوية لتمارين القوة القصوى والسكوات الثقيل (Heavy Slow Resistance >85% 1RM).";
      color = "border-amber-500/40 bg-amber-500/10 text-amber-400";
    } else if (fvpIndex > 115 || (f0_rel >= 32 && V0 < 2.5)) {
      diagnosis = "عجز في السرعة (Velocity Deficit)";
      advice = "اللاعب يمتلك قوة عضلية ممتازة ولكن حركته بطيئة؛ أولوية للقفز المتفجر والباليستي مع أحمال خفيفة أو قفز بمساعدة مطاط (Assisted Plyos & Ballistics).";
      color = "border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF]";
    } else {
      diagnosis = "ملف مثالي متوازن (Well-Balanced Elite)";
      advice = "توازن استثنائي بين القوة والسرعة مع قدرة ميكانيكية فائقة؛ الحفاظ على كامل منحنى القوة والسرعة بنظام التدريب المركب.";
      color = "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
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
    <div className="glass-panel p-4 md:p-6 shadow-2xl text-right border border-white/10 relative overflow-hidden" style={{ direction: 'rtl' }}>
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Sub-tab selection */}
      <div className="flex justify-center gap-3 mb-6 bg-[#111827]/80 p-1.5 rounded-2xl border border-white/10 max-w-md mx-auto">
        <button
          onClick={() => setActiveSubTab('fvp')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'fvp'
              ? 'bg-[#00F0FF] text-[#07090E] shadow-[0_0_15px_rgba(0,240,255,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <TrendingUp size={16} />
          منحنى القوة والسرعة (FVP Curve)
        </button>
        <button
          onClick={() => setActiveSubTab('ftc')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'ftc'
              ? 'bg-[#00F0FF] text-[#07090E] shadow-[0_0_15px_rgba(0,240,255,0.3)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <LineChart size={16} />
          منحنى القوة والزمن (FTC Analysis)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ================= TAB 1: FORCE-VELOCITY PROFILE (FVP) =================== */}
      {/* ========================================================================= */}
      {activeSubTab === 'fvp' && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#00F0FF] to-cyan-400">
              Force-Velocity Profile (FVP) - Samozino Model
            </h3>
            <p className="text-gray-400 text-xs mt-1.5 max-w-xl mx-auto">
              تحليل 4 قفزات بأوزان تصاعدية لتحديد العجز الميكانيكي بدقة (عجز قوة مقابل عجز سرعة) ووصفة التدريب المثالية.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-6">
            {jumps.map((jump, idx) => (
              <div key={idx} className="glass-card p-4 border border-white/10 text-center">
                <span className="text-xs font-black text-[#00F0FF] block mb-2">القفزة #{idx + 1}</span>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">الوزن الإضافي (kg)</label>
                    <input
                      type="number"
                      value={jump.weight}
                      onChange={(e) => handleJumpChange(idx, 'weight', e.target.value)}
                      className="w-full bg-[#0B0F19] border border-white/10 p-2 text-white font-mono text-center rounded-xl text-xs outline-none focus:border-[#00F0FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">زمن الطيران (s)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={jump.flightTime}
                      onChange={(e) => handleJumpChange(idx, 'flightTime', e.target.value)}
                      className="w-full bg-[#0B0F19] border border-white/10 p-2 text-[#00F0FF] font-mono text-center rounded-xl text-xs outline-none focus:border-[#00F0FF]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mb-6">
            <button
              onClick={handleFVPAnalyze}
              className="px-12 py-3.5 btn-electric rounded-xl font-black text-sm shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              📊 حساب ملف القوة والسرعة ومنحنى ساموزينو
            </button>
          </div>

          {fvpResult && (
            <div className="space-y-6 border-t border-white/10 pt-6 animate-fade-in">
              {/* Automated Prescription Badge */}
              <div className={`p-6 rounded-2xl border ${fvpResult.color} shadow-lg text-center`}>
                <p className="text-xs font-bold opacity-80 mb-1">التشخيص الآلي الميكانيكي الحيوي (FVP Diagnosis)</p>
                <h4 className="text-2xl font-black mb-2 text-white">{fvpResult.diagnosis}</h4>
                <p className="text-xs opacity-90 max-w-xl mx-auto leading-relaxed font-sans">
                  💡 {fvpResult.advice}
                </p>
                <div className="mt-3 inline-block bg-black/40 px-3 py-1 rounded-full border border-white/10 font-mono text-xs font-bold text-white">
                  معامل التوازن الميكانيكي (FV-Imbalance): {fvpResult.fvpIndex}% (المثالي = 100%)
                </div>
              </div>

              {/* F-V Curve Plot SVG */}
              <div className="glass-card p-6 border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-sm text-gray-200">مقارنة منحنى القوة والسرعة الفعلي مقابل المثالي</h4>
                  <div className="flex gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-[#00F0FF]">
                      <span className="w-3.5 h-0.5 bg-[#00F0FF] inline-block" /> المنحنى الفعلي للرياضي
                    </span>
                    <span className="flex items-center gap-1.5 text-[#10B981]">
                      <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#10B981] inline-block" /> المنحنى المثالي المستهدف
                    </span>
                  </div>
                </div>

                <div className="relative h-64 flex items-end">
                  <div className="absolute left-2 top-2 text-[9px] text-gray-500 font-bold">Force (N)</div>
                  <div className="absolute right-4 bottom-2 text-[9px] text-gray-500 font-bold">Velocity (m/s)</div>

                  <svg className="w-full h-full" viewBox="0 0 500 220">
                    <line x1="40" y1="20" x2="40" y2="190" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    <line x1="40" y1="190" x2="480" y2="190" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    
                    {/* Grid Lines */}
                    <line x1="40" y1="105" x2="480" y2="105" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="260" y1="20" x2="260" y2="190" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,4" />

                    {/* Actual Curve (Cyan) */}
                    <line x1="40" y1="40" x2="420" y2="190" stroke="#00F0FF" strokeWidth="3" />
                    <circle cx="40" cy="40" r="5" fill="#00F0FF" />
                    <circle cx="420" cy="190" r="5" fill="#00F0FF" />

                    {/* Optimal Target Curve (Emerald Dashed) */}
                    <line x1="40" y1="65" x2="450" y2="190" stroke="#10B981" strokeWidth="2.5" strokeDasharray="6,4" />
                    <circle cx="40" cy="65" r="4" fill="#10B981" />
                    <circle cx="450" cy="190" r="4" fill="#10B981" />

                    <text x="50" y="45" fill="#00F0FF" fontSize="10" fontFamily="monospace">F0: {fvpResult.F0} N</text>
                    <text x="360" y="180" fill="#00F0FF" fontSize="10" fontFamily="monospace">V0: {fvpResult.V0} m/s</text>
                  </svg>
                </div>
              </div>

              {/* Numerical Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="glass-card p-4 border-b-2 border-[#00F0FF]">
                  <span className="block text-[11px] text-gray-400 mb-1">أقصى قوة نظرية (F0)</span>
                  <span className="text-2xl font-black text-white font-mono metric-num">{fvpResult.F0} <span className="text-xs text-gray-400 font-sans">N</span></span>
                  <span className="block text-[9px] text-[#00F0FF] mt-1 font-mono">({fvpResult.f0_rel} N/kg)</span>
                </div>
                <div className="glass-card p-4 border-b-2 border-cyan-400">
                  <span className="block text-[11px] text-gray-400 mb-1">أقصى سرعة نظرية (V0)</span>
                  <span className="text-2xl font-black text-white font-mono metric-num">{fvpResult.V0} <span className="text-xs text-gray-400 font-sans">m/s</span></span>
                </div>
                <div className="glass-card p-4 border-b-2 border-emerald-400">
                  <span className="block text-[11px] text-gray-400 mb-1">القدرة القصوى (Pmax)</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono metric-num">{fvpResult.Pmax} <span className="text-xs text-gray-400 font-sans">W</span></span>
                </div>
                <div className="glass-card p-4 border-b-2 border-purple-400">
                  <span className="block text-[11px] text-gray-400 mb-1">ميل المنحنى (Sfv)</span>
                  <span className="text-2xl font-black text-purple-400 font-mono metric-num">{fvpResult.effectiveSlope}</span>
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
            <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#00F0FF] to-cyan-400">
              Force-Time Curve (FTC) Analysis
            </h3>
            <p className="text-gray-400 text-xs mt-1.5 max-w-xl mx-auto">
              تحليل إشارات القوة الخام ومعدل توليد القوة (RFD) ومراحل الكبح والارتقاء.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <button onClick={() => loadPreset('elite')} className="px-3 py-1.5 bg-[#111827] hover:bg-white/10 text-[#00F0FF] border border-[#00F0FF]/30 rounded-xl text-xs font-bold cursor-pointer">
              نموذج رياضي نخبة ⚡
            </button>
            <button onClick={() => loadPreset('low_rfd')} className="px-3 py-1.5 bg-[#111827] hover:bg-white/10 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold cursor-pointer">
              نموذج انفجارية منخفضة ⚠️
            </button>
            <button onClick={() => loadPreset('low_force')} className="px-3 py-1.5 bg-[#111827] hover:bg-white/10 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold cursor-pointer">
              نموذج قوة منخفضة 🛑
            </button>
          </div>

          <div className="max-w-2xl mx-auto mb-4">
            <textarea
              value={rawForceInput}
              onChange={(e) => setRawForceInput(e.target.value)}
              placeholder="ضع قيم القوة هنا مفصولة بفواصل أو مسافات..."
              className="w-full h-28 bg-[#0B0F19] border border-white/10 p-3 text-white font-mono text-xs rounded-xl outline-none focus:border-[#00F0FF]"
            />
          </div>

          <div className="text-center">
            <button
              onClick={handleFTCAnalyze}
              className="px-10 py-3 btn-electric rounded-xl font-black text-xs shadow-lg cursor-pointer"
            >
              تحليل منحنى القوة والزمن 📈
            </button>
          </div>

          {ftcResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center max-w-3xl mx-auto border-t border-white/10 pt-6">
              <div className="glass-card p-4 border-b-2 border-[#00F0FF]">
                <span className="block text-[11px] text-gray-400 mb-1">ذروة القوة (Peak F)</span>
                <span className="text-2xl font-black text-white font-mono metric-num">{ftcResult.peakForce} N</span>
                <span className="block text-[9px] text-[#00F0FF] font-mono">({ftcResult.peakForceRel} N/kg)</span>
              </div>
              <div className="glass-card p-4 border-b-2 border-cyan-400">
                <span className="block text-[11px] text-gray-400 mb-1">متوسط القوة</span>
                <span className="text-2xl font-black text-white font-mono metric-num">{ftcResult.meanForce} N</span>
              </div>
              <div className="glass-card p-4 border-b-2 border-emerald-400">
                <span className="block text-[11px] text-gray-400 mb-1">وزن الجسم المعياري</span>
                <span className="text-2xl font-black text-emerald-400 font-mono metric-num">{ftcResult.BW} N</span>
              </div>
              <div className="glass-card p-4 border-b-2 border-purple-400">
                <span className="block text-[11px] text-gray-400 mb-1">معدل العينات</span>
                <span className="text-2xl font-black text-purple-400 font-mono metric-num">{ftcResult.samplingRate} Hz</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
