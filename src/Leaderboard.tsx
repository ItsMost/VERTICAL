import { useState, useMemo } from 'react';
import { TEST_TYPES, normalizeTestType } from './lib/testTypes';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame } from 'lucide-react';
import { useData } from './context/DataContext';
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

export default function Leaderboard({ onSelectPlayer, onChangeTab, language: propLang }: LeaderboardProps) {
  const { players, allMeasurements, language: ctxLang, t, setSelectedPlayerId } = useData();
  const language = propLang || ctxLang;
  const isAr = language === 'ar';

  const [category, setCategory] = useState<'vertical' | 'rsi'>('vertical');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // Dynamically compute leaderboard ranking from live shared state
  const leaderboardData = useMemo(() => {
    const processed: LeaderboardAthlete[] = (players || []).map((player: Player) => {
      const playerMeasures = (allMeasurements || []).filter((m: any) => m.player_id === player.id);
      let bestScore = 0;
      
      if (category === 'vertical') {
        const verticalMeasures = playerMeasures.filter((m: any) => normalizeTestType(m.test_type) !== TEST_TYPES.DROP_JUMP);
        if (verticalMeasures.length > 0) {
          bestScore = Math.max(...verticalMeasures.map((m: any) => parseFloat(m.jump_height_cm) || 0));
        }
      } else {
        const rsiMeasures = playerMeasures.filter((m: any) => normalizeTestType(m.test_type) === TEST_TYPES.DROP_JUMP);
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
    return filtered;
  }, [players, allMeasurements, category, genderFilter]);

  const getMetricRating = (score: number) => {
    if (category === 'vertical') {
      const inches = score * 0.393701;
      if (inches >= 34) return { text: t.ui.lbOlympicElite, color: 'text-accent', bg: 'bg-accent/15 border-accent/40' };
      if (inches >= 30) return { text: t.ui.lbExcellent, color: 'text-success', bg: 'bg-success/15 border-success/30' };
      if (inches >= 26) return { text: t.ui.lbVeryGood, color: 'text-zinc-200', bg: 'bg-zinc-700/20 border-zinc-600/30' };
      if (inches >= 22) return { text: t.ui.lbFair, color: 'text-warning', bg: 'bg-warning/15 border-warning/30' };
      return { text: t.ui.lbBelowAverage, color: 'text-danger', bg: 'bg-danger/15 border-danger/30' };
    } else {
      if (score >= 2.5) return { text: t.ui.lbReactiveElite, color: 'text-accent', bg: 'bg-accent/15 border-accent/40' };
      if (score >= 2.0) return { text: t.ui.lbExcellent, color: 'text-success', bg: 'bg-success/15 border-success/30' };
      if (score >= 1.5) return { text: t.ui.lbGoodSsc, color: 'text-zinc-200', bg: 'bg-zinc-700/20 border-zinc-600/30' };
      if (score >= 1.0) return { text: t.ui.lbFairSsc, color: 'text-warning', bg: 'bg-warning/15 border-warning/30' };
      return { text: t.ui.lbLowStiffness, color: 'text-danger', bg: 'bg-danger/15 border-danger/30' };
    }
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayerId(player.id);
    if (onSelectPlayer) {
      onSelectPlayer(player);
    }
    if (onChangeTab) {
      onChangeTab('profile');
    }
  };

  const topThree = leaderboardData.slice(0, 3);
  const restList = leaderboardData.slice(3);

  const podiumRenderList: LeaderboardAthlete[] = [];
  if (topThree[1]) podiumRenderList.push({ pos: 2, ...topThree[1] });
  if (topThree[0]) podiumRenderList.push({ pos: 1, ...topThree[0] });
  if (topThree[2]) podiumRenderList.push({ pos: 3, ...topThree[2] });

  return (
    <div className={`space-y-6 relative text-start`}>
      
      {/* Dynamic Header Block */}
      <div className="bg-surface border border-border p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
            <Trophy size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              {t.leaderboard.title}
              <Flame size={20} className="text-accent" />
            </h2>
            <p className="text-muted text-xs font-bold mt-1">{t.leaderboard.subtitle}</p>
          </div>
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-3 z-10">
          {/* Category Toggle */}
          <div className="bg-bg border border-border rounded-xl p-1 flex">
            <button
              onClick={() => setCategory('vertical')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                category === 'vertical' 
                  ? 'bg-accent text-accent-ink' 
                  : 'text-muted hover:text-accent-ink'
              }`}
            >
              {t.leaderboard.categoryVertical}
            </button>
            <button
              onClick={() => setCategory('rsi')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                category === 'rsi' 
                  ? 'bg-accent text-accent-ink' 
                  : 'text-muted hover:text-accent-ink'
              }`}
            >
              {t.leaderboard.categoryRsi}
            </button>
          </div>

          {/* Gender Filter */}
          <div className="bg-bg border border-border rounded-xl p-1 flex">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                genderFilter === 'all' 
                  ? 'bg-zinc-800 text-accent border border-accent/30' 
                  : 'text-muted hover:text-white'
              }`}
            >
              {t.leaderboard.allAthletes}
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                genderFilter === 'male' 
                  ? 'bg-zinc-800 text-accent border border-accent/30' 
                  : 'text-muted hover:text-white'
              }`}
            >
              {t.leaderboard.males}
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                genderFilter === 'female' 
                  ? 'bg-zinc-800 text-accent border border-accent/30' 
                  : 'text-muted hover:text-white'
              }`}
            >
              {t.leaderboard.females}
            </button>
          </div>
        </div>
      </div>

      {leaderboardData.length === 0 ? (
        <div className="bg-surface border border-border p-16 text-center shadow-xl rounded-3xl flex flex-col items-center justify-center">
          <Trophy size={56} className="text-faint mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-white mb-2">{t.leaderboard.emptyTitle}</h3>
          <p className="text-muted text-xs max-w-sm mx-auto leading-relaxed">{t.leaderboard.emptyDesc}</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* ================= TOP 3 PODIUM DISPLAY ================= */}
          <div className="flex flex-col sm:flex-row items-end justify-center gap-6 sm:gap-4 pt-10 pb-6 max-w-3xl mx-auto">
            <AnimatePresence>
              {podiumRenderList.map((player) => {
                const isFirst = player.pos === 1;
                const isSecond = player.pos === 2;
                
                const heightClass = isFirst 
                  ? 'h-56 bg-gradient-to-t from-accent/20 via-surface-2 to-surface border-accent/60' 
                  : isSecond 
                  ? 'h-44 bg-gradient-to-t from-zinc-700/20 via-surface-2 to-surface border-zinc-500/40'
                  : 'h-36 bg-gradient-to-t from-accent/15 via-surface-2 to-surface border-accent/40';

                const medalLabel = isFirst ? t.leaderboard.podiumGold : isSecond ? t.leaderboard.podiumSilver : t.leaderboard.podiumBronze;
                const medalEmoji = isFirst ? '🥇' : isSecond ? '🥈' : '🥉';
                const textColor = isFirst ? 'text-accent font-black' : isSecond ? 'text-zinc-300 font-bold' : 'text-accent font-bold';

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: (player.pos || 1) * 0.1 }}
                    className="flex-1 w-full flex flex-col items-center relative z-10"
                  >
                    {/* Athlete Avatar Badge */}
                    <div 
                      onClick={() => handlePlayerClick(player)}
                      className={`w-16 h-16 rounded-2xl bg-surface-2 border-2 flex items-center justify-center text-white text-xl font-bold cursor-pointer hover:scale-105 transition-transform shadow-lg mb-3
                        ${isFirst ? 'border-accent' : isSecond ? 'border-zinc-500' : 'border-accent/60'}`}
                    >
                      {player.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>

                    <div className="text-center mb-2">
                      <h4 
                        onClick={() => handlePlayerClick(player)}
                        className="font-black text-white text-xs hover:text-accent cursor-pointer block truncate max-w-[150px]"
                      >
                        {player.full_name}
                      </h4>
                      <span className="text-[10px] text-faint font-bold block">
                        {player.gender === 'female' ? t.leaderboard.females : t.leaderboard.males}
                      </span>
                    </div>

                    {/* Podium Column block */}
                    <div className={`w-full ${heightClass} border rounded-t-3xl shadow-[0_-15px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between p-4`}>
                      <span className={`text-3xl ${textColor} flex items-center gap-1`}>
                        {medalEmoji}
                      </span>
                      
                      <div className="text-center mt-2">
                        <span className="text-2xl font-black text-white font-mono tabular-nums">{player.bestScore}</span>
                        <span className="text-[10px] text-muted block font-bold mt-0.5">
                          {category === 'vertical' ? (t.ui.lbCm) : 'RSI'}
                        </span>
                      </div>

                      <div className="bg-black/60 px-3 py-0.5 rounded-full border border-white/10 mt-2 text-[10px] font-black text-accent font-mono tabular-nums">
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
            <div className="bg-surface border border-border p-5 rounded-3xl shadow-lg overflow-hidden">
              <h3 className="text-sm font-black text-white mb-4 border-b border-border pb-2.5 flex items-center gap-2">
                📋 {t.ui.lbFullTelemetryStandings}
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ textAlign: isAr ? 'right' : 'left' }}>
                  <thead>
                    <tr className="border-b border-border text-muted font-black">
                      <th className="pb-3 text-center">{t.leaderboard.rankCol}</th>
                      <th className={`pb-3 ${isAr ? 'text-right' : 'text-left'}`}>{t.leaderboard.athleteCol}</th>
                      <th className="pb-3 text-center">{t.ui.lbGender}</th>
                      <th className="pb-3 text-center">{t.leaderboard.scoreCol}</th>
                      <th className="pb-3 text-center">{t.ui.lbRating}</th>
                      <th className="pb-3 text-center">{t.ui.lbAction}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restList.map((player, index) => {
                      const rank = index + 4;
                      const rating = getMetricRating(player.bestScore);
                      return (
                        <tr key={player.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                          <td className="py-3.5 text-center font-mono tabular-nums font-black text-muted">#{rank}</td>
                          <td className={`py-3.5 font-black text-white ${isAr ? 'text-right' : 'text-left'}`}>
                            <button onClick={() => handlePlayerClick(player)} className="hover:text-accent transition-colors cursor-pointer text-inherit">
                              {player.full_name}
                            </button>
                          </td>
                          <td className="py-3.5 text-center">
                            {player.gender === 'female' ? (
                              <span className="bg-accent/15 text-accent border border-accent/30 text-[9px] px-2.5 py-0.5 rounded-xl font-bold">
                                {t.leaderboard.females}
                              </span>
                            ) : (
                              <span className="bg-accent/15 text-accent border border-accent/30 text-[9px] px-2.5 py-0.5 rounded-xl font-bold">
                                {t.leaderboard.males}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 text-center font-mono tabular-nums font-black text-white text-sm">
                            {player.bestScore} <span className="text-[10px] text-muted font-normal">{category === 'vertical' ? (t.ui.lbCm) : ''}</span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-lg border font-bold ${rating.color} ${rating.bg}`}>
                              {rating.text}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <button
                              onClick={() => handlePlayerClick(player)}
                              className="px-3 py-1 bg-accent/15 text-accent border border-accent/30 rounded-lg text-[10px] font-bold hover:bg-accent/25 transition-all cursor-pointer"
                            >
                              {t.ui.lbViewProfile}
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
