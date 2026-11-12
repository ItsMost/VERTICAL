import { describe, it, expect } from 'vitest';
import {
  G,
  jumpHeightFromFlightTime,
  flightTimeFromJumpHeight,
  takeoffVelocityFromJumpHeight,
  sayersPeakPowerW,
  harmanPeakPowerW,
  harmanMeanPowerW,
  samozinoMeanForceN,
  samozinoMeanVelocityMs,
  optimalSfv,
  jumpHeightForProfile,
  forceVelocityProfile,
  fvImbalanceBand,
  resolveHpo,
  hpoFromMeasurements,
  rsiFromHeight,
  rsiFromFlightTime,
  rsiModified,
  legStiffnessDalleau,
  gctCategory,
  eccentricUtilizationRatio,
  reactiveIndex,
  cnsReadiness,
  analyzeForceTime,
  realDurationFromVideo,
} from '../src/lib/biomechanics';

describe('constants & flight-time kinematics', () => {
  it('uses g = 9.81', () => expect(G).toBe(9.81));

  it('h = g·tf²/8 (tf 0.5 s → 30.66 cm)', () => {
    expect(jumpHeightFromFlightTime(0.5)).toBeCloseTo(0.3065625, 7);
    expect(jumpHeightFromFlightTime(0)).toBeNull();
  });

  it('round-trips flight time ↔ height', () => {
    expect(flightTimeFromJumpHeight(0.3065625)).toBeCloseTo(0.5, 9);
  });

  it('v = √(2gh) equals g·tf/2', () => {
    expect(takeoffVelocityFromJumpHeight(0.3065625)).toBeCloseTo((G * 0.5) / 2, 9);
  });
});

describe('peak power equations', () => {
  it('Sayers 1999: 60.7·40 + 45.3·75 − 2055 = 3770.5 W', () => {
    expect(sayersPeakPowerW(40, 75)).toBeCloseTo(3770.5, 6);
  });
  it('Harman 1991 peak uses +1822: 61.9·40 + 36·75 + 1822 = 6998 W', () => {
    expect(harmanPeakPowerW(40, 75)).toBeCloseTo(6998, 6);
  });
  it('Harman 1991 mean: 21.2·40 + 23·75 − 1393 = 1180 W', () => {
    expect(harmanMeanPowerW(40, 75)).toBeCloseTo(1180, 6);
  });
  it('returns null instead of guessing when inputs are missing', () => {
    expect(sayersPeakPowerW(0, 75)).toBeNull();
    expect(sayersPeakPowerW(40, 0)).toBeNull();
  });
});

describe('Samozino simple method', () => {
  it('F = m·g·(h/hPO + 1): 75 kg, h = hPO = 0.4 m → 1471.5 N', () => {
    expect(samozinoMeanForceN(75, 0.4, 0.4)).toBeCloseTo(1471.5, 6);
  });
  it('mean velocity = √(g·h/2)', () => {
    expect(samozinoMeanVelocityMs(0.4)).toBeCloseTo(Math.sqrt(9.81 * 0.2), 9);
  });
});

describe('hPO', () => {
  it('prefers the measured hPO', () => {
    expect(resolveHpo({ hpo_m: 0.38, leg_length_m: 1 })).toEqual({ hpoM: 0.38, estimated: false });
  });
  it('falls back to leg length × 0.45 and flags it', () => {
    const r = resolveHpo({ hpo_m: null, leg_length_m: 1 });
    expect(r.hpoM).toBeCloseTo(0.45, 9);
    expect(r.estimated).toBe(true);
  });
  it('returns null when nothing is known', () => {
    expect(resolveHpo({}).hpoM).toBeNull();
  });
  it('hPO = leg length − trochanter height in 90° squat', () => {
    expect(hpoFromMeasurements(0.98, 0.55)).toBeCloseTo(0.43, 9);
    expect(hpoFromMeasurements(0.5, 0.6)).toBeNull();
  });
});

