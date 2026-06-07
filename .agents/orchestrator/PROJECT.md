# Project: The Lab Architectural & Visual Upgrade

## Architecture
- React + Vite + Tailwind CSS frontend.
- Supabase backend (tables: `invite_codes`, `lab_players`, `lab_jump_measurements`, and the new `lab_coaches` table).
- Dynamic layout: `App.tsx` conditionally renders either login/invite or the dashboard depending on auth/session status.
- Core calculators:
  - `JumpCalculator.jsx`: Vertical jump video analyzer & manual input.
  - `RSICalculator.jsx`: Reactive Strength Index drop-jump analyzer.
  - `FVPCalculator.jsx`: Force-Velocity Profile regression calculator.
  - `PlayerProfile.jsx`: Athlete metric display, benchmark tables.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB Schema & Coach Management + Auth Bypass | Create `lab_coaches` schema, link to `lab_players` via `coach_id`, build coach signup/selector UI, and bypass login to route directly to JumpCalculator | None | DONE |
| 2 | RSI Error & Lucide Icons + Mobile Scrubbers | Fix missing Lucide icon imports in RSICalculator.jsx, fix touch/pointer scrubbing on iOS, fix manual frame duration FPS scaling calculations | None | DONE |
| 3 | FVP Upgrade & LaTeX Reporting | Accept 4 jumps, handle positive slope gracefully (plot scatter, flag profiling distortion, compute recommendations), add season & training age selectors, add LaTeX biomechanical reports, season-sensitive recommendation logic | None | IN_PROGRESS |
| 4 | Player Profile Redesign & Egyptian Benchmarks | Implement Premium Cyberpunk theme (cyan/orange outlines), dual peak units (Inches & CM), Arabic performance critique panel, and Egyptian club benchmark modal with 15% physical maturity scaling for youth | None | IN_PROGRESS |
| 5 | E2E Testing Suite & Integration | Implement comprehensive requirement-driven test cases (Tiers 1-4) in a test runner, verify everything integrated together | M1, M2, M3, M4 | IN_PROGRESS (bb72d26e) |
| 6 | Adversarial Hardening (Tier 5) | White-box analysis and bug fixing using adversarial test inputs from Challengers | M5 | PLANNED |

## Interface Contracts
### `App.tsx` ↔ `JumpCalculator.jsx`/`RSICalculator.jsx`/`PlayerProfile.jsx`
- Pass current coach/session user context (e.g. `session.user` or a dummy coach object `{ id: 'default-coach-uuid', full_name: 'Bypassed Coach' }`) down to all child panels to filter players and measurements by coach.
- Standardized database query filtering: `.eq('coach_id', currentCoachId)`.

## Code Layout
- `src/App.tsx`: Startup routing, Coach signup button, global user state.
- `src/JumpCalculator.jsx`: Vertical Jump analysis, database integration, timeline scrubber.
- `src/RSICalculator.jsx`: RSI analyzer, timeline scrubber, Lucide icon imports.
- `src/FVPCalculator.jsx`: Force-Velocity Profile inputs, regression, LaTeX rendering, recommendations.
- `src/PlayerProfile.jsx`: Profile page UI, Egyptian Benchmarks modal, Arabic critique.
