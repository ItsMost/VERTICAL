import { describe, it, expect } from 'vitest';
import { calculateRSI, classifyGCT } from '../../src/useJumpMechanics';

describe('RSI Mechanics & Unit Normalization', () => {
  it('correctly calculates standard RSI using Height(m) / GCT(s)', () => {
    // 23.2 cm jump, 0.180 s contact time
    const rsi = calculateRSI(23.2, 0.435, 0.180, 'height_gct');
    // 0.232 / 0.180 = 1.288... => 1.29
    expect(rsi).toBe(1.29);
  });

  it('correctly calculates RSI when GCT is entered in milliseconds (180ms vs 0.180s)', () => {
    // 23.2 cm jump, 180 ms contact time
    const rsi = calculateRSI(23.2, 0.435, 180, 'height_gct');
    expect(rsi).toBe(1.29);
  });

  it('correctly calculates RSI using Flight Time / GCT', () => {
    // 0.435s flight time, 0.180s contact time
    const rsi = calculateRSI(23.2, 0.435, 0.180, 'flight_gct');
    // 0.435 / 0.180 = 2.416... => 2.42
    expect(rsi).toBe(2.42);
  });

  it('classifies GCT into fast, moderate, and slow SSC categories correctly', () => {
    expect(classifyGCT(0.150).category).toBe('elite_fast');
    expect(classifyGCT(0.200).category).toBe('moderate');
    expect(classifyGCT(0.300).category).toBe('slow');
  });
});
