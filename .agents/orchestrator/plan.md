# Implementation Plan: The Lab Athletic Testing App

This document maps out the detailed execution steps for upgrading "The Lab" Athletic Testing application.

## 1. Objectives & Requirements Map

| Req ID | Title | Description | Targeted Files |
|--------|-------|-------------|----------------|
| **R1** | DB Schema & Coach Management | SQL migration schema for `lab_coaches`. Link players with `coach_id`. Add UI coach registration, selection in "Add Player" form, and group players by coach in dashboard lists. | `src/supabaseClient.js`, `src/App.tsx`, `src/JumpCalculator.jsx`, `src/RSICalculator.jsx`, `src/PlayerProfile.jsx` |
| **R2** | Bypass Authentication / Direct Entry | Bypass user login/signup in `App.tsx`, immediately render `JumpCalculator` dashboard defaulting to the vertical jump tab with a mock/default coach context. | `src/App.tsx` |
| **R3** | Fixed RSI Video Error & Lucide Icon Crashes | Fix missing Lucide-react imports (`Activity`, `ChevronsRight`, `ChevronsLeft`, `Sparkles`) in `RSICalculator.jsx` to stop runtime crashes. | `src/RSICalculator.jsx` |
| **R4** | Upgrade FVP Calculator | 4 jumps inputs, handle positive slope gracefully (plot scatter, "profiling distortion" warning, run recommendations), season selectors, LaTeX equations, season-sensitive training recommendations. | `src/FVPCalculator.jsx` |
| **R5** | 360-Degree Player Profile & Egyptian Benchmarks | Cyberpunk Dark theme (cyan/orange outlines), dual peak units (Inches & CM), Arabic performance critique panel, and Egyptian club benchmark modal with 15% physical scaling for youth. | `src/PlayerProfile.jsx` |
| **R6** | Mobile Timeline Scrubber & Manual FPS Time | Fix pointer-events and touch-action css properties on scrubbers for iOS compatibility. Fix manual frame duration override logic to correct slow-motion scaling calculations. | `src/JumpCalculator.jsx`, `src/RSICalculator.jsx` |

---

## 2. Milestones & Decomposition

### Milestone 1: DB Schema, Coach Management & Auth Bypass (R1, R2)
- **Goal**: Establish the data schema and register/display coaches, bypassing the authentication screen so it boots directly to the coach workspace.
- **Tasks**:
  - Write SQL migrations for `lab_coaches` and update `lab_players` foreign key constraint.
  - Implement a default coach user session structure in `App.tsx`.
  - Add "Register Coach" form in UI header.
  - Link new player records with `coach_id` via a coach selector in the "Add Player" modal.
  - Group players by coach on the dashboard dropdown list.

### Milestone 2: RSI Lucide Imports & Mobile Scrubber/Manual FPS (R3, R6)
- **Goal**: Eliminate crashes on the RSI tab, implement manual FPS scaling calculations, and make scrubbers responsive to iPhone/iOS touch interactions.
- **Tasks**:
  - Add missing Lucide icon imports (`ChevronsRight`, `ChevronsLeft`, `Sparkles`, `Activity`) to `src/RSICalculator.jsx`.
  - Correct scrubber touch events and pointer-events logic in both calculators.
  - Set `touch-action: none` styling on the scrubber timeline handle.
  - Correct slow-motion camera-to-video frame ratios and ensure manual frame duration does not output astronomical jump heights.

### Milestone 3: Upgrade FVP Calculator & LaTeX Reporting (R4)
- **Goal**: Expand FVP calculation inputs, improve slope handling, and add LaTeX reports.
- **Tasks**:
  - Add a 4th jump inputs (weight, flight time).
  - Modify least-squares linear regression to run on 4 data points.
  - If the regression slope is positive (distorted), plot scatter points, render diagnostic warnings as "profiling distortion", and display recommendations without crashing.
  - Integrate metadata selectors: Season Period (`Off-Season`, `In-Season`, `Competition-Phase`) and Training Age.
  - Render Peak Force ($F_0$), Velocity ($V_0$), and Max Power ($P_{max}$) equations using LaTeX math notations.
  - Write season-sensitive logic rules for training suggestions.

### Milestone 4: Player Profile Redesign & Localized Egyptian Benchmarks (R5)
- **Goal**: Cyberpunk redesign of the player profile and addition of regional athletic standards.
- **Tasks**:
  - Redesign UI elements in `PlayerProfile.jsx` with dark cyberpunk style using `#00f5d4` (cyan) and `#f97316` (orange) neon outlines.
  - Display peak height and power metrics in both Inches and CM.
  - Add Arabic Performance Critique box covering strengths and gaps based on peak metrics.
  - Build clickable regional benchmarks modal mapping Elite, Excellent, and Good bounds for Egyptian Volleyball and Track & Field clubs.
  - Dynamically scale benchmarks by 15% physical discount factor for juniors under 17.

### Milestone 5: E2E Test Suite and Verification
- **Goal**: Establish opaque-box, requirement-driven tests covering Tiers 1-4 and verify all implementations work as expected.

### Milestone 6: Adversarial Hardening (Tier 5)
- **Goal**: Run white-box analysis of potential bugs/flaws using Challengers and ensure the application holds under edge inputs.
