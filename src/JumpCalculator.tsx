import React, { useState, lazy, Suspense } from 'react';
import {
  Activity, Zap, LineChart, ScanEye, UserCircle, Edit3, Trash2, Plus, X,
  Save, ChevronDown, Moon, Sun, Users, Trophy, Globe, Star, Sparkles
} from 'lucide-react';
import { useData } from './context/DataContext';
import { getBirthYear } from './lib/utils';
import TeamDashboard from './TeamDashboard';
import { ScreenLoading, ScreenError } from './components/ScreenStates';

// Heavy screens are code-split and loaded on first use
const PlayerProfile = lazy(() => import('./PlayerProfile'));
const RSICalculator = lazy(() => import('./RSICalculator'));
const FVPCalculator = lazy(() => import('./FVPCalculator'));
const JumpTestingConsole = lazy(() => import('./JumpTestingConsole'));
const Leaderboard = lazy(() => import('./Leaderboard'));
const ManualEntryConsole = lazy(() => import('./ManualEntryConsole'));
import AppLogo from './AppLogo';
import type { ActiveTabType } from './types/athletics';

export default function JumpCalculator() {
  const {
    players,
    coaches,
    selectedPlayerId,
    activePlayer,
    playerHistory,
    isSyncing,
    language,
    setLanguage,
    t,
    setSelectedPlayerId,
    addPlayer,
    updatePlayer,
    deletePlayer,
    addCoach,
    deleteCoach,
    toggleFavoritePlayer,
    favoritePlayerIds,
    isLoading,
    loadError,
    refreshData,
  } = useData();

  const [activeTab, setActiveTab] = useState<ActiveTabType>('team');


  // Modals state
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    birthYear: '',
    weight: '',
    leg: '',
    gender: 'male',
    height: '',
    standingReach: '',
    squatHeight: '',
    coachId: ''
  });

  const [showCoachModal, setShowCoachModal] = useState(false);
  const [newCoachName, setNewCoachName] = useState('');

  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [editPlayerForm, setEditPlayerForm] = useState({
    id: '',
    name: '',
    birthYear: '',
    weight: '',
    leg: '',
    gender: '',
    height: '',
    standingReach: '',
    squatHeight: '',
    coachId: ''
  });

  // Selector Dropdown state
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [expandedCoaches, setExpandedCoaches] = useState<Record<string, boolean>>({ unassigned: true });

  const toggleCoachSelector = (coachId: string) => {
    setExpandedCoaches(prev => ({
      ...prev,
      [coachId]: !prev[coachId]
    }));
  };

  const handleSelectPlayerFromDashboard = (player: any) => {
    setSelectedPlayerId(player.id);
    setActiveTab('profile');
  };

  const handleEditPlayer = (player: any) => {
    setEditPlayerForm({
      id: player.id,
      name: player.full_name || '',
      birthYear: getBirthYear(player) ? String(getBirthYear(player)) : '',
      weight: player.weight_kg ? String(player.weight_kg) : '',
      leg: player.leg_length_m ? String(player.leg_length_m) : '',
      gender: player.gender || 'male',
      height: player.height_cm ? String(player.height_cm) : '',
      standingReach: player.standing_reach_cm ? String(player.standing_reach_cm) : '',
      squatHeight: player.hpo_m && player.leg_length_m ? String(Number((player.leg_length_m - player.hpo_m).toFixed(3))) : '',
      coachId: player.coach_id || ''
    });
    setIsEditingPlayer(true);
  };

  const handleRegisterCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoachName.trim()) return;
    await addCoach(newCoachName.trim());
    setNewCoachName('');
    setShowCoachModal(false);
  };

  const handleDeleteCoach = async (coachId: string, coachName: string) => {
    if (!window.confirm(`${t.common.confirmDelete} (${coachName})`)) return;
    await deleteCoach(coachId);
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayer.name) return;
    const created = await addPlayer(newPlayer);
    if (created) {
      setNewPlayer({ name: '', birthYear: '', weight: '', leg: '', gender: 'male', height: '', standingReach: '', squatHeight: '', coachId: '' });
      setShowNewPlayerForm(false);
      setActiveTab('profile');
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlayerForm.id) return;
    const success = await updatePlayer(editPlayerForm.id, editPlayerForm);
    if (success) {
      setIsEditingPlayer(false);
    }
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (!window.confirm(`${t.common.confirmDelete} (${name})`)) return;
    await deletePlayer(id);
    setIsEditingPlayer(false);
  };

  // Strictly 7 Tabs (without sprint and vbt)
  const tabs = [
    {
      id: 'team' as ActiveTabType,
      name: t.nav.roster,
      shortName: t.nav.rosterShort,
      tag: t.nav.rosterTag,
      icon: Users,
      requiresPlayer: false,
    },
    {
      id: 'calculator' as ActiveTabType,
      name: t.nav.verticalJump,
      shortName: t.nav.verticalJumpShort,
      tag: t.nav.verticalJumpTag,
      icon: Activity,
      requiresPlayer: true,
    },
    {
      id: 'manual' as ActiveTabType,
      name: t.nav.manualEntry,
      shortName: t.nav.manualEntryShort,
      tag: t.nav.manualEntryTag,
      icon: Edit3,
      requiresPlayer: true,
    },
    {
      id: 'rsi' as ActiveTabType,
      name: t.nav.rsiCalculator,
      shortName: t.nav.rsiCalculatorShort,
      tag: t.nav.rsiCalculatorTag,
      icon: Zap,
      requiresPlayer: true,
    },
    {
      id: 'fvp' as ActiveTabType,
      name: t.nav.fvpCurve,
      shortName: t.nav.fvpCurveShort,
      tag: t.nav.fvpCurveTag,
      icon: LineChart,
      requiresPlayer: true,
    },
    {
      id: 'profile' as ActiveTabType,
      name: t.nav.athleteProfile,
      shortName: t.nav.athleteProfileShort,
      tag: t.nav.athleteProfileTag,
      icon: UserCircle,
      requiresPlayer: true,
    },
    {
      id: 'leaderboard' as ActiveTabType,
      name: t.nav.leaderboard,
      shortName: t.nav.leaderboardShort,
      tag: t.nav.leaderboardTag,
      icon: Trophy,
      requiresPlayer: false,
    },
  ];

  return (
    <div
      className={`min-h-screen bg-bg text-text pb-[calc(env(safe-area-inset-bottom)+104px)] lg:pb-8 flex flex-col ${
        language === 'ar' ? 'font-arabic' : 'font-sans'
      }`}
    >
      <div className="w-full max-w-[1600px] mx-auto flex-1 flex flex-col p-3 md:p-6 pb-2 gap-5">
        
        {/* =========================================================================
            TOP COMMAND HEADER HUD (CARBON & ACID VOLT)
        ========================================================================= */}
        <header className="relative z-[110] w-full bg-surface border border-border p-4 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-4 shadow-2xl">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center justify-between lg:justify-start w-full lg:w-auto gap-4">
            <div className="flex items-center gap-3">
              <AppLogo size={42} showGlow={true} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-heading font-black tracking-wider text-white">
                    {t.hud.appTitle}
                  </h1>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-accent text-accent-ink uppercase tracking-widest font-mono">
                    {t.hud.versionBadge}
                  </span>
                </div>
                <p className="text-[10px] text-muted font-bold">
                  {t.hud.appSubtitle}
                </p>
              </div>
            </div>

            {/* Sync Indicator & Mobile Controls */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-border font-mono text-[10px]">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-accent animate-ping' : 'bg-accent shadow-[0_0_8px_#D97757]'}`} />
                <span className={isSyncing ? 'text-accent' : 'text-zinc-300'}>
                  {isSyncing ? t.nav.syncing : t.nav.synced}
                </span>
              </div>

              {/* Segmented Language Toggle (EN | عربي) */}
              <div className="flex items-center bg-surface-2 p-1 rounded-xl border border-border shadow-sm font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    language === 'en' ? 'bg-accent text-accent-ink shadow-sm' : 'text-muted hover:text-accent-ink'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    language === 'ar' ? 'bg-accent text-accent-ink shadow-sm' : 'text-muted hover:text-accent-ink'
                  }`}
                >
                  عربي
                </button>
              </div>
            </div>
          </div>

          {/* Quick HUD Actions & Athlete Selector */}
          <div className="flex flex-row sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Quick Action: Register Coach */}
            <button
              onClick={() => setShowCoachModal(true)}
              className="p-2.5 sm:px-3.5 sm:py-2.5 bg-surface-2 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
              title={t.hud.addCoach}
            >
              <Users size={14} className="text-accent" />
              <span className="hidden sm:inline">{t.hud.addCoach}</span>
            </button>

            {/* Quick Action: Register Athlete */}
            <button
              onClick={() => setShowNewPlayerForm(true)}
              className="btn-volt p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
              title={t.hud.addAthlete}
            >
              <Plus size={15} />
              <span className="hidden sm:inline">{t.hud.addAthlete}</span>
            </button>

            {/* Athlete Accordion Dropdown Selector */}
            <div className="relative flex-1 sm:flex-initial sm:w-64 z-[120]">
              <button
                type="button"
                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                className="w-full bg-surface-2 text-white border border-border hover:border-border rounded-xl py-2.5 px-3.5 outline-none transition-all cursor-pointer font-bold text-xs flex items-center justify-between shadow-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <UserCircle size={16} className="text-accent shrink-0" />
                  <span className="truncate">
                    {activePlayer ? activePlayer.full_name : t.hud.selectAthlete}
                  </span>
                </span>
                <ChevronDown size={14} className={`text-muted transition-transform ${isSelectorOpen ? 'rotate-180' : ''}`} />
              </button>

              <>
                {isSelectorOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSelectorOpen(false)} />
                    <div className={`absolute ${language === 'en' ? 'left-0' : 'right-0'} z-50 mt-1.5 w-full bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden max-h-80 flex flex-col`}>
                      
                      {/* Search Bar Input */}
                      <div className="p-2 border-b border-border bg-surface sticky top-0 z-10">
                        <input
                          type="text"
                          placeholder={t.hud.searchAthletePlaceholder}
                          value={headerSearchQuery}
                          onChange={(e) => setHeaderSearchQuery(e.target.value)}
                          autoFocus
                          className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-accent placeholder:text-faint"
                        />
                      </div>

                      <div className="overflow-y-auto max-h-64 divide-y divide-border/80 custom-scrollbar">
                        {headerSearchQuery.trim() ? (
                          <div className="py-1">
                            {players
                              .filter(p => p.full_name?.toLowerCase().includes(headerSearchQuery.toLowerCase().trim()))
                              .map(p => {
                                const isFav = favoritePlayerIds.includes(p.id);
                                return (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      setSelectedPlayerId(p.id);
                                      setIsSelectorOpen(false);
                                      setHeaderSearchQuery('');
                                    }}
                                    className={`w-full px-4 py-2.5 flex items-center justify-between text-xs hover:bg-accent/10 transition-colors cursor-pointer ${
                                      selectedPlayerId === p.id ? 'bg-accent/15 text-accent font-black' : 'text-zinc-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-lg bg-zinc-800 text-accent font-black flex items-center justify-center text-[10px] border border-border">
                                        {p.full_name ? p.full_name[0] : 'P'}
                                      </div>
                                      <span className="font-bold">{p.full_name}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-muted">{p.weight_kg}kg</span>
                                      <button
                                        type="button"
                                        onClick={(e) => toggleFavoritePlayer(p.id, e)}
                                        className="p-1 hover:scale-125 transition-transform"
                                      >
                                        <Star size={13} className={isFav ? "text-accent fill-accent" : "text-faint hover:text-accent"} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            {players.filter(p => p.full_name?.toLowerCase().includes(headerSearchQuery.toLowerCase().trim())).length === 0 && (
                              <div className="p-4 text-center text-xs text-faint font-bold">
                                {t.hud.noMatchingAthletes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* FAVORITE ATHLETES SECTION */}
                            {favoritePlayerIds.length > 0 && (
                              <div className="border-b border-border bg-accent/5 py-1">
                                <div className="px-3 py-1.5 text-[10px] font-black text-accent uppercase tracking-wider flex items-center gap-1.5 font-mono">
                                  <Star size={12} className="fill-accent text-accent" />
                                  <span>{t.hud.favorites} ({favoritePlayerIds.filter(id => players.some(p => p.id === id)).length})</span>
                                </div>

                                {players
                                  .filter(p => favoritePlayerIds.includes(p.id))
                                  .map(p => (
                                    <div
                                      key={p.id}
                                      onClick={() => {
                                        setSelectedPlayerId(p.id);
                                        setIsSelectorOpen(false);
                                      }}
                                      className={`w-full px-4 py-2 flex items-center justify-between text-xs hover:bg-accent/15 transition-colors cursor-pointer ${
                                        selectedPlayerId === p.id ? 'bg-accent/20 text-accent font-black' : 'text-zinc-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-md bg-accent/20 text-accent font-bold flex items-center justify-center text-[10px]">
                                          {p.full_name ? p.full_name[0] : 'P'}
                                        </div>
                                        <span className="font-bold">{p.full_name}</span>
                                      </div>
                                      <span className="text-[10px] font-mono text-muted">{p.weight_kg}kg</span>
                                    </div>
                                  ))}
                              </div>
                            )}

                            {/* COACHES GROUPED SECTION */}
                            {coaches.map(coach => {
                              const coachPlayers = players.filter(p => p.coach_id === coach.id);
                              const isExpanded = !!expandedCoaches[coach.id];
                              return (
                                <div key={coach.id} className="border-b border-border/60 last:border-b-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleCoachSelector(coach.id)}
                                    className="w-full px-3 py-2 bg-surface-2/60 hover:bg-zinc-800/80 flex items-center justify-between text-xs font-bold text-zinc-300 transition-colors"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <span>📋 {coach.full_name}</span>
                                      <span className="text-[10px] font-mono text-faint">({coachPlayers.length})</span>
                                    </span>
                                    <ChevronDown size={12} className={`text-faint transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>

                                  {isExpanded && (
                                    <div className="bg-bg/40 py-1">
                                      {coachPlayers.map(p => {
                                        const isFav = favoritePlayerIds.includes(p.id);
                                        return (
                                          <div
                                            key={p.id}
                                            onClick={() => {
                                              setSelectedPlayerId(p.id);
                                              setIsSelectorOpen(false);
                                            }}
                                            className={`w-full px-5 py-2 flex items-center justify-between text-xs hover:bg-accent/10 transition-colors cursor-pointer ${
                                              selectedPlayerId === p.id ? 'bg-accent/15 text-accent font-bold' : 'text-zinc-300'
                                            }`}
                                          >
                                            <span>{p.full_name}</span>
                                            <button
                                              type="button"
                                              onClick={(e) => toggleFavoritePlayer(p.id, e)}
                                              className="p-1 hover:scale-125 transition-transform"
                                            >
                                              <Star size={13} className={isFav ? "text-accent fill-accent" : "text-faint hover:text-accent"} />
                                            </button>
                                          </div>
                                        );
                                      })}
                                      {coachPlayers.length === 0 && (
                                        <span className="block px-5 py-1.5 text-[10px] text-faint">
                                          {t.roster.emptyTitle}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* UNASSIGNED PLAYERS */}
                            {players.filter(p => !p.coach_id || !coaches.some(c => c.id === p.coach_id)).length > 0 && (() => {
                              const unassigned = players.filter(p => !p.coach_id || !coaches.some(c => c.id === p.coach_id));
                              const isExpanded = !!expandedCoaches['unassigned'];
                              return (
                                <div className="border-b border-border/60 last:border-b-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleCoachSelector('unassigned')}
                                    className="w-full px-3 py-2 bg-surface-2/60 hover:bg-zinc-800/80 flex items-center justify-between text-xs font-bold text-muted transition-colors"
                                  >
                                    <span>👤 {t.hud.unassignedAthletes} ({unassigned.length})</span>
                                    <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                  {isExpanded && (
                                    <div className="bg-bg/40 py-1">
                                      {unassigned.map(p => {
                                        const isFav = favoritePlayerIds.includes(p.id);
                                        return (
                                          <div
                                            key={p.id}
                                            onClick={() => {
                                              setSelectedPlayerId(p.id);
                                              setIsSelectorOpen(false);
                                            }}
                                            className={`w-full px-5 py-2 flex items-center justify-between text-xs hover:bg-accent/10 transition-colors cursor-pointer ${
                                              selectedPlayerId === p.id ? 'bg-accent/15 text-accent font-bold' : 'text-zinc-300'
                                            }`}
                                          >
                                            <span>{p.full_name}</span>
                                            <button
                                              type="button"
                                              onClick={(e) => toggleFavoritePlayer(p.id, e)}
                                              className="p-1 hover:scale-125 transition-transform"
                                            >
                                              <Star size={13} className={isFav ? "text-accent fill-accent" : "text-faint hover:text-accent"} />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            </div>
          </div>
        </header>

        {/* =========================================================================
            COMMAND WORKSPACE (PERSISTENT SIDEBAR + MAIN WORKSPACE)
        ========================================================================= */}
        <div className="flex-1 flex flex-col lg:flex-row gap-5 items-start min-h-0">
          
          {/* Desktop Persistent Command Sidebar */}
          <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-surface border border-border rounded-3xl p-3.5 shadow-2xl sticky top-6 justify-between gap-4">
            <div className="space-y-1.5">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted flex items-center justify-between border-b border-border pb-2 mb-2 font-mono">
                <span className="flex items-center gap-1.5">
                  <Activity size={13} className="text-accent" />
                  {t.nav.telemetryModules}
                </span>
                <span className="flex items-center gap-1 text-[9px] text-success font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  {t.nav.systemOnline}
                </span>
              </div>

              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isDisabled = tab.requiresPlayer && !activePlayer;

                return (
                  <button
                    key={tab.id}
                    disabled={isDisabled}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-2xl transition-all duration-200 flex items-center gap-3 relative group cursor-pointer ${
                      isActive 
                        ? 'bg-accent/10 border border-accent/50 text-accent font-black' 
                        : isDisabled
                          ? 'opacity-35 cursor-not-allowed text-faint'
                          : 'text-muted hover:text-white hover:bg-surface-2 border border-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-all shrink-0 ${
                      isActive ? 'bg-accent text-accent-ink font-bold' : 'bg-surface-2 text-muted group-hover:text-accent-ink'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">
                        {tab.name}
                      </div>
                      <div className="text-[10px] text-faint truncate font-mono">
                        {tab.tag}
                      </div>
                    </div>
                    {isActive && (
                      <div
                       
                        className="w-1.5 h-6 rounded-full bg-accent shadow-[0_0_10px_#D97757]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sidebar Active Athlete Status & Mini Telemetry Card */}
            <div className="pt-3 border-t border-border">
              {activePlayer ? (
                <div 
                  onClick={() => setActiveTab('profile')}
                  className="p-2.5 rounded-2xl bg-surface-2/60 border border-border hover:border-accent/50 cursor-pointer transition-all flex items-center gap-2.5"
                  title={t.profile.athleteDossier}
                >
                  <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-xs font-black text-accent-ink shrink-0 font-mono shadow-md">
                    {activePlayer.full_name ? activePlayer.full_name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{activePlayer.full_name}</p>
                    <p className="text-[10px] text-accent font-mono">
                      {activePlayer.weight_kg} kg • {playerHistory.length} tests
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-2xl bg-surface-2/40 border border-border text-center">
                  <p className="text-[10px] text-muted font-bold">{t.hud.noActiveAthlete}</p>
                  <button
                    onClick={() => setIsSelectorOpen(true)}
                    className="mt-1 text-[10px] text-accent hover:underline font-bold cursor-pointer"
                  >
                    {t.hud.selectAthleteHint}
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* ================= MAIN CONTENT WORKSPACE ================= */}
          <main className="flex-1 min-w-0 w-full">
            <Suspense fallback={<ScreenLoading />}>
            <>
              {loadError && players.length === 0 ? (
                <ScreenError key="load-error" message={loadError} onRetry={refreshData} />
              ) : isLoading && players.length === 0 ? (
                <ScreenLoading key="loading" />
              ) : activeTab === 'team' ? (
                <div key="team" className="animate-fade-in">
                  <TeamDashboard 
                    onSelectPlayer={handleSelectPlayerFromDashboard} 
                    onChangeTab={(tab: string) => setActiveTab(tab as ActiveTabType)} 
                    coaches={coaches}
                    onEditPlayer={handleEditPlayer}
                    language={language}
                  />
                </div>
              ) : activeTab === 'leaderboard' ? (
                <div key="leaderboard" className="animate-fade-in">
                  <Leaderboard 
                    onSelectPlayer={handleSelectPlayerFromDashboard} 
                    onChangeTab={(tab: string) => setActiveTab(tab as ActiveTabType)} 
                    language={language}
                  />
                </div>
              ) : activePlayer ? (
                <div key={activeTab} className="animate-fade-in">
                  {activeTab === 'calculator' && (
                    <JumpTestingConsole
                      activePlayer={activePlayer}
                      selectedPlayerId={selectedPlayerId}
                      language={language}
                      playerHistory={playerHistory}
                    />
                  )}

                  {activeTab === 'manual' && (
                    <ManualEntryConsole
                      activePlayer={activePlayer}
                      selectedPlayerId={selectedPlayerId}
                      language={language}
                      playerHistory={playerHistory}
                    />
                  )}

                  {activeTab === 'rsi' && (
                    <RSICalculator 
                      activePlayer={activePlayer} 
                      selectedPlayerId={selectedPlayerId} 
                      language={language} 
                      playerHistory={playerHistory} 
                    />
                  )}

                  {activeTab === 'fvp' && (
                    <FVPCalculator 
                      activePlayer={activePlayer} 
                      selectedPlayerId={selectedPlayerId} 
                      language={language} 
                    />
                  )}

                  {activeTab === 'profile' && (
                    <PlayerProfile 
                      onEditPlayer={handleEditPlayer}
                      onNavigateTab={(tab: string) => setActiveTab(tab as ActiveTabType)}
                    />
                  )}
                </div>
              ) : (
                <div key="empty-state" className="bento-card p-12 text-center text-muted shadow-2xl flex flex-col items-center justify-center max-w-xl mx-auto my-8">
                  <div className="p-4 rounded-3xl bg-accent/10 border border-accent/20 text-accent mb-4">
                    <ScanEye size={48} />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading font-black text-white mb-2">
                    {t.profile.noAthleteTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-md mx-auto mb-6">
                    {t.profile.noAthleteDesc}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setActiveTab('team')}
                      className="btn-volt px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <Users size={16} />
                      <span>{t.roster.title}</span>
                    </button>
                    <button
                      onClick={() => setShowNewPlayerForm(true)}
                      className="px-5 py-2.5 bg-surface-2 hover:bg-zinc-800 border border-border text-zinc-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Plus size={16} />
                      <span>{t.hud.addAthlete}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
            </Suspense>
          </main>
        </div>

        {/* =========================================================================
            MOBILE BOTTOM DOCK NAVIGATION (CARBON & ACID VOLT, lg:hidden)
        ========================================================================= */}
        <nav className="fixed bottom-[calc(env(safe-area-inset-bottom)+8px)] inset-x-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[100] max-w-[98%] bg-surface/90 backdrop-blur-xl border border-border rounded-3xl p-1.5 flex items-center justify-start sm:justify-center gap-1 shadow-2xl overflow-x-auto custom-scrollbar lg:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.requiresPlayer && !activePlayer;
            return (
              <button
                key={tab.id}
                disabled={isDisabled}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative shrink-0 flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl transition-colors duration-200 select-none min-w-[56px] min-h-[48px] cursor-pointer ${
                  isActive 
                    ? 'bg-accent text-accent-ink font-black' 
                    : isDisabled 
                      ? 'text-faint opacity-40 cursor-not-allowed' 
                      : 'text-muted hover:text-accent-ink'
                }`}
              >
                <Icon size={16} />
                <span className="text-[11px] mt-0.5 font-bold truncate">
                  {tab.shortName}
                </span>
                {isActive && (
                  <div 
                   
                    className="w-1 h-1 rounded-full bg-bg mt-0.5"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* =========================================================================
          NEW ATHLETE MODAL (CARBON & VOLT)
      ========================================================================= */}
      <>
        {showNewPlayerForm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bento-card bg-surface border border-border p-6 w-full max-w-lg shadow-2xl relative">
              <button type="button" onClick={() => setShowNewPlayerForm(false)} className={`absolute top-4 ${language === 'en' ? 'right-4' : 'left-4'} text-muted hover:text-white bg-surface-2 p-2 rounded-full border border-border`}>
                <X size={16} />
              </button>
              <h2 className="text-xl font-heading font-black text-white mb-4 border-b border-border pb-2 flex items-center gap-2">
                <Plus className="text-accent" size={22} /> {t.hud.newAthleteTitle}
              </h2>
              <form onSubmit={handleAddPlayer} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-muted block mb-1 font-bold">{t.hud.fullName}</label>
                  <input required type="text" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="glass-input w-full font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.birthYear}</label>
                    <input required type="number" min="1950" max={new Date().getFullYear()} value={newPlayer.birthYear} onChange={e => setNewPlayer({...newPlayer, birthYear: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.gender}</label>
                    <select value={newPlayer.gender} onChange={e => setNewPlayer({...newPlayer, gender: e.target.value})} className="glass-input w-full font-bold bg-surface text-white">
                      <option value="male">{t.common.male}</option>
                      <option value="female">{t.common.female}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.weightKg}</label>
                    <input required type="number" step="0.1" value={newPlayer.weight} onChange={e => setNewPlayer({...newPlayer, weight: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.legLengthM}</label>
                    <input required type="number" step="0.01" value={newPlayer.leg} onChange={e => setNewPlayer({...newPlayer, leg: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.heightCm}</label>
                    <input type="number" value={newPlayer.height} onChange={e => setNewPlayer({...newPlayer, height: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.standingReachCm}</label>
                    <input type="number" value={newPlayer.standingReach} onChange={e => setNewPlayer({...newPlayer, standingReach: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-muted block mb-1 font-bold">{t.hud.squatTrochanterM}</label>
                  <input type="number" step="0.01" inputMode="decimal" value={newPlayer.squatHeight} onChange={e => setNewPlayer({...newPlayer, squatHeight: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  <p className="text-[11px] text-faint mt-1">{t.hud.squatTrochanterHelp}</p>
                  {parseFloat(newPlayer.leg) > 0 && parseFloat(newPlayer.squatHeight) > 0 && (
                    <p className="text-[11px] mt-1 font-mono tabular-nums">{t.hud.hpoLabel}: {(parseFloat(newPlayer.leg) - parseFloat(newPlayer.squatHeight)).toFixed(2)} m</p>
                  )}
                </div>
                <div>
                  <label className="text-muted block mb-1 font-bold">{t.hud.assignedCoach}</label>
                  <select value={newPlayer.coachId} onChange={e => setNewPlayer({...newPlayer, coachId: e.target.value})} className="glass-input w-full font-bold bg-surface text-white">
                    <option value="">{t.hud.noCoach}</option>
                    {coaches.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn-volt w-full py-3 rounded-xl font-black text-xs shadow-lg mt-2 flex justify-center items-center gap-1.5">
                  <Save size={15} /> {t.hud.saveAthlete}
                </button>
              </form>
            </div>
          </div>
        )}
      </>

      {/* =========================================================================
          EDIT ATHLETE MODAL (CARBON & VOLT)
      ========================================================================= */}
      <>
        {isEditingPlayer && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bento-card bg-surface border border-border p-6 w-full max-w-lg shadow-2xl relative">
              <button type="button" onClick={() => setIsEditingPlayer(false)} className={`absolute top-4 ${language === 'en' ? 'right-4' : 'left-4'} text-muted hover:text-white bg-surface-2 p-2 rounded-full border border-border`}>
                <X size={16} />
              </button>
              <h2 className="text-xl font-heading font-black text-white mb-4 border-b border-border pb-2 flex items-center gap-2">
                <Edit3 className="text-accent" size={20} /> {t.profile.editAthlete}
              </h2>
              <form onSubmit={handleUpdatePlayer} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-muted block mb-1 font-bold">{t.hud.fullName}</label>
                  <input required type="text" value={editPlayerForm.name} onChange={e => setEditPlayerForm({...editPlayerForm, name: e.target.value})} className="glass-input w-full font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.birthYear}</label>
                    <input required type="number" min="1950" max={new Date().getFullYear()} value={editPlayerForm.birthYear} onChange={e => setEditPlayerForm({...editPlayerForm, birthYear: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.gender}</label>
                    <select value={editPlayerForm.gender} onChange={e => setEditPlayerForm({...editPlayerForm, gender: e.target.value})} className="glass-input w-full font-bold bg-surface text-white">
                      <option value="male">{t.common.male}</option>
                      <option value="female">{t.common.female}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.weightKg}</label>
                    <input required type="number" step="0.1" value={editPlayerForm.weight} onChange={e => setEditPlayerForm({...editPlayerForm, weight: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.legLengthM}</label>
                    <input required type="number" step="0.01" value={editPlayerForm.leg} onChange={e => setEditPlayerForm({...editPlayerForm, leg: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.heightCm}</label>
                    <input type="number" value={editPlayerForm.height} onChange={e => setEditPlayerForm({...editPlayerForm, height: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-muted block mb-1 font-bold">{t.hud.standingReachCm}</label>
                    <input type="number" value={editPlayerForm.standingReach} onChange={e => setEditPlayerForm({...editPlayerForm, standingReach: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-muted block mb-1 font-bold">{t.hud.squatTrochanterM}</label>
                  <input type="number" step="0.01" inputMode="decimal" value={editPlayerForm.squatHeight} onChange={e => setEditPlayerForm({...editPlayerForm, squatHeight: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  <p className="text-[11px] text-faint mt-1">{t.hud.squatTrochanterHelp}</p>
                  {parseFloat(editPlayerForm.leg) > 0 && parseFloat(editPlayerForm.squatHeight) > 0 && (
                    <p className="text-[11px] mt-1 font-mono tabular-nums">{t.hud.hpoLabel}: {(parseFloat(editPlayerForm.leg) - parseFloat(editPlayerForm.squatHeight)).toFixed(2)} m</p>
                  )}
                </div>
                <div>
                  <label className="text-muted block mb-1 font-bold">{t.hud.assignedCoach}</label>
                  <select value={editPlayerForm.coachId} onChange={e => setEditPlayerForm({...editPlayerForm, coachId: e.target.value})} className="glass-input w-full font-bold bg-surface text-white">
                    <option value="">{t.hud.noCoach}</option>
                    {coaches.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button type="submit" className="btn-volt flex-1 py-3 rounded-xl font-black text-xs shadow-md flex justify-center items-center gap-1.5">
                    <Save size={15} /> {t.common.save}
                  </button>
                  <button type="button" onClick={() => handleDeletePlayer(editPlayerForm.id, editPlayerForm.name)} className="px-4 py-3 rounded-xl text-xs font-bold bg-surface-2/40 border border-danger text-danger hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
                    <Trash2 size={15} /> {t.common.delete}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>

      {/* =========================================================================
          REGISTER COACH MODAL (CARBON & VOLT)
      ========================================================================= */}
      {showCoachModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bento-card bg-surface border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowCoachModal(false)} className={`absolute top-4 ${language === 'en' ? 'right-4' : 'left-4'} text-muted hover:text-white bg-surface-2 p-2 rounded-full border border-border`}>
              <X size={16} />
            </button>
            <h2 className="text-lg font-heading font-black text-white mb-4 border-b border-border pb-2 flex items-center gap-2">
              <Plus className="text-accent" size={20} /> {t.hud.registerCoachTitle}
            </h2>
            <form onSubmit={handleRegisterCoach} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-muted mb-1.5 font-bold">{t.hud.coachFullName}</label>
                <input 
                  required 
                  type="text" 
                  value={newCoachName} 
                  onChange={e => setNewCoachName(e.target.value)} 
                  className="glass-input w-full font-bold" 
                  placeholder={t.hud.coachPlaceholder}
                />
              </div>
              <button type="submit" className="btn-volt w-full py-3 rounded-xl font-black text-xs shadow-lg flex justify-center items-center gap-2">
                <Save size={16} /> {t.hud.saveCoach}
              </button>
            </form>

            {coaches.length > 0 && (
              <div className="mt-6 border-t border-border pt-4">
                <h3 className="text-xs font-bold text-muted mb-2">{t.hud.registeredCoaches}</h3>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar font-mono text-xs">
                  {coaches.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-surface-2/60 p-2.5 rounded-xl border border-border">
                      <span className="text-white font-bold">{c.full_name}</span>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteCoach(c.id, c.full_name)}
                        className="text-danger hover:text-danger p-1.5 hover:bg-danger/10 rounded-lg transition-all cursor-pointer"
                        title={t.hud.deleteCoach}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
