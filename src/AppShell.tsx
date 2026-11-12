import { lazy, Suspense, useEffect, useState } from 'react';
import { Users, ScanLine, Trophy, UserRound, ChevronDown, RefreshCw } from 'lucide-react';
import { useData } from './context/DataContext';
import AppLogo from './AppLogo';
import AthletesScreen from './screens/AthletesScreen';
import { AthletePicker, Avatar } from './screens/athletes/AthleteSheets';
import { ScreenLoading, ScreenError } from './components/ScreenStates';
import type { Player } from './types/athletics';
import type { TestMethod } from './screens/TestScreen';

const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const TestScreen = lazy(() => import('./screens/TestScreen'));
const RankingsScreen = lazy(() => import('./screens/RankingsScreen'));

type Tab = 'athletes' | 'test' | 'rankings' | 'profile';
const LAST_ATHLETE = 'last_athlete_id';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export default function AppShell() {
  const { t, language, setLanguage, players, activePlayer, selectedPlayerId, setSelectedPlayerId, isLoading, loadError, refreshData, isSyncing } = useData();
  const [tab, setTab] = useState<Tab>(() => (read(LAST_ATHLETE) ? 'profile' : 'athletes'));
  const [picker, setPicker] = useState(false);
  const [testMethod, setTestMethod] = useState<TestMethod>('video');

  // Reopen the athlete the coach looked at last (main use: checking one athlete)
  useEffect(() => {
    if (selectedPlayerId || players.length === 0) return;
    const last = read(LAST_ATHLETE);
    if (last && players.some(p => p.id === last)) setSelectedPlayerId(last);
    else if (tab === 'profile') setTab('athletes');
  }, [players, selectedPlayerId, setSelectedPlayerId, tab]);
  useEffect(() => { if (selectedPlayerId) write(LAST_ATHLETE, selectedPlayerId); }, [selectedPlayerId]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab]);

  const openAthlete = (p: Player) => { setSelectedPlayerId(p.id); setTab('profile'); };
  const go = (next: Tab) => { if (next === 'profile' && !activePlayer) { setPicker(true); return; } setTab(next); };

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'athletes', label: t.s.navAthletes, icon: Users },
    { id: 'test', label: t.s.navTest, icon: ScanLine },
    { id: 'rankings', label: t.s.navRankings, icon: Trophy },
    { id: 'profile', label: t.s.navProfile, icon: UserRound },
  ];

  let content;
  if (loadError && players.length === 0) content = <ScreenError message={loadError} onRetry={refreshData} />;
  else if (isLoading && players.length === 0) content = <ScreenLoading />;
  else if (tab === 'athletes') content = <AthletesScreen onOpen={openAthlete} />;
  else if (tab === 'rankings') content = <RankingsScreen onOpen={openAthlete} />;
  else if (tab === 'test') content = <TestScreen method={testMethod} setMethod={setTestMethod} onPickAthlete={() => setPicker(true)} />;
  else if (activePlayer) content = <ProfileScreen onNewTest={() => { setTestMethod('video'); setTab('test'); }} onRecordFv={() => { setTestMethod('fv'); setTab('test'); }} />;
  else content = (
    <div className="card state-box">
      <UserRound size={32} className="text-faint" />
      <h2 className="text-lg font-bold text-text">{t.s.noAthleteTitle}</h2>
      <p className="text-sm max-w-xs">{t.s.noAthleteBody}</p>
      <button type="button" className="btn-primary" onClick={() => setTab('athletes')}>{t.s.goToAthletes}</button>
    </div>
  );

  return (
    <div className="min-h-svh bg-bg text-text lg:flex">
      {/* desktop rail */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-svh border-e border-border p-4 gap-1 print:hidden">
        <div className="flex items-center gap-2.5 px-2 pb-4">
          <AppLogo size={34} />
          <span className="font-bold tracking-wide">{t.s.appName}</span>
        </div>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-[var(--radius-control)] px-3 min-h-[48px] font-semibold ${tab === id ? 'bg-accent-soft text-accent' : 'text-muted hover:text-text hover:bg-surface'}`}>
            <Icon size={20} />{label}
          </button>
        ))}
      </aside>

      <div className="flex-1 min-w-0">
        {/* top bar */}
        <header className="sticky top-0 z-[100] bg-bg/90 backdrop-blur-md border-b border-border print:hidden">
          <div className="max-w-5xl mx-auto flex items-center gap-2 px-4 h-16">
            <span className="lg:hidden"><AppLogo size={30} /></span>
            <button type="button" onClick={() => setPicker(true)} className="flex-1 min-w-0 flex items-center gap-2.5 rounded-full bg-surface border border-border ps-1.5 pe-3 min-h-[44px] text-start">
              {activePlayer ? <Avatar name={activePlayer.full_name} size={32} active /> : <Avatar name="?" size={32} />}
              <span className="flex-1 min-w-0 truncate text-sm font-semibold">{activePlayer?.full_name ?? t.s.chooseAthlete}</span>
              <ChevronDown size={16} className="text-faint shrink-0" />
            </button>
            {isSyncing && <RefreshCw size={16} className="text-faint animate-spin shrink-0" aria-hidden />}
            <div className="flex rounded-full bg-surface border border-border p-1 shrink-0" role="group" aria-label="Language">
              {(['ar', 'en'] as const).map(l => (
                <button key={l} type="button" onClick={() => setLanguage(l)} aria-pressed={language === l}
                  className={`rounded-full px-3 min-h-[44px] text-xs font-bold ${language === l ? 'bg-accent text-accent-ink' : 'text-muted'}`}>
                  {l === 'ar' ? 'عربي' : 'EN'}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+96px)] lg:pb-10">
          <Suspense fallback={<ScreenLoading />}>
            <div key={tab} className="animate-fade-in">{content}</div>
          </Suspense>
        </main>
      </div>

      {/* phone bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[100] bg-surface/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] print:hidden" aria-label="Main">
        <div className="grid grid-cols-4 max-w-lg mx-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-h-[64px] text-[11px] font-semibold ${tab === id ? 'text-accent' : 'text-faint'}`}>
              <span className={`flex items-center justify-center w-12 h-7 rounded-full ${tab === id ? 'bg-accent-soft' : ''}`}><Icon size={20} /></span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      <AthletePicker open={picker} onClose={() => setPicker(false)} onPick={p => { setSelectedPlayerId(p.id); if (tab === 'athletes' || tab === 'rankings') setTab('profile'); }} />
    </div>
  );
}
