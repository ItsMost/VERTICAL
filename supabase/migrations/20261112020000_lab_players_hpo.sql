-- Push-off distance (hPO, metres) per player:
-- leg length (greater trochanter -> toes, feet extended) minus the height of
-- the greater trochanter in a 90-degree squat. NULL = not measured yet; the app
-- then falls back to leg_length_m * 0.45 and shows an "estimated hPO" badge.
alter table public.lab_players
  add column if not exists hpo_m numeric
  check (hpo_m is null or (hpo_m > 0.1 and hpo_m < 0.8));
