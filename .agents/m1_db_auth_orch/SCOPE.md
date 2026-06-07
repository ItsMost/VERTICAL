# Scope: Milestone 1 - DB Schema, Coach Management & Auth Bypass

## Architecture
- React + Vite + Tailwind CSS frontend.
- Supabase backend (tables: `invite_codes`, `lab_players`, `lab_jump_measurements`, and the new `lab_coaches` table).
- Dynamic layout: `App.tsx` handles routing/routing bypass and coach state.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB Schema & Coach Management + Auth Bypass | Create `lab_coaches` schema, link to `lab_players` via `coach_id`, build coach signup/selector UI, and bypass login to route directly to JumpCalculator | None | IN_PROGRESS |

## Interface Contracts
### `App.tsx` ↔ `JumpCalculator.jsx`/`RSICalculator.jsx`/`PlayerProfile.jsx`
- Pass current coach/session user context (e.g. `session.user` or a dummy coach object `{ id: 'default-coach-uuid', full_name: 'Bypassed Coach' }`) down to all child panels to filter players and measurements by coach.
- Standardized database query filtering: `.eq('coach_id', currentCoachId)`.
