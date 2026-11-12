/**
 * Derived columns stored with a jump (same rules as the approved recompute):
 * take-off velocity always; Sayers peak power only for unloaded standing
 * SJ/CMJ; Samozino mean force/power only for standing SJ/CMJ with an hPO.
 */
import type { Player } from '../types/athletics';
import { resolveHpo, sayersPeakPowerW, samozinoMeanForceN, samozinoMeanPowerW, takeoffVelocityFromJumpHeight } from './biomechanics';
import { supportsStandingJumpModels } from './testTypes';

const r = (v: number | null, d: number) => (v === null || !Number.isFinite(v) ? null : Number(v.toFixed(d)));

export function derivedJumpFields(testType: string, jumpHeightCm: number, addedLoadKg: number, player: Pick<Player, 'weight_kg' | 'hpo_m' | 'leg_length_m'> | null) {
  const hM = jumpHeightCm / 100;
  const mass = Number(player?.weight_kg) || 0;
  const load = addedLoadKg > 0 ? addedLoadKg : 0;
  const standing = supportsStandingJumpModels(testType);
  const { hpoM } = resolveHpo(player);
  return {
    takeoff_velocity_ms: r(takeoffVelocityFromJumpHeight(hM), 2),
    peak_power_watts: standing && load === 0 ? r(sayersPeakPowerW(jumpHeightCm, mass), 2) : null,
    mean_force_newtons: standing && hpoM && mass > 0 ? r(samozinoMeanForceN(mass + load, hM, hpoM), 2) : null,
    mean_power_watts: standing && hpoM && mass > 0 ? r(samozinoMeanPowerW(mass + load, hM, hpoM), 2) : null,
  };
}
