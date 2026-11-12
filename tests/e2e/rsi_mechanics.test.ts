import { describe, it, expect } from 'vitest';
import { classifyGCT, calculateElasticityQuadrant } from '../../src/useJumpMechanics';
import { rsiFromHeight, rsiFromFlightTime } from '../../src/lib/biomechanics';

const r2 = (x: number | null) => (x === null ? null : Number(x.toFixed(2)));

describe('RSI Mechanics (explicit units)', () => {
  it('correctly calculates standard RSI using Height(m) / GCT(s)', () => {
    // 23.2 cm jump, 0.180 s contact time: 0.232 / 0.180 = 1.288... => 1.29
    expect(r2(rsiFromHeight(0.232, 0.18))).toBe(1.29);
  });

  it('callers convert milliseconds explicitly (180 ms → 0.180 s)', () => {
    expect(r2(rsiFromHeight(23.2 / 100, 180 / 1000))).toBe(1.29);
  });

  it('correctly calculates RSI using Flight Time / GCT', () => {
    // 0.435 / 0.180 = 2.416... => 2.42
    expect(r2(rsiFromFlightTime(0.435, 0.18))).toBe(2.42);
  });

  it('classifies GCT into fast, moderate, and slow SSC categories correctly', () => {
    expect(classifyGCT(0.150).category).toBe('elite_fast');
    expect(classifyGCT(0.200).category).toBe('moderate');
    expect(classifyGCT(0.300).category).toBe('slow');
  });

  it('validates 50cm jump with 190ms contact time under both Height/GCT and Flight/GCT modes', () => {
    expect(r2(rsiFromHeight(0.5, 0.19))).toBe(2.63);
    expect(r2(rsiFromFlightTime(0.639, 0.19))).toBe(3.36);
  });
});

describe('EUR (Eccentric Utilization Ratio) & Stretch-Shortening Mechanics', () => {
  it('strictly calculates EUR using CMJ (No Arms) and Squat Jump (SJ), not CMJ with arms', () => {
    const cmjWithArms = 87.5;
    const cmjNoArms = 67.8;
    const sj = 66.5;

    // Erroneous calculation would be 87.5 / 66.5 = 1.32 (Elastic)
    const wrongEur = Number((cmjWithArms / sj).toFixed(2));
    expect(wrongEur).toBe(1.32);

    // Correct Biomechanical EUR strictly uses CMJ No Arms: 67.8 / 66.5 = 1.02 (Strength-dominant)
    const result = calculateElasticityQuadrant(cmjNoArms, sj);
    expect(result.eur).toBe(1.02);
    expect(result.quadrant).toBe('strength_dominant');
  });

  it('correctly classifies elastic-dominant when EUR exceeds 1.15', () => {
    const result = calculateElasticityQuadrant(60.0, 50.0); // 60/50 = 1.20
    expect(result.eur).toBe(1.2);
    expect(result.quadrant).toBe('elastic_dominant');
  });

  it('correctly classifies well-balanced elite when EUR is between 1.05 and 1.15', () => {
    const result = calculateElasticityQuadrant(55.0, 50.0); // 55/50 = 1.10
    expect(result.eur).toBe(1.1);
    expect(result.quadrant).toBe('well_balanced_elite');
  });

  it('returns uncalibrated general deficit when either CMJ No Arms or SJ is missing', () => {
    const resultNoSJ = calculateElasticityQuadrant(60.0, 0);
    expect(resultNoSJ.eur).toBe(0);
    expect(resultNoSJ.quadrant).toBe('general_deficit');

    const resultNoCMJ = calculateElasticityQuadrant(0, 50.0);
    expect(resultNoCMJ.eur).toBe(0);
    expect(resultNoCMJ.quadrant).toBe('general_deficit');
  });
});
