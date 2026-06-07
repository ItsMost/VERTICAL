import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, TrendingUp, Clock, Zap, ArrowUpCircle, AlertCircle, BookOpen, X, ShieldAlert, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PlayerProfile({ activePlayer, playerHistory }) {
  const [showBenchmarks, setShowBenchmarks] = useState(false);

  if (!activePlayer) return null;

  const latestJump = playerHistory && playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;

  // Age calculation
  const currentYear = new Date().getFullYear();
  const birthYear = activePlayer.date_of_birth ? parseInt(activePlayer.date_of_birth.substring(0, 4)) : currentYear;
  const age = currentYear - birthYear;

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

      if (value < fair) return { text: 'تحت المتوسط', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-500', progress: 25, range: `المعدل الجيد: +${good.toFixed(1)}"` };
      if (value < good) return { text: 'مقبول', color: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-cyan-500', progress: 45, range: `المعدل الجيد: +${good.toFixed(1)}"` };
      if (value < excellent) return { text: 'جيد', color: 'text-teal-500 dark:text-teal-400', bg: 'bg-amber-500', progress: 65, range: `الممتاز: +${excellent.toFixed(1)}"` };
      if (value < elite) return { text: 'ممتاز', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500', progress: 85, range: `النخبة: +${elite.toFixed(1)}"` };
      return { text: 'نخبة عالمية (Elite) 👑', color: 'text-cyan-500', bg: 'bg-cyan-500', progress: 100, range: `أعلى من ${elite.toFixed(1)}"` };
    }
    
    if (type === 'flight_time') {
      let elite = (isFemale ? 0.65 : 0.75) * youthFactor;
      let excellent = (isFemale ? 0.58 : 0.68) * youthFactor;
      let good = (isFemale ? 0.52 : 0.60) * youthFactor;
      
      if (value < good) return { text: 'تلامس ثقيل', color: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-cyan-500', progress: 40, range: `الهدف: +${excellent.toFixed(2)}s` };
      if (value < excellent) return { text: 'جيد', color: 'text-teal-500 dark:text-teal-400', bg: 'bg-amber-500', progress: 65, range: `الهدف: +${excellent.toFixed(2)}s` };
      if (value < elite) return { text: 'ممتاز', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500', progress: 85, range: `النخبة: +${elite.toFixed(2)}s` };
      return { text: 'تحليق استثنائي (Elite)', color: 'text-cyan-500', bg: 'bg-cyan-500', progress: 100, range: `أطول من ${elite.toFixed(2)}s` };
    }

    if (type === 'relative_power') {
      let elite = (isFemale ? 52 : 65) * youthFactor;
      let excellent = (isFemale ? 45 : 55) * youthFactor;
      let good = (isFemale ? 38 : 45) * youthFactor;

      if (value < good) return { text: 'قدرة منخفضة', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-500', progress: 30, range: `المعدل الجيد: +${good.toFixed(1)} W/kg` };
      if (value < excellent) return { text: 'جيد', color: 'text-teal-500 dark:text-teal-400', bg: 'bg-amber-500', progress: 60, range: `المعدل الممتاز: +${excellent.toFixed(1)} W/kg` };
      if (value < elite) return { text: 'ممتاز', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500', progress: 85, range: `النخبة: +${elite.toFixed(1)} W/kg` };
      return { text: 'انفجارية خارقة', color: 'text-cyan-500', bg: 'bg-cyan-500', progress: 100, range: `أعلى من ${elite.toFixed(1)} W/kg` };
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

  // Recalculating Precise Sayers / Harman equations dynamically for comparison in profile
  const mass = activePlayer.weight_kg;
  const sayersPeak = 60.7 * heightCm + 45.3 * mass - 2055;
  const harmanPeak = 61.9 * heightCm + 36.0 * mass - 1822;
  const harmanMean = 21.2 * heightCm + 23.0 * mass - 1393;
  const maxRsi = playerHistory ? playerHistory.reduce((max, j) => {
    const val = parseFloat(j.rsi_score) || 0;
    return val > max ? val : max;
  }, 0) : 0;

  return (
    <div className="space-y-6 relative text-right" style={{ direction: "rtl" }}>
      {/* Header Panel */}
      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-all duration-300">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="text-3xl font-black text-[var(--text-primary)]">{activePlayer.full_name}</h2>
            {evalHeight.progress === 100 && (
              <span className="bg-cyan-600/30 text-cyan-400 border border-cyan-500/50 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                <Award size={14} /> لاعب نخبة (Elite Athlete)
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            تقرير الأداء والميكانيكا الحيوية (المعايير مفصلة لـ: {activePlayer.gender === 'female' ? 'سيدات' : 'رجال'} | {age} سنة)
          </p>
          <div className="mt-3 flex gap-3 text-sm">
            <span className="bg-[var(--bg-input)] px-3 py-1.5 rounded-xl text-[var(--brand-text)] border border-[var(--border-light)] font-bold">الوزن: {activePlayer.weight_kg} kg</span>
            <span className="bg-[var(--bg-input)] px-3 py-1.5 rounded-xl text-[var(--brand-text)] border border-[var(--border-light)] font-bold">العمر: {age} سنوات</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0 w-full md:w-auto justify-end">
          <button onClick={() => setShowBenchmarks(true)} className="px-5 py-2.5 bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-[var(--border-light)] text-sm">
            <BookOpen size={16} /> الجداول المعيارية
          </button>
          <button onClick={() => window.print()} className="px-5 py-2.5 btn-orange-gradient rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-105 text-sm">
            <Download size={16} /> تصدير تقرير PDF
          </button>
        </div>
      </div>

      {!latestJump ? (
        <div className="glass-panel p-12 text-center border border-[var(--border-light)]">
          <AlertCircle size={48} className="mx-auto text-gray-500 mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-[var(--text-primary)]">لا توجد قفزات مسجلة حتى الآن</h3>
          <p className="text-gray-400 mt-2 text-sm">قم بإجراء اختبارات للقفز أو مؤشر RSI لتوليد التقارير الميكانيكية المعيارية للاعب.</p>
        </div>
      ) : (
        <>
          <h3 className="text-2xl font-black text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <TrendingUp className="text-[var(--brand-main)]" /> مؤشرات القدرة الميكانيكية الأساسية
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Height Card */}
            <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 p-4 opacity-10"><ArrowUpCircle size={48} className="text-[var(--brand-main)]" /></div>
              <p className="text-gray-400 text-xs font-bold mb-1">الوثبة الانفجارية القصوى</p>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl font-black text-[var(--text-primary)] font-mono">{heightInches}</span>
                <span className="text-gray-400 font-bold text-sm">إنش</span>
                <span className="text-gray-500 text-xs font-mono mr-2">({heightCm} cm)</span>
              </div>
              <p className={`text-xs font-bold ${evalHeight.color}`}>{evalHeight.text}</p>
              <div className="w-full bg-[var(--bg-input)] h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: `${evalHeight.progress}%` }}></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 font-mono">{evalHeight.range}</p>
            </motion.div>

            {/* Flight Time Card */}
            <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 p-4 opacity-10"><Clock size={48} className="text-teal-500" /></div>
              <p className="text-gray-400 text-xs font-bold mb-1">زمن الطيران المعلق</p>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl font-black text-[var(--text-primary)] font-mono">{flightTime.toFixed(3)}</span>
                <span className="text-gray-400 font-bold text-sm">ثانية</span>
              </div>
              <p className={`text-xs font-bold ${evalFlight.color}`}>{evalFlight.text}</p>
              <div className="w-full bg-[var(--bg-input)] h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500" style={{ width: `${evalFlight.progress}%` }}></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 font-mono">{evalFlight.range}</p>
            </motion.div>

            {/* Power Density Card */}
            <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 p-4 opacity-10"><Zap size={48} className="text-cyan-500" /></div>
              <p className="text-gray-400 text-xs font-bold mb-1">كثافة القدرة الميكانيكية</p>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl font-black text-[var(--text-primary)] font-mono">{relativePower > 0 ? relativePower : (harmanPeak / mass).toFixed(1)}</span>
                <span className="text-gray-400 font-bold text-sm">W/kg</span>
              </div>
              <p className={`text-xs font-bold ${evalPower.color}`}>{evalPower.text}</p>
              <div className="w-full bg-[var(--bg-input)] h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400" style={{ width: `${evalPower.progress}%` }}></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 font-mono">{evalPower.range}</p>
            </motion.div>
          </div>

          {/* Biomechanical Power Equations Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            <div className="glass-panel p-5 shadow-lg">
              <h4 className="text-lg font-black text-white mb-4 border-b border-[var(--border-light)] pb-2 flex items-center gap-1.5">
                <Zap size={18} className="text-cyan-500" /> تقديرات القدرة الانفجارية (Explosive Power Models)
              </h4>
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between items-center bg-black/10 p-3 rounded-xl border border-[var(--border-light)]">
                  <span className="font-bold text-gray-400">Sayers Peak Power (القدرة القصوى)</span>
                  <span className="font-mono font-black text-white text-base">{sayersPeak > 0 ? sayersPeak.toFixed(0) : '0'} <span className="text-xs text-gray-500 font-normal">Watt</span></span>
                </div>
                <div className="flex justify-between items-center bg-black/10 p-3 rounded-xl border border-[var(--border-light)]">
                  <span className="font-bold text-gray-400">Harman Peak Power (القدرة القصوى)</span>
                  <span className="font-mono font-black text-white text-base">{harmanPeak > 0 ? harmanPeak.toFixed(0) : '0'} <span className="text-xs text-gray-500 font-normal">Watt</span></span>
                </div>
                <div className="flex justify-between items-center bg-black/10 p-3 rounded-xl border border-[var(--border-light)]">
                  <span className="font-bold text-gray-400">Harman Mean Power (القدرة المتوسطة)</span>
                  <span className="font-mono font-black text-white text-base">{harmanMean > 0 ? harmanMean.toFixed(0) : '0'} <span className="text-xs text-gray-500 font-normal">Watt</span></span>
                </div>
                <div className="flex justify-between items-center bg-black/10 p-3 rounded-xl border border-[var(--border-light)]">
                  <span className="font-bold text-gray-400">سرعة الانطلاق عند الإقلاع (Takeoff V)</span>
                  <span className="font-mono font-black text-cyan-400 text-base">{velocity > 0 ? velocity.toFixed(2) : Math.sqrt(2 * 9.81 * (heightCm/100)).toFixed(2)} <span className="text-xs text-gray-500 font-normal">m/s</span></span>
                </div>
              </div>
            </div>

            {/* Performance History Chart */}
            <div className="glass-panel p-5 shadow-lg flex flex-col justify-between">
              <h4 className="text-lg font-black text-white mb-4 border-b border-[var(--border-light)] pb-2 flex items-center gap-1.5">
                <TrendingUp size={18} className="text-cyan-500" /> منحنى التقدم في قفزات اللاعب (cm)
              </h4>
              <div className="h-48 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.15} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickMargin={5} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} domain={['auto', 'auto']} tickFormatter={(val) => `${val}`} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--brand-main)', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="heightCm" name="الارتفاع (Cm)" stroke="var(--brand-main)" strokeWidth={3.5} dot={{ fill: 'var(--brand-main)', r: 5, strokeWidth: 2, stroke: 'var(--bg-base)' }} activeDot={{ r: 7 }} animationDuration={1000} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sport Performance Critique Box in Arabic */}
          <div className="glass-panel p-5 shadow-lg mt-6 text-right">
            <h4 className="text-lg font-black text-white mb-4 border-b border-[var(--border-light)] pb-2 flex items-center gap-1.5 justify-start" style={{ direction: 'rtl' }}>
              🔬 التقييم البيوميكانيكي ونقاط التطوير (Performance Critique)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ direction: 'rtl' }}>
              <div className="bg-emerald-950/15 border border-emerald-500/20 p-4 rounded-2xl">
                <h5 className="font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                  🌟 ما يميز اللاعب (Strengths)
                </h5>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {((relativePower || (harmanPeak / mass)) >= 50) 
                    ? "يتميز اللاعب بمعدلات قدرة انفجارية ممتازة ونسب قوة إلى الوزن مرتفعة، مما يمنحه أفضلية في الانطلاق السريع والقفز العمودي." 
                    : "يمتلك اللاعب أساس حركي مستقر وثبات جيد أثناء المراحل التحضيرية للقفز."}
                  {" "}
                  {maxRsi >= 2.2 
                    ? "كما يظهر التحليل مرونة تفاعلية ممتازة وصلابة جيدة في مفصل الكاحل (Reactive Strength Index)، مما يقلل من زمن التلامس مع الأرض ويزيد من كفاءة الارتداد." 
                    : "التحكم الحركي والتوازن العام أثناء الهبوط ضمن المعدلات الآمنة."}
                </p>
              </div>
              <div className="bg-amber-950/15 border border-amber-500/20 p-4 rounded-2xl">
                <h5 className="font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                  ⚡ نقاط التطوير البدني (Gaps)
                </h5>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {((relativePower || (harmanPeak / mass)) < 50) 
                    ? "يوصى بالتركيز على زيادة القوة القصوى للأطراف السفلية عبر تدريبات المقاومة الثقيلة (مثل Squats و Deadlifts) لتحسين كثافة القدرة الإجمالية." 
                    : "لتحسين الأداء بشكل أكبر، يوصى بدمج تدريبات القوة البالستية للحفاظ على مستويات القدرة العالية."}
                  {" "}
                  {maxRsi < 2.0 
                    ? "يجب العمل على تحسين الصلابة التفاعلية (Reactive Stiffness) وتقليل زمن التلامس بالأرض باستخدام تمارين الارتداد السريع (Pogo Jumps و Depth Jumps من ارتفاعات متدرجة)." 
                    : "ينصح بالتركيز على التكنيك الحركي للذراعين لزيادة زمن الطيران ونقل الزخم الزاوي بشكل أكثر كفاءة."}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed jump history log */}
          <div className="glass-panel p-5 shadow-lg mt-6 overflow-hidden">
             <h4 className="text-lg font-black text-white mb-4 border-b border-[var(--border-light)] pb-2">سجل القياسات التفصيلية للاعب</h4>
             <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                   <thead>
                      <tr className="border-b border-[var(--border-light)] text-gray-400 font-bold">
                         <th className="pb-3 text-right">التاريخ</th>
                         <th className="pb-3 text-center">النوع</th>
                         <th className="pb-3 text-center">الارتفاع (cm)</th>
                         <th className="pb-3 text-center">زمن الطيران (s)</th>
                         <th className="pb-3 text-center">زمن التلامس (s)</th>
                         <th className="pb-3 text-center">القدرة (W)</th>
                         <th className="pb-3 text-center">مؤشر RSI</th>
                      </tr>
                   </thead>
                   <tbody>
                      {playerHistory.slice().reverse().map((jump) => (
                         <tr key={jump.id} className="border-b border-[var(--border-light)]/50 hover:bg-black/10 transition-colors">
                            <td className="py-3 font-mono text-gray-400">{new Date(jump.created_at).toLocaleDateString('ar-EG')}</td>
                            <td className="py-3 text-center font-bold text-[var(--brand-text)]">{jump.test_type === 'rsi' ? 'Drop Jump' : 'Standard'}</td>
                            <td className="py-3 text-center font-mono font-bold text-white">{parseFloat(jump.jump_height_cm).toFixed(1)}</td>
                            <td className="py-3 text-center font-mono text-gray-300">{parseFloat(jump.flight_time_sec).toFixed(3)}</td>
                            <td className="py-3 text-center font-mono text-gray-300">{jump.contact_time_sec ? parseFloat(jump.contact_time_sec).toFixed(3) : '-'}</td>
                            <td className="py-3 text-center font-mono text-gray-300">{jump.peak_power_watts && parseFloat(jump.peak_power_watts) > 0 ? parseFloat(jump.peak_power_watts).toFixed(0) : '-'}</td>
                            <td className="py-3 text-center font-mono font-bold text-cyan-400">{jump.rsi_score ? parseFloat(jump.rsi_score).toFixed(2) : '-'}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </>
      )}

      {/* Benchmarks Modal */}
      <AnimatePresence>
        {showBenchmarks && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.93, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 15 }} className="glass-panel p-6 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative text-right">
              <button onClick={() => setShowBenchmarks(false)} className="absolute top-4 right-4 p-2 bg-[var(--bg-input)] hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
              
              <div className="text-center mb-6">
                <BookOpen size={40} className="mx-auto text-[var(--brand-main)] mb-2" />
                <h2 className="text-2xl font-black text-white">الجداول المعيارية للأداء الرياضي</h2>
                <p className="text-gray-400 text-sm">مستندة لبيانات الميكانيكا الحيوية الرياضية للشباب والكبار</p>
              </div>

              <div className="space-y-6">
                {/* Men Table */}
                <div className="bg-black/20 p-4 rounded-2xl border border-[var(--border-light)]">
                  <h3 className="text-lg font-bold text-cyan-400 mb-3 border-b border-[var(--border-light)] pb-2">معايير الرجال (18+ سنة)</h3>
                  <div className="grid grid-cols-4 text-center text-xs font-bold text-gray-400 mb-2">
                    <div>التقييم</div><div>الارتفاع (cm)</div><div>الطيران (s)</div><div>القدرة (W/kg)</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-4 text-center items-center bg-cyan-950/20 p-2 rounded-xl border border-cyan-500/30"><span className="text-cyan-400 font-bold">نخبة عالمية</span><span>85+</span><span>0.75+</span><span>65+</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-[var(--border-light)]"><span className="text-teal-500 font-bold">ممتاز</span><span>76 - 84</span><span>0.68 - 0.74</span><span>55 - 64</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-[var(--border-light)]"><span className="text-teal-400 font-bold">جيد</span><span>66 - 75</span><span>0.60 - 0.67</span><span>45 - 54</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-[var(--border-light)]"><span className="text-gray-400 font-bold">مقبول</span><span>55 - 65</span><span>0.55 - 0.59</span><span>38 - 44</span></div>
                  </div>
                </div>

                {/* Women Table */}
                <div className="bg-black/20 p-4 rounded-2xl border border-[var(--border-light)]">
                  <h3 className="text-lg font-bold text-cyan-400 mb-3 border-b border-[var(--border-light)] pb-2">معايير السيدات (18+ سنة)</h3>
                  <div className="grid grid-cols-4 text-center text-xs font-bold text-gray-400 mb-2">
                    <div>التقييم</div><div>الارتفاع (cm)</div><div>الطيران (s)</div><div>القدرة (W/kg)</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-4 text-center items-center bg-cyan-950/20 p-2 rounded-xl border border-cyan-500/30"><span className="text-cyan-400 font-bold">نخبة عالمية</span><span>66+</span><span>0.65+</span><span>52+</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-[var(--border-light)]"><span className="text-teal-500 font-bold">ممتاز</span><span>56 - 65</span><span>0.58 - 0.64</span><span>45 - 51</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-[var(--border-light)]"><span className="text-teal-400 font-bold">جيد</span><span>46 - 55</span><span>0.52 - 0.57</span><span>38 - 44</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-[var(--border-light)]"><span className="text-gray-400 font-bold">مقبول</span><span>38 - 45</span><span>0.48 - 0.51</span><span>32 - 37</span></div>
                  </div>
                </div>

                {/* Egyptian & Regional Club Benchmarks */}
                <div className="bg-black/20 p-4 rounded-2xl border border-orange-500/30">
                  <h3 className="text-lg font-bold text-orange-400 mb-3 border-b border-orange-500/20 pb-2">🏐 معايير الأندية المصرية - الكرة الطائرة (Volleyball)</h3>
                  <div className="grid grid-cols-5 text-center text-xs font-bold text-gray-400 mb-2">
                    <div>النادي</div><div>نخبة (Elite)</div><div>ممتاز</div><div>جيد</div><div>مقبول</div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="grid grid-cols-5 text-center items-center bg-red-950/15 p-2 rounded-xl border border-red-500/20"><span className="text-red-400 font-bold">الأهلي</span><span>+34" (86+)</span><span>30"-33"</span><span>26"-29"</span><span>22"-25"</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-white/[0.02] p-2 rounded-xl border border-gray-700"><span className="text-white font-bold">الزمالك</span><span>+34" (86+)</span><span>30"-33"</span><span>26"-29"</span><span>22"-25"</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-blue-950/15 p-2 rounded-xl border border-blue-500/20"><span className="text-blue-400 font-bold">سموحة</span><span>+32" (81+)</span><span>28"-31"</span><span>24"-27"</span><span>20"-23"</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-yellow-950/15 p-2 rounded-xl border border-yellow-500/20"><span className="text-yellow-400 font-bold">سبورتنج</span><span>+32" (81+)</span><span>28"-31"</span><span>24"-27"</span><span>20"-23"</span></div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 text-center">* معايير السيدات (18+): نخبة: +26" (66+) | ممتاز: 22"-25" | جيد: 18"-21"</p>
                </div>

                {/* National Teams & Track/Field */}
                <div className="bg-black/20 p-4 rounded-2xl border border-emerald-500/30">
                  <h3 className="text-lg font-bold text-emerald-400 mb-3 border-b border-emerald-500/20 pb-2">🏃 المنتخبات الوطنية - ألعاب القوى والكرة الطائرة (National Teams)</h3>
                  <div className="grid grid-cols-4 text-center text-xs font-bold text-gray-400 mb-2">
                    <div>الفئة</div><div>نخبة (Elite)</div><div>ممتاز</div><div>جيد</div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="grid grid-cols-4 text-center items-center bg-emerald-950/15 p-2 rounded-xl border border-emerald-500/20"><span className="text-emerald-400 font-bold">منتخب طائرة رجال</span><span>+36" (91+)</span><span>32"-35"</span><span>28"-31"</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-emerald-950/10 p-2 rounded-xl border border-emerald-500/15"><span className="text-emerald-300 font-bold">منتخب طائرة سيدات</span><span>+28" (71+)</span><span>24"-27"</span><span>20"-23"</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-purple-950/15 p-2 rounded-xl border border-purple-500/20"><span className="text-purple-400 font-bold">ألعاب قوى - وثب</span><span>+38" (96+)</span><span>34"-37"</span><span>30"-33"</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-purple-950/10 p-2 rounded-xl border border-purple-500/15"><span className="text-purple-300 font-bold">ألعاب قوى - عدو</span><span>+34" (86+)</span><span>30"-33"</span><span>26"-29"</span></div>
                  </div>
                </div>

                {/* RSI Benchmarks */}
                <div className="bg-black/20 p-4 rounded-2xl border border-cyan-500/30">
                  <h3 className="text-lg font-bold text-cyan-400 mb-3 border-b border-cyan-500/20 pb-2">⚡ معايير مؤشر القوة التفاعلية (RSI Benchmarks)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CMJ/Standard RSI */}
                    <div>
                      <p className="text-xs text-gray-400 font-bold mb-2">RSI - القفز المضاد للحركة (CMJ):</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center bg-cyan-950/20 p-2.5 rounded-xl border border-cyan-500/25"><span className="text-cyan-400 font-bold">نخبة (Elite)</span><span className="font-mono text-white">&gt; 3.0</span></div>
                        <div className="flex justify-between items-center bg-black/30 p-2.5 rounded-xl border border-gray-700"><span className="text-emerald-400 font-bold">جيد (Good)</span><span className="font-mono text-white">2.0 - 2.5</span></div>
                        <div className="flex justify-between items-center bg-black/30 p-2.5 rounded-xl border border-gray-700"><span className="text-amber-400 font-bold">متوسط (Average)</span><span className="font-mono text-white">1.5 - 2.0</span></div>
                        <div className="flex justify-between items-center bg-red-950/15 p-2.5 rounded-xl border border-red-500/20"><span className="text-red-400 font-bold">انتقالي (Transitional)</span><span className="font-mono text-white">&lt; 1.5</span></div>
                      </div>
                    </div>
                    {/* Depth Jump RSI */}
                    <div>
                      <p className="text-xs text-gray-400 font-bold mb-2">RSI - قفز العمق (Depth Jump):</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center bg-cyan-950/20 p-2.5 rounded-xl border border-cyan-500/25"><span className="text-cyan-400 font-bold">نخبة (Elite)</span><span className="font-mono text-white">&gt; 2.5</span></div>
                        <div className="flex justify-between items-center bg-black/30 p-2.5 rounded-xl border border-gray-700"><span className="text-emerald-400 font-bold">جيد (Good)</span><span className="font-mono text-white">1.6 - 2.5</span></div>
                        <div className="flex justify-between items-center bg-red-950/15 p-2.5 rounded-xl border border-red-500/20"><span className="text-red-400 font-bold">منخفض (Low)</span><span className="font-mono text-white">&lt; 1.6</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-cyan-950/10 border border-cyan-500/30 p-4 rounded-xl flex gap-2">
                  <ShieldAlert className="text-cyan-400 shrink-0" size={18} />
                  <div>
                     <p className="text-xs text-cyan-400 font-bold mb-0.5">معايير الناشئين والناشئات (أقل من 17 سنة):</p>
                     <p className="text-xs text-gray-400 leading-relaxed">يقوم المحرك تلقائياً بتخفيض الحدود المعيارية السابقة بنسبة 15% لملاءمة معدلات التطور البدني والفسيولوجي لسن اللاعب المحدد. ينطبق هذا على جميع الأندية والمنتخبات أعلاه.</p>
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