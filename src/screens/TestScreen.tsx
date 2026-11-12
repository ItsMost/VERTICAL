import { lazy, Suspense, useMemo, useState } from 'react';
import { Plus, Trash2, Save, ArrowLeftRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import { forceVelocityProfile, jumpHeightFromFlightTime, flightTimeFromJumpHeight, resolveHpo, type FvImbalanceBand } from '../lib/biomechanics';
import { derivedJumpFields } from '../lib/derived';
import { TEST_TYPES, normalizeTestType } from '../lib/testTypes';
import { Card, Metric, MiniStat, Pill, Segmented, Field, fmt, shortDate, DASH } from '../ui';
import { toast } from '../components/Toast';
import { ScreenLoading } from '../components/ScreenStates';
import { Avatar } from './athletes/AthleteSheets';
import TestFields, { emptyTestForm, formToPayload, today, type TestForm } from './test/TestFields';
import type { JumpMeasurement } from '../types/athletics';

const VideoJumpTest = lazy(() => import('./test/VideoJumpTest'));

export type TestMethod = 'video' | 'numbers' | 'fv';
const VIDEO_TYPES = ['cmj_arms', 'cmj_no_arms', 'sj_no_arms', 'sj_arms', 'approach', 'rsi'] as const;

export default function TestScreen({ method, setMethod, onPickAthlete }: { method: TestMethod; setMethod: (m: TestMethod) => void; onPickAthlete: () => void }) {
  const { t, activePlayer } = useData();
  const [videoType, setVideoType] = useState<string>(TEST_TYPES.CMJ_ARMS);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.s.testTitle}</h1>

      <button type="button" onClick={onPickAthlete} className="w-full flex items-center gap-3 rounded-[var(--radius-card)] bg-surface border border-border p-3 text-start hover:border-accent/40">
        {activePlayer ? <Avatar name={activePlayer.full_name} size={40} active /> : <Avatar name="?" size={40} />}
        <span className="flex-1 min-w-0">
          <span className="block text-xs text-muted">{t.s.testFor}</span>
          <span className="block font-semibold truncate">{activePlayer?.full_name ?? t.s.chooseAthlete}</span>
        </span>
        <span className="btn-ghost !min-h-[40px] !px-3 text-xs"><ArrowLeftRight size={14} />{t.s.switchAthlete}</span>
      </button>

      {!activePlayer ? null : (
        <>
          <Segmented label={t.s.method} value={method} onChange={setMethod} options={[
            { value: 'video', label: t.s.methodVideo }, { value: 'numbers', label: t.s.methodNumbers }, { value: 'fv', label: t.s.methodFv },
          ]} />

          {method === 'video' && (
            <>
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4" role="radiogroup" aria-label={t.s.testType}>
                {VIDEO_TYPES.map(v => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={videoType === v}
                    onClick={() => setVideoType(v)}
                    className={`shrink-0 rounded-full border px-4 min-h-[44px] text-sm font-semibold ${videoType === v ? 'bg-accent text-accent-ink border-accent' : 'border-border text-muted'}`}
                  >
                    {t.testTypes[v]}
                  </button>
                ))}
              </div>
              <Suspense fallback={<ScreenLoading />}>
                <VideoJumpTest key={activePlayer.id} testType={videoType} />
              </Suspense>
            </>
          )}
          {method === 'numbers' && <NumbersEntry key={activePlayer.id} />}
          {method === 'fv' && <FvSession key={activePlayer.id} />}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ numbers */

function NumbersEntry() {
  const { t, language, activePlayer, selectedPlayerId, playerHistory, addMeasurement } = useData();
  const [form, setForm] = useState<TestForm>(() => emptyTestForm());
  const [busy, setBusy] = useState(false);
  const p = activePlayer!;
  const type = normalizeTestType(form.testType);
  const h = parseFloat(form.height) || 0;
  const preview = h > 0 ? derivedJumpFields(type, h, parseFloat(form.load) || 0, p) : null;

  const save = async () => {
    const { payload, error } = formToPayload(form, p, (ty, hh, load) => derivedJumpFields(ty, hh, load, p));
    if (error) { toast.error(t.s[error]); return; }
    setBusy(true);
    const saved = await addMeasurement({ ...(payload as Partial<JumpMeasurement>), player_id: selectedPlayerId });
    setBusy(false);
    if (saved) {
      toast.success(t.s.testSaved);
      setForm({ ...emptyTestForm(form.testType), date: form.date });
    }
  };

  const recent = useMemo(() => [...playerHistory].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5), [playerHistory]);

  return (
    <div className="space-y-4">
      <Card>
        <TestFields form={form} setForm={setForm} />
        {preview && (
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            <MiniStat label={t.s.takeoffVelocity} value={fmt(preview.takeoff_velocity_ms, 2)} unit="m/s" />
            <MiniStat label={t.s.peakPower} value={fmt(preview.peak_power_watts, 0)} unit="W" />
            <MiniStat label={t.s.meanForce} value={fmt(preview.mean_force_newtons, 0)} unit="N" />
          </div>
        )}
        <button type="button" onClick={save} disabled={busy} className="btn-primary w-full mt-4"><Save size={18} />{busy ? t.s.saving : t.s.saveTest}</button>
      </Card>
      {recent.length > 0 && (
        <Card title={t.s.recentTests}>
          <ul className="divide-y divide-border">
            {recent.map(m => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">{(t.testTypes as Record<string, string>)[normalizeTestType(m.test_type)] ?? m.test_type}</span>
                <span className="text-xs text-faint shrink-0">{shortDate(m.created_at, language)}</span>
                <span className="font-mono shrink-0" dir="ltr">
                  {Number(m.clean_weight_kg) > 0 ? `${m.clean_weight_kg} kg` : normalizeTestType(m.test_type) === 'rsi' ? `RSI ${fmt(Number(m.rsi_score), 2)}` : `${fmt(Number(m.jump_height_cm))} cm`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ F-V session */

interface FvRow { load: string; height: string; flight: string }

function FvSession() {
  const { t, activePlayer, selectedPlayerId, addMeasurement } = useData();
  const p = activePlayer!;
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<FvRow[]>([
    { load: '0', height: '', flight: '' }, { load: '15', height: '', flight: '' }, { load: '30', height: '', flight: '' }, { load: '45', height: '', flight: '' },
  ]);
  const [busy, setBusy] = useState(false);
  const hpo = resolveHpo(p);

  const heightOf = (r: FvRow) => (parseFloat(r.height) > 0 ? parseFloat(r.height) : parseFloat(r.flight) > 0 ? (jumpHeightFromFlightTime(parseFloat(r.flight)) ?? 0) * 100 : 0);
  const filled = rows.filter(r => heightOf(r) > 0);
  const result = useMemo(
    () => forceVelocityProfile(filled.map(r => ({ loadKg: parseFloat(r.load) || 0, jumpHeightM: heightOf(r) / 100 })), Number(p.weight_kg) || 0, hpo.hpoM),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rows), p.weight_kg, hpo.hpoM],
  );
  const canSave = filled.length >= 2 && filled.some(r => parseFloat(r.load) > 0);
  const update = (i: number, patch: Partial<FvRow>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const band: Record<FvImbalanceBand, string> = {
    well_balanced: t.fvpConsole.bandWell, moderate_force_deficit: t.fvpConsole.bandModForce, moderate_velocity_deficit: t.fvpConsole.bandModVel,
    large_force_deficit: t.fvpConsole.bandLargeForce, large_velocity_deficit: t.fvpConsole.bandLargeVel,
  };
  const reason = (r: string) => ({
    too_few_points: t.fvpConsole.reasonTooFew, no_variation: t.fvpConsole.reasonNoVariation, non_negative_slope: t.fvpConsole.reasonSlope,
    low_r2: t.fvpConsole.reasonR2, missing_inputs: t.fvpConsole.reasonMissing,
  } as Record<string, string>)[r] ?? r;

  const save = async () => {
    if (!canSave) { toast.error(t.s.rowsNeeded); return; }
    setBusy(true);
    const created_at = date === today() ? new Date().toISOString() : new Date(`${date}T12:00:00`).toISOString();
    let ok = 0;
    for (const r of filled) {
      const h = heightOf(r);
      const load = parseFloat(r.load) || 0;
      const ft = parseFloat(r.flight) > 0 ? parseFloat(r.flight) : null;
      const saved = await addMeasurement({
        player_id: selectedPlayerId,
        test_type: TEST_TYPES.SJ_NO_ARMS,
        created_at,
        jump_height_cm: Number(h.toFixed(2)),
        flight_time_sec: ft ?? Number((flightTimeFromJumpHeight(h / 100) ?? 0).toFixed(4)),
        added_load_kg: load > 0 ? load : null,
        notes: 'F-V',
        ...derivedJumpFields(TEST_TYPES.SJ_NO_ARMS, h, load, p),
      } as Partial<JumpMeasurement>);
      if (saved) ok++;
    }
    setBusy(false);
    if (ok === filled.length) {
      toast.success(t.s.sessionSaved);
      setRows(rows.map(r => ({ ...r, height: '', flight: '' })));
    }
  };

  return (
    <div className="space-y-4">
      <Card title={t.s.fvSessionTitle}>
        <p className="text-sm text-muted mb-4">{t.s.fvSessionHelp}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <Pill>{t.s.weightKg.split(' (')[0]} <bdi className="font-mono">{p.weight_kg ? `${p.weight_kg} kg` : DASH}</bdi></Pill>
          <Pill><bdi>hPO</bdi> <bdi className="font-mono">{hpo.hpoM ? `${hpo.hpoM.toFixed(2)} m` : DASH}</bdi></Pill>
          {hpo.estimated && hpo.hpoM && <Pill tone="warning">{t.s.hpoEstimated}</Pill>}
        </div>
        <Field label={t.s.date} type="date" value={date} onChange={e => setDate(e.target.value)} />
        <ul className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
              <Field label={i === 0 ? t.s.addedLoadKg : ''} aria-label={t.s.addedLoadKg} type="number" inputMode="decimal" value={r.load} onChange={e => update(i, { load: e.target.value })} />
              <Field label={i === 0 ? t.s.jumpHeightCm : ''} aria-label={t.s.jumpHeightCm} type="number" inputMode="decimal" step="0.1" value={r.height} onChange={e => update(i, { height: e.target.value, flight: '' })} placeholder={r.flight ? fmt(heightOf(r)) : ''} />
              <Field label={i === 0 ? t.s.flightTimeS : ''} aria-label={t.s.flightTimeS} type="number" inputMode="decimal" step="0.001" value={r.flight} onChange={e => update(i, { flight: e.target.value, height: '' })} />
              <button type="button" className="icon-btn" aria-label={t.s.removeRow} disabled={rows.length <= 2} onClick={() => setRows(rows.filter((_, k) => k !== i))}><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn-ghost w-full mt-3" onClick={() => setRows([...rows, { load: '', height: '', flight: '' }])}><Plus size={16} />{t.s.addRow}</button>
      </Card>

      {filled.length >= 2 && (
        <Card title={t.s.preview}>
          {result.ok ? (
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">{t.fvpConsole.imbalancePercent}</p>
                  <Metric value={result.FVimb.toFixed(0)} unit="%" />
                </div>
                <Pill tone={result.band === 'well_balanced' ? 'success' : result.band.startsWith('moderate') ? 'warning' : 'danger'}>{band[result.band]}</Pill>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="F0" value={fmt(result.F0, 1)} unit="N/kg" />
                <MiniStat label="V0" value={fmt(result.V0, 2)} unit="m/s" />
                <MiniStat label="Pmax" value={fmt(result.Pmax, 1)} unit="W/kg" />
                <MiniStat label="Sfv" value={fmt(result.Sfv, 2)} />
                <MiniStat label="Sfv opt" value={fmt(result.SfvOpt, 2)} />
                <MiniStat label="R²" value={fmt(result.r2, 3)} />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Pill tone="danger">{t.s.fvInvalid}</Pill>
              <p className="text-sm text-muted">{reason(result.reason)}</p>
              {result.r2 !== undefined && <p className="text-xs font-mono text-faint" dir="ltr">Sfv = {fmt(result.slope ?? null, 2)} · R² = {fmt(result.r2, 3)}</p>}
            </div>
          )}
        </Card>
      )}

      <button type="button" onClick={save} disabled={busy || !canSave} className="btn-primary w-full"><Save size={18} />{busy ? t.s.saving : t.s.saveSession}</button>
      {!canSave && <p className="text-xs text-faint text-center">{t.s.rowsNeeded}</p>}
    </div>
  );
}
