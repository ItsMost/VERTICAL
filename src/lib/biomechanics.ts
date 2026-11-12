/**
 * VERTICAL LAB — single source of truth for every biomechanics formula.
 *
 * Units are explicit in every function name / argument. Nothing here guesses
 * units, clamps results into "plausible" ranges, or estimates a value with a
 * multiplier: when a value cannot be computed honestly the function returns
 * `null` (or an `{ ok: false, reason }` result) and the UI shows "—".
 */

/** Gravitational acceleration used everywhere in the app (m/s²). */
export const G = 9.81;

const isPos = (x: number | null | undefined): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x > 0;

// ---------------------------------------------------------------------------
// Flight-time kinematics
// ---------------------------------------------------------------------------

/** Jump height (m) from flight time (s): h = g·tf² / 8. */
export function jumpHeightFromFlightTime(flightTimeSec: number): number | null {
  return isPos(flightTimeSec) ? (G * flightTimeSec * flightTimeSec) / 8 : null;
}

/** Flight time (s) from jump height (m): tf = √(8h / g). */
export function flightTimeFromJumpHeight(jumpHeightM: number): number | null {
  return isPos(jumpHeightM) ? Math.sqrt((8 * jumpHeightM) / G) : null;
}

/** Take-off velocity (m/s) from jump height (m): v = √(2gh). */
export function takeoffVelocityFromJumpHeight(jumpHeightM: number): number | null {
  return isPos(jumpHeightM) ? Math.sqrt(2 * G * jumpHeightM) : null;
}

/** Jump height (m) from take-off velocity (m/s): h = v² / 2g. */
export function jumpHeightFromTakeoffVelocity(takeoffVelocityMs: number): number | null {
  return isPos(takeoffVelocityMs) ? (takeoffVelocityMs * takeoffVelocityMs) / (2 * G) : null;
}

// ---------------------------------------------------------------------------
// Empirical peak-power equations
// ---------------------------------------------------------------------------

/**
 * Sayers et al. (1999), Med Sci Sports Exerc 31(4):572-577.
 * PP (W) = 60.7·h(cm) + 45.3·BM(kg) − 2055. Main peak-power value in the app.
 */
export function sayersPeakPowerW(jumpHeightCm: number, bodyMassKg: number): number | null {
  if (!isPos(jumpHeightCm) || !isPos(bodyMassKg)) return null;
  return 60.7 * jumpHeightCm + 45.3 * bodyMassKg - 2055;
}

/**
 * Harman et al. (1991), J Appl Sport Sci Res 5(3):116-120.
 * PP (W) = 61.9·h(cm) + 36.0·BM(kg) + 1822. Secondary value only.
 */
export function harmanPeakPowerW(jumpHeightCm: number, bodyMassKg: number): number | null {
  if (!isPos(jumpHeightCm) || !isPos(bodyMassKg)) return null;
  return 61.9 * jumpHeightCm + 36.0 * bodyMassKg + 1822;
}

/** Harman et al. (1991) average power: AP (W) = 21.2·h(cm) + 23.0·BM(kg) − 1393. */
export function harmanMeanPowerW(jumpHeightCm: number, bodyMassKg: number): number | null {
  if (!isPos(jumpHeightCm) || !isPos(bodyMassKg)) return null;
  return 21.2 * jumpHeightCm + 23.0 * bodyMassKg - 1393;
}

// ---------------------------------------------------------------------------
// Samozino simple method (Samozino et al. 2008, J Biomech 41:2940-2945)
// ---------------------------------------------------------------------------

/** Mean push-off force (N): F = m·g·(h/hPO + 1). `systemMassKg` = body mass + added load. */
export function samozinoMeanForceN(systemMassKg: number, jumpHeightM: number, hpoM: number): number | null {
  if (!isPos(systemMassKg) || !isPos(jumpHeightM) || !isPos(hpoM)) return null;
  return systemMassKg * G * (jumpHeightM / hpoM + 1);
}

/** Mean push-off velocity (m/s): v̄ = √(g·h/2) (= take-off velocity / 2). */
export function samozinoMeanVelocityMs(jumpHeightM: number): number | null {
  return isPos(jumpHeightM) ? Math.sqrt((G * jumpHeightM) / 2) : null;
}

