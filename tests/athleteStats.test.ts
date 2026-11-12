import { describe, it, expect } from 'vitest';
import { computeAthleteStats, latestFvSession, levelOf, ageOf } from '../src/lib/athleteStats';
import type { JumpMeasurement, Player } from '../src/types/athletics';

const player: Player = { id: 'p', full_name: 'Test', weight_kg: 75, leg_length_m: 1, hpo_m: 0.45, gender: 'male', standing_reach_cm: 240 };
let n = 0;
const m = (test_type: string, h: number, day: string, extra: Partial<JumpMeasurement> = {}): JumpMeasurement => ({
  id: String(n++), player_id: 'p', test_type, jump_height_cm: h, flight_time_sec: 0, created_at: `${day}T10:00:00`, ...extra,
});

describe('computeAthleteStats', () => {
  const history = [
    m('cmj_arms', 50, '2026-10-01'),
    m('cmj', 52, '2026-10-05'), // legacy spelling counts as cmj_arms
    m('cmj_arms', 51, '2026-10-08'),
    m('cmj_no_arms', 44, '2026-10-08'),
    m('sj_no_arms', 40, '2026-10-08'),
    m('approach', 66, '2026-10-08'),
    m('rsi', 30, '2026-10-09', { rsi_score: 1.8, contact_time_sec: 0.2 }),
    m('rsi', 33, '2026-10-10', { rsi_score: 2.2, contact_time_sec: 0.15 }),
    m('full_squat', 0, '2026-10-02', { clean_weight_kg: 120 }),
  ];
  const s = computeAthleteStats(player, history);

  it('best / latest / change for CMJ', () => {
    expect(s.cmj.best).toBe(52);
    expect(s.cmj.latest).toBe(51);
    expect(s.cmj.change).toBe(-1);
    expect(s.cmj.count).toBe(3);
  });
  it('RSI from the best drop jump with its contact time', () => {
    expect(s.rsi.best).toBe(2.2);
    expect(s.rsi.contactMs).toBe(150);
    expect(s.rsi.gct).toBe('elite_fast');
  });
  it('EUR, arm swing, reactive index', () => {
    expect(s.eur).toBeCloseTo(1.1, 9);
    expect(s.eurType).toBe('well_balanced_elite');
    expect(s.armSwingGainPct).toBeCloseTo((52 - 44) / 44 * 100, 9);
    expect(s.reactiveIndex).toBeCloseTo(33 / 44, 9);
  });
  it('power from best CMJ (Sayers)', () => {
    expect(s.sayersW).toBeCloseTo(60.7 * 52 + 45.3 * 75 - 2055, 6);
  });
  it('reach uses the higher of CMJ and approach', () => {
    expect(s.reach.touch).toBe(240 + 66);
    expect(s.reach.netClearance).toBe(306 - 243);
  });
  it('strength x body weight', () => {
    expect(s.strength.squat.kg).toBe(120);
    expect(s.strength.squat.xBw).toBeCloseTo(1.6, 9);
    expect(s.strength.bench.kg).toBeNull();
  });
  it('no reach without a measured standing reach', () => {
    expect(computeAthleteStats({ ...player, standing_reach_cm: null }, history).reach.touch).toBeNull();
  });
});

describe('F-V session', () => {
  it('uses the latest day with loaded SJs, including its 0 kg jump', () => {
    const h = [
      m('sj_no_arms', 40, '2026-09-01', { added_load_kg: 20 }),
      m('sj_no_arms', 47.14, '2026-10-01'),
      m('sj_no_arms', 35.76, '2026-10-01', { added_load_kg: 15 }),
      m('sj_no_arms', 25.95, '2026-10-01', { added_load_kg: 30 }),
      m('sj_no_arms', 17.71, '2026-10-01', { added_load_kg: 45 }),
    ];
    const fv = latestFvSession(h, player)!;
    expect(fv.day).toBe('2026-10-01');
    expect(fv.rows).toHaveLength(4);
    expect(fv.result.ok).toBe(true);
    if (fv.result.ok) expect(fv.result.FVimb).toBeGreaterThan(20);
  });
  it('is null without loaded jumps', () => {
    expect(latestFvSession([m('sj_no_arms', 40, '2026-10-01')], player)).toBeNull();
  });
  it('loaded SJs do not count as the athlete best SJ', () => {
    const s = computeAthleteStats(player, [m('sj_no_arms', 40, '2026-10-01'), m('sj_no_arms', 20, '2026-10-01', { added_load_kg: 30 })]);
    expect(s.sj.best).toBe(40);
    expect(s.sj.latest).toBe(40);
  });
});

describe('levels', () => {
  it('uses the handbook thresholds with the junior factor', () => {
    expect(levelOf('jump', 87, 'male', 20)).toBe('elite');
    expect(levelOf('jump', 70, 'male', 20)).toBe('good');
    expect(levelOf('jump', 70, 'male', 15)).toBe('excellent');
    expect(levelOf('rsi', 2.6, 'male', 20)).toBe('excellent');
    expect(levelOf('jump', null, 'male', 20)).toBeNull();
  });
  it('age from date of birth', () => {
    const y = new Date().getFullYear() - 20;
    expect(ageOf({ date_of_birth: `${y}-01-01` })).toBe(20);
  });
});
