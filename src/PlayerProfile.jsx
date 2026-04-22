import React, { useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function PlayerProfile({ activePlayer, playerHistory }) {
  const reportRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!activePlayer || playerHistory.length === 0) {
    return (
      <div className="bg-[#111827] p-12 rounded-2xl text-center border border-gray-800 animate-fade-in">
        <span className="text-5xl mb-4 block">📉</span>
        <h3 className="text-xl font-bold text-gray-300">
          لا يوجد بيانات كافية للتحليل
        </h3>
        <p className="text-gray-500 mt-2">
          قم بإجراء اختبار قفز وحفظه ليظهر تقرير اللاعب هنا.
        </p>
      </div>
    );
  }

  const getPlayerAge = (dobString) => {
    if (!dobString) return 0;
    return new Date().getFullYear() - new Date(dobString).getFullYear();
  };
  const playerAge = getPlayerAge(activePlayer.date_of_birth);

  // === الدالة المحدثة لطباعة التقرير بالكامل بدون قص ===
  const handleDownloadPDF = async () => {
    const reportElement = reportRef.current;
    if (!reportElement) return;

    setIsGeneratingPDF(true);

    try {
      // 1. تصوير الشاشة بجودة عالية
      const dataUrl = await toPng(reportElement, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0b0f19',
        style: {
          direction: 'rtl',
        },
      });

      // 2. حساب أبعاد الصورة الناتجة
      const tempPdf = new jsPDF();
      const imgProps = tempPdf.getImageProperties(dataUrl);

      // 3. السر هنا: جعل حجم الـ PDF مطابق تماماً لطول التقرير
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [imgProps.width, imgProps.height],
      });

      // 4. وضع الصورة بحجمها الكامل داخل الـ PDF
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgProps.width, imgProps.height);

      const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
      pdf.save(
        `تقرير_${activePlayer.full_name.replace(/\s+/g, '_')}_${today}.pdf`
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء التقرير.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getMetricEvaluation = (metric, value, gender, age) => {
    const isAdult = age >= 16;
    const genderMod = gender === 'female' ? 0.75 : 1.0;
    const ageMod = isAdult ? 1.0 : 0.85;
    const mod = genderMod * ageMod;

    let targetMin, targetMax, maxScale, unit;
    if (metric === 'height') {
      targetMin = 45 * mod;
      targetMax = 60 * mod;
      maxScale = 80 * mod;
      unit = 'cm';
    } else if (metric === 'velocity') {
      targetMin = 2.6 * mod;
      targetMax = 3.1 * mod;
      maxScale = 4.0 * mod;
      unit = 'm/s';
    } else if (metric === 'power') {
      targetMin = 45 * mod;
      targetMax = 60 * mod;
      maxScale = 85 * mod;
      unit = 'W/kg';
    }

    let status, color, barColor;
    if (value < targetMin * 0.8) {
      status = 'ضعيف (خطر)';
      color = 'text-red-400';
      barColor = 'bg-red-500';
    } else if (value < targetMin) {
      status = 'تحت المعدل';
      color = 'text-yellow-400';
      barColor = 'bg-yellow-500';
    } else if (value <= targetMax) {
      status = 'مثالي';
      color = 'text-emerald-400';
      barColor = 'bg-emerald-500';
    } else {
      status = 'نخبة (Elite)';
      color = 'text-blue-400';
      barColor = 'bg-blue-500';
    }

    const percentage = Math.min((value / maxScale) * 100, 100);
    return {
      targetMin: targetMin.toFixed(1),
      targetMax: targetMax.toFixed(1),
      status,
      color,
      barColor,
      percentage,
      unit,
    };
  };

  const InBodyMetricBar = ({ label, value, metricType }) => {
    const evalData = getMetricEvaluation(
      metricType,
      parseFloat(value),
      activePlayer.gender,
      playerAge
    );
    return (
      <div className="bg-[#1f2937] p-5 rounded-xl border border-gray-700/50 mb-4 relative overflow-hidden">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-gray-400 text-sm font-semibold">{label}</p>
            <p className="text-3xl font-black text-white">
              {value}{' '}
              <span className="text-sm font-normal text-gray-500">
                {evalData.unit}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold ${evalData.color}`}>
              {evalData.status}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              المعدل: {evalData.targetMin} - {evalData.targetMax}
            </p>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded-full mt-4 relative">
          <div
            className="absolute top-0 bottom-0 bg-gray-600/30 border-x border-gray-500"
            style={{
              left: `${
                (evalData.targetMin / (evalData.targetMax * 1.5)) * 100
              }%`,
              width: `${
                ((evalData.targetMax - evalData.targetMin) /
                  (evalData.targetMax * 1.5)) *
                100
              }%`,
            }}
          ></div>
          <div
            className={`h-full rounded-full transition-all duration-1000 ${evalData.barColor}`}
            style={{ width: `${evalData.percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const standardJumps = playerHistory.filter((j) => j.test_type !== 'rsi');
  const rsiJumps = playerHistory.filter((j) => j.test_type === 'rsi');

  const bothJumps = standardJumps.filter(
    (j) => j.leg_used === 'both' || !j.leg_used
  );
  const rightJumps = standardJumps.filter((j) => j.leg_used === 'right');
  const leftJumps = standardJumps.filter((j) => j.leg_used === 'left');

  const bestJump =
    bothJumps.length > 0
      ? bothJumps.reduce((max, jump) =>
          parseFloat(max.jump_height_cm) > parseFloat(jump.jump_height_cm)
            ? max
            : jump
        )
      : null;
  const bestRight =
    rightJumps.length > 0
      ? Math.max(...rightJumps.map((j) => parseFloat(j.jump_height_cm)))
      : 0;
  const bestLeft =
    leftJumps.length > 0
      ? Math.max(...leftJumps.map((j) => parseFloat(j.jump_height_cm)))
      : 0;
  const bestRSI =
    rsiJumps.length > 0
      ? Math.max(...rsiJumps.map((j) => parseFloat(j.rsi_score)))
      : 0;

  let asymmetryIndex = 0;
  if (bestRight > 0 && bestLeft > 0) {
    asymmetryIndex =
      (Math.abs(bestRight - bestLeft) / Math.max(bestRight, bestLeft)) * 100;
  }

  const chartData = bothJumps.map((jump, index) => ({
    name: `Test ${index + 1}`,
    height: parseFloat(jump.jump_height_cm),
    date: new Date(jump.created_at).toLocaleDateString('ar-EG'),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* زر طباعة التقرير */}
      {bestJump && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
          >
            {isGeneratingPDF ? (
              'جاري تحضير التقرير...'
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                تحميل التقرير (PDF)
              </>
            )}
          </button>
        </div>
      )}

      {/* الـ Container اللي هيتم تصويره وتحويله لـ PDF */}
      <div
        ref={reportRef}
        className="space-y-6 p-4 rounded-2xl bg-[#0b0f19] text-right"
        dir="rtl"
      >
        {/* عنوان التقرير */}
        <div
          className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl flex justify-between items-center"
          dir="rtl"
        >
          <div>
            <h2 className="text-2xl font-black text-white">
              {activePlayer.full_name}
            </h2>
            <p className="text-gray-400 mt-1">تقرير الأداء الميكانيكي الشامل</p>
          </div>
          <div className="text-left">
            <p className="text-blue-400 font-bold">
              العمر: {playerAge} | الوزن: {activePlayer.weight_kg}kg
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>
        </div>

        {/* 1. التقرير الشامل */}
        {bestJump && (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-200 mb-6 border-b border-gray-800 pb-4">
              مؤشرات القوة الانفجارية الأساسية
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <InBodyMetricBar
                  label="ارتفاع الوثبة الانفجارية"
                  value={bestJump.jump_height_cm}
                  metricType="height"
                />
                <InBodyMetricBar
                  label="سرعة الانطلاق"
                  value={bestJump.takeoff_velocity_ms}
                  metricType="velocity"
                />
                <InBodyMetricBar
                  label="القوة النسبية"
                  value={(
                    bestJump.mean_power_watts / activePlayer.weight_kg
                  ).toFixed(1)}
                  metricType="power"
                />
              </div>

              <div className="flex flex-col gap-4">
                {bestRSI > 0 && (
                  <div className="bg-gradient-to-br from-[#1f2937] to-orange-900/20 border border-orange-500/30 rounded-xl p-5 text-center">
                    <p className="text-orange-400 text-sm font-bold mb-1">
                      أعلى مؤشر قوة تفاعلية (RSI)
                    </p>
                    <p className="text-4xl font-black text-white">
                      {bestRSI.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      يقيس كفاءة الأوتار (Stiffness)
                    </p>
                  </div>
                )}

                <div className="bg-[#0f1423] border border-gray-800 rounded-xl p-5 flex-1">
                  <h4 className="text-gray-400 font-semibold mb-4 text-sm">
                    سجل آخر الاختبارات (القدمين)
                  </h4>
                  <div className="space-y-3 overflow-y-auto max-h-48 pr-2">
                    {bothJumps
                      .slice()
                      .reverse()
                      .map((h, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center bg-[#1f2937] p-3 rounded-xl border border-gray-700/50"
                        >
                          <div>
                            <span className="text-gray-400 text-xs block">
                              {new Date(h.created_at).toLocaleDateString(
                                'ar-EG'
                              )}
                            </span>
                            <span className="text-white font-bold">
                              {h.jump_height_cm} cm
                            </span>
                          </div>
                          <span className="text-emerald-400 text-sm font-mono">
                            {h.takeoff_velocity_ms} m/s
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. اختبار عدم التوازن */}
        {bestJump && (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-200 mb-2">
              اختبار التوازن العضلي (Asymmetry Test)
            </h3>
            <p className="text-sm text-gray-500 mb-6 border-b border-gray-800 pb-4">
              يقيس الفروق بين القدم اليمنى واليسرى لتحديد خطر الإصابة.
            </p>

            {bestRight === 0 || bestLeft === 0 ? (
              <div className="bg-[#1f2937] p-4 rounded-xl text-center border border-gray-700 border-dashed">
                <p className="text-gray-400 text-sm">
                  قم بإجراء اختبار قفز بقدم واحدة (يمين) واختبار آخر (يسار)
                  ليظهر التقرير.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1f2937] p-5 rounded-xl text-center border-r-4 border-blue-500 shadow-md">
                  <p className="text-gray-400 text-sm mb-1">
                    القدم اليمنى (Right)
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {bestRight.toFixed(1)} cm
                  </p>
                </div>

                <div
                  className={`p-5 rounded-xl text-center border shadow-md ${
                    asymmetryIndex > 10
                      ? 'bg-red-900/20 border-red-500'
                      : 'bg-emerald-900/20 border-emerald-500'
                  }`}
                >
                  <p className="text-gray-300 text-sm mb-1">
                    مؤشر العجز (Asymmetry)
                  </p>
                  <p
                    className={`text-4xl font-black ${
                      asymmetryIndex > 10 ? 'text-red-500' : 'text-emerald-500'
                    }`}
                  >
                    {asymmetryIndex.toFixed(1)}%
                  </p>
                  <p className="text-xs mt-2 font-bold">
                    {asymmetryIndex > 10
                      ? '⚠️ خطر إصابة مرتفع (عدم توازن)'
                      : '✅ توازن عضلي ممتاز'}
                  </p>
                </div>

                <div className="bg-[#1f2937] p-5 rounded-xl text-center border-l-4 border-purple-500 shadow-md">
                  <p className="text-gray-400 text-sm mb-1">
                    القدم اليسرى (Left)
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {bestLeft.toFixed(1)} cm
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. الرسم البياني */}
        {bothJumps.length > 0 && (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-200 mb-6">
              منحنى التطور (القفزة العادية)
            </h3>
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                >
                  <Line
                    type="monotone"
                    dataKey="height"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    dot={{
                      r: 6,
                      fill: '#1e3a8a',
                      stroke: '#3b82f6',
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 8 }}
                  />
                  <CartesianGrid stroke="#1f2937" strokeDasharray="5 5" />
                  <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af' }}
                  />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      borderColor: '#374151',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