/** Mean push-off power (W) = F̄ · v̄. */
export function samozinoMeanPowerW(systemMassKg: number, jumpHeightM: number, hpoM: number): number | null {
  const f = samozinoMeanForceN(systemMassKg, jumpHeightM, hpoM);
  const v = samozinoMeanVelocityMs(jumpHeightM);
  return f !== null && v !== null ? f * v : null;
}

/** Mean push-off acceleration (m/s²) = v_TO² / (2·hPO) = g·h / hPO. */
export function pushOffAccelerationMs2(jumpHeightM: number, hpoM: number): number | null {
  return isPos(jumpHeightM) && isPos(hpoM) ? (G * jumpHeightM) / hpoM : null;
}

/** Push-off duration (s) = 2·hPO / v_TO (uniform acceleration over hPO). */
export function pushOffDurationSec(jumpHeightM: number, hpoM: number): number | null {
  const v = takeoffVelocityFromJumpHeight(jumpHeightM);
  return v !== null && isPos(hpoM) ? (2 * hpoM) / v : null;
}

// ---------------------------------------------------------------------------
// Push-off distance (hPO)
// ---------------------------------------------------------------------------

/** Fraction of leg length used only when no measured hPO exists. */
export const HPO_ESTIMATE_FRACTION = 0.45;

export interface HpoResult {
  hpoM: number | null;
  estimated: boolean;
}

/**
 * hPO = leg length (greater trochanter → toes, feet extended) − height of the
 * greater trochanter in a 90° squat. Uses the measured `hpo_m` when available,
 * otherwise falls back to leg_length × 0.45 and flags it as estimated.
 */
export function resolveHpo(player: { hpo_m?: number | string | null; leg_length_m?: number | string | null } | null | undefined): HpoResult {
  const measured = Number(player?.hpo_m);
  if (isPos(measured)) return { hpoM: measured, estimated: false };
  const leg = legLengthMetres(player?.leg_length_m);
  if (leg !== null) return { hpoM: leg * HPO_ESTIMATE_FRACTION, estimated: true };
  return { hpoM: null, estimated: true };
}

/** Plausible leg length (greater trochanter → toes) in metres. */
export const LEG_LENGTH_RANGE_M = [0.6, 1.3] as const;

/**
 * Leg length in metres. Some players have it typed in centimetres in the
 * `leg_length_m` column (e.g. 99). A value inside 0.6–1.3 is metres, inside
 * 60–130 is centimetres (unambiguous: the ranges don't overlap). Anything else
 * (e.g. 9 or 185) is ambiguous or implausible and returns null.
 */
export function legLengthMetres(value: number | string | null | undefined): number | null {
  const v = Number(value);
  if (!isPos(v)) return null;
  const [lo, hi] = LEG_LENGTH_RANGE_M;
  if (v >= lo && v <= hi) return v;
  if (v >= lo * 100 && v <= hi * 100) return v / 100;
  return null;
}

/** hPO (m) from the two measurements (both in m). */
export function hpoFromMeasurements(legLengthM: number, squatTrochanterHeightM: number): number | null {
  if (!isPos(legLengthM) || !isPos(squatTrochanterHeightM)) return null;
  const hpo = legLengthM - squatTrochanterHeightM;
  return hpo > 0 ? hpo : null;
}

// ---------------------------------------------------------------------------
// Force-velocity profile (Samozino et al. 2012, MSSE 44(2):313-322)
// ---------------------------------------------------------------------------

export interface FvInputPoint {
  loadKg: number;
  /** Provide either a jump height (m) or a flight time (s). */
  jumpHeightM?: number;
  flightTimeSec?: number;
}

export interface FvPoint {
  loadKg: number;
  jumpHeightM: number;
  /** Mean push-off force relative to body mass (N/kg). */
  forceNkg: number;
  /** Mean push-off velocity (m/s). */
  velocityMs: number;
}

export type FvImbalanceBand =
  | 'well_balanced'
  | 'moderate_force_deficit'
  | 'moderate_velocity_deficit'
  | 'large_force_deficit'
  | 'large_velocity_deficit';

export type FvInvalidReason = 'too_few_points' | 'no_variation' | 'non_negative_slope' | 'low_r2' | 'missing_inputs';

