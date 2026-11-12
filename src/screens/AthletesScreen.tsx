import { useMemo, useState } from 'react';
import { Search, UserPlus, Users, BookOpen, Star, ChevronLeft } from 'lucide-react';
import { useData } from '../context/DataContext';
import { TEST_TYPES, normalizeTestType } from '../lib/testTypes';
import { ageOf, levelOf, type Level } from '../lib/athleteStats';
import { Segmented, fmt, shortDate, DASH } from '../ui';
import { ScreenEmpty } from '../components/ScreenStates';
import { Avatar, AthleteFormSheet, CoachesSheet, StandardsSheet } from './athletes/AthleteSheets';
import type { Player } from '../types/athletics';

interface Row { player: Player; cmj: number | null; approach: number | null; rsi: number | null; last: string | null; age: number | null }

const dot: Record<Level, string> = { elite: 'bg-accent', excellent: 'bg-success', good: 'bg-muted', developing: 'bg-warning' };

function Score({ label, value, digits, level }: { label: string; value: number | null; digits: number; level: Level | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-faint truncate">{label}</p>
      <p className="flex items-center gap-1.5 font-mono tabular-nums font-semibold" dir="ltr">
        {level && <span className={`w-1.5 h-1.5 rounded-full ${dot[level]}`} aria-hidden />}
        {fmt(value, digits)}
      </p>
    </div>
  );
}

