import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useData } from '../context/DataContext';
import { normalizeTestType, TEST_TYPES } from '../lib/testTypes';
import { ageOf, levelOf } from '../lib/athleteStats';
import { Segmented, LevelPill, SelectField } from '../ui';
import { ScreenEmpty } from '../components/ScreenStates';
import { Avatar } from './athletes/AthleteSheets';
import type { Player } from '../types/athletics';

type Metric = 'cmj_arms' | 'cmj_no_arms' | 'sj_no_arms' | 'approach' | 'rsi';

export default function RankingsScreen({ onOpen }: { onOpen: (p: Player) => void }) {
  const { t, players, coaches, allMeasurements } = useData();
  const [metric, setMetric] = useState<Metric>('cmj_arms');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [coachId, setCoachId] = useState('all');

  const ranked = useMemo(() => {
    const bestBy = new Map<string, number>();
    for (const m of allMeasurements) {
      const ty = normalizeTestType(m.test_type);
      if (ty !== metric) continue;
      // loaded squat jumps belong to F-V sessions, not to the SJ ranking
      if (ty === TEST_TYPES.SJ_NO_ARMS && Number(m.added_load_kg) > 0) continue;
      const v = metric === 'rsi' ? Number(m.rsi_score) || 0 : Number(m.jump_height_cm) || 0;
      if (v > (bestBy.get(m.player_id) ?? 0)) bestBy.set(m.player_id, v);
    }
    return players
      .filter(p => bestBy.has(p.id))
      .filter(p => gender === 'all' || p.gender === gender)
      .filter(p => coachId === 'all' || p.coach_id === coachId)
      .map(p => ({ p, v: bestBy.get(p.id)! }))
      .sort((a, b) => b.v - a.v);
  }, [players, allMeasurements, metric, gender, coachId]);

  const unit = metric === 'rsi' ? '' : 'cm';
  const digits = metric === 'rsi' ? 2 : 1;
  const medal = ['text-accent', 'text-muted', 'text-warning'];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.s.rankingsTitle}</h1>
      <Segmented size="sm" label={t.s.metric} value={metric} onChange={setMetric} options={[
        { value: 'cmj_arms', label: t.testTypes.cmj_arms },
        { value: 'cmj_no_arms', label: t.testTypes.cmj_no_arms },
        { value: 'sj_no_arms', label: 'SJ' },
        { value: 'approach', label: t.testTypes.approach },
        { value: 'rsi', label: 'RSI' },
      ]} />
      <div className="grid grid-cols-2 gap-2">
        <Segmented size="sm" value={gender} onChange={setGender} options={[{ value: 'all', label: t.s.all }, { value: 'male', label: t.s.men }, { value: 'female', label: t.s.women }]} />
        <SelectField label={<span className="sr-only">{t.s.coach}</span>} value={coachId} onChange={e => setCoachId(e.target.value)}>
          <option value="all">{t.s.allCoaches}</option>
          {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </SelectField>
      </div>

      {ranked.length === 0 ? (
        <ScreenEmpty title={t.s.noRanking} />
      ) : (
        <ol className="rounded-[var(--radius-card)] bg-surface border border-border divide-y divide-border overflow-hidden">
          {ranked.map(({ p, v }, i) => (
            <li key={p.id}>
              <button type="button" onClick={() => onOpen(p)} className={`w-full flex items-center gap-3 px-4 min-h-[64px] text-start hover:bg-surface-2 ${i === 0 ? 'bg-accent-soft' : ''}`}>
                <span className={`w-8 text-center font-mono font-bold ${i < 3 ? medal[i] : 'text-faint'}`}>
                  {i < 3 ? <Trophy size={18} className="inline" aria-label={`${t.s.rank} ${i + 1}`} /> : i + 1}
                </span>
                <Avatar name={p.full_name} size={36} active={i === 0} />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{p.full_name}</span>
                  <LevelPill level={levelOf(metric === 'rsi' ? 'rsi' : 'jump', metric === 'rsi' || metric === 'cmj_arms' || metric === 'approach' ? v : null, p.gender, ageOf(p))} />
                </span>
                <span className="font-mono tabular-nums text-lg font-bold" dir="ltr">
                  {v.toFixed(digits)}{unit && <span className="text-xs text-muted ms-1">{unit}</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