export type FvProfileResult =
  | {
      ok: true;
      points: FvPoint[];
      /** N/kg */ F0: number;
      /** m/s */ V0: number;
      /** W/kg */ Pmax: number;
      /** N·s/m/kg */ Sfv: number;
      /** N·s/m/kg */ SfvOpt: number;
      /** % (100 = optimal) */ FVimb: number;
      band: FvImbalanceBand;
      r2: number;
      hpoM: number;
    }
  | { ok: false; reason: FvInvalidReason; points: FvPoint[]; slope?: number; r2?: number };

export const FV_MIN_R2 = 0.9;

/** Ordinary least-squares fit y = a + b·x, with R². */
export function linearRegression(xs: number[], ys: number[]): { intercept: number; slope: number; r2: number } | null {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx < 1e-12) return null;
  const slope = sxy / sxx;
  const r2 = syy > 0 ? (sxy * sxy) / (sxx * syy) : 1;
  return { intercept: my - slope * mx, slope, r2 };
}

/**
 * Jump height (m) reached for a given Sfv when Pmax (W/kg) and hPO (m) are fixed
 * (Samozino 2012 model). Used to verify the closed-form optimum numerically.
 */
export function jumpHeightForProfile(sfv: number, pmaxWkg: number, hpoM: number): number {
  if (!(sfv < 0) || !isPos(pmaxWkg) || !isPos(hpoM)) return 0;
  const F0 = Math.sqrt(-4 * pmaxWkg * sfv);
  const d = (sfv * sfv) / 4 + (2 * (F0 - G)) / hpoM;
  if (d < 0) return 0;
  const vTO = hpoM * (sfv / 2 + Math.sqrt(d));
  return vTO > 0 ? (vTO * vTO) / (2 * G) : 0;
}

/**
 * Optimal F-V slope (N·s/m/kg) that maximises jump height for a given Pmax
 * (W/kg) and hPO (m) — Samozino et al. (2012) closed-form solution.
 *
 * Setting dh/dSfv = 0 with F0 = √(−4·Pmax·Sfv) gives, for u = √(−Sfv):
 *   2a·u³ − 4b·u² − a² = 0,  a = 4√Pmax / hPO,  b = 2g / hPO
 * which has exactly one positive real root (Descartes). Solved with Cardano.
 */
export function optimalSfv(pmaxWkg: number, hpoM: number): number | null {
  if (!isPos(pmaxWkg) || !isPos(hpoM)) return null;
  const a = (4 * Math.sqrt(pmaxWkg)) / hpoM;
  const b = (2 * G) / hpoM;
  // u³ + A·u² + C = 0
  const A = (-2 * b) / a;
  const C = -a / 2;
  // depressed cubic t³ + p·t + q = 0 with u = t − A/3
  const p = (-A * A) / 3;
  const q = (2 * A * A * A) / 27 + C;
  const disc = (q * q) / 4 + (p * p * p) / 27;
  let roots: number[];
  if (disc >= 0) {
    const s = Math.sqrt(disc);
    roots = [Math.cbrt(-q / 2 + s) + Math.cbrt(-q / 2 - s)];
  } else {
    const r = 2 * Math.sqrt(-p / 3);
    const th = Math.acos(((3 * q) / (2 * p)) * Math.sqrt(-3 / p)) / 3;
    roots = [0, 1, 2].map(k => r * Math.cos(th - (2 * Math.PI * k) / 3));
  }
  const us = roots.map(t => t - A / 3).filter(u => u > 0);
  if (us.length === 0) return null;
  const u = Math.max(...us);
  return -(u * u);
}

/** FVimb bands: 90–110 % balanced; 60–90 / 110–140 moderate; beyond → large. */
export function fvImbalanceBand(fvimbPercent: number): FvImbalanceBand {
  if (fvimbPercent < 60) return 'large_force_deficit';
  if (fvimbPercent < 90) return 'moderate_force_deficit';
  if (fvimbPercent <= 110) return 'well_balanced';
  if (fvimbPercent <= 140) return 'moderate_velocity_deficit';
  return 'large_velocity_deficit';
}

/**
 * Builds the vertical-jump F-V profile from ≥2 loaded jumps.
 * Force is mean push-off force of the system (body + load) divided by body mass.
 * Never invents a slope: returns `ok:false` with the raw points when the
 * regression is non-negative or R² < 0.9.
 */
