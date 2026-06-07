## 2026-06-07T16:30:01Z

Complete architectural and visual upgrade of "The Lab" Athletic Testing application. Upgrading core calculators (Vertical Jump, RSI, FVP) and Player Profile, introducing Coach Management, bypassing authentication screens, fixing mobile playback/timing bugs, and adding regional athletic benchmarks.

Working directory: C:\Users\memob\.gemini\antigravity\scratch\The-Lab
Integrity mode: development

## Requirements

### R1. Database Schema & Coach Management
- **SQL Migration**: Define the schema for a new Supabase table: `lab_coaches` (id UUID primary key default gen_random_uuid(), full_name TEXT NOT NULL, created_at TIMESTAMPTZ default now()).
- **Player-Coach Mapping**: Update the `lab_players` table to include a foreign key `coach_id` referencing `lab_coaches(id)`.
- **UI Coach Registration**: Add a clean button/form in the UI header to register a Coach.
- **Coach Selector**: Add a Coach dropdown to the "Add Player" form. When saving an athlete, map their record with the selected `coach_id`.
- **Coach Grouping**: Group the dashboard player selection list by their registered coach (e.g. nested lists or sections in the dropdown).

### R2. Bypass Authentication / Direct Entry Routing
- **Bypass Login**: Remove or bypass the Login/Signup authentication views in `App.tsx` completely.
- **Direct App Launch**: The application must directly render `JumpCalculator.jsx` inside the coach workspace on launch, defaulting to the vertical jump tab.

### R3. Fixed RSI Video Error & Lucide Icon Crashes
- **Import Audit**: Resolve the `Uncaught ReferenceError: Activity is not defined` and `ChevronsRight is not defined` crash when loading the RSI tab. Audit all Lucide icon imports (`Activity`, `ChevronsRight`, `ChevronsLeft`, etc.) in `RSICalculator.jsx` to make sure they are imported correctly from `lucide-react`.

### R4. Upgrade FVP Calculator (4 Jumps + Season Periods)
- **4 Jumps Input**: Modify `FVPCalculator.jsx` to accept 4 jump weights and flight times (e.g. Jump 1 to 4) instead of 3.
- **Graceful Error Handling**: Do not throw hard errors or block execution if the linear regression slope is positive or has anomalies. Plot the actual scatter points on the SVG chart, flag it dynamically as a "profiling distortion" in the diagnosis panel, and render recommendations anyway.
- **New Metadata Inputs**: Add selectors for Season Period (`Off-Season`, `In-Season`, `Competition-Phase`) and Training Age (`Beginner (<1 year)`, `Intermediate (1-3 years)`, `Advanced (>3 years)`).
- **LaTeX Biomechanical Report**: Display equations and results ($F_0$, $V_0$, $P_{max}$) using LaTeX notation.
- **Season-Sensitive Logic**: If `In-Season`/`Competition` with a Force Deficit, recommend rapid low-load plyometrics and complex training. If `Off-Season` with a Force Deficit, prescribe heavy strength training (Squats, Cleans, eccentric loading).

### R5. 360-Degree Player Profile & Localized Egyptian Benchmarks
- **Cyberpunk Dark Theme**: Redesign `PlayerProfile.jsx` with a premium dark athletic layout with electric cyan/orange accent outlines.
- **Peak Metrics**: Display the athlete's peak metrics in both Inches (") and Centimeters (cm).
- **Critique Panel**: Add a Sport Performance Critique box in Arabic covering:
  1. "ما يميز اللاعب (Strengths)" based on peak power and RSI elasticity.
  2. "نقاط التطوير البدني (Gaps)" suggesting specific programmatic changes.
- **Egyptian/Regional Benchmarks Modal**: Add a clickable panel/modal containing dynamic benchmark tables adjusted for Gender, Age, and Egyptian club contexts (Al Ahly, Zamalek, Smouha, Sporting, National teams data ranges for Volleyball and Track & Field):
  - Male Elite Volley (18+): Elite: +34" (86+ cm), Excellent: 30"-33", Good: 26"-29".
  - Female Elite Volley (18+): Elite: +26" (66+ cm), Excellent: 22"-25", Good: 18"-21".
  - Juniors (Under 17): Auto-apply a 15% physical maturity scaling discount factor dynamically.
  - RSI Benchmarks: Elite > 3.0, Good 2.0 - 2.5, Transitional < 1.5.
  - Depth Jump RSI Benchmarks: Elite > 2.5, Good 1.6 - 2.5, Low < 1.6.

### R6. Mobile Timeline Scrubber & Manual Time Calculation Repair
- **iOS Scrubber Fix**: Fix the pointer event / touch scrubber in `JumpCalculator.jsx` and `RSICalculator.jsx` so it moves smoothly on mobile iPhone (specifically verifying pointer-event cancelation and touch-action css properties on handles).
- **Manual Time Calculation Repair**: Fix the manual frame-to-frame duration calculation mode. Ensure when the user enters the frame-to-frame duration manually, it calculates the exact time difference correctly. If the video is in slow motion and recorded at e.g. 120/240 FPS but playing back at 30 FPS, ensure the calculations correctly account for the camera-to-video FPS ratio and do not output astronomical jump heights.

---

## Acceptance Criteria

### Verification Methods
- [ ] **Verification 1**: Launch the web app. Verify it bypasses the login screen and immediately shows the vertical jump calculator dashboard.
- [ ] **Verification 2**: Register a Coach via the header, open "Add Player", verify the coach appears in the dropdown, and saving the player correctly links them in the database.
- [ ] **Verification 3**: Open the RSI Calculator tab. Confirm the page does not crash and displays `ChevronsRight` and `ChevronsLeft` step buttons.
- [ ] **Verification 4**: In the FVP Calculator, enter 4 jumps with flat/irregular weights. Verify the graph still renders scatter points, shows a "profiling distortion" warning rather than a crash, and formats equations in LaTeX.
- [ ] **Verification 5**: Load the Player Profile, click "Egyptian & Regional Benchmarks", verify the tables appear, and check that a junior player's benchmarks have the 15% discount factor applied.
- [ ] **Verification 6**: Drag the video timeline scrubber on an iOS emulator/device. Confirm it seeks the video and does not freeze. Enter manual frame duration in settings and verify the jump heights are calculated correctly without yielding unrealistic values.

## 2026-06-07T16:54:19Z

Please provide a status update on your progress. Which requirements are completed, which ones are in progress, and are there any issues?

## 2026-06-07T16:56:53Z

Excellent progress on Milestones 1, 2, and the E2E infrastructure! Please proceed to implement:
- Milestone 3 (Upgrade FVP Calculator & LaTeX Reporting - R4)
- Milestone 4 (Player Profile Redesign & Localized Egyptian Benchmarks - R5)
Let me know if you hit any obstacles.
