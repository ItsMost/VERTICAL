# Handoff Report — E2E Setup Investigation

## 1. Observation
- **Codebase Structure**: Found components in `src/` directory including:
  - `src/App.tsx`: Handles authentication views and conditionally renders `<JumpCalculator />` (Line 285).
  - `src/supabaseClient.js`: Initialized with static URLs and keys (Lines 4, 7-8).
  - `src/RSICalculator.jsx`: Contains imports for Lucide icons (Line 3), but has missing imports for `ChevronsRight` (Line 636), `ChevronsLeft` (Line 644), and `Sparkles` (Line 757).
  - `src/FVPCalculator.jsx` (Lines 1-240): Implements Force-Time Curve (FTC) & Force-Velocity Profile (FVP) calculations and regression analysis.
  - `src/PlayerProfile.jsx` (Lines 1-150): Displays athlete profiles and charts using Recharts.
- **Dynamic Scripts**: Pose analysis components load MediaPipe libraries dynamically using `<script>` DOM nodes (e.g. `src/JumpCalculator.jsx` line 262, `src/VBTCamera.jsx` line 62).
- **Environment**: React version is `^19.2.5` and Vite is `^8.0.9` (`package.json` lines 22, 39).

## 2. Logic Chain
- Since we are in CODE_ONLY mode, external networks are restricted and tests must run offline and deterministically.
- Therefore, we must mock `src/supabaseClient.js` to simulate database records (for `invite_codes`, `lab_players`, and `lab_jump_measurements`) in-memory.
- JSDOM does not implement visual layout, canvas, audio/video playback, or ResizeObserver.
- Therefore, components relying on Recharts (which uses ResizeObserver and needs dimensional bounding rects) or MediaPipe (which dynamically checks `window.Pose`) will crash.
- Thus, the setup file must globally mock:
  - `window.Pose` to mock pose detection.
  - `ResizeObserver` and `Recharts`' `ResponsiveContainer` to bypass layout dependencies.
  - Media/URL prototypes (`play`, `pause`, `createObjectURL`, `requestVideoFrameCallback`) to allow video analyzer components to execute without crashing.
- `RSICalculator.jsx` uses `ChevronsRight`, `ChevronsLeft`, and `Sparkles` which are not imported in the file. Running these in tests will throw ReferenceErrors unless corrected by the implementer or patched globally.

## 3. Caveats
- Since this is a read-only investigation, no code or test files were modified or written to the source directory.
- Dynamic script loading is simulated in the mock. In practice, the test environment relies on script element injection timing which we bypassed by pre-declaring `global.Pose` on test startup.
- Did not verify camera user-media streams in real browsers as JSDOM does not support camera mock APIs.

## 4. Conclusion
- A setup using **Vitest** + **JSDOM** + **React Testing Library** is the optimal headless solution for Vite 8 + React 19.
- A robust setup file (`tests/setup.ts`) along with a stateful local mock for `supabaseClient.js` is detailed in `discovery.md` to run tests fully offline.
- Testing the timeline scrubber requires simulating pointer events (`PointerEvent`), which is supported under JSDOM via `fireEvent`.

## 5. Verification Method
- **Files to inspect**:
  - `C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\explorer_e2e_setup\discovery.md`
- **Verification Command**:
  - Run the proposed E2E test commands after integration: `npm run test:e2e` (to run the Vitest suite).