export function forceVelocityProfile(input: FvInputPoint[], bodyMassKg: number, hpoM: number | null): FvProfileResult {
  if (!isPos(bodyMassKg) || !isPos(hpoM ?? NaN)) return { ok: false, reason: 'missing_inputs', points: [] };
  const hpo = hpoM as number;
  const points: FvPoint[] = [];
  for (const p of input) {
    const h = isPos(p.jumpHeightM) ? p.jumpHeightM : p.flightTimeSec !== undefined ? jumpHeightFromFlightTime(p.flightTimeSec) : null;
    const load = Number.isFinite(p.loadKg) && p.loadKg >= 0 ? p.loadKg : NaN;
    if (h === null || !Number.isFinite(load)) continue;
    const f = samozinoMeanForceN(bodyMassKg + load, h, hpo)!;
    points.push({ loadKg: load, jumpHeightM: h, forceNkg: f / bodyMassKg, velocityMs: samozinoMeanVelocityMs(h)! });
  }
  if (points.length < 2) return { ok: false, reason: 'too_few_points', points };
  const fit = linearRegression(points.map(p => p.velocityMs), points.map(p => p.forceNkg));
  if (!fit) return { ok: false, reason: 'no_variation', points };
  if (fit.slope >= 0) return { ok: false, reason: 'non_negative_slope', points, slope: fit.slope, r2: fit.r2 };
  if (fit.r2 < FV_MIN_R2) return { ok: false, reason: 'low_r2', points, slope: fit.slope, r2: fit.r2 };
  const F0 = fit.intercept;
  const Sfv = fit.slope;
  const V0 = -F0 / Sfv;
  const Pmax = (F0 * V0) / 4;
  const SfvOpt = optimalSfv(Pmax, hpo);
  if (SfvOpt === null || !(F0 > 0)) return { ok: false, reason: 'non_negative_slope', points, slope: fit.slope, r2: fit.r2 };
  const FVimb = (Sfv / SfvOpt) * 100;
  return { ok: true, points, F0, V0, Pmax, Sfv, SfvOpt, FVimb, band: fvImbalanceBand(FVimb), r2: fit.r2, hpoM: hpo };
}

// ---------------------------------------------------------------------------
// Reactive strength
// ---------------------------------------------------------------------------

/** Drop-jump RSI = jump height (m) / ground contact time (s). */
export function rsiFromHeight(jumpHeightM: number, contactTimeSec: number): number | null {
  return isPos(jumpHeightM) && isPos(contactTimeSec) ? jumpHeightM / contactTimeSec : null;
}

/** Drop-jump RSI (flight-time variant) = flight time (s) / contact time (s). */
export function rsiFromFlightTime(flightTimeSec: number, contactTimeSec: number): number | null {
  return isPos(flightTimeSec) && isPos(contactTimeSec) ? flightTimeSec / contactTimeSec : null;
}

/**
 * RSImod = CMJ jump height (m) / time-to-take-off (s) (Ebben & Petushek 2010).
 * Only valid where time-to-take-off is measured (force plate).
 */
export function rsiModified(jumpHeightM: number, timeToTakeoffSec: number): number | null {
  return isPos(jumpHeightM) && isPos(timeToTakeoffSec) ? jumpHeightM / timeToTakeoffSec : null;
}

/**
 * Vertical leg stiffness (N/m), Dalleau et al. (2004), Int J Sports Med 25:170-176:
 * K = m·π·(tf + tc) / (tc²·((tf + tc)/π − tc/4)).
 */
export function legStiffnessDalleau(bodyMassKg: number, contactTimeSec: number, flightTimeSec: number): number | null {
  if (!isPos(bodyMassKg) || !isPos(contactTimeSec) || !isPos(flightTimeSec)) return null;
  const tc = contactTimeSec, tf = flightTimeSec;
  const denom = tc * tc * ((tf + tc) / Math.PI - tc / 4);
  return denom > 0 ? (bodyMassKg * Math.PI * (tf + tc)) / denom : null;
}

export type GctCategory = 'elite_fast' | 'moderate' | 'slow';

/** Ground-contact-time band: < 170 ms fast SSC, 170–250 ms moderate, > 250 ms slow. */
export function gctCategory(contactTimeSec: number): GctCategory | null {
  if (!isPos(contactTimeSec)) return null;
  const ms = contactTimeSec * 1000;
  if (ms < 170) return 'elite_fast';
  if (ms <= 250) return 'moderate';
  return 'slow';
}

// ---------------------------------------------------------------------------
// Ratios
// ---------------------------------------------------------------------------

