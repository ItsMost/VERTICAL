import React, { useState } from 'react';

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {jumps.map((jump, index) => (
          <div key={index} className="bg-[#0f1423] p-5 rounded-2xl border border-gray-700 shadow-lg text-center">
            <h4 className="font-bold text-white mb-4 bg-[#1f2937] py-2 rounded-lg">قفزة {index + 1}</h4>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">الوزن الإضافي (kg)</label>
              <input type="number" value={jump.weight} onChange={(e) => handleJumpChange(index, 'weight', e.target.value)} className="w-full bg-[#1f2937] border border-gray-600 p-2 text-white rounded-xl text-center outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">زمن الطيران (Sec)</label>
              <input type="number" step="0.01" value={jump.flightTime} onChange={(e) => handleJumpChange(index, 'flightTime', e.target.value)} className="w-full bg-[#1f2937] border border-teal-700/50 p-2 text-teal-400 font-bold rounded-xl text-center outline-none focus:border-teal-400" placeholder="مثال: 0.60" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mb-8">
        <button onClick={handleAnalyze} className="px-12 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl font-bold text-xl shadow-lg transition-transform hover:scale-105">
          رسم المنحنى والتحليل
        </button>
      </div>

      {fvpResult && (
        <div className="space-y-6 animate-fade-in-down border-t border-gray-800 pt-6">
          
          <div className={`p-6 rounded-2xl border shadow-lg text-center ${fvpResult.color}`}>
             <p className="text-sm font-bold opacity-80 mb-2">التشخيص الميكانيكي (FVP Diagnosis)</p>
             <h4 className="text-3xl font-black mb-3">{fvpResult.diagnosis}</h4>
             <p className="text-sm opacity-90 max-w-xl mx-auto leading-relaxed">
               💡 {fvpResult.advice}
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-red-500">
              <span className="block text-xs text-gray-400 mb-2">أقصى قوة نظرية (F0)</span>
              <span className="text-4xl font-black text-white">{fvpResult.F0.toFixed(0)} <span className="text-sm text-gray-500">N</span></span>
            </div>
            <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-blue-500">
              <span className="block text-xs text-gray-400 mb-2">أقصى سرعة نظرية (V0)</span>
              <span className="text-4xl font-black text-white">{fvpResult.V0.toFixed(2)} <span className="text-sm text-gray-500">m/s</span></span>
            </div>
            <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-emerald-500">
              <span className="block text-xs text-gray-400 mb-2">ذروة القدرة (Pmax)</span>
              <span className="text-4xl font-black text-white">{fvpResult.Pmax.toFixed(0)} <span className="text-sm text-gray-500">W</span></span>
            </div>
          </div>

          <div className="bg-[#0f1423] p-6 rounded-2xl border border-gray-700 relative h-64 mt-8 flex items-end">
             <div className="absolute left-10 top-4 bottom-10 w-0.5 bg-gray-600"></div>
             <span className="absolute left-2 top-2 text-xs text-gray-400 font-bold">Force</span>
             <span className="absolute left-2 bottom-10 text-xs text-gray-400 font-bold">0</span>

             <div className="absolute left-10 bottom-10 right-4 h-0.5 bg-gray-600"></div>
             <span className="absolute right-4 bottom-2 text-xs text-gray-400 font-bold">Velocity</span>

             <svg className="absolute left-10 bottom-10" style={{ width: 'calc(100% - 3rem)', height: 'calc(100% - 3.5rem)', overflow: 'visible' }}>
               <line x1="0" y1="0" x2="100%" y2="100%" stroke="#10b981" strokeWidth="3" strokeDasharray="5,5" opacity="0.5" />
               {fvpResult.points.map((pt, i) => {
                 const xPercent = (pt.v / fvpResult.V0) * 100;
                 const yPercent = 100 - ((pt.f / fvpResult.F0) * 100);
                 return (
                   <g key={i}>
                     <circle cx={`${xPercent}%`} cy={`${yPercent}%`} r="6" fill="#0ea5e9" stroke="#fff" strokeWidth="2" />
                     <text x={`${xPercent}%`} y={`${yPercent - 5}%`} fill="#9ca3af" fontSize="10" textAnchor="middle">
                       {pt.weight}kg
                     </text>
                   </g>
                 );
               })}
             </svg>
          </div>
        </div>
      )}
    </div>
  );
}