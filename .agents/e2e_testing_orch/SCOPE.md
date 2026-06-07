# Scope: E2E Testing Track

## Architecture
- The test suite will be opaque-box, requirement-driven, and independent of implementation internals.
- We will set up a testing environment using Vitest + JSDOM + `@testing-library/react` to render `src/App.tsx` and simulate user interactions (clicks, inputs, selections).
- The Supabase client (`src/supabaseClient.js`) will be mocked in the test environment to avoid external network dependencies and provide a deterministic, stateful local database.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Test Infra Setup | Install Vitest, JSDOM, Testing Library; set up Supabase mock and configuration | None | PLANNED |
| 2 | Tier 1: Feature Coverage | Implement >=5 test cases per feature (6 features: Coach Management, Auth Bypass, RSI, Vertical Jump, FVP, Player Profile) | M1 | PLANNED |
| 3 | Tier 2: Boundary & Corner Cases | Implement >=5 boundary/corner cases per feature | M2 | PLANNED |
| 4 | Tier 3: Cross-Feature Combinations | Implement pairwise cross-feature combination test cases | M3 | PLANNED |
| 5 | Tier 4: Real-World Workloads | Implement >=5 real-world application workload scenarios | M4 | PLANNED |
| 6 | Verification & Reporting | Run the full test suite, verify pass rates, generate TEST_INFRA.md and TEST_READY.md | M5 | PLANNED |

## Feature Inventory
We identify 6 key features based on the requirements:
1. **Coach Management (F1)**: Registration, selection, linking with players, and player grouping on dashboard.
2. **Auth Bypass (F2)**: Defaulting to JumpCalculator on launch, direct entry to the workspace.
3. **RSI Calculator (F3)**: Calculations of RSI, navigation controls, and mobile timeline/scrubber interaction.
4. **Vertical Jump Calculator (F4)**: Video/manual calculations, mobile timeline/scrubber, manual frame-to-frame duration calculations with slow-motion correction.
5. **FVP Calculator (F5)**: 4 jumps inputs, positive slope handling (profiling distortion warning), season period/training age metadata, season-sensitive training suggestions, and LaTeX formula display.
6. **Player Profile & local benchmarks (F6)**: Cyberpunk design elements, peak metrics in inches/cm, Arabic critique panel, Egyptian Volleyball and Track & Field club benchmark tables with 15% discount for juniors (<17).

## Interface Contracts
- The test suite interacts with the application solely through the DOM:
  - Form inputs: `<input>`, `<select>`, `<button>`.
  - Displayed outputs: text matches, SVG chart elements, LaTeX math strings.
- Mock database: The simulated Supabase mock will respond to `.select()`, `.insert()`, etc., mirroring real Supabase behavior.
