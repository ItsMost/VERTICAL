import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Zap, LineChart, ScanEye, UserCircle, Edit3, Trash2, Plus, X,
  Save, ChevronDown, Moon, Sun, Users, Trophy, Globe, Star, Sparkles
} from 'lucide-react';
import { useData } from './context/DataContext';
import PlayerProfile from './PlayerProfile';
import RSICalculator from './RSICalculator';
import FVPCalculator from './FVPCalculator';
import TeamDashboard from './TeamDashboard';
import JumpTestingConsole from './JumpTestingConsole';
import Leaderboard from './Leaderboard';
import ManualEntryConsole from './ManualEntryConsole';
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
  } = useData();

  const [activeTab, setActiveTab] = useState<ActiveTabType>('team');
  const [colorMode, setColorMode] = useState<string>(() => localStorage.getItem('app_theme') || 'dark');

  useEffect(() => {
    localStorage.setItem('app_theme', colorMode);
    document.documentElement.setAttribute('data-theme', colorMode);
  }, [colorMode]);

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
      birthYear: player.birth_year ? String(player.birth_year) : '',
      weight: player.weight_kg ? String(player.weight_kg) : '',
      leg: player.leg_length_m ? String(player.leg_length_m) : '',
      gender: player.gender || 'male',
      height: player.height_cm ? String(player.height_cm) : '',
      standingReach: player.standing_reach_cm ? String(player.standing_reach_cm) : '',
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
      setNewPlayer({ name: '', birthYear: '', weight: '', leg: '', gender: 'male', height: '', standingReach: '', coachId: '' });
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
      data-theme={colorMode}
      className={`min-h-screen bg-[#09090B] text-[#F4F4F5] transition-all duration-300 pb-24 lg:pb-8 flex flex-col ${
        language === 'ar' ? 'font-arabic' : 'font-sans'
      }`}
      style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
    >
      <div className="w-full max-w-[1600px] mx-auto flex-1 flex flex-col p-3 md:p-6 pb-2 gap-5">
        
        {/* =========================================================================
            TOP COMMAND HEADER HUD (CARBON & ACID VOLT)
        ========================================================================= */}
        <header className="relative z-[110] w-full bg-[#121215] border border-[#27272A] p-4 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-4 shadow-2xl">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center justify-between lg:justify-start w-full lg:w-auto gap-4">
            <div className="flex items-center gap-3">
              <AppLogo size={42} showGlow={true} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-heading font-black tracking-wider text-white">
                    {t.hud.appTitle}
                  </h1>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-[#D4FF00] text-[#09090B] uppercase tracking-widest font-mono shadow-[0_0_12px_rgba(212,255,0,0.35)]">
                    {t.hud.versionBadge}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-bold">
                  {t.hud.appSubtitle}
                </p>
              </div>
            </div>

            {/* Sync Indicator & Mobile Controls */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 font-mono text-[10px]">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-[#FF5500] animate-ping' : 'bg-[#D4FF00] shadow-[0_0_8px_#D4FF00]'}`} />
                <span className={isSyncing ? 'text-[#FF5500]' : 'text-zinc-300'}>
                  {isSyncing ? t.nav.syncing : t.nav.synced}
                </span>
              </div>

              {/* Segmented Language Toggle (EN | عربي) */}
              <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 shadow-sm font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    language === 'en' ? 'bg-[#D4FF00] text-[#09090B] shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    language === 'ar' ? 'bg-[#D4FF00] text-[#09090B] shadow-sm' : 'text-zinc-400 hover:text-white'
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
              className="p-2.5 sm:px-3.5 sm:py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
              title={t.hud.addCoach}
            >
              <Users size={14} className="text-[#D4FF00]" />
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
                className="w-full bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700 rounded-xl py-2.5 px-3.5 outline-none transition-all cursor-pointer font-bold text-xs flex items-center justify-between shadow-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <UserCircle size={16} className="text-[#D4FF00] shrink-0" />
                  <span className="truncate">
                    {activePlayer ? activePlayer.full_name : t.hud.selectAthlete}
                  </span>
                </span>
                <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isSelectorOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isSelectorOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSelectorOpen(false)} />
                    <div className={`absolute ${language === 'en' ? 'left-0' : 'right-0'} z-50 mt-1.5 w-full bg-[#121215] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden max-h-80 flex flex-col`}>
                      
                      {/* Search Bar Input */}
                      <div className="p-2 border-b border-zinc-800 bg-[#121215] sticky top-0 z-10">
                        <input
                          type="text"
                          placeholder={t.hud.searchAthletePlaceholder}
                          value={headerSearchQuery}
                          onChange={(e) => setHeaderSearchQuery(e.target.value)}
                          autoFocus
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#D4FF00] placeholder:text-zinc-500"
                        />
                      </div>

                      <div className="overflow-y-auto max-h-64 divide-y divide-zinc-800/80 custom-scrollbar">
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
                                    className={`w-full px-4 py-2.5 flex items-center justify-between text-xs hover:bg-[#D4FF00]/10 transition-colors cursor-pointer ${
                                      selectedPlayerId === p.id ? 'bg-[#D4FF00]/15 text-[#D4FF00] font-black' : 'text-zinc-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-lg bg-zinc-800 text-[#D4FF00] font-black flex items-center justify-center text-[10px] border border-zinc-700">
                                        {p.full_name ? p.full_name[0] : 'P'}
                                      </div>
                                      <span className="font-bold">{p.full_name}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-zinc-400">{p.weight_kg}kg</span>
                                      <button
                                        type="button"
                                        onClick={(e) => toggleFavoritePlayer(p.id, e)}
                                        className="p-1 hover:scale-125 transition-transform"
                                      >
                                        <Star size={13} className={isFav ? "text-[#D4FF00] fill-[#D4FF00]" : "text-zinc-500 hover:text-[#D4FF00]"} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            {players.filter(p => p.full_name?.toLowerCase().includes(headerSearchQuery.toLowerCase().trim())).length === 0 && (
                              <div className="p-4 text-center text-xs text-zinc-500 font-bold">
                                {t.hud.noMatchingAthletes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* FAVORITE ATHLETES SECTION */}
                            {favoritePlayerIds.length > 0 && (
                              <div className="border-b border-zinc-800 bg-[#D4FF00]/5 py-1">
                                <div className="px-3 py-1.5 text-[10px] font-black text-[#D4FF00] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                                  <Star size={12} className="fill-[#D4FF00] text-[#D4FF00]" />
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
                                      className={`w-full px-4 py-2 flex items-center justify-between text-xs hover:bg-[#D4FF00]/15 transition-colors cursor-pointer ${
                                        selectedPlayerId === p.id ? 'bg-[#D4FF00]/20 text-[#D4FF00] font-black' : 'text-zinc-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-md bg-[#D4FF00]/20 text-[#D4FF00] font-bold flex items-center justify-center text-[10px]">
                                          {p.full_name ? p.full_name[0] : 'P'}
                                        </div>
                                        <span className="font-bold">{p.full_name}</span>
                                      </div>
                                      <span className="text-[10px] font-mono text-zinc-400">{p.weight_kg}kg</span>
                                    </div>
                                  ))}
                              </div>
                            )}

                            {/* COACHES GROUPED SECTION */}
                            {coaches.map(coach => {
                              const coachPlayers = players.filter(p => p.coach_id === coach.id);
                              const isExpanded = !!expandedCoaches[coach.id];
                              return (
                                <div key={coach.id} className="border-b border-zinc-800/60 last:border-b-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleCoachSelector(coach.id)}
                                    className="w-full px-3 py-2 bg-zinc-900/60 hover:bg-zinc-800/80 flex items-center justify-between text-xs font-bold text-zinc-300 transition-colors"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <span>📋 {coach.full_name}</span>
                                      <span className="text-[10px] font-mono text-zinc-500">({coachPlayers.length})</span>
                                    </span>
                                    <ChevronDown size={12} className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>

                                  {isExpanded && (
                                    <div className="bg-zinc-950/40 py-1">
                                      {coachPlayers.map(p => {
                                        const isFav = favoritePlayerIds.includes(p.id);
                                        return (
                                          <div
                                            key={p.id}
                                            onClick={() => {
                                              setSelectedPlayerId(p.id);
                                              setIsSelectorOpen(false);
                                            }}
                                            className={`w-full px-5 py-2 flex items-center justify-between text-xs hover:bg-[#D4FF00]/10 transition-colors cursor-pointer ${
                                              selectedPlayerId === p.id ? 'bg-[#D4FF00]/15 text-[#D4FF00] font-bold' : 'text-zinc-300'
                                            }`}
                                          >
                                            <span>{p.full_name}</span>
                                            <button
                                              type="button"
                                              onClick={(e) => toggleFavoritePlayer(p.id, e)}
                                              className="p-1 hover:scale-125 transition-transform"
                                            >
                                              <Star size={13} className={isFav ? "text-[#D4FF00] fill-[#D4FF00]" : "text-zinc-600 hover:text-[#D4FF00]"} />
                                            </button>
                                          </div>
                                        );
                                      })}
                                      {coachPlayers.length === 0 && (
                                        <span className="block px-5 py-1.5 text-[10px] text-zinc-500">
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
                                <div className="border-b border-zinc-800/60 last:border-b-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleCoachSelector('unassigned')}
                                    className="w-full px-3 py-2 bg-zinc-900/60 hover:bg-zinc-800/80 flex items-center justify-between text-xs font-bold text-zinc-400 transition-colors"
                                  >
                                    <span>👤 {t.hud.unassignedAthletes} ({unassigned.length})</span>
                                    <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                  {isExpanded && (
                                    <div className="bg-zinc-950/40 py-1">
                                      {unassigned.map(p => {
                                        const isFav = favoritePlayerIds.includes(p.id);
                                        return (
                                          <div
                                            key={p.id}
                                            onClick={() => {
                                              setSelectedPlayerId(p.id);
                                              setIsSelectorOpen(false);
                                            }}
                                            className={`w-full px-5 py-2 flex items-center justify-between text-xs hover:bg-[#D4FF00]/10 transition-colors cursor-pointer ${
                                              selectedPlayerId === p.id ? 'bg-[#D4FF00]/15 text-[#D4FF00] font-bold' : 'text-zinc-300'
                                            }`}
                                          >
                                            <span>{p.full_name}</span>
                                            <button
                                              type="button"
                                              onClick={(e) => toggleFavoritePlayer(p.id, e)}
                                              className="p-1 hover:scale-125 transition-transform"
                                            >
                                              <Star size={13} className={isFav ? "text-[#D4FF00] fill-[#D4FF00]" : "text-zinc-600 hover:text-[#D4FF00]"} />
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
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* =========================================================================
            COMMAND WORKSPACE (PERSISTENT SIDEBAR + MAIN WORKSPACE)
        ========================================================================= */}
        <div className="flex-1 flex flex-col lg:flex-row gap-5 items-start min-h-0">
          
          {/* Desktop Persistent Command Sidebar */}
          <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-[#121215] border border-[#27272A] rounded-3xl p-3.5 shadow-2xl sticky top-6 justify-between gap-4">
            <div className="space-y-1.5">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 font-mono">
                <span className="flex items-center gap-1.5">
                  <Activity size={13} className="text-[#D4FF00]" />
                  {t.nav.telemetryModules}
                </span>
                <span className="flex items-center gap-1 text-[9px] text-[#10B981] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
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
                        ? 'bg-[#D4FF00]/10 border border-[#D4FF00]/50 text-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.15)] font-black' 
                        : isDisabled
                          ? 'opacity-35 cursor-not-allowed text-zinc-600'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-all shrink-0 ${
                      isActive ? 'bg-[#D4FF00] text-[#09090B] font-bold shadow-[0_0_10px_rgba(212,255,0,0.4)]' : 'bg-zinc-900 text-zinc-400 group-hover:text-white'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">
                        {tab.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate font-mono">
                        {tab.tag}
                      </div>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="active-sidebar-indicator"
                        className="w-1.5 h-6 rounded-full bg-[#D4FF00] shadow-[0_0_10px_#D4FF00]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sidebar Active Athlete Status & Mini Telemetry Card */}
            <div className="pt-3 border-t border-zinc-800">
              {activePlayer ? (
                <div 
                  onClick={() => setActiveTab('profile')}
                  className="p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-[#D4FF00]/50 cursor-pointer transition-all flex items-center gap-2.5"
                  title={t.profile.athleteDossier}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#D4FF00] flex items-center justify-center text-xs font-black text-[#09090B] shrink-0 font-mono shadow-md">
                    {activePlayer.full_name ? activePlayer.full_name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{activePlayer.full_name}</p>
                    <p className="text-[10px] text-[#D4FF00] font-mono">
                      {activePlayer.weight_kg} kg • {playerHistory.length} tests
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center">
                  <p className="text-[10px] text-zinc-400 font-bold">{t.hud.noActiveAthlete}</p>
                  <button
                    onClick={() => setIsSelectorOpen(true)}
                    className="mt-1 text-[10px] text-[#D4FF00] hover:underline font-bold cursor-pointer"
                  >
                    {t.hud.selectAthleteHint}
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* ================= MAIN CONTENT WORKSPACE ================= */}
          <main className="flex-1 min-w-0 w-full">
            <AnimatePresence mode="wait">
              {activeTab === 'team' ? (
                <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <TeamDashboard 
                    onSelectPlayer={handleSelectPlayerFromDashboard} 
                    onChangeTab={(tab: string) => setActiveTab(tab as ActiveTabType)} 
                    coaches={coaches}
                    onEditPlayer={handleEditPlayer}
                    language={language}
                  />
                </motion.div>
              ) : activeTab === 'leaderboard' ? (
                <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <Leaderboard 
                    onSelectPlayer={handleSelectPlayerFromDashboard} 
                    onChangeTab={(tab: string) => setActiveTab(tab as ActiveTabType)} 
                    language={language}
                  />
                </motion.div>
              ) : activePlayer ? (
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
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
                </motion.div>
              ) : (
                <motion.div key="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bento-card p-12 text-center text-zinc-400 shadow-2xl flex flex-col items-center justify-center max-w-xl mx-auto my-8">
                  <div className="p-4 rounded-3xl bg-[#D4FF00]/10 border border-[#D4FF00]/20 text-[#D4FF00] mb-4">
                    <ScanEye size={48} />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading font-black text-white mb-2">
                    {t.profile.noAthleteTitle}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md mx-auto mb-6">
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
                      className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Plus size={16} />
                      <span>{t.hud.addAthlete}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* =========================================================================
            MOBILE BOTTOM DOCK NAVIGATION (CARBON & ACID VOLT, lg:hidden)
        ========================================================================= */}
        <nav className="fixed bottom-3 inset-x-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[100] max-w-[98%] bg-[#121215]/90 backdrop-blur-xl border border-[#27272A] rounded-3xl p-1.5 flex items-center justify-start sm:justify-center gap-1 shadow-2xl overflow-x-auto custom-scrollbar lg:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.requiresPlayer && !activePlayer;
            return (
              <button
                key={tab.id}
                disabled={isDisabled}
                onClick={() => setActiveTab(tab.id)}
                className={`relative shrink-0 flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl transition-all duration-200 select-none min-w-[56px] cursor-pointer ${
                  isActive 
                    ? 'bg-[#D4FF00] text-[#09090B] font-black shadow-[0_0_12px_rgba(212,255,0,0.35)]' 
                    : isDisabled 
                      ? 'text-zinc-600 opacity-40 cursor-not-allowed' 
                      : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon size={16} />
                <span className="text-[9px] mt-0.5 font-bold truncate">
                  {tab.shortName}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="active-dock-indicator"
                    className="w-1 h-1 rounded-full bg-[#09090B] mt-0.5"
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
      <AnimatePresence>
        {showNewPlayerForm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bento-card bg-[#121215] border border-[#27272A] p-6 w-full max-w-lg shadow-2xl relative">
              <button type="button" onClick={() => setShowNewPlayerForm(false)} className={`absolute top-4 ${language === 'en' ? 'right-4' : 'left-4'} text-zinc-400 hover:text-white bg-zinc-900 p-2 rounded-full border border-zinc-800`}>
                <X size={16} />
              </button>
              <h2 className="text-xl font-heading font-black text-white mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Plus className="text-[#D4FF00]" size={22} /> {t.hud.newAthleteTitle}
              </h2>
              <form onSubmit={handleAddPlayer} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1 font-bold">{t.hud.fullName}</label>
                  <input required type="text" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="glass-input w-full font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.birthYear}</label>
                    <input required type="number" min="1950" max={new Date().getFullYear()} value={newPlayer.birthYear} onChange={e => setNewPlayer({...newPlayer, birthYear: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.gender}</label>
                    <select value={newPlayer.gender} onChange={e => setNewPlayer({...newPlayer, gender: e.target.value})} className="glass-input w-full font-bold bg-[#121215] text-white">
                      <option value="male">{t.common.male}</option>
                      <option value="female">{t.common.female}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.weightKg}</label>
                    <input required type="number" step="0.1" value={newPlayer.weight} onChange={e => setNewPlayer({...newPlayer, weight: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.legLengthM}</label>
                    <input required type="number" step="0.01" value={newPlayer.leg} onChange={e => setNewPlayer({...newPlayer, leg: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.heightCm}</label>
                    <input type="number" value={newPlayer.height} onChange={e => setNewPlayer({...newPlayer, height: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.standingReachCm}</label>
                    <input type="number" value={newPlayer.standingReach} onChange={e => setNewPlayer({...newPlayer, standingReach: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-bold">{t.hud.assignedCoach}</label>
                  <select value={newPlayer.coachId} onChange={e => setNewPlayer({...newPlayer, coachId: e.target.value})} className="glass-input w-full font-bold bg-[#121215] text-white">
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          EDIT ATHLETE MODAL (CARBON & VOLT)
      ========================================================================= */}
      <AnimatePresence>
        {isEditingPlayer && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bento-card bg-[#121215] border border-[#27272A] p-6 w-full max-w-lg shadow-2xl relative">
              <button type="button" onClick={() => setIsEditingPlayer(false)} className={`absolute top-4 ${language === 'en' ? 'right-4' : 'left-4'} text-zinc-400 hover:text-white bg-zinc-900 p-2 rounded-full border border-zinc-800`}>
                <X size={16} />
              </button>
              <h2 className="text-xl font-heading font-black text-white mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Edit3 className="text-[#D4FF00]" size={20} /> {t.profile.editAthlete}
              </h2>
              <form onSubmit={handleUpdatePlayer} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1 font-bold">{t.hud.fullName}</label>
                  <input required type="text" value={editPlayerForm.name} onChange={e => setEditPlayerForm({...editPlayerForm, name: e.target.value})} className="glass-input w-full font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.birthYear}</label>
                    <input required type="number" min="1950" max={new Date().getFullYear()} value={editPlayerForm.birthYear} onChange={e => setEditPlayerForm({...editPlayerForm, birthYear: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.gender}</label>
                    <select value={editPlayerForm.gender} onChange={e => setEditPlayerForm({...editPlayerForm, gender: e.target.value})} className="glass-input w-full font-bold bg-[#121215] text-white">
                      <option value="male">{t.common.male}</option>
                      <option value="female">{t.common.female}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.weightKg}</label>
                    <input required type="number" step="0.1" value={editPlayerForm.weight} onChange={e => setEditPlayerForm({...editPlayerForm, weight: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.legLengthM}</label>
                    <input required type="number" step="0.01" value={editPlayerForm.leg} onChange={e => setEditPlayerForm({...editPlayerForm, leg: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.heightCm}</label>
                    <input type="number" value={editPlayerForm.height} onChange={e => setEditPlayerForm({...editPlayerForm, height: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1 font-bold">{t.hud.standingReachCm}</label>
                    <input type="number" value={editPlayerForm.standingReach} onChange={e => setEditPlayerForm({...editPlayerForm, standingReach: e.target.value})} className="glass-input w-full font-mono font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-bold">{t.hud.assignedCoach}</label>
                  <select value={editPlayerForm.coachId} onChange={e => setEditPlayerForm({...editPlayerForm, coachId: e.target.value})} className="glass-input w-full font-bold bg-[#121215] text-white">
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
                  <button type="button" onClick={() => handleDeletePlayer(editPlayerForm.id, editPlayerForm.name)} className="px-4 py-3 rounded-xl text-xs font-bold bg-rose-950/40 border border-rose-800 text-rose-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer">
                    <Trash2 size={15} /> {t.common.delete}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          REGISTER COACH MODAL (CARBON & VOLT)
      ========================================================================= */}
      {showCoachModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bento-card bg-[#121215] border border-[#27272A] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowCoachModal(false)} className={`absolute top-4 ${language === 'en' ? 'right-4' : 'left-4'} text-zinc-400 hover:text-white bg-zinc-900 p-2 rounded-full border border-zinc-800`}>
              <X size={16} />
            </button>
            <h2 className="text-lg font-heading font-black text-white mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Plus className="text-[#D4FF00]" size={20} /> {t.hud.registerCoachTitle}
            </h2>
            <form onSubmit={handleRegisterCoach} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-zinc-400 mb-1.5 font-bold">{t.hud.coachFullName}</label>
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
              <div className="mt-6 border-t border-zinc-800 pt-4">
                <h3 className="text-xs font-bold text-zinc-400 mb-2">{t.hud.registeredCoaches}</h3>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar font-mono text-xs">
                  {coaches.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-white font-bold">{c.full_name}</span>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteCoach(c.id, c.full_name)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
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
