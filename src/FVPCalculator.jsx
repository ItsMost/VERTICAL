import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';

export default function FVPCalculator({ activePlayer, selectedPlayerId }) {
  // 3 قفزات افتراضية (بوزن الجسم، +10 كجم، +20 كجم)
  const [jumps, setJumps] = useState([
    { id: 1, load: 0, flightTime: 0 },
    { id: 2, load: 10, flightTime: 0 },
    { id: 3, load: 20, flightTime: 0 },
  ]);

  const [fvpResults, setFvpResults] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleJumpChange = (id, field, value) => {
    setJumps(
      jumps.map((j) =>
        j.id === id ? { ...j, [field]: parseFloat(value) || 0 } : j
      )
    );
  };

  const calculateFVP = () => {
    if (!activePlayer) return alert('يرجى اختيار لاعب أولاً!');

    // التأكد من إدخال الأوقات
    if (jumps.some((j) => j.flightTime <= 0)) {
      return alert('يرجى إدخال زمن الطيران لجميع القفزات الثلاث.');
    }

    const g = 9.81;
    const bodyMass = parseFloat(activePlayer.weight_kg);
    const legLength = parseFloat(activePlayer.leg_length_m);
    const pushDistance = legLength * 0.45; // مسافة الدفع التقريبية

    // حساب القوة والسرعة لكل قفزة
    const dataPoints = jumps.map((jump) => {
      const totalMass = bodyMass + jump.load;
      const t = jump.flightTime;

      // السرعة عند الإقلاع والارتفاع
      const vTakeoff = (t * g) / 2;
      const height = Math.pow(vTakeoff, 2) / (2 * g);

      // متوسط السرعة ومتوسط القوة (معادلات Samozino)
      const meanVelocity = vTakeoff / 2;
      const meanForce = totalMass * g * (height / pushDistance + 1);

      return {
        x: meanVelocity, // السرعة على محور X
        y: meanForce, // القوة على محور Y
        load: jump.load,
      };
    });

    // حساب الانحدار الخطي (Linear Regression) لمعرفة F0 و V0
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;
    const n = dataPoints.length;

    dataPoints.forEach((p) => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n; // F0 (القوة القصوى النظرية)

    const f0 = intercept;
    const v0 = -f0 / slope; // V0 (السرعة القصوى النظرية)
    const pMax = (f0 * v0) / 4; // ذروة القدرة

    // تحديد نوع البروفايل (Deficit)
    // حساب الميل الفعلي مقارنة بالميل المثالي (تقريبي بناء على وزن الجسم)
    const optimalSlope = -(bodyMass * g) / 0.5; // معادلة مبسطة للـ Optimal
    let profileType = '';
    let advice = '';
    let color = '';

    if (slope > optimalSlope * 0.85) {
      profileType = 'Velocity Deficit (نقص في السرعة)';
      advice =
        'اللاعب يمتلك قوة كبيرة لكنه بطيء. يجب التركيز على تدريبات القفز بدون أوزان (Plyometrics) والسرعة الانفجارية بنسبة 70%.';
      color = 'text-blue-400';
    } else if (slope < optimalSlope * 1.15) {
      profileType = 'Force Deficit (نقص في القوة)';
      advice =
        'اللاعب سريع لكن يفتقر للقوة العضلية لدفع الأرض بقوة. يجب التركيز على تدريبات الأوزان الثقيلة (Squats, Deadlifts) بنسبة 70%.';
      color = 'text-red-400';
    } else {
      profileType = 'Well-Balanced (متوازن)';
      advice =
        'بروفايل اللاعب مثالي. يجب الحفاظ على التوازن في التدريب بين تدريبات القوة وتدريبات السرعة (50/50).';
      color = 'text-emerald-400';
    }

    setFvpResults({
      f0,
      v0,
      pMax,
      slope,
      dataPoints,
      profileType,
      advice,
      color,
    });
  };

  const saveFVP = async () => {
    if (!fvpResults || !selectedPlayerId) return;
    setIsSaving(true);

    const { data, error } = await supabase.from('fvp_tests').insert([
      {
        player_id: selectedPlayerId,
        f0_force: fvpResults.f0.toFixed(2),
        v0_velocity: fvpResults.v0.toFixed(2),
        pmax_power: fvpResults.pMax.toFixed(2),
        profile_type: fvpResults.profileType,
      },
    ]);

    if (!error) {
      alert('تم حفظ تقرير الـ FVP بنجاح في سجل اللاعب!');
    } else {
      alert('حدث خطأ أثناء الحفظ.');
    }
    setIsSaving(false);
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl animate-fade-in">
      <div className="mb-6 text-center border-b border-gray-800 pb-4">
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-500">
          منحنى القوة والسرعة (Force-Velocity Profile)
        </h3>
        <p className="text-gray-400 text-sm mt-2">
          قم بإجراء 3 قفزات (بوزن الجسم، وأوزان إضافية) لتحديد نواقص اللاعب (قوة
          أم سرعة).
        </p>
      </div>

      {/* حقول إدخال القفزات الثلاث */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {jumps.map((jump, index) => (
          <div
            key={jump.id}
            className="bg-[#1f2937] p-5 rounded-xl border border-gray-700"
          >
            <h4 className="text-center font-bold text-gray-300 mb-4 border-b border-gray-600 pb-2">
              قفزة {index + 1}
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  الوزن الإضافي (kg)
                </label>
                <input
                  type="number"
                  value={jump.load}
                  onChange={(e) =>
                    handleJumpChange(jump.id, 'load', e.target.value)
                  }
                  className="w-full bg-[#0b0f19] border border-gray-600 rounded-lg p-2 text-white outline-none focus:border-blue-500 text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  زمن الطيران (Sec)
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="مثال: 0.650"
                  value={jump.flightTime || ''}
                  onChange={(e) =>
                    handleJumpChange(jump.id, 'flightTime', e.target.value)
                  }
                  className="w-full bg-[#0b0f19] border border-emerald-600/50 rounded-lg p-2 text-emerald-400 outline-none focus:border-emerald-500 text-center font-mono font-bold"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mb-8">
        <button
          onClick={calculateFVP}
          className="px-14 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-2xl font-bold text-xl shadow-[0_10px_25px_rgba(16,185,129,0.3)] transition-transform hover:scale-105"
        >
          رسم المنحنى والتحليل
        </button>
      </div>

      {/* النتائج والمنحنى */}
      {fvpResults && (
        <div className="space-y-6 animate-fade-in-down">
          {/* الروشتة (Diagnosis) */}
          <div className="bg-[#0f1423] border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-2">
              التشخيص الميكانيكي (FVP Diagnosis)
            </p>
            <h2 className={`text-3xl font-black mb-4 ${fvpResults.color}`}>
              {fvpResults.profileType}
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed bg-[#1f2937] p-4 rounded-lg border border-gray-700/50">
              💡 {fvpResults.advice}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-[#1f2937] p-5 rounded-xl border-b-4 border-red-500">
              <span className="block text-xs text-gray-400 mb-2">
                أقصى قوة نظرية (F0)
              </span>
              <span className="text-3xl font-black text-white">
                {fvpResults.f0.toFixed(0)}{' '}
                <span className="text-sm font-normal text-gray-500">N</span>
              </span>
            </div>
            <div className="bg-[#1f2937] p-5 rounded-xl border-b-4 border-blue-500">
              <span className="block text-xs text-gray-400 mb-2">
                أقصى سرعة نظرية (V0)
              </span>
              <span className="text-3xl font-black text-white">
                {fvpResults.v0.toFixed(2)}{' '}
                <span className="text-sm font-normal text-gray-500">m/s</span>
              </span>
            </div>
            <div className="bg-[#1f2937] p-5 rounded-xl border-b-4 border-emerald-500">
              <span className="block text-xs text-gray-400 mb-2">
                ذروة القدرة (Pmax)
              </span>
              <span className="text-3xl font-black text-white">
                {fvpResults.pMax.toFixed(0)}{' '}
                <span className="text-sm font-normal text-gray-500">W</span>
              </span>
            </div>
          </div>

          {/* الرسم البياني F-V */}
          <div className="bg-[#0f1423] p-6 rounded-xl border border-gray-800 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid stroke="#1f2937" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Velocity"
                  unit="m/s"
                  domain={[0, fvpResults.v0 + 0.5]}
                  stroke="#9ca3af"
                  label={{
                    value: 'السرعة (Velocity)',
                    position: 'insideBottomRight',
                    offset: -10,
                    fill: '#9ca3af',
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Force"
                  unit="N"
                  domain={[0, fvpResults.f0 + 500]}
                  stroke="#9ca3af"
                  label={{
                    value: 'القوة (Force)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#9ca3af',
                  }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    borderColor: '#374151',
                    color: '#fff',
                  }}
                />

                {/* رسم النقاط الفعلية */}
                <Scatter
                  data={fvpResults.dataPoints}
                  fill="#10b981"
                  line={{ stroke: '#3b82f6', strokeWidth: 3 }}
                />

                {/* رسم الخط الممتد (التقاطع مع المحاور) */}
                <Line
                  dataKey="y"
                  data={[
                    { x: 0, y: fvpResults.f0 },
                    { x: fvpResults.v0, y: 0 },
                  ]}
                  stroke="#3b82f6"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <button
            onClick={saveFVP}
            disabled={isSaving}
            className="w-full py-4 bg-[#1f2937] hover:bg-gray-700 text-blue-400 border border-blue-500/50 rounded-xl font-bold text-lg transition-all"
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ تقرير FVP في سجل اللاعب'}
          </button>
        </div>
      )}
    </div>
  );
}