/** Eccentric utilisation ratio = CMJ (no arms) / SJ (no arms) height. */
export function eccentricUtilizationRatio(cmjNoArmsCm: number, sjNoArmsCm: number): number | null {
  return isPos(cmjNoArmsCm) && isPos(sjNoArmsCm) ? cmjNoArmsCm / sjNoArmsCm : null;
}

/** Reactive index = drop-jump height / CMJ (no arms) height — only from real DJ heights. */
export function reactiveIndex(djHeightCm: number, cmjNoArmsCm: number): number | null {
  return isPos(djHeightCm) && isPos(cmjNoArmsCm) ? djHeightCm / cmjNoArmsCm : null;
}

export type EurQuadrant = 'elastic_dominant' | 'strength_dominant' | 'well_balanced_elite';

export function eurQuadrant(eur: number | null): EurQuadrant | null {
  if (eur === null) return null;
  if (eur > 1.15) return 'elastic_dominant';
  if (eur < 1.05) return 'strength_dominant';
  return 'well_balanced_elite';
}

// ---------------------------------------------------------------------------
// CNS readiness
// ---------------------------------------------------------------------------

export interface DatedValue {
  created_at: string;
  value: number;
}

export type ReadinessResult =
  | {
      ok: true;
      todayValue: number;
      baselineMean: number;
      baselineSd: number;
      baselineN: number;
      percentChange: number;
      zScore: number | null;
      status: 'optimal' | 'moderate_fatigue' | 'high_cns_fatigue';
      referenceDay: string;
    }
  | { ok: false; reason: 'no_tests' | 'not_enough_data'; baselineN: number };

export const READINESS_WINDOW_DAYS = 14;
export const READINESS_MIN_TESTS = 3;

const dayKey = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Readiness = the reference day's best CMJ vs the mean/SD of CMJ tests in the
 * previous 14 days (reference day excluded). The reference day is the most
 * recent test day (by `created_at`), so `today` = the latest session.
 * Needs ≥ 3 baseline tests, otherwise "not enough data".
 * Status: drop < 3 % optimal, 3–7 % moderate, > 7 % high fatigue.
 */
export function cnsReadiness(tests: DatedValue[]): ReadinessResult {
  const valid = tests
    .filter(t => isPos(t.value) && t.created_at && !Number.isNaN(new Date(t.created_at).getTime()))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  if (valid.length === 0) return { ok: false, reason: 'no_tests', baselineN: 0 };
  const refDay = dayKey(valid[valid.length - 1].created_at);
  const today = valid.filter(t => dayKey(t.created_at) === refDay);
  const refStart = new Date(`${refDay}T00:00:00`);
  const windowStart = new Date(refStart.getTime() - READINESS_WINDOW_DAYS * 86400000);
  const baseline = valid.filter(t => {
    const d = new Date(t.created_at);
    return d < refStart && d >= windowStart;
  });
  if (baseline.length < READINESS_MIN_TESTS) return { ok: false, reason: 'not_enough_data', baselineN: baseline.length };
  const todayValue = Math.max(...today.map(t => t.value));
  const vals = baseline.map(t => t.value);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1));
  const percentChange = ((todayValue - mean) / mean) * 100;
  const drop = -percentChange;
  const status = drop < 3 ? 'optimal' : drop <= 7 ? 'moderate_fatigue' : 'high_cns_fatigue';
  return {
    ok: true,
    todayValue,
    baselineMean: mean,
    baselineSd: sd,
    baselineN: vals.length,
    percentChange,
    zScore: sd > 0 ? (todayValue - mean) / sd : null,
    status,
    referenceDay: refDay,
  };
}

// ---------------------------------------------------------------------------
// Force-time (force plate) CMJ analysis
// ---------------------------------------------------------------------------

export type ForceTimeResult =
  | {
      ok: true;
      bodyWeightN: number;
      bodyMassKg: number;
      quietSdN: number;
      onsetIndex: number;
      takeoffIndex: number;
      propulsionStartIndex: number;
      /** s */ timeToTakeoff: number;
      /** s */ propulsiveDuration: number;
      /** m/s */ takeoffVelocity: number;
      /** m */ jumpHeight: number;
      /** N·s (net) */ propulsiveImpulse: number;
      /** N */ meanPropulsiveForce: number;
      /** N */ peakForce: number;
      /** W */ peakPower: number;
      /** W */ meanPropulsivePower: number;
      rsiMod: number | null;
    }
  | { ok: false; reason: 'too_short' | 'no_quiet_phase' | 'no_onset' | 'no_takeoff' | 'negative_takeoff_velocity' };

