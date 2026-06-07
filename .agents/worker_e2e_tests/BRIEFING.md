# BRIEFING — 2026-06-07T16:51:29Z

## Mission
Implement a comprehensive opaque-box E2E test suite covering Tiers 1-4 for the 6 key features of "The Lab" with 71+ passing tests, lint checks, and a handoff report.

## 🔒 My Identity
- Archetype: worker_e2e_tests
- Roles: implementer, qa, specialist
- Working directory: C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\worker_e2e_tests
- Original parent: bb72d26e-bab6-46d2-868c-9e48601fe08f
- Milestone: E2E Testing Coverage

## 🔒 Key Constraints
- Make sure to mock time/timers cleanly using Vitest fake timers when rendering App to avoid act() warnings, timeouts, or state leakage.
- Use JSDOM and @testing-library/react.
- Exercise components completely: input typing, button clicks, select options, drag events for scrubbers, check DOM texts, SVG graphs, warning panels, and LaTeX formulas.
- Run `npm run test:e2e` to verify.
- Run `npm run lint` to verify.
- Do not cheat, do not hardcode test results.
- Minimum counts: Tier 1: >=30 cases, Tier 2: >=30 cases, Tier 3: >=6 cases, Tier 4: >=5 cases. Total >= 71.

## Current Parent
- Conversation ID: bb72d26e-bab6-46d2-868c-9e48601fe08f
- Updated: not yet

## Task Summary
- **What to build**: Comprehensive opaque-box E2E test suite in `tests/e2e/` for:
  - F1: Coach Management (`F1_coach_mgmt.test.tsx`)
  - F2: Auth Bypass (`F2_auth_bypass.test.tsx`)
  - F3: RSI Calculator (`F3_rsi_calc.test.tsx`)
  - F4: Vertical Jump Calculator (`F4_vertical_jump.test.tsx`)
  - F5: FVP Calculator (`F5_fvp_calc.test.tsx`)
  - F6: Player Profile (`F6_player_profile.test.tsx`)
- **Success criteria**: All 71+ test cases compile, pass, and lint clean. Handoff report contains all 5 sections.
- **Interface contracts**: `tests/e2e/sanity.test.tsx` (reference for fake timers & testing style)

## Key Decisions Made
- [TBD]

## Artifact Index
- [TBD]
