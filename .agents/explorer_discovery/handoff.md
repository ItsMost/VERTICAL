# Explorer Handoff Report

## 1. Observation

Direct observations and file inspections on `The-Lab` codebase located at `C:\Users\memob\.gemini\antigravity\scratch\The-Lab`:

### R1: Authentication and Routing
- File path: `src/App.tsx`
- Lines 283–288:
  ```tsx
  return (
    <div className="relative min-h-screen">
      {/* Floating control buttons at top-left corner */}
      ...
      <JumpCalculator />
    </div>
  );
  ```
  Authentication checks if `session` is defined. There is no route router like `react-router-dom` in `package.json`.

### R2: Supabase Tables
- Mapped client in `src/supabaseClient.js`.
- Queries are executed using `supabase.from('table_name')`:
  - `invite_codes` in `src/App.tsx` (Line 67, 73, 111)
  - `lab_players` in `src/JumpCalculator.jsx` (Line 405, 431, 447, 471)
  - `lab_jump_measurements` in `src/JumpCalculator.jsx` (Line 422, 892) and `src/RSICalculator.jsx` (Line 233)
- No coach-to-player mapping or RLS filtering exists in the queries. All coaches share the global table content.

### R3: Missing Icons causing Reference Crashes
- File path: `src/RSICalculator.jsx`
- Line 3 Import statement:
  ```javascript
  import { Zap, Play, Pause, X, Save, Info, ChevronRight, ChevronLeft, Activity } from 'lucide-react';
  ```
- Lines 636 & 644 usage:
  ```javascript
  <ChevronsRight size={18} />
  ...
  <ChevronsLeft size={18} />
  ```
- Line 757 usage:
  ```javascript
  <Sparkles size={14} className="animate-pulse" />
  ```
- Result: `ChevronsRight`, `ChevronsLeft`, and `Sparkles` are not present in the import line, causing React runtime ReferenceErrors when the timeline/video is loaded.

### R4: Force-Velocity Profile (FVP) Calculations
- File path: `src/FVPCalculator.jsx`
- Jumps array initialization (Line 535):
  ```javascript
  const [jumps, setJumps] = useState([
    { weight: 0, flightTime: '' },
    { weight: 10, flightTime: '' },
    { weight: 20, flightTime: '' }
  ]);
  ```
- Sliders feed flight times into `jumps[i].flightTime`.
- Regression calculations (Lines 575–594) use least-squares regression over the 3 data points to compute theoretical peak force ($F_0$), peak velocity ($V_0$), and max power ($P_{max}$).

### R5: Player Profile Styling and Benchmark Modal
- File path: `src/PlayerProfile.jsx`
- Displays charts using `recharts` responsive containers.
- Line 20–62: `evaluateMetric` adjusts the metric standards (height, flight time, power) using:
  ```javascript
  const isFemale = activePlayer.gender === 'female';
  const isYouth = age < 17;
  const youthFactor = isYouth ? 0.85 : 1.0;
  ```
- Renders benchmark modal tables for adults using Tailwind CSS glassmorphic panel styling.

### R6: Timeline Scrubber and Frame-by-Frame Duration Logic
- Scrubber track events handled via custom coordinate calculations in `handleTimelineDragStart` (Line 94 in `JumpCalculator.jsx`, Line 73 in `RSICalculator.jsx`).
- Calculates percentage by checking directionality for RTL (Arabic language context):
  ```javascript
  const pct = rtl ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;
  ```
- Frame duration calculation modes (Auto/Manual):
  - Slow-motion scaling: `(videoFps / cameraFps)`
  - Manual frame duration override: multiplies total frame difference by custom `manualFrameDuration`.

---

## 2. Logic Chain

1. **R1**: Because `package.json` contains no routing library (e.g. `react-router-dom`) and routing in `App.tsx` uses state variables (`session` check and conditional tabs in `JumpCalculator`), navigation to `JumpCalculator` defaults to the vertical jump tab by virtue of `activeTab` initializing to `'calculator'` in state.
2. **R2**: Because queries like `supabase.from('lab_players').select('*')` lack filter criteria (like `.eq('coach_id', user.id)`), there is no isolated coach-player relationship. Therefore, an SQL migration is required to add `coach_id` referencing `auth.users(id)` and update React files to pass down session user ID to queries.
3. **R3**: Because `ChevronsRight`, `ChevronsLeft`, and `Sparkles` are referenced as JSX tags in `RSICalculator.jsx` but are omitted from the `lucide-react` import statement, loading the drop-jump workspace triggers a JavaScript reference crash. Replacing the import statement to include these three icons will resolve the crash.
4. **R4**: Because FVP calculations in `FVPCalculator.jsx` use linear regression on 3 loaded jump inputs to output training recommendations, season-sensitive training rules (Pre-season vs. In-season) can be integrated by adding a season-phase selector and conditioning the textual output on it.
5. **R5**: Because `PlayerProfile.jsx` dynamically computes power values and benchmarks (incorporating the `youthFactor` of 0.85 for age < 17), styling modifications and benchmark tables can be edited directly inside this file.
6. **R6**: Because timeline dragging handles RTL direction checks and throttles seeks to 40ms, touch/pointer event drag calculation is robust. FPS manual calculations are driven by `timeCalculationMethod === 'manual'` using `manualFrameDuration` scaled against video FPS.

---

## 3. Caveats

- **Supabase Config**: Direct credentials or database configuration dashboard access is not available locally. Schema migrations must be run on the Supabase console by the user.
- **MediaPipe Pose Model**: The MediaPipe script loading (`@mediapipe/pose`) assumes access to the browser camera/runtime environment, which was not executed dynamically in this read-only report.

---

## 4. Conclusion

- The codebase is architecturally solid but has a critical import crash in `RSICalculator.jsx`.
- Database schema changes are necessary to support player isolation per coach.
- Season-sensitive training rules can be easily appended to the existing decision tree inside `FVPCalculator.jsx`.
- Timeline seek calculations and manual frame scaling are already fully implemented in both calculator files.

---

## 5. Verification Method

To verify the codebase structure and validate findings:
1. Run `npm run build` in PowerShell to verify Vite compiling. It should flag TypeScript or bundler errors (such as the missing Lucide icon imports if the compiler checks them strictly, otherwise runtime checks will fail).
2. Open `src/RSICalculator.jsx` and inspect lines 3, 636, 644, and 757 to verify the missing Lucide React icon imports.
3. Open `src/FVPCalculator.jsx` and inspect lines 550–622 to verify the linear regression calculations and diagnostic conditions.
