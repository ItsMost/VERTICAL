import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, TrendingUp, Clock, Zap, ArrowUpCircle, AlertCircle, BookOpen, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PlayerProfile({ activePlayer, playerHistory }) {
  const [showBenchmarks, setShowBenchmarks] = useState(false); // حالة إظهار جداول المعايير

  if (!activePlayer) return null;

  const latestJump = playerHistory && playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;

  // حساب العمر لتطبيق معايير الناشئين
  const currentYear = new Date().getFullYear();
  const birthYear = activePlayer.date_of_birth ? parseInt(activePlayer.date_of_birth.substring(0, 4)) : currentYear;
  const age = currentYear - birthYear;

  // === العقل المدبر للمعايير (Dynamic Benchmarking Engine) ===
  const evaluateMetric = (type, value) => {
    if (!value) return { text: 'غير متوفر', color: 'text-gray-500', bg: 'bg-gray-800', progress: 0, range: '' };

    const isFemale = activePlayer.gender === 'female';
    const isYouth = age < 17; // تحت 17 سنة بنخفف المعايير شوية
    
    // معامل تخفيف للناشئين (15% أقل من الكبار)
    const youthFactor = isYouth ? 0.85 : 1.0;

    if (type === 'jump_in') {
      // معايير الوثب بالإنش (كرة الطائرة)
      let elite = (isFemale ? 26 : 34) * youthFactor;
      let excellent = (isFemale ? 22 : 30) * youthFactor;
      let good = (isFemale ? 18 : 26) * youthFactor;
      let fair = (isFemale ? 15 : 22) * youthFactor;

      if (value < fair) return { text: 'ضعيف', color: 'text-red-500', bg: 'bg-red-500', progress: 25, range: `المعدل الجيد لل${isFemale?'بنات':'أولاد'}: +${good.toFixed(1)}"` };
      if (value < good) return { text: 'مقبول', color: 'text-orange-500', bg: 'bg-orange-500', progress: 45, range: `المعدل الجيد لل${isFemale?'بنات':'أولاد'}: +${good.toFixed(1)}"` };
      if (value < excellent) return { text: 'جيد', color: 'text-yellow-500', bg: 'bg-yellow-500', progress: 65, range: `المعدل الممتاز: +${excellent.toFixed(1)}"` };
      if (value < elite) return { text: 'ممتاز', color: 'text-emerald-500', bg: 'bg-emerald-500', progress: 85, range: `مستوى النخبة: +${elite.toFixed(1)}"` };
      return { text: 'نخبة عالمية (Elite)', color: 'text-blue-500', bg: 'bg-blue-500', progress: 100, range: `أعلى من ${elite.toFixed(1)}"` };
    }
    
    if (type === 'flight_time') {
      // زمن الطيران بيعتمد على الارتفاع، فهنطبق نفس المعاملات
      let elite = (isFemale ? 0.65 : 0.75) * youthFactor;
      let excellent = (isFemale ? 0.58 : 0.68) * youthFactor;
      let good = (isFemale ? 0.52 : 0.60) * youthFactor;
      
      if (value < good) return { text: 'ضعيف/مقبول', color: 'text-orange-500', bg: 'bg-orange-500', progress: 40, range: `الهدف: +${excellent.toFixed(2)}s` };
      if (value < excellent) return { text: 'جيد', color: 'text-yellow-500', bg: 'bg-yellow-500', progress: 65, range: `الهدف: +${excellent.toFixed(2)}s` };
      if (value < elite) return { text: 'ممتاز', color: 'text-emerald-500', bg: 'bg-emerald-500', progress: 85, range: `النخبة: +${elite.toFixed(2)}s` };
      return { text: 'طيران معلق (Elite)', color: 'text-blue-500', bg: 'bg-blue-500', progress: 100, range: `أطول من ${elite.toFixed(2)}s` };
    }

    if (type === 'relative_power') {
      // القدرة النسبية (واط لكل كيلو جرام)
      let elite = (isFemale ? 52 : 65) * youthFactor;
      let excellent = (isFemale ? 45 : 55) * youthFactor;
      let good = (isFemale ? 38 : 45) * youthFactor;

      if (value < good) return { text: 'طاقة منخفضة', color: 'text-red-500', bg: 'bg-red-500', progress: 30, range: `المعدل الجيد: +${good.toFixed(1)} W/kg` };
      if (value < excellent) return { text: 'جيد', color: 'text-yellow-500', bg: 'bg-yellow-500', progress: 60, range: `المعدل الممتاز: +${excellent.toFixed(1)} W/kg` };
      if (value < elite) return { text: 'ممتاز', color: 'text-emerald-500', bg: 'bg-emerald-500', progress: 85, range: `النخبة: +${elite.toFixed(1)} W/kg` };
      return { text: 'انفجارية استثنائية', color: 'text-blue-500', bg: 'bg-blue-500', progress: 100, range: `أعلى من ${elite.toFixed(1)} W/kg` };
    }

    return { text: '', color: '', bg: '', progress: 0, range: '' };
  };

  const chartData = playerHistory.map((jump, index) => ({
    name: `اختبار ${index + 1}`,
    heightInches: parseFloat((jump.jump_height_cm * 0.393701).toFixed(1)),
    date: new Date(jump.created_at).toLocaleDateString('ar-EG')
  }));

  const heightCm = latestJump ? parseFloat(latestJump.jump_height_cm) : 0;
  const heightInches = parseFloat((heightCm * 0.393701).toFixed(1));
  const flightTime = latestJump ? parseFloat(latestJump.flight_time_sec) : 0;
  const velocity = latestJump ? parseFloat(latestJump.takeoff_velocity_ms) : 0;
  const peakPower = latestJump ? parseFloat(latestJump.peak_power_watts) : 0;
  const relativePower = activePlayer.weight_kg > 0 ? parseFloat((peakPower / activePlayer.weight_kg).toFixed(1)) : 0;

  const evalHeight = evaluateMetric('jump_in', heightInches);
  const evalFlight = evaluateMetric('flight_time', flightTime);
  const evalPower = evaluateMetric('relative_power', relativePower);

  return (
    <div className="space-y-6 relative">
      {/* الهيدر */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[var(--bg-panel)] p-6 rounded-3xl border border-[var(--border-light)] shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-black text-[var(--text-primary)]">{activePlayer.full_name}</h2>
            {/* التاج بيظهر لو اللاعب أرقامه معدية النخبة */}
            {evalHeight.progress === 100 && <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-lg font-bold">لاعب نخبة 👑</span>}
          </div>
          <p className="text-[var(--text-secondary)]">تقرير الأداء الميكانيكي (تم ضبط المعايير لـ: {activePlayer.gender === 'female' ? 'أنثى' : 'ذكر'} | {age} سنة)</p>
          <div className="mt-3 flex gap-3 text-sm">
            <span className="bg-[var(--bg-input)] px-3 py-1 rounded-lg text-[var(--brand-text)] border border-[var(--border-color)]">الوزن: {activePlayer.weight_kg} kg</span>
            <span className="bg-[var(--bg-input)] px-3 py-1 rounded-lg text-[var(--brand-text)] border border-[var(--border-color)]">العمر: {age}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4 md:mt-0">
          <button onClick={() => setShowBenchmarks(true)} className="px-6 py-2.5 bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-[var(--border-light)]">
            <BookOpen size={18} /> عرض الجداول المعيارية
          </button>
          <button onClick={() => window.print()} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-emerald-900/20">
            <Download size={18} /> تحميل PDF
          </button>
        </div>
      </div>

      {!latestJump ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-[var(--text-secondary)] mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">لا توجد قفزات مسجلة</h3>
          <p className="text-[var(--text-secondary)] mt-2">قم بإجراء اختبار قفز لهذا اللاعب لتوليد التقرير المعياري.</p>
        </div>
      ) : (
        <>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <TrendingUp className="text-[var(--brand-main)]" /> مؤشرات القوة الانفجارية الأساسية
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* كارت الارتفاع */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[var(--bg-panel)] p-5 rounded-3xl border border-[var(--border-light)] shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20"><ArrowUpCircle size={48} className="text-[var(--brand-main)]" /></div>
              <p className="text-[var(--text-secondary)] text-sm font-bold mb-1">الوثبة الانفجارية</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-black text-[var(--text-primary)]">{heightInches}</span>
                <span className="text-[var(--text-secondary)] font-bold text-lg">Inches</span>
                <span className="text-gray-500 text-sm ml-2">({heightCm} cm)</span>
              </div>
              <p className={`text-sm font-bold ${evalHeight.color}`}>{evalHeight.text}</p>
              <div className="w-full bg-[var(--bg-input)] h-2 rounded-full mt-2 overflow-hidden">
                <div className={`h-full ${evalHeight.bg}`} style={{ width: `${evalHeight.progress}%` }}></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 font-mono">{evalHeight.range}</p>
            </motion.div>

            {/* كارت زمن الطيران */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-[var(--bg-panel)] p-5 rounded-3xl border border-[var(--border-light)] shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20"><Clock size={48} className="text-purple-500" /></div>
              <p className="text-[var(--text-secondary)] text-sm font-bold mb-1">زمن الطيران الحر</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-black text-[var(--text-primary)]">{flightTime.toFixed(3)}</span>
                <span className="text-[var(--text-secondary)] font-bold text-lg">Sec</span>
              </div>
              <p className={`text-sm font-bold ${evalFlight.color}`}>{evalFlight.text}</p>
              <div className="w-full bg-[var(--bg-input)] h-2 rounded-full mt-2 overflow-hidden">
                <div className={`h-full ${evalFlight.bg}`} style={{ width: `${evalFlight.progress}%` }}></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 font-mono">{evalFlight.range}</p>
            </motion.div>

            {/* كارت القدرة النسبية */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-[var(--bg-panel)] p-5 rounded-3xl border border-[var(--border-light)] shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20"><Zap size={48} className="text-orange-500" /></div>
              <p className="text-[var(--text-secondary)] text-sm font-bold mb-1">القدرة الانفجارية (W/kg)</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-black text-[var(--text-primary)]">{relativePower}</span>
                <span className="text-[var(--text-secondary)] font-bold text-lg">W/kg</span>
              </div>
              <p className={`text-sm font-bold ${evalPower.color}`}>{evalPower.text}</p>
              <div className="w-full bg-[var(--bg-input)] h-2 rounded-full mt-2 overflow-hidden">
                <div className={`h-full ${evalPower.bg}`} style={{ width: `${evalPower.progress}%` }}></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 font-mono">{evalPower.range}</p>
            </motion.div>
          </div>

          <div className="bg-[var(--bg-panel)] p-6 rounded-3xl border border-[var(--border-light)] shadow-lg mt-6">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">سجل التطور الزمني للارتفاع (Inches)</h3>
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickMargin={10} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} domain={['auto', 'auto']} tickFormatter={(val) => `${val}"`} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--brand-text)', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="heightInches" name="الارتفاع (Inches)" stroke="var(--brand-main)" strokeWidth={4} dot={{ fill: 'var(--brand-main)', r: 6, strokeWidth: 2, stroke: 'var(--bg-panel)' }} activeDot={{ r: 8 }} animationDuration={1500} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* نافذة المعايير العالمية (Modal) */}
      <AnimatePresence>
        {showBenchmarks && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[var(--bg-panel)] border border-[var(--border-light)] p-6 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative">
              <button onClick={() => setShowBenchmarks(false)} className="absolute top-4 right-4 p-2 bg-[var(--bg-input)] hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
              
              <div className="text-center mb-6">
                <BookOpen size={40} className="mx-auto text-[var(--brand-main)] mb-2" />
                <h2 className="text-2xl font-black text-white">الجداول المعيارية لكرة الطائرة</h2>
                <p className="text-gray-400 text-sm">مستندة إلى بيانات NCAA والمنتخبات العالمية</p>
              </div>

              <div className="space-y-6">
                {/* جدول الأولاد */}
                <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-color)]">
                  <h3 className="text-lg font-bold text-blue-400 mb-3 border-b border-[var(--border-color)] pb-2">معايير الرجال (18+ سنة)</h3>
                  <div className="grid grid-cols-5 text-center text-xs font-bold text-gray-400 mb-2">
                    <div>التقييم</div><div>الإنش (")</div><div>الطيران (s)</div><div>القدرة (W/kg)</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-5 text-center items-center bg-[#0b0f19] p-2 rounded-lg border border-blue-900"><span className="text-blue-500 font-bold">نخبة عالمية</span><span>34"+</span><span>0.75+</span><span>65+</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-[#0b0f19] p-2 rounded-lg border border-emerald-900"><span className="text-emerald-500 font-bold">ممتاز</span><span>30" - 33.9"</span><span>0.68+</span><span>55+</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-[#0b0f19] p-2 rounded-lg border border-yellow-900"><span className="text-yellow-500 font-bold">جيد</span><span>26" - 29.9"</span><span>0.60+</span><span>45+</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-[#0b0f19] p-2 rounded-lg border border-orange-900"><span className="text-orange-500 font-bold">مقبول</span><span>22" - 25.9"</span><span>0.55+</span><span>38+</span></div>
                  </div>
                </div>

                {/* جدول البنات */}
                <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-color)]">
                  <h3 className="text-lg font-bold text-pink-400 mb-3 border-b border-[var(--border-color)] pb-2">معايير السيدات (18+ سنة)</h3>
                  <div className="grid grid-cols-5 text-center text-xs font-bold text-gray-400 mb-2">
                    <div>التقييم</div><div>الإنش (")</div><div>الطيران (s)</div><div>القدرة (W/kg)</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-5 text-center items-center bg-[#0b0f19] p-2 rounded-lg border border-blue-900"><span className="text-blue-500 font-bold">نخبة عالمية</span><span>26"+</span><span>0.65+</span><span>52+</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-[#0b0f19] p-2 rounded-lg border border-emerald-900"><span className="text-emerald-500 font-bold">ممتاز</span><span>22" - 25.9"</span><span>0.58+</span><span>45+</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-[#0b0f19] p-2 rounded-lg border border-yellow-900"><span className="text-yellow-500 font-bold">جيد</span><span>18" - 21.9"</span><span>0.52+</span><span>38+</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-[#0b0f19] p-2 rounded-lg border border-orange-900"><span className="text-orange-500 font-bold">مقبول</span><span>15" - 17.9"</span><span>0.48+</span><span>32+</span></div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-2xl">
                  <p className="text-sm text-blue-300 font-bold">⚠️ ملاحظة للمراحل السنية (تحت 17 سنة):</p>
                  <p className="text-xs text-gray-400 mt-1">يقوم النظام أوتوماتيكياً بتخفيض المعايير المذكورة أعلاه بنسبة 15% لتتناسب مع التطور البدني للناشئين والناشئات.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}