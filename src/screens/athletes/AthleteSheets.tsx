import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Search, Star, Trash2, Plus, Check } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { getBirthYear } from '../../lib/utils';
import { Sheet, Field, SelectField, Segmented } from '../../ui';
import type { Player } from '../../types/athletics';

/* ------------------------------------------------------------ add / edit */

const emptyForm = { name: '', birthYear: '', weight: '', leg: '', gender: 'male', height: '', standingReach: '', squatHeight: '', coachId: '' };
type FormState = typeof emptyForm;

function toForm(p: Player): FormState {
  return {
    name: p.full_name || '',
    birthYear: getBirthYear(p) ? String(getBirthYear(p)) : '',
    weight: p.weight_kg ? String(p.weight_kg) : '',
    leg: p.leg_length_m ? String(p.leg_length_m) : '',
    gender: p.gender || 'male',
    height: p.height_cm ? String(p.height_cm) : '',
    standingReach: p.standing_reach_cm ? String(p.standing_reach_cm) : '',
    squatHeight: p.hpo_m && p.leg_length_m ? String(Number((Number(p.leg_length_m) - Number(p.hpo_m)).toFixed(3))) : '',
    coachId: p.coach_id || '',
  };
}

export function AthleteFormSheet({ open, onClose, player, onSaved }: { open: boolean; onClose: () => void; player?: Player | null; onSaved?: (p: Player | null) => void }) {
  const { t, coaches, addPlayer, updatePlayer, deletePlayer } = useData();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setForm(player ? toForm(player) : emptyForm); }, [open, player]);
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));
  const hpo = parseFloat(form.leg) > 0 && parseFloat(form.squatHeight) > 0 ? parseFloat(form.leg) - parseFloat(form.squatHeight) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (player) {
      const ok = await updatePlayer(player.id, form);
      setBusy(false);
      if (ok) { onSaved?.(player); onClose(); }
    } else {
      const created = await addPlayer(form);
      setBusy(false);
      if (created) { onSaved?.(created); onClose(); }
    }
  };
  const remove = async () => {
    if (!player || !window.confirm(t.s.confirmDeleteAthlete)) return;
    if (await deletePlayer(player.id)) { onSaved?.(null); onClose(); }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={player ? t.s.editAthlete : t.s.addAthlete}
      footer={
        <>
          {player && (
            <button type="button" onClick={remove} className="icon-btn text-danger" aria-label={t.s.deleteAthlete}><Trash2 size={18} /></button>
          )}
          <button type="button" onClick={onClose} className="btn-ghost flex-1">{t.s.cancel}</button>
          <button type="submit" form="athlete-form" disabled={busy} className="btn-primary flex-1">{busy ? t.s.saving : t.s.save}</button>
        </>
      }
    >
      <form id="athlete-form" onSubmit={submit} className="space-y-4">
        <Field label={t.s.fullName} required value={form.name} onChange={set('name')} autoComplete="off" />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.s.birthYear} type="number" inputMode="numeric" min={1950} max={new Date().getFullYear()} value={form.birthYear} onChange={set('birthYear')} />
          <div>
            <span className="block text-xs font-medium text-muted mb-1.5">{t.s.gender}</span>
            <Segmented value={form.gender} onChange={v => setForm(f => ({ ...f, gender: v }))} options={[{ value: 'male', label: t.s.male }, { value: 'female', label: t.s.female }]} />
          </div>
        </div>
        <p className="text-xs font-semibold text-faint pt-1">{t.s.measurements}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.s.weightKg} required type="number" inputMode="decimal" step="0.1" value={form.weight} onChange={set('weight')} />
          <Field label={t.s.legLengthM} required type="number" inputMode="decimal" step="0.01" value={form.leg} onChange={set('leg')} />
          <Field label={t.s.heightCm} type="number" inputMode="decimal" value={form.height} onChange={set('height')} />
          <Field label={t.s.standingReachCm} type="number" inputMode="decimal" value={form.standingReach} onChange={set('standingReach')} />
        </div>
        <Field
          label={t.hud.squatTrochanterM}
          type="number"
          inputMode="decimal"
          step="0.01"
          value={form.squatHeight}
          onChange={set('squatHeight')}
          hint={<>{t.hud.squatTrochanterHelp}{hpo !== null && <span className="block mt-1 font-mono text-text" dir="ltr">hPO = {hpo.toFixed(2)} m</span>}</>}
        />
        <SelectField label={t.s.coach} value={form.coachId} onChange={set('coachId')}>
          <option value="">{t.s.noCoach}</option>
          {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </SelectField>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------------ picker */

export function AthletePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (p: Player) => void }) {
  const { t, players, coaches, selectedPlayerId, favoritePlayerIds, toggleFavoritePlayer } = useData();
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  const groups = useMemo(() => {
    const match = (p: Player) => !q.trim() || p.full_name.toLowerCase().includes(q.trim().toLowerCase());
    const sorted = [...players].filter(match).sort((a, b) => a.full_name.localeCompare(b.full_name));
    const out: { title: string; items: Player[] }[] = [];
    const favs = sorted.filter(p => favoritePlayerIds.includes(p.id));
    if (favs.length) out.push({ title: t.s.favorites, items: favs });
    for (const c of coaches) {
      const items = sorted.filter(p => p.coach_id === c.id);
      if (items.length) out.push({ title: c.full_name, items });
    }
    const none = sorted.filter(p => !p.coach_id || !coaches.some(c => c.id === p.coach_id));
    if (none.length) out.push({ title: t.s.noCoach, items: none });
    return out;
  }, [players, coaches, favoritePlayerIds, q, t]);

  return (
    <Sheet open={open} onClose={onClose} title={t.s.chooseAthlete}>
      <div className="relative">
        <Search size={18} className="absolute inset-y-0 start-3 my-auto text-faint pointer-events-none" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.s.search} className="field ps-10" autoFocus />
      </div>
      {groups.length === 0 && <p className="text-sm text-faint py-6 text-center">{t.s.noAthletesFound}</p>}
      {groups.map(g => (
        <div key={g.title}>
          <p className="text-xs font-semibold text-faint mb-1.5">{g.title} <span className="font-mono">({g.items.length})</span></p>
          <ul className="rounded-[var(--radius-control)] border border-border divide-y divide-border overflow-hidden">
            {g.items.map(p => (
              <li key={p.id} className="flex items-center">
                <button type="button" onClick={() => { onPick(p); onClose(); }} className="flex-1 min-h-[52px] flex items-center gap-3 px-3 text-start hover:bg-surface-2">
                  <Avatar name={p.full_name} active={p.id === selectedPlayerId} />
                  <span className="flex-1 min-w-0 truncate font-medium">{p.full_name}</span>
                  {p.id === selectedPlayerId && <Check size={18} className="text-accent" />}
                </button>
                <button
                  type="button"
                  aria-label={t.s.favorites}
                  aria-pressed={favoritePlayerIds.includes(p.id)}
                  onClick={e => toggleFavoritePlayer(p.id, e)}
                  className="icon-btn"
                >
                  <Star size={18} className={favoritePlayerIds.includes(p.id) ? 'fill-accent text-accent' : ''} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Sheet>
  );
}

export function Avatar({ name, active = false, size = 36 }: { name: string; active?: boolean; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`shrink-0 inline-flex items-center justify-center rounded-full font-bold ${active ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted border border-border'}`}
    >
      {initials || '?'}
    </span>
  );
}

/* ------------------------------------------------------------ coaches */

export function CoachesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, coaches, players, addCoach, deleteCoach } = useData();
  const [name, setName] = useState('');
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (await addCoach(name.trim())) setName('');
  };
  return (
    <Sheet open={open} onClose={onClose} title={t.s.manageCoaches}>
      <form onSubmit={add} className="flex gap-2 items-end">
        <div className="flex-1"><Field label={t.s.coachName} value={name} onChange={e => setName(e.target.value)} /></div>
        <button type="submit" className="btn-primary" aria-label={t.s.addCoach}><Plus size={18} /></button>
      </form>
      <ul className="rounded-[var(--radius-control)] border border-border divide-y divide-border">
        {coaches.map(c => (
          <li key={c.id} className="flex items-center gap-3 ps-3">
            <span className="flex-1 font-medium">{c.full_name}</span>
            <span className="text-xs text-faint font-mono">{players.filter(p => p.coach_id === c.id).length}</span>
            <button type="button" className="icon-btn text-danger" aria-label={t.s.delete} onClick={() => window.confirm(t.s.confirmDeleteCoach) && deleteCoach(c.id)}>
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/* ------------------------------------------------------------ levels guide */

export function StandardsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useData();
  const [tab, setTab] = useState<'men' | 'women' | 'rsi' | 'juniors'>('men');
  const rows: Record<'men' | 'women' | 'rsi', string[]> = {
    men: [t.s.guideEliteMen, t.s.guideExcellentMen, t.s.guideGoodMen, t.s.guideDevMen],
    women: [t.s.guideEliteWomen, t.s.guideExcellentWomen, t.s.guideGoodWomen, t.s.guideDevWomen],
    rsi: [t.s.guideEliteRsi, t.s.guideExcellentRsi, t.s.guideGoodRsi, t.s.guideDevRsi],
  };
  const labels = [t.s.levelElite, t.s.levelExcellent, t.s.levelGood, t.s.levelDeveloping];
  const tones = ['text-accent', 'text-success', 'text-text', 'text-warning'];
  return (
    <Sheet open={open} onClose={onClose} title={t.s.standardsGuide}>
      <Segmented size="sm" value={tab} onChange={setTab} options={[
        { value: 'men', label: t.s.men }, { value: 'women', label: t.s.women }, { value: 'rsi', label: t.s.guideRsi }, { value: 'juniors', label: t.s.guideJuniors },
      ]} />
      {tab === 'juniors' ? (
        <p className="text-sm leading-relaxed">{t.s.guideJuniorsBody}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows[tab].map((r, i) => (
            <li key={i} className="flex items-center justify-between py-3">
              <span className={`font-semibold ${tones[i]}`}>{labels[i]}</span>
              <span className="text-sm text-muted">{r}</span>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
