/**
 * Everything the athlete page shows, computed from that athlete's stored
 * measurements. Pure functions (no React) so they are unit-tested.
 * Values that cannot be computed honestly are `null` and render as "—".
 */
import type { JumpMeasurement, Player } from '../types/athletics';
import {
  cnsReadiness,
  type ReadinessResult,
  eccentricUtilizationRatio,
  eurQuadrant,
  type EurQuadrant,
  reactiveIndex,
  gctCategory,
  type GctCategory,
  sayersPeakPowerW,
  harmanPeakPowerW,
  forceVelocityProfile,
  type FvProfileResult,
  resolveHpo,
} from './biomechanics';
import { TEST_TYPES, normalizeTestType } from './testTypes';

const num = (v: unknown): number => {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};
const time = (m: JumpMeasurement) => new Date(m.created_at).getTime();
const byDate = (a: JumpMeasurement, b: JumpMeasurement) => time(a) - time(b);

export const dayOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function ofType(history: JumpMeasurement[], ...types: string[]) {
  return history.filter(m => types.includes(normalizeTestType(m.test_type))).sort(byDate);
}

function best(rows: JumpMeasurement[], key: keyof JumpMeasurement): JumpMeasurement | null {
  let out: JumpMeasurement | null = null;
  for (const r of rows) if (num(r[key]) > 0 && (!out || num(r[key]) > num(out[key]))) out = r;
  return out;
}

export interface HeightStat {
  best: number | null;
  bestRecord: JumpMeasurement | null;
  latest: number | null;
  previous: number | null;
  /** latest − previous test, cm */
  change: number | null;
  count: number;
}

function heightStat(rows: JumpMeasurement[]): HeightStat {
  const valid = rows.filter(r => num(r.jump_height_cm) > 0);
  const b = best(valid, 'jump_height_cm');
  const latest = valid.length ? num(valid[valid.length - 1].jump_height_cm) : null;
  const previous = valid.length > 1 ? num(valid[valid.length - 2].jump_height_cm) : null;
  return {
    best: b ? num(b.jump_height_cm) : null,
    bestRecord: b,
    latest,
    previous,
    change: latest !== null && previous !== null ? latest - previous : null,
    count: valid.length,
  };
}

export interface StrengthStat { kg: number | null; xBw: number | null; record: JumpMeasurement | null }

function strengthStat(rows: JumpMeasurement[], bodyMass: number): StrengthStat {
  const b = best(rows, 'clean_weight_kg');
  const kg = b ? num(b.clean_weight_kg) : null;
  return { kg, xBw: kg && bodyMass > 0 ? kg / bodyMass : null, record: b };
}

export interface FvSession { day: string; result: FvProfileResult; rows: JumpMeasurement[] }

/**
 * Latest F-V session: squat jumps (no arms) on the most recent day that has at
 * least one loaded jump (added_load_kg > 0). Unloaded SJs on that day count as
 * the 0 kg point.
 */
export function latestFvSession(history: JumpMeasurement[], player: Pick<Player, 'weight_kg' | 'hpo_m' | 'leg_length_m'>): FvSession | null {
  const sj = ofType(history, TEST_TYPES.SJ_NO_ARMS).filter(r => num(r.jump_height_cm) > 0);
  const loadedDays = [...new Set(sj.filter(r => num(r.added_load_kg) > 0).map(r => dayOf(r.created_at)))].sort();
  const day = loadedDays[loadedDays.length - 1];
  if (!day) return null;
  const rows = sj.filter(r => dayOf(r.created_at) === day);
  const result = forceVelocityProfile(
    rows.map(r => ({ loadKg: num(r.added_load_kg), jumpHeightM: num(r.jump_height_cm) / 100 })),
    num(player.weight_kg),
    resolveHpo(player).hpoM,
  );
  return { day, result, rows };
}

export interface AthleteStats {
  bodyMass: number;
  cmj: HeightStat;           // with arms
  cmjNoArms: HeightStat;
  sj: HeightStat;            // no arms
  sjArms: HeightStat;
  approach: HeightStat;
  dropJump: HeightStat;      // DJ jump heights
  readiness: ReadinessResult;
  rsi: { best: number | null; record: JumpMeasurement | null; contactMs: number | null; gct: GctCategory | null; latest: number | null; count: number };
  eur: number | null;
  eurType: EurQuadrant | null;
  armSwingGainPct: number | null;
  reactiveIndex: number | null;
  /** highest standing jump used for power (CMJ arms → CMJ no arms → SJ) */
  powerJumpCm: number | null;
  sayersW: number | null;
  harmanW: number | null;
  relativeW: number | null;
  reach: {
    standingReach: number | null;
    touch: number | null;
    netHeight: number;
    netClearance: number | null;
    rimMargin: number | null;
    dunkMargin: number | null;
  };
  strength: { squat: StrengthStat; bench: StrengthStat; clean: StrengthStat };
  fv: FvSession | null;
  totalTests: number;
  lastTestAt: string | null;
}

