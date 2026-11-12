-- Applied 2026-11-12 after review of the dry-run report (scripts/recompute-derived.ts).
-- Backup taken first: lab_jump_measurements_backup_20261112 (504 rows).
-- Result: 475 rows / 1305 values changed; no hand-entered column touched.
-- Same formulas as src/lib/biomechanics.ts (g = 9.81):
--   takeoff_velocity_ms = sqrt(2 g h)
--   peak_power_watts    = Sayers 1999 (standing SJ/CMJ, unloaded); null for approach / drop jump
--   mean_force_newtons  = (BM + load) g (h / hPO + 1), hPO = hpo_m or leg (0.6-1.3 m | 60-130 cm) x 0.45
--   mean_power_watts    = mean force x sqrt(g h / 2)
--   rsi_score           = h / tc, only where the stored value already matched h / tc (re-rounding)
create table if not exists public.lab_jump_measurements_backup_20261112 as select * from public.lab_jump_measurements;
alter table public.lab_jump_measurements_backup_20261112 enable row level security;
-- (the UPDATE itself is in the commit message / scripts; it is intentionally not re-runnable)
