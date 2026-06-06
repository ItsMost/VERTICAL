import React, { useState, useEffect } from 'react';
import { LineChart, Zap, TrendingUp, AlertCircle, Info, CheckCircle } from 'lucide-react';

// Animated counter helper
const AnimatedCounter = ({ value, duration = 1000, decimals = 1 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    const startTime = performance.now();
    const updateCount = (now) => {
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
  return <span className="font-mono">{count.toFixed(decimals)}</span>;
};

export default function FVPCalculator({ activePlayer }) {
  const [jumps, setJumps] = useState([
    { weight: 0, flightTime: '' },
    { weight: 10, flightTime: '' },
    { weight: 20, flightTime: '' }
  ]);
  
  const [fvpResult, setFvpResult] = useState(null);

  const handleJumpChange = (index, field, value) => {
    const newJumps = [...jumps];
    newJumps[index][field] = value;
    setJumps(newJumps);
  };

  const handleAnalyze = () => {
    if (!activePlayer) return alert("يرجى اختيار لاعب أولاً!");

    const mass = parseFloat(activePlayer.weight_kg);
    const legLength = parseFloat(activePlayer.leg_length_m) || 1.0;
    const h_po = legLength * 0.45; 
    const g = 9.81;

    let points = [];

    // حساب القوة والسرعة لكل قفزة
    for (let i = 0; i < jumps.length; i++) {
      const extraWeight = parseFloat(jumps[i].weight) || 0;
      const ft = parseFloat(jumps[i].flightTime);

      if (!ft || ft <= 0) return alert(`يرجى إدخال زمن الطيران للقفزة رقم ${i + 1} بشكل صحيح.`);

      const h = (g * ft * ft) / 8; 
      const v_takeoff = (g * ft) / 2; 
      const mean_v = v_takeoff / 2; 
      
      const totalMass = mass + extraWeight;
      const mean_f = totalMass * g * ((h / h_po) + 1); 

      points.push({ v: mean_v, f: mean_f, weight: extraWeight });
    }

    // حساب معادلة الانحدار الخطي (Linear Regression)
    let n = points.length;
    let sum_v = 0, sum_f = 0;
    
    points.forEach(p => { sum_v += p.v; sum_f += p.f; });
    
    const mean_v_all = sum_v / n;
    const mean_f_all = sum_f / n;

    let numerator = 0, denominator = 0;
    points.forEach(p => {
      numerator += (p.v - mean_v_all) * (p.f - mean_f_all);
      denominator += (p.v - mean_v_all) * (p.v - mean_v_all);
    });

    const slope = numerator / denominator;
    
    // حماية ضد الأرقام المستحيلة (زي إنك تشيل وزن أكبر وتنط أعلى!)
    if (slope >= 0) {
      return alert("خطأ فيزيائي: لا يمكن أن تزيد سرعتك عندما تحمل وزناً أثقل! يرجى التأكد من أن أزمنة الطيران تقل منطقياً مع زيادة الأوزان.");
    }

    const F0 = mean_f_all - slope * mean_v_all; 
    const V0 = -F0 / slope;                     
    const Pmax = (F0 * V0) / 4;                 

    // التشخيص المحدث والحساس للتغيرات (FVP Diagnosis)
    const f0_rel = F0 / mass; // القوة النسبية (N/kg)

    let diagnosis = "";
    let advice = "";
    let color = "";

    // المعايير الفيزيائية الدقيقة لأبحاث Samozino (V0 ~ 3.0 m/s, F0_rel ~ 25 N/kg)
    if (V0 < 3.0 && f0_rel >= 24) {
        diagnosis = "نقص في السرعة (Velocity Deficit)";
        advice = "اللاعب يمتلك قوة كبيرة لكنه بطيء. يجب التركيز على تدريبات القفز السريع (Plyometrics) والأوزان الخفيفة جداً.";
        color = "text-blue-400 border-blue-500 bg-blue-900/20";
    } else if (f0_rel < 24 && V0 >= 3.0) {
        diagnosis = "نقص في القوة (Force Deficit)";
        advice = "اللاعب سريع ولكنه يفتقر للقوة الأساسية. يجب التركيز على تدريبات الأوزان الثقيلة (Squat/Deadlift).";
        color = "text-orange-400 border-orange-500 bg-orange-900/20";
    } else if (f0_rel < 24 && V0 < 3.0) {
        diagnosis = "ضعف عام (Weak Profile)";
        advice = "اللاعب يعاني من نقص في كل من القوة والسرعة. ابدأ ببناء قاعدة قوة (Base Strength) أولاً ثم انتقل للسرعة.";
        color = "text-red-400 border-red-500 bg-red-900/20";
    } else {
        diagnosis = "ملف متوازن (Well-Balanced Profile)";
        advice = "اللاعب يمتلك توازن ممتاز بين القوة والسرعة. استمر في التدريب المتنوع (Mixed Training) للحفاظ على المنحنى وتطويره.";
        color = "text-emerald-400 border-emerald-500 bg-emerald-900/20";
    }

    setFvpResult({
      F0, V0, Pmax, diagnosis, advice, color, points
    });
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl animate-fade-in">
      <h3 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 mb-2">
        منحنى القوة والسرعة (Force-Velocity Profile)
      </h3>
      <p className="text-center text-gray-400 text-sm mb-8">
        قم بإجراء 3 قفزات (بوزن الجسم، وأوزان إضافية) لتحديد نواقص اللاعب بدقة.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 text-right">
        {jumps.map((jump, index) => (
          <div key={index} className="bg-black/20 p-5 rounded-2xl border border-[var(--border-light)] text-center transition-all hover:border-[var(--border-color)]">
            <h4 className="font-bold text-white mb-4 bg-[var(--bg-input)] py-2 rounded-xl border border-[var(--border-light)]">
              قفزة {index + 1}
            </h4>
            
            {/* Weight Telemetry Input */}
            <div className="mb-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">الوزن الإضافي:</span>
                <span className="text-cyan-400 font-mono font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">{jump.weight} kg</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => handleJumpChange(index, 'weight', Math.max(0, parseInt(jump.weight || 0) - 5))} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-bold flex items-center justify-center">-</button>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="5" 
                  value={jump.weight || 0} 
                  onChange={(e) => handleJumpChange(index, 'weight', Number(e.target.value))} 
                  className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-main)]" 
                />
                <button type="button" onClick={() => handleJumpChange(index, 'weight', Math.min(100, parseInt(jump.weight || 0) + 5))} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-bold flex items-center justify-center">+</button>
              </div>
              <div className="flex gap-1.5 justify-center">
                {[0, 10, 20, 30, 40].map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handleJumpChange(index, 'weight', w)}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${parseInt(jump.weight || 0) === w ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-[var(--bg-input)] text-gray-400 border-[var(--border-light)] hover:text-white'}`}
                  >
                    {w}kg
                  </button>
                ))}
              </div>
            </div>

            {/* Flight Time Telemetry Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">زمن الطيران:</span>
                <span className="text-cyan-400 font-mono font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">{(parseFloat(jump.flightTime) || 0).toFixed(3)} s</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => handleJumpChange(index, 'flightTime', Math.max(0.2, (parseFloat(jump.flightTime) || 0.5) - 0.01).toFixed(3))} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-bold flex items-center justify-center">-</button>
                <input 
                  type="range" 
                  min="0.200" 
                  max="1.000" 
                  step="0.005" 
                  value={parseFloat(jump.flightTime) || 0.500} 
                  onChange={(e) => handleJumpChange(index, 'flightTime', parseFloat(e.target.value).toFixed(3))} 
                  className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-main)]" 
                />
                <button type="button" onClick={() => handleJumpChange(index, 'flightTime', Math.min(1.0, (parseFloat(jump.flightTime) || 0.5) + 0.01).toFixed(3))} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-bold flex items-center justify-center">+</button>
              </div>
              <div className="flex gap-1.5 justify-center">
                {[0.4, 0.5, 0.6, 0.7].map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => handleJumpChange(index, 'flightTime', f.toFixed(3))}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${(parseFloat(jump.flightTime) || 0).toFixed(3) === f.toFixed(3) ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-[var(--bg-input)] text-gray-400 border-[var(--border-light)] hover:text-white'}`}
                  >
                    {f.toFixed(2)}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mb-8">
        <button onClick={handleAnalyze} className="px-14 py-4 btn-orange-gradient rounded-2xl font-black text-xl shadow-lg transition-transform hover:scale-105">
          رسم المنحنى والتحليل
        </button>
      </div>

      {fvpResult && (
        <div className="space-y-6 border-t border-[var(--border-light)] pt-6 text-right">
          
          <div className={`p-6 rounded-2xl border shadow-lg text-center ${fvpResult.color}`}>
             <p className="text-sm font-bold opacity-80 mb-2">التشخيص الميكانيكي (FVP Diagnosis)</p>
             <h4 className="text-3xl font-black mb-3 text-white">{fvpResult.diagnosis}</h4>
             <p className="text-sm opacity-90 max-w-xl mx-auto leading-relaxed">
               💡 {fvpResult.advice}
             </p>
          </div>

          {/* Metric Cards & Speedometer Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center items-center">
            {/* Speedometer Gauge card */}
            <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-cyan-500/40 relative overflow-hidden flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-cyan-600/5"></div>
              
              {/* SVG Speedometer Needle Gauge for Velocity V0 */}
              <div className="relative w-48 h-28 flex flex-col items-center justify-center overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 100 55">
                  <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
                  <path 
                    d="M 15 50 A 35 35 0 0 1 85 50" 
                    fill="none" 
                    stroke="url(#fvpGaugeGradient)" 
                    strokeWidth="6" 
                    strokeLinecap="round"
                    strokeDasharray={110}
                    strokeDashoffset={110 - (110 * Math.min(4.0, fvpResult.V0) / 4.0)}
                    style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
                  />
                  <path d="M 46 16 A 35 35 0 0 1 54 16" fill="none" stroke="#10b981" strokeWidth="6" />
                  
                  {(() => {
                    const angle = -180 + (Math.min(4.0, fvpResult.V0) / 4.0) * 180;
                    const fillRadian = (angle * Math.PI) / 180;
                    const x2 = 50 + 30 * Math.cos(fillRadian);
                    const y2 = 50 + 30 * Math.sin(fillRadian);
                    return (
                      <line x1="50" y1="50" x2={x2} y2={y2} stroke="#00f5d4" strokeWidth="2.5" strokeLinecap="round" />
                    );
                  })()}
                  <circle cx="50" cy="50" r="3" fill="#00f5d4" />
                  <defs>
                    <linearGradient id="fvpGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute bottom-1 text-center">
                  <span className="text-[9px] text-gray-400 font-bold">السرعة القصوى (V0)</span>
                  <div className="text-base font-black text-white font-mono"><AnimatedCounter value={fvpResult.V0} decimals={2} /> m/s</div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-light)] relative">
              <span className="block text-xs text-gray-400 mb-2">أقصى قوة نظرية (F0)</span>
              <span className="text-3xl font-black text-[var(--text-primary)]"><AnimatedCounter value={fvpResult.F0} decimals={0} /> <span className="text-xs text-gray-500 font-bold">N</span></span>
              <span className="block text-[10px] text-gray-500 mt-1 font-mono">({(fvpResult.F0 / activePlayer.weight_kg).toFixed(1)} N/kg)</span>
            </div>
            
            <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-light)] relative">
              <span className="block text-xs text-gray-400 mb-2">أقصى سرعة نظرية (V0)</span>
              <span className="text-3xl font-black text-[var(--text-primary)]"><AnimatedCounter value={fvpResult.V0} decimals={2} /> <span className="text-xs text-gray-500 font-bold">m/s</span></span>
            </div>

            <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-light)] relative">
              <span className="block text-xs text-gray-400 mb-2">ذروة القدرة القصوى (Pmax)</span>
              <span className="text-3xl font-black text-cyan-500"><AnimatedCounter value={fvpResult.Pmax} decimals={0} /> <span className="text-xs text-cyan-500/50 font-bold">W</span></span>
              <span className="block text-[10px] text-cyan-500/50 mt-1 font-mono">({(fvpResult.Pmax / activePlayer.weight_kg).toFixed(1)} W/kg)</span>
            </div>
          </div>

          {/* SVG F-V Curve Dashboard */}
          <div className="bg-black/30 p-6 rounded-2xl border border-[var(--border-light)] shadow-inner">
             <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-sm text-gray-300">مقارنة منحنى اللاعب الفعلي (Actual F-V Curve)</h4>
                <div className="flex gap-4 text-xs font-bold">
                   <span className="flex items-center gap-1.5 text-cyan-500"><span className="w-3.5 h-0.5 bg-cyan-500 inline-block"></span> المنحنى الفعلي</span>
                </div>
             </div>
             
             <div className="relative h-72 flex items-end">
                {/* Y-axis Label */}
                <div className="absolute left-2 top-2 text-[10px] text-gray-500 font-bold vertical-text">القوة (Force - N)</div>
                <div className="absolute left-12 top-4 bottom-12 w-0.5 bg-gray-700"></div>
                <span className="absolute left-6 top-4 text-[10px] text-gray-500 font-bold">{fvpResult.F0.toFixed(0)}</span>
                <span className="absolute left-8 bottom-12 text-[10px] text-gray-500 font-bold">0</span>

                {/* X-axis Label */}
                <div className="absolute left-12 bottom-12 right-4 h-0.5 bg-gray-700"></div>
                <div className="absolute right-4 bottom-4 text-[10px] text-gray-500 font-bold">السرعة (Velocity - m/s)</div>
                <span className="absolute right-12 bottom-14 text-[10px] text-gray-500 font-bold">{fvpResult.V0.toFixed(1)}</span>

                <svg className="absolute left-12 bottom-12" style={{ width: 'calc(100% - 4.5rem)', height: 'calc(100% - 4.5rem)', overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1="0" y1="0" x2="100%" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  
                  {(() => {
                    const actualX1 = 0;
                    const actualY1 = 0;
                    const actualX2 = 100;
                    const actualY2 = 100;

                    return (
                      <>
                        {/* Actual Curve (Solid cyan line) */}
                        <line 
                          x1={`${actualX1}%`} 
                          y1={`${actualY1}%`} 
                          x2={`${actualX2}%`} 
                          y2={`${actualY2}%`} 
                          stroke="#00f5d4" 
                          strokeWidth="3.5" 
                          style={{ filter: 'drop-shadow(0px 0px 4px rgba(0, 245, 212, 0.4))' }}
                        />

                        {/* Plotted load points */}
                        {fvpResult.points.map((pt, i) => {
                          const px = (pt.v / fvpResult.V0) * 100;
                          const py = 100 - (pt.f / fvpResult.F0) * 100;
                          return (
                            <g key={i}>
                              <circle 
                                cx={`${px}%`} 
                                cy={`${py}%`} 
                                r="6.5" 
                                fill="#00b4d8" 
                                stroke="#fff" 
                                strokeWidth="2.5" 
                              />
                              <text 
                                x={`${px}%`} 
                                y={`${py - 8}%`} 
                                fill="#00f5d4" 
                                fontSize="9.5" 
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {pt.weight}kg
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}