export function computeAthleteStats(player: Player, history: JumpMeasurement[]): AthleteStats {
  const bodyMass = num(player.weight_kg);
  const cmj = heightStat(ofType(history, TEST_TYPES.CMJ_ARMS));
  const cmjNoArms = heightStat(ofType(history, TEST_TYPES.CMJ_NO_ARMS));
  const sj = heightStat(ofType(history, TEST_TYPES.SJ_NO_ARMS).filter(r => !(num(r.added_load_kg) > 0)));
  const sjArms = heightStat(ofType(history, TEST_TYPES.SJ_ARMS));
  const approach = heightStat(ofType(history, TEST_TYPES.APPROACH));
  const djRows = ofType(history, TEST_TYPES.DROP_JUMP);
  const dropJump = heightStat(djRows);

  const readiness = cnsReadiness(
    ofType(history, TEST_TYPES.CMJ_ARMS).map(r => ({ created_at: r.created_at, value: num(r.jump_height_cm) })),
  );

  const rsiRecord = best(djRows, 'rsi_score');
  const contact = rsiRecord ? num(rsiRecord.contact_time_sec) : 0;
  // contact_time_sec is seconds; one legacy row holds milliseconds (237) and is shown as ms
  const contactSec = contact >= 1 ? contact / 1000 : contact;
  const rsiValid = djRows.filter(r => num(r.rsi_score) > 0);

  const eur = eccentricUtilizationRatio(cmjNoArms.best ?? 0, sj.best ?? 0);
  const powerJumpCm = cmj.best ?? cmjNoArms.best ?? sj.best ?? null;
  const sayersW = powerJumpCm ? sayersPeakPowerW(powerJumpCm, bodyMass) : null;

  const standingReach = num(player.standing_reach_cm) || null;
  const reachJump = Math.max(cmj.best ?? 0, approach.best ?? 0);
  const touch = standingReach && reachJump > 0 ? standingReach + reachJump : null;
  const netHeight = player.gender === 'female' ? 224 : 243;

  const sorted = [...history].sort(byDate);
  return {
    bodyMass,
    cmj, cmjNoArms, sj, sjArms, approach, dropJump,
    readiness,
    rsi: {
      best: rsiRecord ? num(rsiRecord.rsi_score) : null,
      record: rsiRecord,
      contactMs: contactSec > 0 ? Math.round(contactSec * 1000) : null,
      gct: contactSec > 0 ? gctCategory(contactSec) : null,
      latest: rsiValid.length ? num(rsiValid[rsiValid.length - 1].rsi_score) : null,
      count: rsiValid.length,
    },
    eur,
    eurType: eurQuadrant(eur),
    armSwingGainPct: cmj.best && cmjNoArms.best ? ((cmj.best - cmjNoArms.best) / cmjNoArms.best) * 100 : null,
    reactiveIndex: reactiveIndex(dropJump.best ?? 0, cmjNoArms.best ?? 0),
    powerJumpCm,
    sayersW,
    harmanW: powerJumpCm ? harmanPeakPowerW(powerJumpCm, bodyMass) : null,
    relativeW: sayersW && bodyMass > 0 ? sayersW / bodyMass : null,
    reach: {
      standingReach,
      touch,
      netHeight,
      netClearance: touch !== null ? touch - netHeight : null,
      rimMargin: touch !== null ? touch - 305 : null,
      dunkMargin: touch !== null ? touch - 315 : null,
    },
    strength: {
      squat: strengthStat(ofType(history, TEST_TYPES.FULL_SQUAT), bodyMass),
      bench: strengthStat(ofType(history, TEST_TYPES.BENCH_PRESS), bodyMass),
      clean: strengthStat(ofType(history, TEST_TYPES.POWER_CLEAN), bodyMass),
    },
    fv: latestFvSession(history, player),
    totalTests: history.length,
    lastTestAt: sorted.length ? sorted[sorted.length - 1].created_at : null,
  };
}

/** Age in whole years from date_of_birth (or legacy `age`). */
export function ageOf(player: Pick<Player, 'date_of_birth' | 'age'>): number | null {
  if (player.date_of_birth) {
    const dob = new Date(player.date_of_birth);
    if (!Number.isNaN(dob.getTime())) {
      const now = new Date();
      let a = now.getFullYear() - dob.getFullYear();
      if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) a--;
      return a;
    }
  }
  return player.age ? Number(player.age) : null;
}

export type Level = 'elite' | 'excellent' | 'good' | 'developing';

/**
 * Same standards as the old roster badges / handbook:
 * CMJ & approach (inches): men 34 / 30 / 26, women 26 / 22 / 18;
 * RSI: 3.0 / 2.5 / 2.0. Under-17s get a 0.85 factor on thresholds.
 */
export function levelOf(kind: 'jump' | 'rsi', value: number | null, gender: string | null | undefined, age: number | null): Level | null {
  if (value === null || !(value > 0)) return null;
  const f = age !== null && age < 17 ? 0.85 : 1;
  const t = kind === 'rsi' ? [3.0, 2.5, 2.0] : gender === 'female' ? [26, 22, 18] : [34, 30, 26];
  const v = kind === 'rsi' ? value : value / 2.54;
  if (v >= t[0] * f) return 'elite';
  if (v >= t[1] * f) return 'excellent';
  if (v >= t[2] * f) return 'good';
  return 'developing';
}
