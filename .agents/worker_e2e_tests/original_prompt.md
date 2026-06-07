## 2026-06-07T16:51:29Z
You are the E2E Test Writer Worker. Your working directory is C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\worker_e2e_tests.
Your task is to implement the comprehensive opaque-box E2E test suite covering Tiers 1-4 for the 6 key features of "The Lab".
Specifically, you must write the following test files in `tests/e2e/`:
1. `F1_coach_mgmt.test.tsx` (Contains Tier 1, 2, 3, 4 cases for Coach Management & registration)
2. `F2_auth_bypass.test.tsx` (Contains Tier 1, 2, 3, 4 cases for Authentication bypass / direct entry routing)
3. `F3_rsi_calc.test.tsx` (Contains Tier 1, 2, 3, 4 cases for RSI Calculator and touch timeline scrubbers)
4. `F4_vertical_jump.test.tsx` (Contains Tier 1, 2, 3, 4 cases for Vertical Jump Calculator and manual time slow-motion corrections)
5. `F5_fvp_calc.test.tsx` (Contains Tier 1, 2, 3, 4 cases for FVP Calculator (4 jumps, season periods, LaTeX, recommendations))
6. `F6_player_profile.test.tsx` (Contains Tier 1, 2, 3, 4 cases for Player Profile, Cyberpunk layout, Arabic critique, Egyptian Benchmarks modal, junior 15% physical maturity scaling)

Test Case Minimum Count (71 Total):
- Tier 1: >=30 cases (>=5 per feature)
- Tier 2: >=30 cases (>=5 per feature boundary/corner cases)
- Tier 3: >=6 cases (pairwise combinations of major features)
- Tier 4: >=5 cases (real-world application-level workload scenarios)

Requirements:
- Make sure to mock time/timers cleanly using Vitest fake timers when rendering App to avoid act() warnings, timeouts, or state leakage, similar to `tests/e2e/sanity.test.tsx`.
- The tests must use JSDOM and `@testing-library/react`.
- Exercise the components completely by typing in fields, clicking buttons, selecting options, triggering drag events (pointerDown, pointerMove, pointerUp) for scrubbers, and checking the resulting DOM texts, SVG graphs, warning panels, and LaTeX formulas.
- Run `cmd /c npm run test:e2e` to verify that all 70+ test cases compile and pass successfully.
- Run `cmd /c npm run lint` to ensure no lint warnings or errors are introduced.
- Document all tests implemented (including summaries of each tier) and run results in a handoff report at `C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\worker_e2e_tests\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