export default function AthletesScreen({ onOpen }: { onOpen: (p: Player) => void }) {
  const { t, language, players, coaches, allMeasurements, favoritePlayerIds, toggleFavoritePlayer } = useData();
  const [q, setQ] = useState('');
  const [coachId, setCoachId] = useState('all');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [sort, setSort] = useState<'name' | 'cmj' | 'recent'>('name');
  const [sheet, setSheet] = useState<null | 'add' | 'coaches' | 'guide'>(null);

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    for (const p of players) map.set(p.id, { player: p, cmj: null, approach: null, rsi: null, last: null, age: ageOf(p) });
    for (const m of allMeasurements) {
      const r = map.get(m.player_id);
      if (!r) continue;
      const type = normalizeTestType(m.test_type);
      const h = Number(m.jump_height_cm) || 0;
      if (type === TEST_TYPES.CMJ_ARMS && h > (r.cmj ?? 0)) r.cmj = h;
      if (type === TEST_TYPES.APPROACH && h > (r.approach ?? 0)) r.approach = h;
      const rsi = Number(m.rsi_score) || 0;
      if (type === TEST_TYPES.DROP_JUMP && rsi > (r.rsi ?? 0)) r.rsi = rsi;
      if (!r.last || m.created_at > r.last) r.last = m.created_at;
    }
    return [...map.values()];
  }, [players, allMeasurements]);

  const shown = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const list = rows.filter(r =>
      (!qq || r.player.full_name.toLowerCase().includes(qq)) &&
      (coachId === 'all' || (coachId === 'none' ? !r.player.coach_id : r.player.coach_id === coachId)) &&
      (gender === 'all' || r.player.gender === gender),
    );
    const fav = (r: Row) => (favoritePlayerIds.includes(r.player.id) ? 0 : 1);
    list.sort((a, b) =>
      fav(a) - fav(b) ||
      (sort === 'cmj' ? (b.cmj ?? -1) - (a.cmj ?? -1) : sort === 'recent' ? (b.last ?? '').localeCompare(a.last ?? '') : a.player.full_name.localeCompare(b.player.full_name)),
    );
    return list;
  }, [rows, q, coachId, gender, sort, favoritePlayerIds]);

  const coachName = (id?: string | null) => coaches.find(c => c.id === id)?.full_name;

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.s.athletesTitle}</h1>
          <p className="text-sm text-muted"><span className="font-mono">{players.length}</span> {t.s.athletesCount}</p>
        </div>
        <button type="button" onClick={() => setSheet('add')} className="btn-primary"><UserPlus size={18} />{t.s.addAthlete}</button>
      </header>

      <div className="relative">
        <Search size={18} className="absolute inset-y-0 start-3 my-auto text-faint pointer-events-none" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.s.search} className="field ps-10" type="search" />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {[{ id: 'all', name: t.s.allCoaches }, ...coaches.map(c => ({ id: c.id, name: c.full_name })), { id: 'none', name: t.s.noCoach }].map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCoachId(c.id)}
            aria-pressed={coachId === c.id}
            className={`shrink-0 rounded-full border px-4 min-h-[40px] text-sm font-semibold ${coachId === c.id ? 'bg-accent-soft border-accent/40 text-accent' : 'border-border text-muted'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Segmented size="sm" label={t.s.gender} value={gender} onChange={setGender} options={[{ value: 'all', label: t.s.all }, { value: 'male', label: t.s.men }, { value: 'female', label: t.s.women }]} />
        <Segmented size="sm" label={t.s.sortBy} value={sort} onChange={setSort} options={[{ value: 'name', label: t.s.sortName }, { value: 'cmj', label: t.s.sortCmj }, { value: 'recent', label: t.s.sortRecent }]} />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setSheet('coaches')} className="btn-ghost flex-1"><Users size={16} />{t.s.manageCoaches}</button>
        <button type="button" onClick={() => setSheet('guide')} className="btn-ghost flex-1"><BookOpen size={16} />{t.s.standardsGuide}</button>
      </div>

      {players.length === 0 ? (
        <ScreenEmpty title={t.s.noAthletesYet} />
      ) : shown.length === 0 ? (
        <ScreenEmpty title={t.s.noAthletesFound} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map(({ player: p, cmj, approach, rsi, last, age }) => {
            const fav = favoritePlayerIds.includes(p.id);
            return (
              <li key={p.id} className="relative rounded-[var(--radius-card)] bg-surface border border-border hover:border-accent/40 transition-colors">
                <button type="button" onClick={() => onOpen(p)} className="w-full text-start p-4 pe-14 block">
                  <span className="flex items-center gap-3">
                    <Avatar name={p.full_name} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold truncate">{p.full_name}</span>
                      <span className="block text-xs text-muted truncate">
                        {[p.gender === 'female' ? t.s.female : t.s.male, age !== null ? `${age} ${t.s.years}` : null, p.weight_kg ? `${p.weight_kg} kg` : null, coachName(p.coach_id)].filter(Boolean).map((x, i) => <span key={i}>{i > 0 && ' · '}<bdi>{x}</bdi></span>)}
                      </span>
                    </span>
                    <ChevronLeft size={18} className="text-faint ltr:rotate-180 shrink-0" aria-hidden />
                  </span>
                  <span className="grid grid-cols-3 gap-3 mt-4">
                    <Score label="CMJ" value={cmj} digits={1} level={levelOf('jump', cmj, p.gender, age)} />
                    <Score label={t.testTypes.approach} value={approach} digits={1} level={levelOf('jump', approach, p.gender, age)} />
                    <Score label="RSI" value={rsi} digits={2} level={levelOf('rsi', rsi, p.gender, age)} />
                  </span>
                  <span className="block text-[11px] text-faint mt-3">{t.s.lastTest}: {last ? shortDate(last, language) : DASH}</span>
                </button>
                <button
                  type="button"
                  aria-label={t.s.favorites}
                  aria-pressed={fav}
                  onClick={e => toggleFavoritePlayer(p.id, e)}
                  className="icon-btn absolute top-2 end-2"
                >
                  <Star size={18} className={fav ? 'fill-accent text-accent' : ''} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AthleteFormSheet open={sheet === 'add'} onClose={() => setSheet(null)} onSaved={p => p && onOpen(p)} />
      <CoachesSheet open={sheet === 'coaches'} onClose={() => setSheet(null)} />
      <StandardsSheet open={sheet === 'guide'} onClose={() => setSheet(null)} />
    </div>
  );
}
