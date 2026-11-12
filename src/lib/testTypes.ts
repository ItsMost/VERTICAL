/**
 * Canonical `test_type` values stored in lab_jump_measurements.
 * Every component must use these constants; legacy spellings are mapped by
 * `normalizeTestType` until the database rows are migrated.
 */
export const TEST_TYPES = {
  CMJ: 'cmj',                 // CMJ with arm swing (legacy rows: 'cmj', 'cmj_arms', 'standard')
  CMJ_ARMS: 'cmj_arms',
  CMJ_NO_ARMS: 'cmj_no_arms',
  SJ_NO_ARMS: 'sj_no_arms',
  SJ_ARMS: 'sj_arms',
  APPROACH: 'approach',
  DROP_JUMP: 'rsi',           // drop jump / reactive strength test
  STANDARD: 'standard',
  POWER_CLEAN: 'power_clean',
  CLEAN: 'clean',
  FULL_SQUAT: 'full_squat',
  BENCH_PRESS: 'bench_press',
} as const;

export type TestTypeValue = (typeof TEST_TYPES)[keyof typeof TEST_TYPES];
export const ALL_TEST_TYPES: TestTypeValue[] = Object.values(TEST_TYPES);

/** Legacy / alternative spellings found in code → canonical value. */
export const TEST_TYPE_ALIASES: Record<string, TestTypeValue> = {
  cmj_no_arm: TEST_TYPES.CMJ_NO_ARMS,
  approach_jump: TEST_TYPES.APPROACH,
  sj: TEST_TYPES.SJ_NO_ARMS,
  dj: TEST_TYPES.DROP_JUMP,
};

export function normalizeTestType(t: string | null | undefined): string {
  const v = String(t ?? '').trim().toLowerCase();
  return TEST_TYPE_ALIASES[v] ?? v;
}

/** CMJ family (arm swing allowed), used for readiness and peak height. */
export const CMJ_FAMILY: string[] = [TEST_TYPES.CMJ, TEST_TYPES.CMJ_ARMS, TEST_TYPES.STANDARD];
export const STRENGTH_TYPES: string[] = [TEST_TYPES.POWER_CLEAN, TEST_TYPES.CLEAN, TEST_TYPES.FULL_SQUAT, TEST_TYPES.BENCH_PRESS];

export const isType = (t: string | null | undefined, ...types: string[]) => types.includes(normalizeTestType(t));

/**
 * Sayers (1999) and the Samozino push-off model describe a standing vertical
 * jump (SJ / CMJ). They are not valid for approach jumps (run-up) or drop jumps.
 */
export function supportsStandingJumpModels(t: string | null | undefined): boolean {
  return isType(t, TEST_TYPES.CMJ, TEST_TYPES.CMJ_ARMS, TEST_TYPES.CMJ_NO_ARMS, TEST_TYPES.SJ_NO_ARMS, TEST_TYPES.SJ_ARMS, TEST_TYPES.STANDARD);
}
