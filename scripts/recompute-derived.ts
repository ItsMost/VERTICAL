/**
 * Dry-run recompute of derived columns in lab_jump_measurements.
 *
 *   npx tsx scripts/recompute-derived.ts <export.json> <outDir>
 *
 * <export.json> is a JSON array of rows (or a Supabase MCP result containing
 * one) with: id, t (test_type), d (date), h (jump_height_cm), ft, ct, l
 * (added_load_kg), v, pp, mp, mf, rsi, w (player weight_kg), leg, hpo.
 *
 * Writes <outDir>/recompute-report.csv, recompute-report.md and
 * recompute-update.sql. NOTHING is written to the database by this script.
 *
 * Rules
 *  - Only rows with jump_height_cm > 0 are touched (strength rows are skipped).
 *  - Inputs used: jump_height_cm, contact_time_sec, added_load_kg (all as typed)
 *    + the player's CURRENT weight_kg and hPO (measured hpo_m or leg × 0.45).
 *  - takeoff_velocity_ms = √(2gh)
 *  - peak_power_watts    = Sayers 1999 (unloaded jumps only)
 *  - mean_force_newtons  = Samozino m·g·(h/hPO + 1), m = weight + load
 *  - mean_power_watts    = mean force × √(g·h/2)
 *  - rsi_score: the original method of each row is detected (h/ct or ft/ct);
 *    rows that match neither were typed directly and are left unchanged.
 *    contact_time_sec >= 1 (ms typed into the seconds column) is left as is.
 *  - f0_value / v0_value / fvp_slope are never stored with load points, so
 *    they cannot be reconstructed and are left unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  takeoffVelocityFromJumpHeight,
  sayersPeakPowerW,
  samozinoMeanForceN,
  samozinoMeanPowerW,
  rsiFromHeight,
  rsiFromFlightTime,
  resolveHpo,
} from '../src/lib/biomechanics';
import { supportsStandingJumpModels } from '../src/lib/testTypes';

interface Row {
  id: string; t: string; d: string;
  h: number | null; ft: number | null; ct: number | null; l: number | null;
  v: number | null; pp: number | null; mp: number | null; mf: number | null; rsi: number | null;
  w: number | null; leg: number | null; hpo: number | null;
}

const [, , inFile, outDir = '.'] = process.argv;
let raw = readFileSync(inFile, 'utf8');
// MCP exports wrap the rows in a JSON string; unwrap until the array is plain JSON
try { const outer = JSON.parse(raw); raw = typeof outer === 'string' ? outer : outer.result ?? raw; } catch { /* plain file */ }
if (raw.includes('\\"')) raw = raw.replace(/\\"/g, '"');
const start = raw.indexOf('[{');
const end = raw.lastIndexOf('}]') + 2;
let parsed = JSON.parse(raw.slice(start, end));
if (Array.isArray(parsed) && parsed[0]?.json_agg) parsed = parsed[0].json_agg;
const rows: Row[] = (parsed as Record<string, unknown>[]).map(r => {
  const num = (k: string) => (r[k] === null || r[k] === undefined || r[k] === '' ? null : Number(r[k]));
  return {
    id: String(r.id), t: String(r.t), d: String(r.d),
    h: num('h'), ft: num('ft'), ct: num('ct'), l: num('l'),
    v: num('v'), pp: num('pp'), mp: num('mp'), mf: num('mf'), rsi: num('rsi'),
    w: num('w'), leg: num('leg'), hpo: num('hpo'),
  };
});

type Col = 'takeoff_velocity_ms' | 'peak_power_watts' | 'mean_power_watts' | 'mean_force_newtons' | 'rsi_score';
interface Change { id: string; date: string; type: string; col: Col; old: number | null; next: number | null; note: string }

const round = (x: number | null, d: number) => (x === null ? null : Number(x.toFixed(d)));
const changes: Change[] = [];
const skipped: { id: string; reason: string }[] = [];
let weightDependentRows = 0;
let rsiDirect = 0, rsiHeight = 0, rsiFlight = 0;

for (const r of rows) {
  if (!(r.h && r.h > 0)) { skipped.push({ id: r.id, reason: 'no jump height (strength row or empty)' }); continue; }
  const hM = r.h / 100;
  const load = r.l && r.l > 0 ? r.l : 0;
  const { hpoM, estimated } = resolveHpo({ hpo_m: r.hpo, leg_length_m: r.leg });
  const standing = supportsStandingJumpModels(r.t);
  const note = !standing ? 'model not valid for this test type' : !hpoM ? 'leg length missing/implausible' : estimated ? 'hPO estimated (leg × 0.45)' : 'measured hPO';
  const next: Record<Col, number | null> = {
    takeoff_velocity_ms: round(takeoffVelocityFromJumpHeight(hM), 2),
    peak_power_watts: !standing || load > 0 ? null : round(sayersPeakPowerW(r.h, r.w ?? 0), 2),
    mean_force_newtons: standing && hpoM ? round(samozinoMeanForceN((r.w ?? 0) + load, hM, hpoM), 2) : null,
    mean_power_watts: standing && hpoM ? round(samozinoMeanPowerW((r.w ?? 0) + load, hM, hpoM), 2) : null,
    rsi_score: r.rsi,
  };
  if (r.w && r.w > 0 && standing) weightDependentRows++;

  if (r.t === 'rsi' || (r.ct && r.ct > 0 && r.rsi)) {
    if (r.ct && r.ct > 0 && r.ct < 1 && r.rsi) {
      const byH = rsiFromHeight(hM, r.ct)!;
      const byF = r.ft ? rsiFromFlightTime(r.ft, r.ct) : null;
      const tol = 0.03; // stored values were rounded to 2 decimals
      if (Math.abs(byH - r.rsi) <= tol) { next.rsi_score = round(byH, 2); rsiHeight++; }
      else if (byF !== null && Math.abs(byF - r.rsi) <= tol) { next.rsi_score = round(byF, 2); rsiFlight++; }
      else { rsiDirect++; }
    } else if (r.rsi) {
      rsiDirect++;
    }
  }

  (Object.keys(next) as Col[]).forEach(col => {
    const oldKey = { takeoff_velocity_ms: 'v', peak_power_watts: 'pp', mean_power_watts: 'mp', mean_force_newtons: 'mf', rsi_score: 'rsi' }[col] as keyof Row;
    const old = r[oldKey] as number | null;
    const nv = next[col];
    const same = (old === null && nv === null) || (old !== null && nv !== null && Math.abs(old - nv) < 0.005);
    if (!same) changes.push({ id: r.id, date: r.d, type: r.t, col, old, next: nv, note });
  });
}

mkdirSync(outDir, { recursive: true });
const csv = ['id,date,test_type,column,old,new,diff,diff_pct,note']
  .concat(changes.map(c => {
    const diff = c.old !== null && c.next !== null ? c.next - c.old : null;
    const pct = diff !== null && c.old ? (diff / c.old) * 100 : null;
    return [c.id, c.date, c.type, c.col, c.old ?? '', c.next ?? '', diff === null ? '' : diff.toFixed(2), pct === null ? '' : pct.toFixed(1), c.note].join(',');
  }))
  .join('\n');
writeFileSync(join(outDir, 'recompute-report.csv'), csv);

// SQL (only applied after explicit approval)
const byRow = new Map<string, Change[]>();
changes.forEach(c => byRow.set(c.id, [...(byRow.get(c.id) || []), c]));
const sql = ['-- Generated by scripts/recompute-derived.ts. Backup: lab_jump_measurements_backup_20261112', 'begin;']
  .concat([...byRow.entries()].map(([id, cs]) =>
    `update public.lab_jump_measurements set ${cs.map(c => `${c.col} = ${c.next === null ? 'null' : c.next}`).join(', ')} where id = '${id}';`))
  .concat(['commit;'])
  .join('\n');
writeFileSync(join(outDir, 'recompute-update.sql'), sql);

// Markdown summary
const cols: Col[] = ['takeoff_velocity_ms', 'peak_power_watts', 'mean_power_watts', 'mean_force_newtons', 'rsi_score'];
const lines: string[] = [];
lines.push('# Derived-value recompute — dry run', '');
lines.push(`- Rows in table: **${rows.length}**`);
lines.push(`- Rows skipped (no jump height, e.g. strength tests): **${skipped.length}**`);
lines.push(`- Rows that would change: **${byRow.size}**`);
lines.push(`- Individual values that would change: **${changes.length}**`);
lines.push(`- Rows whose new values depend on the player's **current** weight: **${weightDependentRows}**`);
lines.push(`- RSI rows: ${rsiHeight} matched height/GCT, ${rsiFlight} matched flight/GCT, ${rsiDirect} typed directly or unusable (left unchanged)`);
lines.push('', '| column | changes | median old → new | largest change |', '|---|---:|---|---|');
for (const col of cols) {
  const cs = changes.filter(c => c.col === col);
  if (!cs.length) { lines.push(`| ${col} | 0 | | |`); continue; }
  const withBoth = cs.filter(c => c.old !== null && c.next !== null);
  const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const big = [...withBoth].sort((a, b) => Math.abs(b.next! - b.old!) - Math.abs(a.next! - a.old!))[0];
  lines.push(`| ${col} | ${cs.length} | ${withBoth.length ? `${med(withBoth.map(c => c.old!)).toFixed(1)} → ${med(withBoth.map(c => c.next!)).toFixed(1)}` : '—'} | ${big ? `${big.old} → ${big.next} (${big.type}, ${big.date})` : '—'} |`);
}
lines.push('', '## Top 15 biggest changes (absolute)', '', '| date | test | column | old | new | Δ |', '|---|---|---|---:|---:|---:|');
changes.filter(c => c.old !== null && c.next !== null)
  .sort((a, b) => Math.abs(b.next! - b.old!) - Math.abs(a.next! - a.old!))
  .slice(0, 15)
  .forEach(c => lines.push(`| ${c.date} | ${c.type} | ${c.col} | ${c.old} | ${c.next} | ${(c.next! - c.old!).toFixed(1)} |`));
const nulls = changes.filter(c => c.next === null);
lines.push('', `Values that would become empty (cannot be computed honestly): **${nulls.length}**`);
const byNote = new Map<string, number>();
nulls.forEach(c => byNote.set(`${c.col} — ${c.note}`, (byNote.get(`${c.col} — ${c.note}`) || 0) + 1));
[...byNote.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));
writeFileSync(join(outDir, 'recompute-report.md'), lines.join('\n'));
console.log(lines.join('\n'));
