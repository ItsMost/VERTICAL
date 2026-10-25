import React, { useState, useMemo } from 'react';
import {
  Users, Award, ChevronDown, Activity, Zap, Play, BookOpen,
  User, X, Edit3, Grid, List, Search, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from './context/DataContext';
import type { Player } from './types/athletics';

interface TeamDashboardProps {
  onSelectPlayer?: (player: Player) => void;
  onChangeTab?: (tab: string) => void;
  coaches?: any[];
  onEditPlayer?: (player: Player) => void;
  language?: string;
}

export default function TeamDashboard({
  onSelectPlayer,
  onChangeTab,
  onEditPlayer,
}: TeamDashboardProps) {
  const {
    players: allPlayers,
    coaches,
    allMeasurements,
    dataVersion,
    setSelectedPlayerId,
    t,
    language,
  } = useData();

  const isEn = language === 'en';

  const [selectedCoachId, setSelectedCoachId] = useState<string>('all');
  const [isCoachDropdownOpen, setIsCoachDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [showHandbookModal, setShowHandbookModal] = useState(false);
  const [activeHandbookTab, setActiveHandbookTab] = useState<'men' | 'women' | 'rsi' | 'juniors'>('men');

  // Compute live scores for every athlete from central allMeasurements (instant in-memory sync!)
  const latestScores = useMemo(() => {
    const scoresMap: Record<string, { cmj: any; approach: any; rsi: any }> = {};

    allPlayers.forEach(p => {
      scoresMap[p.id] = { cmj: null, approach: null, rsi: null };
    });

    allMeasurements.forEach(m => {
      const pId = m.player_id;
      if (!scoresMap[pId]) return;

      if (m.test_type === 'cmj' || m.test_type === 'cmj_arms' || m.test_type === 'cmj_no_arms' || m.test_type === 'standard') {
        const val = parseFloat(String(m.jump_height_cm)) || 0;
        const currentPeak = scoresMap[pId].cmj ? (parseFloat(String(scoresMap[pId].cmj.jump_height_cm)) || 0) : -1;
        if (val > currentPeak) {
          scoresMap[pId].cmj = m;
        }
      } else if (m.test_type === 'approach' || m.test_type === 'approach_jump') {
        const val = parseFloat(String(m.jump_height_cm)) || 0;
        const currentPeak = scoresMap[pId].approach ? (parseFloat(String(scoresMap[pId].approach.jump_height_cm)) || 0) : -1;
        if (val > currentPeak) {
          scoresMap[pId].approach = m;
        }
      } else if (m.test_type === 'rsi') {
        const val = parseFloat(String(m.rsi_score)) || 0;
        const currentPeak = scoresMap[pId].rsi ? (parseFloat(String(scoresMap[pId].rsi.rsi_score)) || 0) : -1;
        if (val > currentPeak) {
          scoresMap[pId].rsi = m;
        }
      }
    });

    return scoresMap;
  }, [allPlayers, allMeasurements, dataVersion]);

  // Compute team averages dynamically
  const teamAverages = useMemo(() => {
    let cmjSum = 0, cmjCount = 0;
    let appSum = 0, appCount = 0;
    let rsiSum = 0, rsiCount = 0;

    Object.values(latestScores).forEach(score => {
      if (score.cmj && parseFloat(String(score.cmj.jump_height_cm)) > 0) {
        cmjSum += parseFloat(String(score.cmj.jump_height_cm));
        cmjCount++;
      }
      if (score.approach && parseFloat(String(score.approach.jump_height_cm)) > 0) {
        appSum += parseFloat(String(score.approach.jump_height_cm));
        appCount++;
      }
      if (score.rsi && parseFloat(String(score.rsi.rsi_score)) > 0) {
        rsiSum += parseFloat(String(score.rsi.rsi_score));
        rsiCount++;
      }
    });

    return {
      cmj: cmjCount > 0 ? cmjSum / cmjCount : null,
      approach: appCount > 0 ? appSum / appCount : null,
      rsi: rsiCount > 0 ? rsiSum / rsiCount : null,
    };
  }, [latestScores]);

  // Filtered Players
  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(player => {
      // Coach filter
      if (selectedCoachId === 'unassigned') {
        if (player.coach_id) return false;
      } else if (selectedCoachId !== 'all') {
        if (player.coach_id !== selectedCoachId) return false;
      }

      // Gender filter
      if (genderFilter !== 'all' && player.gender !== genderFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!player.full_name?.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [allPlayers, selectedCoachId, genderFilter, searchQuery]);

  const getPlayerAge = (player: Player) => {
    if (player.birth_year) {
      return Math.max(1, new Date().getFullYear() - Number(player.birth_year));
    }
    return 20;
  };

  const getStatusBadge = (heightCm: number | null, type: 'cmj' | 'approach' | 'rsi', gender: string, age: number) => {
    if (!heightCm || isNaN(heightCm) || heightCm <= 0) {
      return <span className="text-[10px] font-mono text-zinc-500">—</span>;
    }

    const isYouth = age < 17;
    const discount = isYouth ? 0.85 : 1.0;
    const isFemale = gender === 'female';

    if (type === 'cmj' || type === 'approach') {
      const heightInches = heightCm * 0.393701;
      const elite = (isFemale ? 26 : 34) * discount;
      const excellent = (isFemale ? 22 : 30) * discount;
      const good = (isFemale ? 18 : 26) * discount;

      if (heightInches >= elite) return <span className="badge-volt text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">ELITE 🏆</span>;
      if (heightInches >= excellent) return <span className="badge-emerald text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">EXCELLENT ⭐</span>;
      if (heightInches >= good) return <span className="badge-amber text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">GOOD ⚡</span>;
      return <span className="badge-rose text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">DEV ⚠️</span>;
    } else {
      const rsiVal = heightCm;
      const elite = 3.0 * discount;
      const excellent = 2.5 * discount;
      const good = 2.0 * discount;

      if (rsiVal >= elite) return <span className="badge-volt text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">ELITE 🏆</span>;
      if (rsiVal >= excellent) return <span className="badge-emerald text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">EXCELLENT ⭐</span>;
      if (rsiVal >= good) return <span className="badge-amber text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">GOOD ⚡</span>;
      return <span className="badge-rose text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">DEV ⚠️</span>;
    }
  };

  const handleSelectAthlete = (p: Player) => {
    setSelectedPlayerId(p.id);
    if (onSelectPlayer) {
      onSelectPlayer(p);
    }
    if (onChangeTab) {
      onChangeTab('profile');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Top Banner & Control HUD */}
      <div className="bento-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D4FF00] text-[#09090B] flex items-center justify-center font-bold shadow-[0_0_15px_rgba(212,255,0,0.3)]">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-xl font-heading font-black text-white">
              {t.roster.title}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t.roster.subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls & Coach Filter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowHandbookModal(true)}
            className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen size={14} className="text-[#D4FF00]" />
            <span>{t.roster.handbookBtn}</span>
          </button>

          {/* Coach Dropdown Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCoachDropdownOpen(!isCoachDropdownOpen)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer min-w-[12rem] justify-between"
            >
              <span className="truncate">
                {selectedCoachId === 'all'
                  ? t.roster.allCoaches
                  : selectedCoachId === 'unassigned'
                    ? t.roster.unassigned
                    : (coaches.find(c => c.id === selectedCoachId)?.full_name || t.roster.coachFilter)}
              </span>
              <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isCoachDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isCoachDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCoachDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 rtl:right-auto rtl:left-0 z-50 mt-1.5 w-60 bg-[#121215] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden py-1 text-xs font-bold"
                  >
                    <button
                      onClick={() => { setSelectedCoachId('all'); setIsCoachDropdownOpen(false); }}
                      className={`w-full text-left rtl:text-right px-4 py-2 hover:bg-[#D4FF00]/15 ${selectedCoachId === 'all' ? 'text-[#D4FF00] font-black' : 'text-zinc-300'}`}
                    >
                      {t.roster.allCoaches}
                    </button>
                    <button
                      onClick={() => { setSelectedCoachId('unassigned'); setIsCoachDropdownOpen(false); }}
                      className={`w-full text-left rtl:text-right px-4 py-2 hover:bg-[#D4FF00]/15 ${selectedCoachId === 'unassigned' ? 'text-[#D4FF00] font-black' : 'text-zinc-300'}`}
                    >
                      {t.roster.unassigned}
                    </button>
                    {coaches.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCoachId(c.id); setIsCoachDropdownOpen(false); }}
                        className={`w-full text-left rtl:text-right px-4 py-2 hover:bg-[#D4FF00]/15 ${selectedCoachId === c.id ? 'text-[#D4FF00] font-black' : 'text-zinc-300'}`}
                      >
                        {c.full_name}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Filter & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder={t.roster.searchPlaceholder}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-9 rtl:pl-3 rtl:pr-9 font-bold"
          />
        </div>

        {/* Gender Filter & View Mode */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 font-bold">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${genderFilter === 'all' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.roster.allGenders}
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${genderFilter === 'male' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.roster.malesOnly}
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${genderFilter === 'female' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              {t.roster.femalesOnly}
            </button>
          </div>

          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'table' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Roster Grid / Table */}
      {filteredPlayers.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map(player => {
              const age = getPlayerAge(player);
              const score = latestScores[player.id] || { cmj: null, approach: null, rsi: null };
              const cmjVal = score.cmj ? parseFloat(String(score.cmj.jump_height_cm)) : null;
              const approachVal = score.approach ? parseFloat(String(score.approach.jump_height_cm)) : null;
              const rsiVal = score.rsi ? parseFloat(String(score.rsi.rsi_score)) : null;

              return (
                <div
                  key={player.id}
                  className="bento-card p-5 flex flex-col justify-between hover:border-[#D4FF00]/50 transition-all cursor-pointer group"
                  onClick={() => handleSelectAthlete(player)}
                >
                  <div>
                    {/* Header: Name, Age, Status */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 group-hover:bg-[#D4FF00] text-zinc-300 group-hover:text-[#09090B] font-mono font-bold flex items-center justify-center text-xs transition-colors border border-zinc-800">
                          {player.full_name ? player.full_name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-[#D4FF00] transition-colors">
                            {player.full_name}
                          </h4>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {player.gender === 'female' ? t.common.female : t.common.male} • {player.weight_kg} kg • {age} {t.roster.years}
                          </span>
                        </div>
                      </div>

                      <ArrowUpRight size={16} className="text-zinc-600 group-hover:text-[#D4FF00] transition-colors" />
                    </div>

                    {/* Scores Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80 font-mono text-center my-3">
                      <div>
                        <span className="text-[9px] text-zinc-500 block uppercase">{t.roster.cmjStatic}</span>
                        <span className="text-sm font-bold text-[#D4FF00]">
                          {cmjVal ? `${cmjVal.toFixed(1)}` : '—'}
                        </span>
                        <div className="mt-1">{getStatusBadge(cmjVal, 'cmj', player.gender, age)}</div>
                      </div>

                      <div>
                        <span className="text-[9px] text-zinc-500 block uppercase">{t.roster.approachDynamic}</span>
                        <span className="text-sm font-bold text-white">
                          {approachVal ? `${approachVal.toFixed(1)}` : '—'}
                        </span>
                        <div className="mt-1">{getStatusBadge(approachVal, 'approach', player.gender, age)}</div>
                      </div>

                      <div>
                        <span className="text-[9px] text-zinc-500 block uppercase">{t.roster.rsiReactive}</span>
                        <span className="text-sm font-bold text-[#FF5500]">
                          {rsiVal ? `${rsiVal.toFixed(2)}` : '—'}
                        </span>
                        <div className="mt-1">{getStatusBadge(rsiVal, 'rsi', player.gender, age)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Reach: {player.standing_reach_cm || Math.round(Number(player.height_cm || 178) * 1.32)} cm
                    </span>
                    <span className="text-[11px] font-bold text-[#D4FF00] group-hover:underline">
                      {t.roster.viewProfile} →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bento-card p-6 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="py-3 px-3">Athlete</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">{t.roster.cmjStatic}</th>
                  <th className="py-3 px-3">{t.roster.approachDynamic}</th>
                  <th className="py-3 px-3">{t.roster.rsiReactive}</th>
                  <th className="py-3 px-3 text-right rtl:text-left">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {filteredPlayers.map(player => {
                  const age = getPlayerAge(player);
                  const score = latestScores[player.id] || { cmj: null, approach: null, rsi: null };
                  const cmjVal = score.cmj ? parseFloat(String(score.cmj.jump_height_cm)) : null;
                  const approachVal = score.approach ? parseFloat(String(score.approach.jump_height_cm)) : null;
                  const rsiVal = score.rsi ? parseFloat(String(score.rsi.rsi_score)) : null;

                  return (
                    <tr
                      key={player.id}
                      onClick={() => handleSelectAthlete(player)}
                      className="hover:bg-zinc-900/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-white">
                        {player.full_name}
                      </td>
                      <td className="py-3 px-3 text-zinc-400">
                        {player.gender === 'female' ? t.common.female : t.common.male} • {player.weight_kg} kg
                      </td>
                      <td className="py-3 px-3 font-bold text-[#D4FF00]">
                        {cmjVal ? `${cmjVal.toFixed(1)} cm` : '—'}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {approachVal ? `${approachVal.toFixed(1)} cm` : '—'}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#FF5500]">
                        {rsiVal ? rsiVal.toFixed(2) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right rtl:text-left font-sans">
                        <button className="text-[11px] font-bold text-[#D4FF00] hover:underline">
                          {t.roster.viewProfile}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="bento-card p-12 text-center text-zinc-500 font-mono text-xs">
          {t.roster.emptyDesc}
        </div>
      )}

      {/* =========================================================================
          HANDBOOK MODAL (EGYPTIAN & INTERNATIONAL STANDARDS)
      ========================================================================= */}
      <AnimatePresence>
        {showHandbookModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bento-card bg-[#121215] border border-[#27272A] p-6 w-full max-w-2xl rounded-3xl shadow-2xl relative max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                <h3 className="text-lg font-heading font-black text-white flex items-center gap-2">
                  <BookOpen size={20} className="text-[#D4FF00]" />
                  {t.roster.handbookTitle}
                </h3>
                <button
                  onClick={() => setShowHandbookModal(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-zinc-900"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Handbook Tabs */}
              <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-bold mb-4 font-mono">
                <button
                  onClick={() => setActiveHandbookTab('men')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeHandbookTab === 'men' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
                >
                  {t.roster.menTab}
                </button>
                <button
                  onClick={() => setActiveHandbookTab('women')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeHandbookTab === 'women' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
                >
                  {t.roster.womenTab}
                </button>
                <button
                  onClick={() => setActiveHandbookTab('rsi')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeHandbookTab === 'rsi' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
                >
                  {t.roster.rsiTab}
                </button>
                <button
                  onClick={() => setActiveHandbookTab('juniors')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeHandbookTab === 'juniors' ? 'bg-[#D4FF00] text-[#09090B]' : 'text-zinc-400 hover:text-white'}`}
                >
                  {t.roster.juniorsTab}
                </button>
              </div>

              {/* Handbook Content */}
              <div className="space-y-3 text-xs">
                {activeHandbookTab === 'men' && (
                  <div className="space-y-2.5 font-mono">
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="badge-volt text-[10px] px-2 py-0.5 rounded font-bold">ELITE 🏆</span>
                      <p className="text-white font-bold text-sm mt-1">&gt; 34 inches (86.4+ cm)</p>
                      <p className="text-zinc-400 text-[11px] font-sans mt-0.5">International Olympics & Premier League elite volleyball/basketball jump standard.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="badge-emerald text-[10px] px-2 py-0.5 rounded font-bold">EXCELLENT ⭐</span>
                      <p className="text-white font-bold text-sm mt-1">30 to 33.9 inches (76.2 - 86.1 cm)</p>
                      <p className="text-zinc-400 text-[11px] font-sans mt-0.5">High professional national league caliber (Al Ahly, Zamalek, Sporting starters).</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="badge-amber text-[10px] px-2 py-0.5 rounded font-bold">GOOD ⚡</span>
                      <p className="text-white font-bold text-sm mt-1">26 to 29.9 inches (66.0 - 75.9 cm)</p>
                      <p className="text-zinc-400 text-[11px] font-sans mt-0.5">Standard acceptable benchmark for competitive team sport athletes.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="badge-rose text-[10px] px-2 py-0.5 rounded font-bold">DEVELOPMENT ⚠️</span>
                      <p className="text-white font-bold text-sm mt-1">&lt; 26 inches (&lt; 66 cm)</p>
                      <p className="text-zinc-400 text-[11px] font-sans mt-0.5">Requires prioritized RFD and triple extension explosive strength training.</p>
                    </div>
                  </div>
                )}

                {activeHandbookTab === 'women' && (
                  <div className="space-y-2.5 font-mono">
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="badge-volt text-[10px] px-2 py-0.5 rounded font-bold">ELITE 🏆</span>
                      <p className="text-white font-bold text-sm mt-1">&gt; 26 inches (66.0+ cm)</p>
                      <p className="text-zinc-400 text-[11px] font-sans mt-0.5">Olympic level and international elite female athletes.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="badge-emerald text-[10px] px-2 py-0.5 rounded font-bold">EXCELLENT ⭐</span>
                      <p className="text-white font-bold text-sm mt-1">22 to 25.9 inches (55.8 - 65.7 cm)</p>
                      <p className="text-zinc-400 text-[11px] font-sans mt-0.5">Elite national league starters.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="badge-amber text-[10px] px-2 py-0.5 rounded font-bold">GOOD ⚡</span>
                      <p className="text-white font-bold text-sm mt-1">18 to 21.9 inches (45.7 - 55.6 cm)</p>
                      <p className="text-zinc-400 text-[11px] font-sans mt-0.5">Standard competitive benchmark.</p>
                    </div>
                  </div>
                )}

                {activeHandbookTab === 'rsi' && (
                  <div className="space-y-2.5 font-mono">
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="badge-volt text-[10px] px-2 py-0.5 rounded font-bold">ELITE 🏆</span>
                      <p className="text-white font-bold text-sm mt-1">RSI &gt; 3.0</p>
                      <p className="text-zinc-400 text-[11px] font-sans mt-0.5">Extremely fast ground contact (&lt;170ms) with elite tendon stiffness recoil.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="badge-emerald text-[10px] px-2 py-0.5 rounded font-bold">EXCELLENT ⭐</span>
                      <p className="text-white font-bold text-sm mt-1">RSI 2.5 to 2.99</p>
                      <p className="text-zinc-400 text-[11px] font-sans mt-0.5">Rapid elastic energy storage and release.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <span className="badge-amber text-[10px] px-2 py-0.5 rounded font-bold">GOOD ⚡</span>
                      <p className="text-white font-bold text-sm mt-1">RSI 2.0 to 2.49</p>
                      <p className="text-zinc-400 text-[11px] font-sans mt-0.5">Balanced contact time.</p>
                    </div>
                  </div>
                )}

                {activeHandbookTab === 'juniors' && (
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 font-sans space-y-2 text-zinc-300">
                    <p className="font-bold text-white text-sm">
                      {t.roster.juniorFlag}
                    </p>
                    <p className="text-[11px] leading-relaxed text-zinc-400">
                      Athletes under 17 years old automatically receive an age-maturity normalization factor of 0.85 (15% reduction in difficult threshold ceilings) to accurately evaluate their biological growth stage without penalizing developing tendons.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
