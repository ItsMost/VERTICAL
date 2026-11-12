import React, { useMemo, useState } from 'react';
import { LineChart, TrendingUp, Zap, Plus, Trash2, Activity, AlertTriangle, Upload } from 'lucide-react';
import { useData } from './context/DataContext';
import type { Player } from './types/athletics';
import {
  forceVelocityProfile,
  resolveHpo,
  analyzeForceTime,
  type FvProfileResult,
  type ForceTimeResult,
  type FvImbalanceBand,
} from './lib/biomechanics';

interface FVPCalculatorProps {
  activePlayer?: Player | null;
  selectedPlayerId?: string;
  language?: string;
}

const DASH = '—';
const n = (v: number | null | undefined, d: number) => (v === null || v === undefined || !Number.isFinite(v) ? DASH : v.toFixed(d));

function Metric({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="card p-4">
      <span className="block text-xs text-muted mb-1">{label}</span>
      <span className="text-2xl font-bold font-mono tabular-nums text-text">
        {value}
        {unit && <span className="text-xs text-muted font-sans ms-1">{unit}</span>}
      </span>
      {sub && <span className="block text-xs text-muted font-mono tabular-nums mt-1">{sub}</span>}
    </div>
  );
}

export default function FVPCalculator({ activePlayer: propPlayer }: FVPCalculatorProps) {
  const { activePlayer: ctxPlayer, t } = useData();
  const activePlayer = propPlayer || ctxPlayer;
  const f = t.fvpConsole;

  const [tab, setTab] = useState<'fvp' | 'ftc'>('fvp');

  // ------------------------------- F-V profile -------------------------------
  const [jumps, setJumps] = useState([
    { load: '0', flight: '' },
    { load: '15', flight: '' },
    { load: '30', flight: '' },
    { load: '45', flight: '' },
  ]);
  const [result, setResult] = useState<FvProfileResult | null>(null);

  const mass = Number(activePlayer?.weight_kg) || 0;
  const hpo = resolveHpo(activePlayer);

  const compute = () => {
    setResult(
      forceVelocityProfile(
        jumps
          .filter(j => j.flight.trim() !== '')
          .map(j => ({ loadKg: parseFloat(j.load) || 0, flightTimeSec: parseFloat(j.flight) })),
        mass,
        hpo.hpoM,
      ),
    );
  };

  const bandLabel: Record<FvImbalanceBand, string> = {
    well_balanced: f.bandWell,
    moderate_force_deficit: f.bandModForce,
    moderate_velocity_deficit: f.bandModVel,
    large_force_deficit: f.bandLargeForce,
    large_velocity_deficit: f.bandLargeVel,
  };
  const bandTone = (b: FvImbalanceBand) =>
    b === 'well_balanced' ? 'tone-success' : b.startsWith('moderate') ? 'tone-warning' : 'tone-danger';
  const presc = (b: FvImbalanceBand) =>
    b === 'well_balanced' ? f.prescBalanced : b.endsWith('force_deficit') ? f.prescForce : f.prescVel;

  const reasonText = (r: string) =>
    ({ too_few_points: f.reasonTooFew, no_variation: f.reasonNoVariation, non_negative_slope: f.reasonSlope, low_r2: f.reasonR2, missing_inputs: f.reasonMissing } as Record<string, string>)[r] || r;

  // Plot geometry (actual vs optimal line, plus raw points)
  const plot = useMemo(() => {
    if (!result || !result.ok) return null;
    const F0opt = Math.sqrt(-4 * result.Pmax * result.SfvOpt);
    const V0opt = -F0opt / result.SfvOpt;
    const maxV = Math.max(result.V0, V0opt) * 1.05;
    const maxF = Math.max(result.F0, F0opt) * 1.05;
    const W = 320, H = 200, L = 36, B = 24;
    const x = (v: number) => L + (v / maxV) * (W - L - 8);
    const y = (fv: number) => H - B - (fv / maxF) * (H - B - 8);
    return { W, H, L, B, x, y, F0opt, V0opt, maxV, maxF };
  }, [result]);

  // ------------------------------- Force-time --------------------------------
  const [fs, setFs] = useState('1000');
  const [raw, setRaw] = useState('');
  const [ft, setFt] = useState<ForceTimeResult | null>(null);

  const analyze = () => {
    const samples = raw.split(/[\s,;]+/).map(Number).filter(Number.isFinite);
    setFt(analyzeForceTime(samples, parseFloat(fs)));
  };
  const loadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(txt => {
      // keep the last numeric column of each row (common force-plate export layout)
      const vals = txt.split(/\r?\n/).map(line => {
        const nums = line.split(/[,;\t ]+/).map(Number).filter(Number.isFinite);
        return nums.length ? nums[nums.length - 1] : NaN;
      }).filter(Number.isFinite);
      setRaw(vals.join(', '));
    });
  };
  const ftReason = (r: string) =>
    ({ too_short: f.ftErrTooShort, no_quiet_phase: f.ftErrQuiet, no_onset: f.ftErrOnset, no_takeoff: f.ftErrTakeoff, negative_takeoff_velocity: f.ftErrVelocity } as Record<string, string>)[r] || r;

  return (
    <div className="space-y-6">
      <div className="segmented max-w-md mx-auto">
        <button onClick={() => setTab('fvp')} aria-pressed={tab === 'fvp'}><TrendingUp size={16} /> {f.tabFvp}</button>
        <button onClick={() => setTab('ftc')} aria-pressed={tab === 'ftc'}><LineChart size={16} /> {f.tabFt}</button>
      </div>

      {tab === 'fvp' && (
        <section className="space-y-5">
          <header className="text-center space-y-1">
            <h3 className="text-xl font-bold flex items-center justify-center gap-2"><Zap className="text-accent" size={22} />{f.title}</h3>
            <p className="text-muted text-sm max-w-xl mx-auto">{f.subtitle}</p>
            <div className="flex flex-wrap justify-center gap-2 pt-1 text-xs font-mono tabular-nums">
              <span className="chip">{f.bodyMass}: {mass > 0 ? `${mass} kg` : DASH}</span>
              <span className="chip">hPO: {hpo.hpoM ? `${hpo.hpoM.toFixed(2)} m` : DASH}</span>
              {hpo.estimated && hpo.hpoM && <span className="chip tone-warning">{t.hud.hpoEstimatedBadge}</span>}
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {jumps.map((j, i) => (
              <div key={i} className="card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-accent">{f.trial} {i + 1}</span>
                  {jumps.length > 2 && (
                    <button aria-label={f.removeTrial} className="icon-btn" onClick={() => setJumps(jumps.filter((_, k) => k !== i))}><Trash2 size={16} /></button>
                  )}
                </div>
                <label className="block text-xs text-muted">{f.loadTrial} (kg)
                  <input type="number" inputMode="decimal" value={j.load} onChange={e => setJumps(jumps.map((x, k) => (k === i ? { ...x, load: e.target.value } : x)))} className="field mt-1" />
                </label>
                <label className="block text-xs text-muted">{f.flightTimeS}
                  <input type="number" inputMode="decimal" step="0.001" value={j.flight} placeholder="0.000" onChange={e => setJumps(jumps.map((x, k) => (k === i ? { ...x, flight: e.target.value } : x)))} className="field mt-1" />
                </label>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button className="btn-ghost" onClick={() => setJumps([...jumps, { load: '', flight: '' }])}><Plus size={16} /> {f.addTrial}</button>
            <button className="btn-primary" onClick={compute}>{f.compute}</button>
          </div>

          {result && !result.ok && (
            <div className="card p-4 space-y-3 tone-danger" role="alert">
              <h4 className="font-bold flex items-center gap-2"><AlertTriangle size={18} /> {f.invalidTitle}</h4>
              <p className="text-sm">{reasonText(result.reason)}</p>
              {(result.slope !== undefined || result.r2 !== undefined) && (
                <p className="text-xs font-mono tabular-nums">Sfv = {n(result.slope ?? null, 2)} · R² = {n(result.r2 ?? null, 3)}</p>
              )}
            </div>
          )}

          {result && result.points.length > 0 && (
            <div className="card p-4 overflow-x-auto">
              <h4 className="text-sm font-bold mb-2">{f.rawPoints}</h4>
              <table className="w-full text-sm font-mono tabular-nums">
                <thead className="text-muted text-xs">
                  <tr><th className="text-start py-1">{f.load} (kg)</th><th className="text-start">{f.height} (cm)</th><th className="text-start">{f.force} (N/kg)</th><th className="text-start">{f.velocity} (m/s)</th></tr>
                </thead>
                <tbody>
                  {result.points.map((p, i) => (
                    <tr key={i} className="border-t border-border"><td className="py-1">{p.loadKg}</td><td>{(p.jumpHeightM * 100).toFixed(1)}</td><td>{p.forceNkg.toFixed(2)}</td><td>{p.velocityMs.toFixed(3)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result && result.ok && plot && (
            <div className="space-y-4">
              <div className={`card p-5 text-center ${bandTone(result.band)}`}>
                <p className="text-xs text-muted">{f.imbalancePercent}</p>
                <p className="text-5xl font-bold font-mono tabular-nums my-1">{result.FVimb.toFixed(0)}%</p>
                <p className="font-bold">{bandLabel[result.band]}</p>
                <p className="text-sm text-muted mt-2 max-w-md mx-auto">{presc(result.band)}</p>
              </div>

              <div className="card p-4">
                <div className="flex flex-wrap justify-between gap-2 mb-2 text-xs">
                  <span className="font-bold text-sm">{f.actualVsOptCurve}</span>
                  <span className="flex gap-3">
                    <span className="flex items-center gap-1 text-accent"><span className="w-4 h-0.5 bg-accent inline-block" />{f.actualCurve}</span>
                    <span className="flex items-center gap-1 text-success"><span className="w-4 border-t-2 border-dashed border-success inline-block" />{f.optimalCurve}</span>
                  </span>
                </div>
                <svg viewBox={`0 0 ${plot.W} ${plot.H}`} className="w-full h-auto" role="img" aria-label={f.actualVsOptCurve} style={{ direction: "ltr" }}>
                  <line x1={plot.L} y1={8} x2={plot.L} y2={plot.H - plot.B} className="stroke-border" />
                  <line x1={plot.L} y1={plot.H - plot.B} x2={plot.W - 8} y2={plot.H - plot.B} className="stroke-border" />
                  <line x1={plot.x(0)} y1={plot.y(result.F0)} x2={plot.x(result.V0)} y2={plot.y(0)} className="stroke-accent" strokeWidth={2.5} />
                  <line x1={plot.x(0)} y1={plot.y(plot.F0opt)} x2={plot.x(plot.V0opt)} y2={plot.y(0)} className="stroke-success" strokeWidth={2} strokeDasharray="6 4" />
                  {result.points.map((p, i) => <circle key={i} cx={plot.x(p.velocityMs)} cy={plot.y(p.forceNkg)} r={4} className="fill-text" />)}
                  <text x={plot.L - 4} y={14} textAnchor="end" className="fill-muted" fontSize={10}>N/kg</text>
                  <text x={plot.W - 8} y={plot.H - 6} textAnchor="end" className="fill-muted" fontSize={10}>m/s</text>
                  <text x={plot.L - 4} y={plot.y(result.F0) + 3} textAnchor="end" className="fill-muted" fontSize={9}>{result.F0.toFixed(0)}</text>
                  <text x={plot.x(result.V0)} y={plot.H - 10} textAnchor="middle" className="fill-muted" fontSize={9}>{result.V0.toFixed(1)}</text>
                </svg>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label={`${f.f0Force} (F0)`} value={n(result.F0, 1)} unit="N/kg" sub={`${n(result.F0 * mass, 0)} N`} />
                <Metric label={`${f.v0Velocity} (V0)`} value={n(result.V0, 2)} unit="m/s" />
                <Metric label={`${f.pmaxPower} (Pmax)`} value={n(result.Pmax, 1)} unit="W/kg" sub={`${n(result.Pmax * mass, 0)} W`} />
                <Metric label="R²" value={n(result.r2, 3)} />
                <Metric label={`${f.sfvSlope} (Sfv)`} value={n(result.Sfv, 2)} unit="N·s/m/kg" />
                <Metric label={`${f.sfvOptSlope} (Sfv opt)`} value={n(result.SfvOpt, 2)} unit="N·s/m/kg" />
                <Metric label="hPO" value={n(result.hpoM, 2)} unit="m" sub={hpo.estimated ? t.hud.hpoEstimatedBadge : undefined} />
              </div>
              <p className="text-xs text-muted">{f.methodDesc}</p>
            </div>
          )}
        </section>
      )}

      {tab === 'ftc' && (
        <section className="space-y-5">
          <header className="text-center space-y-1">
            <h3 className="text-xl font-bold flex items-center justify-center gap-2"><Activity className="text-accent" size={22} />{f.ftTitle}</h3>
            <p className="text-muted text-sm max-w-xl mx-auto">{f.ftSubtitle}</p>
          </header>
          <div className="grid gap-3 max-w-2xl mx-auto">
            <label className="text-xs text-muted">{f.ftSampling}
              <input type="number" inputMode="numeric" value={fs} onChange={e => setFs(e.target.value)} className="field mt-1" />
            </label>
            <label className="text-xs text-muted">{f.ftPaste}
              <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={5} className="field mt-1 font-mono" dir="ltr" />
            </label>
            <div className="flex flex-wrap gap-3 justify-center">
              <label className="btn-ghost cursor-pointer"><Upload size={16} /> {f.ftLoadFile}
                <input type="file" accept=".csv,.txt" className="sr-only" onChange={loadFile} />
              </label>
              <button className="btn-primary" onClick={analyze} disabled={!raw.trim()}>{f.ftAnalyze}</button>
            </div>
            <p className="text-xs text-muted">{f.ftMethod}</p>
          </div>

          {ft && !ft.ok && (
            <div className="card p-4 tone-danger max-w-2xl mx-auto" role="alert">
              <p className="font-bold flex items-center gap-2"><AlertTriangle size={18} /> {ftReason(ft.reason)}</p>
            </div>
          )}

          {ft && ft.ok && (
            <div className="space-y-3 max-w-3xl mx-auto">
              <div className="card p-5 text-center">
                <p className="text-xs text-muted">{f.ftJumpHeight}</p>
                <p className="text-5xl font-bold font-mono tabular-nums">{(ft.jumpHeight * 100).toFixed(1)}<span className="text-base text-muted ms-1">cm</span></p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label={f.ftTakeoffVel} value={n(ft.takeoffVelocity, 2)} unit="m/s" />
                <Metric label={f.ftTimeToTakeoff} value={n(ft.timeToTakeoff, 3)} unit="s" />
                <Metric label={f.ftRsiMod} value={n(ft.rsiMod, 2)} unit="m/s" />
                <Metric label={f.ftPropDuration} value={n(ft.propulsiveDuration, 3)} unit="s" />
                <Metric label={f.ftPeakForce} value={n(ft.peakForce, 0)} unit="N" sub={`${n(ft.peakForce / ft.bodyMassKg, 1)} N/kg`} />
                <Metric label={f.ftMeanPropForce} value={n(ft.meanPropulsiveForce, 0)} unit="N" sub={`${n(ft.meanPropulsiveForce / ft.bodyMassKg, 1)} N/kg`} />
                <Metric label={f.ftPeakPower} value={n(ft.peakPower, 0)} unit="W" sub={`${n(ft.peakPower / ft.bodyMassKg, 1)} W/kg`} />
                <Metric label={f.ftImpulse} value={n(ft.propulsiveImpulse, 1)} unit="N·s" />
                <Metric label={f.ftBodyWeight} value={n(ft.bodyWeightN, 0)} unit="N" sub={`${n(ft.bodyMassKg, 1)} kg`} />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
