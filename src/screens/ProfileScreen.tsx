import { lazy, Suspense, useMemo, useState } from 'react';
import {
  Plus, Pencil, Sparkles, Printer, TrendingUp, TrendingDown, Minus, ShieldCheck, Zap, Ruler, Dumbbell,
  Gauge, ChevronDown, Trash2, Activity,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../context/DataContext';
import { computeAthleteStats, ageOf, levelOf, ofType } from '../lib/athleteStats';
import { resolveHpo, type FvImbalanceBand } from '../lib/biomechanics';
import { TEST_TYPES, STRENGTH_TYPES, normalizeTestType } from '../lib/testTypes';
import { derivedJumpFields } from '../lib/derived';
import { Card, Metric, MiniStat, Pill, LevelPill, Segmented, Sheet, fmt, signed, shortDate, DASH } from '../ui';
import { toast } from '../components/Toast';
import { Avatar, AthleteFormSheet } from './athletes/AthleteSheets';
import TestFields, { formToPayload, recordToForm, type TestForm } from './test/TestFields';
import type { JumpMeasurement } from '../types/athletics';

const ShareCard = lazy(() => import('../components/MotionGraphicVideoModal'));

const CHART = { accent: '#D97757', grid: '#3D3C38', tick: '#ABA79D', surface: '#2A2927', text: '#F5F4ED' };

type ChartMetric = 'cmj_arms' | 'cmj_no_arms' | 'sj_no_arms' | 'approach' | 'rsi';
type HistoryFilter = 'all' | 'jumps' | 'rsi' | 'strength';

export default function ProfileScreen({ onNewTest, onRecordFv }: { onNewTest: () => void; onRecordFv: () => void }) {
  const { t, language, activePlayer, playerHistory, coaches, updateMeasurement, deleteMeasurement } = useData();
  const [editPlayer, setEditPlayer] = useState(false);
  const [share, setShare] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printStrength, setPrintStrength] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [metric, setMetric] = useState<ChartMetric>('cmj_arms');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [editing, setEditing] = useState<JumpMeasurement | null>(null);
  const [editForm, setEditForm] = useState<TestForm | null>(null);

  const stats = useMemo(() => (activePlayer ? computeAthleteStats(activePlayer, playerHistory) : null), [activePlayer, playerHistory]);

  const chartData = useMemo(() => {
    const rows = ofType(playerHistory, metric);
    return rows
      .map(r => ({ date: shortDate(r.created_at, language), value: metric === 'rsi' ? Number(r.rsi_score) || 0 : Number(r.jump_height_cm) || 0 }))
      .filter(r => r.value > 0);
  }, [playerHistory, metric, language]);

  const history = useMemo(() => {
    const rows = [...playerHistory].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return rows.filter(r => {
      const ty = normalizeTestType(r.test_type);
      if (filter === 'rsi') return ty === TEST_TYPES.DROP_JUMP;
      if (filter === 'strength') return STRENGTH_TYPES.includes(ty);
      if (filter === 'jumps') return ty !== TEST_TYPES.DROP_JUMP && !STRENGTH_TYPES.includes(ty);
      return true;
    });
  }, [playerHistory, filter]);

  if (!activePlayer || !stats) return null;
  const p = activePlayer;
  const age = ageOf(p);
  const hpo = resolveHpo(p);
  const coach = coaches.find(c => c.id === p.coach_id)?.full_name;
  const isEn = language === 'en';

  /* ---------- readiness ---------- */
  const rd = stats.readiness;
  const rdTone = rd.ok ? (rd.status === 'optimal' ? 'success' : rd.status === 'moderate_fatigue' ? 'warning' : 'danger') : undefined;
  const rdLabel = rd.ok ? (rd.status === 'optimal' ? t.s.readinessOptimal : rd.status === 'moderate_fatigue' ? t.s.readinessModerate : t.s.readinessHigh) : '';

  /* ---------- F-V ---------- */
  const fv = stats.fv?.result;
  const bandLabel: Record<FvImbalanceBand, string> = {
    well_balanced: t.fvpConsole.bandWell,
    moderate_force_deficit: t.fvpConsole.bandModForce,
    moderate_velocity_deficit: t.fvpConsole.bandModVel,
    large_force_deficit: t.fvpConsole.bandLargeForce,
    large_velocity_deficit: t.fvpConsole.bandLargeVel,
  };
  const bandTone = (b: FvImbalanceBand) => (b === 'well_balanced' ? 'success' : b.startsWith('moderate') ? 'warning' : 'danger');
  const presc = (b: FvImbalanceBand) => (b === 'well_balanced' ? t.fvpConsole.prescBalanced : b.endsWith('force_deficit') ? t.fvpConsole.prescForce : t.fvpConsole.prescVel);
  const reason = (r: string) => ({
    too_few_points: t.fvpConsole.reasonTooFew, no_variation: t.fvpConsole.reasonNoVariation, non_negative_slope: t.fvpConsole.reasonSlope,
    low_r2: t.fvpConsole.reasonR2, missing_inputs: t.fvpConsole.reasonMissing,
  } as Record<string, string>)[r] ?? r;

  /* ---------- history actions ---------- */
  const startEdit = (m: JumpMeasurement) => { setEditing(m); setEditForm(recordToForm(m)); };
  const saveEdit = async () => {
    if (!editing || !editForm) return;
    const { payload, error } = formToPayload(editForm, p, (ty, h, load) => derivedJumpFields(ty, h, load, p), editing.created_at);
    if (error) { toast.error(t.s[error]); return; }
    if (await updateMeasurement(editing.id, payload as Partial<JumpMeasurement>)) {
      toast.success(t.s.saved);
      setEditing(null);
    }
  };
  const remove = async (m: JumpMeasurement) => {
    if (!window.confirm(t.s.confirmDeleteTest)) return;
    if (await deleteMeasurement(m.id)) toast.success(t.s.deleted);
  };

  const testLabel = (ty: string) => (t.testTypes as Record<string, string>)[normalizeTestType(ty)] ?? ty;
  const trendIcon = stats.cmj.change === null ? null : stats.cmj.change > 0 ? <TrendingUp size={16} /> : stats.cmj.change < 0 ? <TrendingDown size={16} /> : <Minus size={16} />;
  const trendTone = stats.cmj.change === null ? 'text-faint' : stats.cmj.change > 0 ? 'text-success' : stats.cmj.change < 0 ? 'text-danger' : 'text-muted';

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------ identity */}
      <Card>
        <div className="flex items-start gap-4">
          <Avatar name={p.full_name} size={56} active />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">{p.full_name}</h1>
            <p className="text-sm text-muted">
              {[p.gender === 'female' ? t.s.female : t.s.male, age !== null ? `${age} ${t.s.years}` : null, coach].filter(Boolean).map((x, i) => <span key={i}>{i > 0 && ' · '}<bdi>{x}</bdi></span>)}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Pill>{t.s.weightKg.split(' (')[0]} <bdi className="font-mono">{p.weight_kg ? `${p.weight_kg} kg` : DASH}</bdi></Pill>
              <Pill>{t.s.heightCm.split(' (')[0]} <bdi className="font-mono">{p.height_cm ? `${p.height_cm} cm` : DASH}</bdi></Pill>
              <Pill>{t.s.standingReachCm.split(' (')[0]} <bdi className="font-mono">{p.standing_reach_cm ? `${p.standing_reach_cm} cm` : DASH}</bdi></Pill>
              <Pill><bdi>hPO</bdi> <bdi className="font-mono">{hpo.hpoM ? `${hpo.hpoM.toFixed(2)} m` : DASH}</bdi></Pill>
              {hpo.estimated && hpo.hpoM && <Pill tone="warning">{t.s.hpoEstimated}</Pill>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4 print:hidden">
          <button type="button" onClick={onNewTest} className="btn-primary col-span-3 sm:col-span-1"><Plus size={18} />{t.s.newTest}</button>
          <button type="button" onClick={() => setEditPlayer(true)} className="btn-ghost px-2"><Pencil size={16} /><span className="truncate">{t.s.edit}</span></button>
          <button type="button" onClick={() => setShare(true)} className="btn-ghost px-2"><Sparkles size={16} /><span className="truncate">{t.s.shareCard}</span></button>
          <button type="button" onClick={() => setPrintOpen(true)} className="btn-ghost px-2"><Printer size={16} /><span className="truncate">{t.s.print}</span></button>
        </div>
      </Card>

      {stats.totalTests === 0 && (
        <Card><p className="text-sm text-muted">{t.s.noTestsYet}</p></Card>
      )}

      {/* ------------------------------------------------ headline */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card title={t.s.bestCmj} icon={<Activity size={16} />} action={<LevelPill level={levelOf('jump', stats.cmj.best, p.gender, age)} />}>
          <Metric value={fmt(stats.cmj.best, 1)} unit="cm" />
          <p className={`mt-3 flex items-center gap-1.5 text-sm ${trendTone}`}>
            {trendIcon}
            {stats.cmj.change !== null ? (
              <><bdi className="font-mono">{signed(stats.cmj.change)} cm</bdi><span className="text-muted">{t.s.vsPrevious}</span></>
            ) : (
              <span className="text-muted">{stats.cmj.count === 1 ? t.s.firstTest : t.s.noTestsYet}</span>
            )}
          </p>
          <p className="text-xs text-faint mt-1">{t.s.latest}: <bdi className="font-mono">{fmt(stats.cmj.latest)} cm</bdi> · <bdi className="font-mono">{stats.cmj.count}</bdi> {t.s.testsCount}</p>
        </Card>

        <Card title={t.s.readiness} icon={<ShieldCheck size={16} />} action={rd.ok ? <Pill tone={rdTone as 'success'}>{rdLabel}</Pill> : null}>
          {rd.ok ? (
            <>
              <Metric value={signed(rd.percentChange)} unit="%" className={rdTone === 'success' ? 'text-success' : rdTone === 'warning' ? 'text-warning' : 'text-danger'} />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <MiniStat label={t.s.readinessToday} value={fmt(rd.todayValue)} unit="cm" />
                <MiniStat label={t.s.readinessBaseline} value={`${rd.baselineMean.toFixed(1)} ± ${rd.baselineSd.toFixed(1)}`} unit="cm" />
              </div>
              <p className="text-xs text-faint mt-2"><bdi className="font-mono">n = {rd.baselineN}</bdi>{rd.zScore !== null && <> · <bdi className="font-mono">z = {rd.zScore.toFixed(2)}</bdi></>} · {shortDate(rd.referenceDay, language)}</p>
            </>
          ) : (
            <>
              <Metric value={DASH} />
              <p className="text-sm text-muted mt-3">{t.s.readinessNotEnough} <span className="font-mono">({rd.baselineN}/3)</span></p>
            </>
          )}
        </Card>

        <Card title={t.s.bestRsi} icon={<Zap size={16} />} action={<LevelPill level={levelOf('rsi', stats.rsi.best, p.gender, age)} />}>
          <Metric value={fmt(stats.rsi.best, 2)} />
          <div className="flex items-center justify-between gap-2 mt-3">
            <MiniStat label={t.s.contactTime} value={stats.rsi.contactMs !== null ? String(stats.rsi.contactMs) : DASH} unit="ms" />
            {stats.rsi.gct && (
              <Pill tone={stats.rsi.gct === 'elite_fast' ? 'success' : stats.rsi.gct === 'moderate' ? 'neutral' : 'warning'}>
                {stats.rsi.gct === 'elite_fast' ? t.s.gctFast : stats.rsi.gct === 'moderate' ? t.s.gctModerate : t.s.gctSlow}
              </Pill>
            )}
          </div>
          <p className="text-xs text-faint mt-1">{t.s.latest}: <bdi className="font-mono">{fmt(stats.rsi.latest, 2)}</bdi> · <bdi className="font-mono">{stats.rsi.count}</bdi> {t.s.testsCount}</p>
        </Card>
      </div>

      {/* ------------------------------------------------ secondary */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card title={t.s.eurTitle} icon={<Gauge size={16} />}>
          {stats.eur !== null ? (
            <>
              <div className="flex items-end justify-between gap-2">
                <p className="font-mono tabular-nums text-3xl font-bold" dir="ltr">{stats.eur.toFixed(2)}</p>
                <Pill tone={stats.eurType === 'well_balanced_elite' ? 'success' : 'accent'}>
                  {stats.eurType === 'elastic_dominant' ? t.s.eurElastic : stats.eurType === 'strength_dominant' ? t.s.eurStrength : t.s.eurBalanced}
                </Pill>
              </div>
              <p className="text-sm text-muted mt-2">
                {stats.eurType === 'elastic_dominant' ? t.s.eurElasticAdvice : stats.eurType === 'strength_dominant' ? t.s.eurStrengthAdvice : t.s.eurBalancedAdvice}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">{t.s.eurNeeds}</p>
          )}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border">
            <MiniStat label={t.s.armSwing} value={stats.armSwingGainPct !== null ? signed(stats.armSwingGainPct) : DASH} unit="%" />
            <MiniStat label={t.s.reactiveIndex} value={fmt(stats.reactiveIndex, 2)} />
          </div>
        </Card>

        <Card title={t.s.reachTitle} icon={<Ruler size={16} />}>
          {stats.reach.touch !== null ? (
            <>
              <p className="text-xs text-muted">{t.s.touchHeight}</p>
              <p className="font-mono tabular-nums text-3xl font-bold" dir="ltr">{stats.reach.touch.toFixed(1)}<span className="text-sm text-muted ms-1">cm</span></p>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border">
                <MiniStat label={`${t.s.netClearance} (${stats.reach.netHeight})`} value={signed(stats.reach.netClearance)} tone={(stats.reach.netClearance ?? 0) >= 0 ? 'success' : 'danger'} />
                <MiniStat label={t.s.rimMargin} value={signed(stats.reach.rimMargin)} tone={(stats.reach.rimMargin ?? 0) >= 0 ? 'success' : undefined} />
                <MiniStat label={t.s.dunkMargin} value={signed(stats.reach.dunkMargin)} tone={(stats.reach.dunkMargin ?? 0) >= 0 ? 'accent' : undefined} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{stats.reach.standingReach ? t.s.noTestsYet : t.s.needsReach}</p>
          )}
        </Card>

        <Card title={t.s.strengthTitle} icon={<Dumbbell size={16} />} className={printStrength ? '' : 'print:hidden'}>
          {stats.strength.squat.kg || stats.strength.bench.kg || stats.strength.clean.kg ? (
            <ul className="space-y-3">
              {([['squat', stats.strength.squat], ['clean', stats.strength.clean], ['bench', stats.strength.bench]] as const).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{t.s[k]}</span>
                  <span className="text-end">
                    <span className="font-mono font-semibold" dir="ltr">{v.kg ? `${v.kg} kg` : DASH}</span>
                    {v.xBw ? <span className="block text-xs text-faint"><bdi className="font-mono">{v.xBw.toFixed(2)}</bdi> {t.s.xBw}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t.s.noStrength}</p>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------ F-V profile */}
      <Card
        title={t.s.fvTitle}
        icon={<TrendingUp size={16} />}
        action={stats.fv ? <span className="text-xs text-faint">{t.s.fvSessionOf} {shortDate(stats.fv.day, language)}</span> : null}
      >
        {!stats.fv ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-sm text-muted">{t.s.fvNoSession}</p>
            <button type="button" onClick={onRecordFv} className="btn-ghost print:hidden"><Plus size={16} />{t.s.fvRecord}</button>
          </div>
        ) : fv && fv.ok ? (
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div>
              <p className="text-xs text-muted">{t.fvpConsole.imbalancePercent}</p>
              <Metric value={fv.FVimb.toFixed(0)} unit="%" />
              <div className="mt-2"><Pill tone={bandTone(fv.band)}>{bandLabel[fv.band]}</Pill></div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted">{presc(fv.band)}</p>
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="F0" value={fmt(fv.F0, 1)} unit="N/kg" />
                <MiniStat label="V0" value={fmt(fv.V0, 2)} unit="m/s" />
                <MiniStat label="Pmax" value={fmt(fv.Pmax, 1)} unit="W/kg" />
                <MiniStat label="Sfv" value={fmt(fv.Sfv, 2)} />
                <MiniStat label="Sfv opt" value={fmt(fv.SfvOpt, 2)} />
                <MiniStat label="R²" value={fmt(fv.r2, 3)} />
              </div>
            </div>
          </div>
        ) : fv ? (
          <div className="space-y-2">
            <Pill tone="danger">{t.s.fvInvalid}</Pill>
            <p className="text-sm text-muted">{reason(fv.reason)}</p>
            <ul className="text-xs font-mono text-faint" dir="ltr">
              {fv.points.map((pt, i) => <li key={i}>{pt.loadKg} kg → {(pt.jumpHeightM * 100).toFixed(1)} cm · {pt.forceNkg.toFixed(1)} N/kg · {pt.velocityMs.toFixed(2)} m/s</li>)}
            </ul>
          </div>
        ) : null}
      </Card>

      {/* ------------------------------------------------ progress chart */}
      <Card title={t.s.progressTitle} icon={<TrendingUp size={16} />}>
        <Segmented size="sm" value={metric} onChange={setMetric} options={[
          { value: 'cmj_arms', label: t.testTypes.cmj_arms },
          { value: 'cmj_no_arms', label: t.testTypes.cmj_no_arms },
          { value: 'sj_no_arms', label: 'SJ' },
          { value: 'approach', label: t.testTypes.approach },
          { value: 'rsi', label: 'RSI' },
        ]} />
        <div className="h-56 mt-4" dir="ltr">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="accentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: CHART.tick, fontSize: 12 }} tickLine={false} axisLine={{ stroke: CHART.grid }} minTickGap={20} reversed={!isEn} />
                <YAxis tick={{ fill: CHART.tick, fontSize: 12 }} width={40} tickLine={false} axisLine={false} domain={['auto', 'auto']} orientation={isEn ? 'left' : 'right'} />
                <Tooltip contentStyle={{ background: CHART.surface, border: `1px solid ${CHART.grid}`, borderRadius: 12, color: CHART.text, fontSize: 13 }} labelStyle={{ color: CHART.tick }} />
                <Area type="monotone" dataKey="value" stroke={CHART.accent} strokeWidth={2.5} fill="url(#accentFill)" dot={{ r: 3, fill: CHART.accent }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-faint text-center px-6">{t.s.needTwoTests}</div>
          )}
        </div>
      </Card>

      {/* ------------------------------------------------ more details */}
      <section className="rounded-[var(--radius-card)] bg-surface border border-border">
        <button type="button" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} className="w-full flex items-center justify-between gap-3 px-5 min-h-[56px] font-semibold">
          {moreOpen ? t.s.less : t.s.more}
          <ChevronDown size={18} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
        </button>
        {moreOpen && (
          <div className="px-5 pb-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-muted mb-2">{t.s.jumpsTitle}</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-faint">
                  <tr><th className="text-start font-medium py-1.5"></th><th className="text-end font-medium">{t.s.best}</th><th className="text-end font-medium">{t.s.latest}</th><th className="text-end font-medium">n</th></tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {([['cmj_arms', stats.cmj], ['cmj_no_arms', stats.cmjNoArms], ['sj_no_arms', stats.sj], ['sj_arms', stats.sjArms], ['approach', stats.approach], ['rsi', stats.dropJump]] as const).map(([k, v]) => (
                    <tr key={k} className="border-t border-border">
                      <td className="py-2 font-sans">{t.testTypes[k]}</td>
                      <td className="text-end" dir="ltr">{fmt(v.best)}</td>
                      <td className="text-end" dir="ltr">{fmt(v.latest)}</td>
                      <td className="text-end">{v.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted mb-2">{t.s.powerTitle}</h3>
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label={t.s.peakPower} value={fmt(stats.sayersW, 0)} unit="W" />
                <MiniStat label={t.s.relativePower} value={fmt(stats.relativeW, 1)} unit="W/kg" />
                <MiniStat label={t.s.harmanPower} value={fmt(stats.harmanW, 0)} unit="W" />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------ history */}
      <Card title={`${t.s.historyTitle} (${playerHistory.length})`}>
        <div className="print:hidden"><Segmented size="sm" value={filter} onChange={setFilter} options={[
          { value: 'all', label: t.s.all }, { value: 'jumps', label: t.s.filterJumps }, { value: 'rsi', label: t.s.filterRsi }, { value: 'strength', label: t.s.filterStrength },
        ]} /></div>
        <ul className="divide-y divide-border mt-2">
          {history.map(m => {
            const ty = normalizeTestType(m.test_type);
            const strength = STRENGTH_TYPES.includes(ty);
            if (strength && !printStrength) return null;
            const main = strength
              ? `${fmt(Number(m.clean_weight_kg), 1)} kg`
              : ty === TEST_TYPES.DROP_JUMP
                ? `RSI ${fmt(Number(m.rsi_score), 2)}`
                : `${fmt(Number(m.jump_height_cm), 1)} cm`;
            const ct = Number(m.contact_time_sec) || 0;
            const sub = strength
              ? [m.reps_count ? `${m.reps_count} ${t.s.reps}` : null, m.week_number ? `${t.s.week} ${m.week_number}` : null, Number(m.clean_bw_ratio) ? `${Number(m.clean_bw_ratio).toFixed(2)}×BW` : null]
              : ty === TEST_TYPES.DROP_JUMP
                ? [`${fmt(Number(m.jump_height_cm), 1)} cm`, ct > 0 ? `${Math.round(ct >= 1 ? ct : ct * 1000)} ms` : null, Number(m.box_height_cm) ? `${t.s.box} ${m.box_height_cm}` : null]
                : [Number(m.flight_time_sec) ? `${Number(m.flight_time_sec).toFixed(3)} s` : null, Number(m.added_load_kg) ? `${t.s.load} ${m.added_load_kg} kg` : null, Number(m.peak_power_watts) ? `${Math.round(Number(m.peak_power_watts))} W` : null];
            return (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{testLabel(m.test_type)}</p>
                  <p className="text-xs text-faint truncate">{shortDate(m.created_at, language)}{m.notes ? ` · ${m.notes}` : ''}</p>
                </div>
                <div className="text-end">
                  <p className="font-mono tabular-nums font-semibold" dir="ltr">{main}</p>
                  <p className="text-[11px] text-faint">{sub.filter(Boolean).map((x, i) => <span key={i}>{i > 0 && ' · '}<bdi className="font-mono">{x}</bdi></span>)}</p>
                </div>
                <div className="flex print:hidden">
                  <button type="button" className="icon-btn" aria-label={t.s.edit} onClick={() => startEdit(m)}><Pencil size={16} /></button>
                  <button type="button" className="icon-btn text-danger/80" aria-label={t.s.delete} onClick={() => remove(m)}><Trash2 size={16} /></button>
                </div>
              </li>
            );
          })}
          {history.length === 0 && <li className="py-6 text-sm text-faint text-center">{t.s.noTestsYet}</li>}
        </ul>
      </Card>

      {/* ------------------------------------------------ sheets */}
      <AthleteFormSheet open={editPlayer} onClose={() => setEditPlayer(false)} player={p} />

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={t.s.edit}
        footer={<><button type="button" className="btn-ghost flex-1" onClick={() => setEditing(null)}>{t.s.cancel}</button><button type="button" className="btn-primary flex-1" onClick={saveEdit}>{t.s.save}</button></>}
      >
        {editForm && <TestFields form={editForm} setForm={setEditForm} />}
      </Sheet>

      <Sheet
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        title={t.s.printTitle}
        footer={<button type="button" className="btn-primary flex-1" onClick={() => { setMoreOpen(true); setPrintOpen(false); setTimeout(() => window.print(), 150); }}><Printer size={16} />{t.s.print}</button>}
      >
        <label className="flex items-center gap-3 min-h-[44px]">
          <input type="checkbox" className="w-5 h-5 accent-[var(--color-accent)]" checked={printStrength} onChange={e => setPrintStrength(e.target.checked)} />
          {t.s.includeStrength}
        </label>
      </Sheet>

      {share && (
        <Suspense fallback={null}>
          <ShareCard activePlayer={p} playerHistory={playerHistory} isOpen={share} onClose={() => setShare(false)} language={language} />
        </Suspense>
      )}
    </div>
  );
}