export const FT_ONSET_SD_MULTIPLIER = 5;
export const FT_TAKEOFF_THRESHOLD_N = 20;

/**
 * Countermovement-jump force-time analysis from vertical GRF samples (N).
 * - Body weight = mean of the first 1 s (quiet standing), SD from the same window.
 * - Movement onset = first sample with F < BW − 5·SD (unweighting) or F > BW + 5·SD.
 * - Take-off = first sample after onset with F < 20 N.
 * - Velocity by forward integration of (F − BW)/m from onset; propulsive phase
 *   starts where centre-of-mass velocity becomes positive.
 */
export function analyzeForceTime(forceN: number[], samplingHz: number): ForceTimeResult {
  if (!isPos(samplingHz) || forceN.length < samplingHz * 1.2) return { ok: false, reason: 'too_short' };
  const dt = 1 / samplingHz;
  const quietN = Math.round(samplingHz * 1.0);
  const quiet = forceN.slice(0, quietN);
  const bw = quiet.reduce((a, b) => a + b, 0) / quiet.length;
  const sd = Math.sqrt(quiet.reduce((a, b) => a + (b - bw) ** 2, 0) / (quiet.length - 1));
  if (!(bw > FT_TAKEOFF_THRESHOLD_N * 5)) return { ok: false, reason: 'no_quiet_phase' };
  const thr = FT_ONSET_SD_MULTIPLIER * sd;
  let onset = -1;
  for (let i = quietN; i < forceN.length; i++) {
    if (forceN[i] < bw - thr || forceN[i] > bw + thr) { onset = i; break; }
  }
  if (onset < 0) return { ok: false, reason: 'no_onset' };
  let takeoff = -1;
  for (let i = onset; i < forceN.length; i++) {
    if (forceN[i] < FT_TAKEOFF_THRESHOLD_N) { takeoff = i; break; }
  }
  if (takeoff < 0) return { ok: false, reason: 'no_takeoff' };
  const m = bw / G;
  let v = 0;
  let peakForce = 0, peakPower = 0, propStart = -1, propForceSum = 0, propPowerSum = 0, propSamples = 0, impulse = 0;
  for (let i = onset; i < takeoff; i++) {
    const f = forceN[i];
    impulse += (f - bw) * dt;
    v += ((f - bw) / m) * dt;
    if (f > peakForce) peakForce = f;
    if (propStart < 0 && v > 0) propStart = i;
    if (propStart >= 0) {
      const p = f * v;
      propForceSum += f;
      propPowerSum += p;
      propSamples++;
      if (p > peakPower) peakPower = p;
    }
  }
  if (!(v > 0) || propStart < 0) return { ok: false, reason: 'negative_takeoff_velocity' };
  const jumpHeight = (v * v) / (2 * G);
  const timeToTakeoff = (takeoff - onset) * dt;
  return {
    ok: true,
    bodyWeightN: bw,
    bodyMassKg: m,
    quietSdN: sd,
    onsetIndex: onset,
    takeoffIndex: takeoff,
    propulsionStartIndex: propStart,
    timeToTakeoff,
    propulsiveDuration: (takeoff - propStart) * dt,
    takeoffVelocity: v,
    jumpHeight,
    propulsiveImpulse: impulse,
    meanPropulsiveForce: propForceSum / propSamples,
    peakForce,
    peakPower,
    meanPropulsivePower: propPowerSum / propSamples,
    rsiMod: rsiModified(jumpHeight, timeToTakeoff),
  };
}

// ---------------------------------------------------------------------------
// Video timing helpers
// ---------------------------------------------------------------------------

/**
 * Converts a time span measured on a (possibly slow-motion) video into real
 * seconds. With `frameDurationSec`, the span is counted in video frames and
 * multiplied by the real duration of one frame; otherwise scaled by videoFps/cameraFps.
 */
export function realDurationFromVideo(
  videoSpanSec: number,
  cameraFps: number,
  videoFps: number,
  frameDurationSec?: number | null,
): number {
  if (isPos(frameDurationSec ?? NaN)) return Math.round(Math.abs(videoSpanSec) * videoFps) * (frameDurationSec as number);
  return Math.abs(videoSpanSec) * (videoFps / cameraFps);
}
