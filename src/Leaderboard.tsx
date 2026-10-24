import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { supabase } from './supabaseClient';
import type { Player, ActiveTabType } from './types/athletics';

interface LeaderboardProps {
  onSelectPlayer?: (player: Player) => void;
  onChangeTab?: (tab: ActiveTabType) => void;
  language?: string;
}

interface LeaderboardAthlete extends Player {
  bestScore: number;
  pos?: number;
}

export default function Leaderboard({ onSelectPlayer, onChangeTab, language = 'ar' }: LeaderboardProps) {
  const [category, setCategory] = useState<'vertical' | 'rsi'>('vertical');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardAthlete[]>([]);

  useEffect(() => {
    loadLeaderboard();
  }, [category, genderFilter]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // 1. Fetch all players
      const { data: players, error: playersError } = await supabase
        .from('lab_players')
        .select('id, full_name, gender, weight_kg, height_cm, created_at');
      
      if (playersError) throw playersError;

      // 2. Fetch all measurements
      const { data: measurements, error: measurementsError } = await supabase
        .from('lab_jump_measurements')
        .select('player_id, test_type, jump_height_cm, rsi_score');

      if (measurementsError) throw measurementsError;

      // 3. Process data
      const processed: LeaderboardAthlete[] = (players || []).map((player: any) => {
        const playerMeasures = (measurements || []).filter((m: any) => m.player_id === player.id);
        let bestScore = 0;
        
        if (category === 'vertical') {
          const verticalMeasures = playerMeasures.filter((m: any) => m.test_type !== 'rsi');
          if (verticalMeasures.length > 0) {
            bestScore = Math.max(...verticalMeasures.map((m: any) => parseFloat(m.jump_height_cm) || 0));
          }
        } else {
          const rsiMeasures = playerMeasures.filter((m: any) => m.test_type === 'rsi' || (m.rsi_score && parseFloat(m.rsi_score) > 0));
          if (rsiMeasures.length > 0) {
            bestScore = Math.max(...rsiMeasures.map((m: any) => parseFloat(m.rsi_score) || 0));
          }
        }

        return {
          ...player,
          bestScore: parseFloat(bestScore.toFixed(category === 'vertical' ? 1 : 2))
        };
      });

      let filtered = processed.filter(p => p.bestScore > 0);
      if (genderFilter !== 'all') {
        filtered = filtered.filter(p => p.gender === genderFilter);
      }

      filtered.sort((a, b) => b.bestScore - a.bestScore);
      setLeaderboardData(filtered);
    } catch (err) {
      console.error("Error loading leaderboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getMetricRating = (score: number) => {
    if (category === 'vertical') {
      const inches = score * 0.393701;
      if (inches >= 34) return { text: language === 'en' ? 'Olympic Elite 👑' : 'نخبة أولمبية 👑', color: 'text-[#00F0FF]', bg: 'bg-[#00F0FF]/15 border-[#00F0FF]/40' };
      if (inches >= 30) return { text: language === 'en' ? 'Excellent 🏆' : 'ممتاز 🏆', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' };
      if (inches >= 26) return { text: language === 'en' ? 'Very Good ⭐' : 'جيد جداً ⭐', color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30' };
      if (inches >= 22) return { text: language === 'en' ? 'Fair ⚡' : 'مقبول ⚡', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' };
      return { text: language === 'en' ? 'Below Average ⚠️' : 'تحت المتوسط ⚠️', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' };
    } else {
      if (score >= 2.5) return { text: language === 'en' ? 'Reactive Elite 👑' : 'نخبة تفاعلية 👑', color: 'text-[#00F0FF]', bg: 'bg-[#00F0FF]/15 border-[#00F0FF]/40' };
      if (score >= 2.0) return { text: language === 'en' ? 'Excellent 🏆' : 'ممتاز 🏆', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' };
      if (score >= 1.5) return { text: language === 'en' ? 'Good SSC ⭐' : 'تفاعل جيد ⭐', color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30' };
      if (score >= 1.0) return { text: language === 'en' ? 'Fair SSC ⚡' : 'تفاعل مقبول ⚡', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' };
      return { text: language === 'en' ? 'Low Stiffness ⚠️' : 'صلابة منخفضة ⚠️', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' };
    }
  };

  const handlePlayerClick = (player: Player) => {
    if (onSelectPlayer) {
      onSelectPlayer(player);
      if (onChangeTab) onChangeTab('profile');
    }
  };

  const topThree = leaderboardData.slice(0, 3);
  const restList = leaderboardData.slice(3);

  const podiumRenderList: LeaderboardAthlete[] = [];
  if (topThree[1]) podiumRenderList.push({ pos: 2, ...topThree[1] });
  if (topThree[0]) podiumRenderList.push({ pos: 1, ...topThree[0] });
  if (topThree[2]) podiumRenderList.push({ pos: 3, ...topThree[2] });

  const trans = {
    title: language === 'en' ? 'PeakForce Leaderboards' : 'لوحة شرف الأداء الرياضي (Leaderboards)',
    subtitle: language === 'en' ? 'Rankings and classifications of athletes based on their personal records.' : 'ترتيب وتصنيف أبطال الأداء الرياضي والميكانيكا الحيوية بناءً على الأرقام القياسية الشخصية.',
    verticalJump: language === 'en' ? 'Vertical Jump (cm)' : 'الوثب العمودي (cm)',
    rsiIndex: language === 'en' ? 'RSI Index' : 'مؤشر RSI الارتدادي',
    all: language === 'en' ? 'All' : 'الكل',
    boys: language === 'en' ? 'Boys 👦' : 'الشباب 👦',
    girls: language === 'en' ? 'Girls 👧' : 'الآنسات 👧',
    loading: language === 'en' ? 'Loading leaderboards...' : 'جاري تحميل وتصنيف لوحة الشرف...',
    noResults: language === 'en' ? 'No records found for this category' : 'لا توجد نتائج مسجلة لهذه الفئة',
    ensureRecords: language === 'en' ? 'Ensure athletes have recorded measurements in this category.' : 'تأكد من تسجيل قياسات للرياضيين في الفئة المختارة لتظهر في لوحة الصدارة.',
    genderGirl: language === 'en' ? 'Girl 👧' : 'آنسة 👧',
    genderBoy: language === 'en' ? 'Boy 👦' : 'شاب 👦',
    unitCm: language === 'en' ? 'cm (Height)' : 'سم (Height)',
    unitRsi: language === 'en' ? 'Index (RSI)' : 'مؤشر (RSI)',
    restTitle: language === 'en' ? '📋 Remaining Leaderboard Rankings' : '📋 بقية الترتيب العام في القائمة',
    rankCol: language === 'en' ? 'Rank' : 'الترتيب',
    athleteCol: language === 'en' ? 'Athlete' : 'الرياضي',
    genderCol: language === 'en' ? 'Gender' : 'النوع',
    bestScoreCol: language === 'en' ? 'Personal Best' : 'الرقم الشخصي الأفضل',
    ratingCol: language === 'en' ? 'Rating' : 'التقييم المعياري',
    profileCol: language === 'en' ? 'Profile' : 'الملف الشخصي',
    viewProfileBtn: language === 'en' ? 'View Profile' : 'عرض الملف',
    cmLabel: language === 'en' ? 'cm' : 'سم',
  };

  return (
    <div className={`space-y-6 relative ${language === 'en' ? 'text-left' : 'text-right'}`} style={{ direction: language === 'en' ? 'ltr' : 'rtl' }}>
      
      {/* Dynamic Header Block */}
      <div className="glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden border border-white/10">
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <Trophy size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{trans.title}</h2>
            <p className="text-gray-400 text-xs font-bold mt-1">{trans.subtitle}</p>
          </div>
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          {/* Category Toggle */}
          <div className="bg-[#111827]/80 border border-white/10 rounded-xl p-1 flex">
            <button
              onClick={() => setCategory('vertical')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${category === 'vertical' ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'text-gray-400 hover:text-white'}`}
            >
              {trans.verticalJump}
            </button>
            <button
              onClick={() => setCategory('rsi')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${category === 'rsi' ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'text-gray-400 hover:text-white'}`}
            >
              {trans.rsiIndex}
            </button>
          </div>

          {/* Gender Filter */}
          <div className="bg-[#111827]/80 border border-white/10 rounded-xl p-1 flex">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${genderFilter === 'all' ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40' : 'text-gray-400 hover:text-white'}`}
            >
              {trans.all}
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${genderFilter === 'male' ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40' : 'text-gray-400 hover:text-white'}`}
            >
              {trans.boys}
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${genderFilter === 'female' ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40' : 'text-gray-400 hover:text-white'}`}
            >
              {trans.girls}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-20 text-center flex flex-col items-center justify-center border border-white/10">
          <div className="w-12 h-12 border-4 border-[#00F0FF] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm font-bold">{trans.loading}</p>
        </div>
      ) : leaderboardData.length === 0 ? (
        <div className="glass-panel p-16 text-center border border-white/10 shadow-xl rounded-3xl flex flex-col items-center justify-center">
          <Trophy size={56} className="text-[#00F0FF] mb-4 opacity-30 animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-2">{trans.noResults}</h3>
          <p className="text-gray-400 text-xs max-w-sm mx-auto leading-relaxed">{trans.ensureRecords}</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* ================= TOP 3 PODIUM DISPLAY ================= */}
          <div className="flex flex-col sm:flex-row items-end justify-center gap-6 sm:gap-4 pt-12 pb-6 max-w-3xl mx-auto">
            <AnimatePresence>
              {podiumRenderList.map((player) => {
                const isFirst = player.pos === 1;
                const isSecond = player.pos === 2;
                
                const heightClass = isFirst ? 'h-52 bg-gradient-to-t from-[#00F0FF]/25 to-[#0B0F19] border-[#00F0FF]/50 shadow-[0_0_30px_rgba(0,240,255,0.2)]' 
                                  : isSecond ? 'h-40 bg-gradient-to-t from-slate-600/25 to-[#0B0F19] border-slate-400/40'
                                  : 'h-32 bg-gradient-to-t from-cyan-700/25 to-[#0B0F19] border-cyan-600/40';

                const medalEmoji = isFirst ? '🥇' : isSecond ? '🥈' : '🥉';
                const textColor = isFirst ? 'text-[#00F0FF] font-extrabold' : isSecond ? 'text-slate-300' : 'text-cyan-400';

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: (player.pos || 1) * 0.1 }}
                    className={`flex-1 w-full flex flex-col items-center relative z-10`}
                  >
                    {/* Athlete Profile Initial Badge */}
                    <div 
                      onClick={() => handlePlayerClick(player)}
                      className={`w-16 h-16 rounded-2xl bg-[#111827] border-2 flex items-center justify-center text-white text-xl font-bold cursor-pointer hover:scale-105 transition-transform shadow-lg mb-3
                        ${isFirst ? 'border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.4)]' : isSecond ? 'border-slate-400' : 'border-cyan-600'}`}
                    >
                      {player.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>

                    <div className="text-center mb-2">
                      <h4 
                        onClick={() => handlePlayerClick(player)}
                        className="font-black text-white text-xs hover:text-[#00F0FF] cursor-pointer block truncate max-w-[150px]"
                      >
                        {player.full_name}
                      </h4>
                      <span className="text-[10px] text-gray-500 font-bold block">
                        {player.gender === 'female' ? trans.genderGirl : trans.genderBoy}
                      </span>
                    </div>

                    {/* Podium Column block */}
                    <div className={`w-full ${heightClass} border rounded-t-3xl shadow-[0_-15px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between p-4`}>
                      <span className={`text-3xl ${textColor} font-black`}>{medalEmoji}</span>
                      
                      <div className="text-center mt-2">
                        <span className="text-2xl font-black text-white font-mono metric-num">{player.bestScore}</span>
                        <span className="text-[9px] text-gray-400 block font-bold mt-0.5 font-sans">
                          {category === 'vertical' ? trans.unitCm : trans.unitRsi}
                        </span>
                      </div>

                      <div className="bg-black/60 px-2 py-0.5 rounded-full border border-white/10 mt-2 text-[9px] font-black text-[#00F0FF] font-mono">
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
            <div className="glass-panel p-5 shadow-lg overflow-hidden border border-white/10">
              <h3 className="text-sm font-black text-white mb-4 border-b border-white/10 pb-2.5 flex items-center gap-2">
                {trans.restTitle}
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ textAlign: language === 'en' ? 'left' : 'right' }}>
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 font-black">
                      <th className="pb-3 text-center">{trans.rankCol}</th>
                      <th className={`pb-3 ${language === 'en' ? 'text-left' : 'text-right'}`}>{trans.athleteCol}</th>
                      <th className="pb-3 text-center">{trans.genderCol}</th>
                      <th className="pb-3 text-center">{trans.bestScoreCol}</th>
                      <th className="pb-3 text-center">{trans.ratingCol}</th>
                      <th className="pb-3 text-center">{trans.profileCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restList.map((player, index) => {
                      const rank = index + 4;
                      const rating = getMetricRating(player.bestScore);
                      return (
                        <tr key={player.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3.5 text-center font-mono font-black text-gray-400">#{rank}</td>
                          <td className={`py-3.5 font-black text-white ${language === 'en' ? 'text-left' : 'text-right'}`}>
                            <button onClick={() => handlePlayerClick(player)} className="hover:text-[#00F0FF] transition-colors cursor-pointer text-inherit">
                              {player.full_name}
                            </button>
                          </td>
                          <td className="py-3.5 text-center">
                            {player.gender === 'female' ? (
                              <span className="bg-pink-500/15 text-pink-400 border border-pink-500/30 text-[9px] px-2.5 py-0.5 rounded-xl font-bold">{trans.genderGirl}</span>
                            ) : (
                              <span className="bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 text-[9px] px-2.5 py-0.5 rounded-xl font-bold">{trans.genderBoy}</span>
                            )}
                          </td>
                          <td className="py-3.5 text-center font-mono font-black text-white text-sm metric-num">
                            {player.bestScore} <span className="text-[10px] text-gray-400 font-normal">{category === 'vertical' ? trans.cmLabel : ''}</span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${rating.color} ${rating.bg}`}>
                              {rating.text}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <button
                              onClick={() => handlePlayerClick(player)}
                              className="px-2.5 py-1 bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 rounded-lg text-[10px] font-bold hover:bg-[#00F0FF]/25 transition-all cursor-pointer"
                            >
                              {trans.viewProfileBtn}
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
      
      <div className="bottom-dock-clearance h-20" />
    </div>
  );
}
