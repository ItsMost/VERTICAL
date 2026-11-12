-- Canonical list (src/lib/testTypes.ts). Applied after the app that only saves
-- these values was deployed.
alter table public.lab_jump_measurements
  add constraint chk_lab_jump_measurements_test_type
  check (test_type in ('cmj_arms','cmj_no_arms','sj_no_arms','sj_arms','approach','rsi','power_clean','full_squat','bench_press'));
