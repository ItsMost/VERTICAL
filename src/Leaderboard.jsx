import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Award, Shield, ChevronLeft, ArrowUp, Zap, HelpCircle } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function Leaderboard({ onSelectPlayer, onChangeTab }) {
  const [category, setCategory] = useState('vertical'); // vertical, rsi
  const [genderFilter, setGenderFilter] = useState('all'); // all, male, female
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState([]);

  useEffect(() => {
    loadLeaderboard();
  }, [category, genderFilter]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // 1. Fetch all players
      const { data: players, error: playersError } = await supabase
        .from('lab_players')
        .select('id, full_name, gender, weight_kg');
      
      if (playersError) throw playersError;

      // 2. Fetch all measurements
      const { data: measurements, error: measurementsError } = await supabase
        .from('lab_jump_measurements')
        .select('player_id, test_type, jump_height_cm, rsi_score');

      if (measurementsError) throw measurementsError;

      // 3. Process data
      const processed = players.map(player => {
        // Filter measurements for this player
        const playerMeasures = measurements.filter(m => m.player_id === player.id);

        let bestScore = 0;
        
        if (category === 'vertical') {
          // Find max jump height excluding RSI
          const verticalMeasures = playerMeasures.filter(m => m.test_type !== 'rsi');
          if (verticalMeasures.length > 0) {
            bestScore = Math.max(...verticalMeasures.map(m => parseFloat(m.jump_height_cm) || 0));
          }
        } else {
          // Find max RSI score
          const rsiMeasures = playerMeasures.filter(m => m.test_type === 'rsi' || (m.rsi_score && parseFloat(m.rsi_score) > 0));
          if (rsiMeasures.length > 0) {
            bestScore = Math.max(...rsiMeasures.map(m => parseFloat(m.rsi_score) || 0));
          }
        }

        return {
          ...player,
          bestScore: parseFloat(bestScore.toFixed(category === 'vertical' ? 1 : 2))
        };
      });

      // Filter by bestScore > 0 and gender
      let filtered = processed.filter(p => p.bestScore > 0);
      if (genderFilter !== 'all') {
        filtered = filtered.filter(p => p.gender === genderFilter);
      }

      // Sort descending
      filtered.sort((a, b) => b.bestScore - a.bestScore);

      setLeaderboardData(filtered);
    } catch (err) {
      console.error("Error loading leaderboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getMetricRating = (score) => {
    if (category === 'vertical') {
      const inches = score * 0.393701;
      if (inches >= 34) return { text: 'نخبة أولمبية 👑', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/25' };
      if (inches >= 30) return { text: 'ممتاز 🏆', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' };
      if (inches >= 26) return { text: 'جيد جداً ⭐', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/25' };
      if (inches >= 22) return { text: 'مقبول ⚡', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25' };
      return { text: 'تحت المتوسط ⚠️', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25' };
    } else {
      if (score >= 2.5) return { text: 'نخبة تفاعلية 👑', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/25' };
      if (score >= 2.0) return { text: 'ممتاز 🏆', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' };
      if (score >= 1.5) return { text: 'تفاعل جيد ⭐', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/25' };
      if (score >= 1.0) return { text: 'تفاعل مقبول ⚡', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25' };
      return { text: 'صلابة منخفضة ⚠️', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25' };
    }
  };

  const handlePlayerClick = (player) => {
    if (onSelectPlayer) {
      onSelectPlayer(player);
      if (onChangeTab) onChangeTab('profile');
    }
  };

  // Podium Positions (1st, 2nd, 3rd)
  const topThree = leaderboardData.slice(0, 3);
  const restList = leaderboardData.slice(3);

  // Re-order topThree for podium rendering: [2nd, 1st, 3rd]
  const podiumRenderList = [];
  if (topThree[1]) podiumRenderList.push({ pos: 2, ...topThree[1] });
  if (topThree[0]) podiumRenderList.push({ pos: 1, ...topThree[0] });
  if (topThree[2]) podiumRenderList.push({ pos: 3, ...topThree[2] });

  return (
    <div className="space-y-6 text-right relative" style={{ direction: 'rtl' }}>
      
      {/* Dynamic Header Block */}
      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Trophy size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">لوحة شرف الأداء الرياضي (Leaderboards)</h2>
            <p className="text-gray-400 text-xs font-bold mt-1">
              ترتيب وتصنيف أبطال الأداء الرياضي والميكانيكا الحيوية بناءً على الأرقام القياسية الشخصية.
            </p>
          </div>
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          {/* Category Toggle */}
          <div className="bg-[#111827]/40 border border-gray-800/80 rounded-xl p-1 flex">
            <button
              onClick={() => setCategory('vertical')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${category === 'vertical' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              الوثب العمودي (cm)
            </button>
            <button
              onClick={() => setCategory('rsi')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${category === 'rsi' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              مؤشر RSI الارتدادي
            </button>
          </div>

          {/* Gender Filter */}
          <div className="bg-[#111827]/40 border border-gray-800/80 rounded-xl p-1 flex">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${genderFilter === 'all' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              الكل
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${genderFilter === 'male' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              الشباب 👦
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${genderFilter === 'female' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              الآنسات 👧
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-20 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm font-bold">جاري تحميل وتصنيف لوحة الشرف...</p>
        </div>
      ) : leaderboardData.length === 0 ? (
        <div className="glass-panel p-16 text-center border border-gray-800/60 shadow-xl rounded-3xl flex flex-col items-center justify-center">
          <Trophy size={56} className="text-yellow-500 mb-4 opacity-30 animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-2">لا توجد نتائج مسجلة لهذه الفئة</h3>
          <p className="text-gray-400 text-xs max-w-sm mx-auto leading-relaxed">
            تأكد من تسجيل قياسات للرياضيين في الفئة المختارة لتظهر في لوحة الصدارة.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* ================= TOP 3 PODIUM DISPLAY ================= */}
          <div className="flex flex-col sm:flex-row items-end justify-center gap-6 sm:gap-4 pt-12 pb-6 max-w-3xl mx-auto">
            <AnimatePresence>
              {podiumRenderList.map((player) => {
                const isFirst = player.pos === 1;
                const isSecond = player.pos === 2;
                const isThird = player.pos === 3;
                
                const heightClass = isFirst ? 'h-52 bg-gradient-to-t from-amber-500/25 to-yellow-500/15 border-yellow-500/40' 
                                  : isSecond ? 'h-40 bg-gradient-to-t from-slate-600/25 to-slate-400/15 border-slate-400/40'
                                  : 'h-32 bg-gradient-to-t from-amber-700/25 to-amber-600/15 border-amber-600/40';

                const medalEmoji = isFirst ? '🥇' : isSecond ? '🥈' : '🥉';
                const textColor = isFirst ? 'text-yellow-400 font-extrabold' : isSecond ? 'text-slate-350' : 'text-amber-500';

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: player.pos * 0.1 }}
                    className={`flex-1 w-full flex flex-col items-center relative z-10`}
                  >
                    {/* Athlete Profile Initial Badge */}
                    <div 
                      onClick={() => handlePlayerClick(player)}
                      className={`w-16 h-16 rounded-2xl bg-slate-900 border-2 flex items-center justify-center text-white text-xl font-bold cursor-pointer hover:scale-105 transition-transform shadow-lg mb-3
                        ${isFirst ? 'border-yellow-400' : isSecond ? 'border-slate-400' : 'border-amber-600'}`}
                    >
                      {player.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>

                    <div className="text-center mb-2">
                      <h4 
                        onClick={() => handlePlayerClick(player)}
                        className="font-black text-white text-xs hover:text-cyan-400 cursor-pointer block truncate max-w-[150px]"
                      >
                        {player.full_name}
                      </h4>
                      <span className="text-[10px] text-gray-500 font-bold block">
                        {player.gender === 'female' ? 'آنسة 👧' : 'شاب 👦'}
                      </span>
                    </div>

                    {/* Podium Column block */}
                    <div className={`w-full ${heightClass} border rounded-t-3xl shadow-[0_-15px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between p-4`}>
                      <span className={`text-3xl ${textColor} font-black`}>{medalEmoji}</span>
                      
                      <div className="text-center mt-2">
                        <span className="text-2xl font-black text-white font-mono">{player.bestScore}</span>
                        <span className="text-[9px] text-gray-400 block font-bold mt-0.5">
                          {category === 'vertical' ? 'سم (Height)' : 'مؤشر (RSI)'}
                        </span>
                      </div>

                      <div className="bg-black/35 px-2 py-0.5 rounded-full border border-gray-800/60 mt-2 text-[9px] font-black text-cyan-400 font-mono">
                        #{player.pos}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* ================= LEADERBOARD LIST TABLE ================= */}
          {restList.length > 0 && (
            <div className="glass-panel p-5 shadow-lg overflow-hidden">
              <h3 className="text-sm font-black text-white mb-4 border-b border-gray-800/80 pb-2.5 flex items-center gap-2">
                📋 بقية الترتيب العام في القائمة
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-450 font-black">
                      <th className="pb-3 text-center">الترتيب</th>
                      <th className="pb-3 text-right">الرياضي</th>
                      <th className="pb-3 text-center">النوع</th>
                      <th className="pb-3 text-center">الرقم الشخصي الأفضل</th>
                      <th className="pb-3 text-center">التقييم المعياري</th>
                      <th className="pb-3 text-center">الملف الشخصي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restList.map((player, index) => {
                      const rank = index + 4;
                      const rating = getMetricRating(player.bestScore);
                      return (
                        <tr key={player.id} className="border-b border-gray-855 hover:bg-black/10 transition-colors">
                          <td className="py-3.5 text-center font-mono font-black text-gray-400">#{rank}</td>
                          <td className="py-3.5 text-right font-black text-white">
                            <button onClick={() => handlePlayerClick(player)} className="hover:text-cyan-400 transition-colors cursor-pointer text-right">
                              {player.full_name}
                            </button>
                          </td>
                          <td className="py-3.5 text-center">
                            {player.gender === 'female' ? (
                              <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[9px] px-2.5 py-0.5 rounded-xl font-bold">آنسة 👧</span>
                            ) : (
                              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] px-2.5 py-0.5 rounded-xl font-bold">شاب 👦</span>
                            )}
                          </td>
                          <td className="py-3.5 text-center font-mono font-black text-white text-sm">
                            {player.bestScore} <span className="text-[10px] text-gray-500 font-normal">{category === 'vertical' ? 'سم' : ''}</span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${rating.color} ${rating.bg}`}>
                              {rating.text}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <button
                              onClick={() => handlePlayerClick(player)}
                              className="px-2.5 py-1 bg-cyan-600/15 text-cyan-400 border border-cyan-500/20 rounded-lg text-[10px] font-bold hover:bg-cyan-600/25 transition-all cursor-pointer"
                            >
                              عرض الملف
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
      
      {/* Bottom docking clearance div */}
      <div className="bottom-dock-clearance h-20" />
    </div>
  );
}
