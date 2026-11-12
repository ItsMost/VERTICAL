/**
 * The typed-numbers form for one test, shared by "Test → Numbers" and the
 * history edit sheet. Values are kept as strings exactly as typed.
 */
import { useData } from '../../context/DataContext';
import { Field, Segmented } from '../../ui';
import { flightTimeFromJumpHeight, jumpHeightFromFlightTime, rsiFromHeight, rsiFromFlightTime } from '../../lib/biomechanics';
import { TEST_TYPES, STRENGTH_TYPES, normalizeTestType } from '../../lib/testTypes';

export interface TestForm {
  testType: string;
  date: string;
  height: string;
  flight: string;
  contactMs: string;
  rsiMode: 'direct' | 'height' | 'flight';
  rsi: string;
  box: string;
  load: string;
  lift: string;
  reps: string;
  week: string;
  notes: string;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const emptyTestForm = (testType: string = TEST_TYPES.CMJ_ARMS): TestForm => ({
  testType, date: today(), height: '', flight: '', contactMs: '', rsiMode: 'height', rsi: '', box: '', load: '', lift: '', reps: '1', week: '', notes: '',
});

export const isStrength = (t: string) => STRENGTH_TYPES.includes(normalizeTestType(t));
export const isDrop = (t: string) => normalizeTestType(t) === TEST_TYPES.DROP_JUMP;

/** RSI the form currently implies (null = cannot be computed). */
export function formRsi(f: TestForm): number | null {
  const ct = (parseFloat(f.contactMs) || 0) / 1000;
  if (f.rsiMode === 'direct') return parseFloat(f.rsi) > 0 ? parseFloat(f.rsi) : null;
  if (f.rsiMode === 'height') return rsiFromHeight((parseFloat(f.height) || 0) / 100, ct);
  return rsiFromFlightTime(parseFloat(f.flight) || 0, ct);
}

export default function TestFields({ form, setForm, showType = true }: { form: TestForm; setForm: (f: TestForm) => void; showType?: boolean }) {
  const { t } = useData();
  const set = (patch: Partial<TestForm>) => setForm({ ...form, ...patch });
  const strength = isStrength(form.testType);
  const drop = isDrop(form.testType);

  const onHeight = (v: string) => {
    const h = parseFloat(v);
    set({ height: v, flight: h > 0 ? flightTimeFromJumpHeight(h / 100)!.toFixed(3) : '' });
  };
  const onFlight = (v: string) => {
    const ft = parseFloat(v);
    set({ flight: v, height: ft > 0 ? (jumpHeightFromFlightTime(ft)! * 100).toFixed(1) : '' });
  };
  const rsi = drop ? formRsi(form) : null;

  return (
    <div className="space-y-4">
      {showType && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="tf-type">{t.s.testType}</label>
            <select id="tf-type" className="field" value={normalizeTestType(form.testType)} onChange={e => set({ testType: e.target.value })}>
              {(['cmj_arms', 'cmj_no_arms', 'sj_no_arms', 'sj_arms', 'approach', 'rsi', 'full_squat', 'bench_press', 'power_clean'] as const).map(v => (
                <option key={v} value={v}>{t.testTypes[v]}</option>
              ))}
            </select>
          </div>
          <Field label={t.s.date} type="date" value={form.date} onChange={e => set({ date: e.target.value })} />
        </div>
      )}
      {!showType && <Field label={t.s.date} type="date" value={form.date} onChange={e => set({ date: e.target.value })} />}

      {strength ? (
        <div className="grid grid-cols-3 gap-3">
          <Field label={t.s.liftKg} type="number" inputMode="decimal" step="0.5" value={form.lift} onChange={e => set({ lift: e.target.value })} />
          <Field label={t.s.repsCount} type="number" inputMode="numeric" min={1} value={form.reps} onChange={e => set({ reps: e.target.value })} />
          <Field label={t.s.weekNumber} type="number" inputMode="numeric" min={1} value={form.week} onChange={e => set({ week: e.target.value })} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.s.jumpHeightCm} type="number" inputMode="decimal" step="0.1" value={form.height} onChange={e => onHeight(e.target.value)} />
            <Field label={t.s.flightTimeS} type="number" inputMode="decimal" step="0.001" value={form.flight} onChange={e => onFlight(e.target.value)} />
          </div>
          {drop ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.s.contactMs} type="number" inputMode="decimal" min={1} placeholder="180" value={form.contactMs} onChange={e => set({ contactMs: e.target.value })} />
                <Field label={t.s.boxHeightCm} type="number" inputMode="decimal" value={form.box} onChange={e => set({ box: e.target.value })} />
              </div>
              <div>
                <span className="block text-xs font-medium text-muted mb-1.5">{t.s.rsiMode}</span>
                <Segmented size="sm" value={form.rsiMode} onChange={v => set({ rsiMode: v })} options={[
                  { value: 'height', label: t.s.rsiFromHeight }, { value: 'flight', label: t.s.rsiFromFlight }, { value: 'direct', label: t.s.rsiDirect },
                ]} />
              </div>
              {form.rsiMode === 'direct' ? (
                <Field label={t.s.rsiValue} type="number" inputMode="decimal" step="0.01" value={form.rsi} onChange={e => set({ rsi: e.target.value })} />
              ) : (
                <p className="text-sm text-muted">RSI = <span className="font-mono text-text text-lg" dir="ltr">{rsi !== null ? rsi.toFixed(2) : '—'}</span></p>
              )}
            </>
          ) : (
            <Field label={t.s.addedLoadKg} type="number" inputMode="decimal" step="0.5" min={0} value={form.load} onChange={e => set({ load: e.target.value })} />
          )}
        </>
      )}
      <div>
        <label htmlFor="tf-notes" className="block text-xs font-medium text-muted mb-1.5">{t.s.notes}</label>
        <textarea id="tf-notes" rows={2} className="field" value={form.notes} onChange={e => set({ notes: e.target.value })} />
      </div>
    </div>
  );
}

