-- Approved 2026-11-12. 'cmj' and 'standard' were the same test as 'cmj_arms'
-- (CMJ with arm swing); 'clean' is 'power_clean'.
create table if not exists public.lab_jump_measurements_backup_20261112_types as select * from public.lab_jump_measurements;
alter table public.lab_jump_measurements_backup_20261112_types enable row level security;
update public.lab_jump_measurements set test_type = 'cmj_arms' where test_type in ('cmj', 'standard');
update public.lab_jump_measurements set test_type = 'power_clean' where test_type = 'clean';
