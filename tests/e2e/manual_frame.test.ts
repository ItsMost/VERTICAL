import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useJumpMechanics } from '../../src/useJumpMechanics';

describe('manual frame duration', () => {
  // 240fps slow-mo exported at 30fps: 0.5s real flight = 120 frames = 4s of video
  const run = (manual: boolean, frameDur: number) =>
    renderHook(() => useJumpMechanics(240, 30, 1, 5, 75, 1, 0, 0, 'cmj', 30, manual, frameDur)).result.current;

  it('matches FPS ratio when frame duration = 1/cameraFps', () => {
    expect(run(true, 1 / 240).flightTime).toBe(run(false, 0).flightTime);
    expect(run(true, 1 / 240).flightTime).toBe('0.500');
  });

  it('uses the entered frame duration', () => {
    expect(run(true, 1 / 120).flightTime).toBe('1.000');
  });
});