/**
 * Builds the row to save. Returns an error key when required numbers are
 * missing. `originalCreatedAt` keeps the time of day when editing on the same date.
 */
export function formToPayload(
  form: TestForm,
  player: { weight_kg?: number | null; hpo_m?: number | null; leg_length_m?: number | null } | null,
  derive: (type: string, h: number, load: number) => Record<string, number | null>,
  originalCreatedAt?: string,
): { payload?: Record<string, unknown>; error?: 'fillHeightOrFlight' | 'fillLift' | 'fillRsi' } {
  const type = normalizeTestType(form.testType);
  const sameDay = originalCreatedAt && originalCreatedAt.slice(0, 10) === form.date;
  const created_at = sameDay
    ? originalCreatedAt
    : form.date === today() && !originalCreatedAt
      ? new Date().toISOString()
      : new Date(`${form.date}T12:00:00`).toISOString();
  const base: Record<string, unknown> = { test_type: type, created_at, notes: form.notes.trim() || null };

  if (isStrength(type)) {
    const lift = parseFloat(form.lift);
    if (!(lift > 0)) return { error: 'fillLift' };
    const bw = Number(player?.weight_kg) || 0;
    return {
      payload: {
        ...base,
        clean_weight_kg: lift,
        reps_count: parseInt(form.reps) || 1,
        week_number: parseInt(form.week) || null,
        clean_bw_ratio: bw > 0 ? Number((lift / bw).toFixed(2)) : null,
      },
    };
  }
  const h = parseFloat(form.height);
  const ft = parseFloat(form.flight);
  if (!(h > 0)) return { error: 'fillHeightOrFlight' };
  const load = parseFloat(form.load) > 0 ? parseFloat(form.load) : 0;
  const payload: Record<string, unknown> = {
    ...base,
    jump_height_cm: Number(h.toFixed(2)),
    flight_time_sec: ft > 0 ? Number(ft.toFixed(4)) : null,
    added_load_kg: load > 0 ? load : null,
    ...derive(type, h, load),
  };
  if (isDrop(type)) {
    const rsi = formRsi(form);
    if (rsi === null) return { error: 'fillRsi' };
    const ct = parseFloat(form.contactMs);
    payload.rsi_score = Number(rsi.toFixed(2));
    payload.contact_time_sec = ct > 0 ? Number((ct / 1000).toFixed(4)) : null;
    payload.box_height_cm = parseFloat(form.box) > 0 ? parseFloat(form.box) : null;
    payload.added_load_kg = null;
  }
  return { payload };
}

/** Prefills the form from a stored row (for editing). */
export function recordToForm(m: {
  test_type: string; created_at: string; jump_height_cm?: number | null; flight_time_sec?: number | null; contact_time_sec?: number | null;
  rsi_score?: number | null; box_height_cm?: number | null; added_load_kg?: number | null; clean_weight_kg?: number | null;
  reps_count?: number | null; week_number?: number | null; notes?: string | null;
}): TestForm {
  const s = (v: unknown) => (v === null || v === undefined || Number(v) === 0 ? '' : String(v));
  const ct = Number(m.contact_time_sec) || 0;
  return {
    testType: normalizeTestType(m.test_type),
    date: String(m.created_at).slice(0, 10),
    height: s(m.jump_height_cm),
    flight: s(m.flight_time_sec),
    contactMs: ct > 0 ? String(Math.round((ct >= 1 ? ct : ct * 1000) * 10) / 10) : '',
    rsiMode: 'direct',
    rsi: s(m.rsi_score),
    box: s(m.box_height_cm),
    load: s(m.added_load_kg),
    lift: s(m.clean_weight_kg),
    reps: s(m.reps_count) || '1',
    week: s(m.week_number),
    notes: m.notes ?? '',
  };
}