describe('optimal F-V slope (Samozino et al. 2012)', () => {
  const numericArgmax = (pmax: number, hpo: number) => {
    let best = -1, bestS = 0;
    for (let s = -0.01; s > -100; s -= 0.001) {
      const h = jumpHeightForProfile(s, pmax, hpo);
      if (h > best) { best = h; bestS = s; }
    }
    return bestS;
  };

  it.each([
    [20, 0.45],
    [25, 0.40],
    [15, 0.35],
    [30, 0.50],
    [51.5, 0.45],
  ])('closed form matches numeric argmax of h(Sfv) within 1%% (Pmax %s W/kg, hPO %s m)', (pmax, hpo) => {
    const closed = optimalSfv(pmax, hpo)!;
    const numeric = numericArgmax(pmax, hpo);
    expect(Math.abs(closed - numeric) / Math.abs(numeric)).toBeLessThan(0.01);
  });

  it('typical values land in the published range (≈ −12 to −16 N·s/m/kg)', () => {
    const s = optimalSfv(20, 0.45)!;
    expect(s).toBeLessThan(-12);
    expect(s).toBeGreaterThan(-16);
  });

  it('example: 75 kg, hPO 0.45, flight 0.62/0.54/0.46/0.38 s at 0/15/30/45 kg → FVimb ≈ 22 % (large force deficit)', () => {
    const r = forceVelocityProfile(
      [
        { loadKg: 0, flightTimeSec: 0.62 },
        { loadKg: 15, flightTimeSec: 0.54 },
        { loadKg: 30, flightTimeSec: 0.46 },
        { loadKg: 45, flightTimeSec: 0.38 },
      ],
      75,
      0.45,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.FVimb).toBeGreaterThan(21);
    expect(r.FVimb).toBeLessThan(23);
    expect(r.band).toBe('large_force_deficit');
    expect(r.Sfv).toBeCloseTo(-3.0, 2);
    expect(r.Pmax).toBeCloseTo((r.F0 * r.V0) / 4, 9);
  });

  it('FVimb bands', () => {
    expect(fvImbalanceBand(100)).toBe('well_balanced');
    expect(fvImbalanceBand(90)).toBe('well_balanced');
    expect(fvImbalanceBand(110)).toBe('well_balanced');
    expect(fvImbalanceBand(75)).toBe('moderate_force_deficit');
    expect(fvImbalanceBand(130)).toBe('moderate_velocity_deficit');
    expect(fvImbalanceBand(40)).toBe('large_force_deficit');
    expect(fvImbalanceBand(160)).toBe('large_velocity_deficit');
  });

  it('does not invent a slope when it is non-negative', () => {
    const r = forceVelocityProfile(
      [
        { loadKg: 0, flightTimeSec: 0.40 },
        { loadKg: 30, flightTimeSec: 0.50 },
      ],
      75,
      0.45,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('non_negative_slope');
    expect(r.points).toHaveLength(2);
  });

  it('rejects profiles with R² < 0.9', () => {
    const r = forceVelocityProfile(
      [
        { loadKg: 0, flightTimeSec: 0.55 },
        { loadKg: 20, flightTimeSec: 0.40 },
        { loadKg: 30, flightTimeSec: 0.50 },
        { loadKg: 45, flightTimeSec: 0.38 },
      ],
      75,
      0.45,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('low_r2');
  });

  it('needs at least two points and an hPO', () => {
    expect(forceVelocityProfile([{ loadKg: 0, flightTimeSec: 0.5 }], 75, 0.45).ok).toBe(false);
    expect(forceVelocityProfile([{ loadKg: 0, flightTimeSec: 0.5 }, { loadKg: 20, flightTimeSec: 0.4 }], 75, null).ok).toBe(false);
  });
});

describe('reactive strength', () => {
  it('RSI = h(m)/tc(s): 23.2 cm / 0.180 s = 1.289', () => {
    expect(rsiFromHeight(0.232, 0.18)).toBeCloseTo(1.2889, 4);
  });
  it('RSI (flight) = tf/tc: 0.435 / 0.180 = 2.417', () => {
    expect(rsiFromFlightTime(0.435, 0.18)).toBeCloseTo(2.4167, 4);
  });
  it('RSImod = h / time-to-take-off', () => {
    expect(rsiModified(0.4, 0.8)).toBeCloseTo(0.5, 9);
    expect(rsiModified(0.4, 0)).toBeNull();
  });
  it('Dalleau leg stiffness: 75 kg, tc 0.2, tf 0.5 → 23.9 kN/m', () => {
    expect(legStiffnessDalleau(75, 0.2, 0.5)! / 1000).toBeCloseTo(23.9, 1);
  });
  it('GCT categories', () => {
    expect(gctCategory(0.15)).toBe('elite_fast');
    expect(gctCategory(0.2)).toBe('moderate');
    expect(gctCategory(0.3)).toBe('slow');
    expect(gctCategory(0)).toBeNull();
  });
});

describe('ratios', () => {
  it('EUR = CMJ no-arms / SJ', () => {
    expect(eccentricUtilizationRatio(55, 50)).toBeCloseTo(1.1, 9);
    expect(eccentricUtilizationRatio(55, 0)).toBeNull();
  });
  it('reactive index needs a real DJ height', () => {
    expect(reactiveIndex(45, 50)).toBeCloseTo(0.9, 9);
    expect(reactiveIndex(0, 50)).toBeNull();
  });
});

describe('CNS readiness', () => {
  const at = (day: string, v: number) => ({ created_at: `${day}T10:00:00`, value: v });

  it('baseline = mean/SD of the previous 14 days, excluding the reference day', () => {
    const r = cnsReadiness([
      at('2026-10-01', 99), // outside the 14-day window
      at('2026-10-20', 40),
      at('2026-10-24', 42),
      at('2026-10-28', 44),
      at('2026-11-01', 38),
      at('2026-11-01', 37.5),
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.baselineN).toBe(3);
    expect(r.baselineMean).toBeCloseTo(42, 9);
    expect(r.baselineSd).toBeCloseTo(2, 9);
    expect(r.todayValue).toBe(38);
    expect(r.percentChange).toBeCloseTo(-9.5238, 3);
    expect(r.status).toBe('high_cns_fatigue');
    expect(r.zScore).toBeCloseTo(-2, 9);
  });

  it('needs at least 3 baseline tests', () => {
    const r = cnsReadiness([at('2026-10-28', 44), at('2026-10-30', 44), at('2026-11-01', 40)]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('not_enough_data');
    expect(r.baselineN).toBe(2);
  });

  it('orders by created_at explicitly (input order does not matter)', () => {
    const r = cnsReadiness([at('2026-11-01', 41), at('2026-10-28', 40), at('2026-10-24', 40), at('2026-10-20', 40)]);
    expect(r.ok && r.todayValue).toBe(41);
  });
});

describe('force-time analysis', () => {
  // 75 kg athlete, 1000 Hz: 1 s quiet, 0.2 s unweighting (−300 N), 0.3 s push (+900 N), flight.
  const fs = 1000;
  const m = 75;
  const bw = m * G;
  const signal: number[] = [];
  for (let i = 0; i < 1000; i++) signal.push(bw + (i % 2 === 0 ? 2 : -2));
  for (let i = 0; i < 200; i++) signal.push(bw - 300);
  for (let i = 0; i < 300; i++) signal.push(bw + 900);
  for (let i = 0; i < 400; i++) signal.push(0);
  // net impulse = −60 + 270 = 210 N·s → v = 2.8 m/s → h = 0.3996 m

  it('detects onset/take-off and integrates impulse correctly', () => {
    const r = analyzeForceTime(signal, fs);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bodyWeightN).toBeCloseTo(bw, 6);
    expect(r.onsetIndex).toBe(1000);
    expect(r.takeoffIndex).toBe(1500);
    expect(r.timeToTakeoff).toBeCloseTo(0.5, 9);
    expect(r.takeoffVelocity).toBeCloseTo(2.8, 6);
    expect(r.jumpHeight).toBeCloseTo((2.8 * 2.8) / (2 * G), 6);
    expect(r.peakForce).toBeCloseTo(bw + 900, 6);
    expect(r.rsiMod).toBeCloseTo(r.jumpHeight / 0.5, 9);
  });

  it('refuses signals that are too short', () => {
    expect(analyzeForceTime(signal.slice(0, 500), fs).ok).toBe(false);
  });
});

describe('video timing', () => {
  it('scales by FPS ratio or counts frames', () => {
    expect(realDurationFromVideo(4, 240, 30)).toBeCloseTo(0.5, 9);
    expect(realDurationFromVideo(4, 240, 30, 1 / 120)).toBeCloseTo(1, 9);
  });
});

describe('leg length units', () => {
  it('accepts 0.6–1.3 m or 60–130 cm; rejects ambiguous values', async () => {
    const { legLengthMetres } = await import('../src/lib/biomechanics');
    expect(legLengthMetres(0.95)).toBe(0.95);
    expect(legLengthMetres(99)).toBeCloseTo(0.99, 9);
    expect(legLengthMetres(0)).toBeNull();
    expect(legLengthMetres(9)).toBeNull();
    expect(legLengthMetres(185)).toBeNull();
    expect(resolveHpo({ leg_length_m: 100 }).hpoM).toBeCloseTo(0.45, 9);
  });
});
