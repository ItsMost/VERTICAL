# Codebase Exploration & Discovery Report

## Executive Summary
This report presents the findings of a comprehensive, read-only architectural investigation of "The Lab" performance tracking codebase located in `C:\Users\memob\.gemini\antigravity\scratch\The-Lab`. The application is a React-based Single Page Application (SPA) leveraging Vite and TypeScript. It uses Supabase for Authentication and Database operations, MediaPipe for biomechanical pose detection, and Lucide React for iconography.

---

## R1: Authentication and Routing Structure

### Current Auth Architecture
Authentication is implemented in `src/App.tsx` using Supabase Auth. It handles:
- **Session State**: Reacts to Auth state changes via `supabase.auth.onAuthStateChange`.
- **Forms**: Renders Login, Signup, and password recovery interfaces.
- **Access Control**:
  - Super admin access is defined statically by matching the email `mahmoud@thelab.com`.
  - Non-admin coaches require an **invite code** validation checked against the `invite_codes` table.
- **Routing**: Routing is entirely state-based. No routing library (such as React Router) is installed.
  - If authenticated, the user is presented with the application interface.
  - The standard view renders `<JumpCalculator />` directly:
    ```tsx
    // src/App.tsx line 285:
    return (
      <div className="relative min-h-screen">
        {/* Floating control buttons at top-left corner */}
        ...
        <JumpCalculator />
      </div>
    );
    ```

### Direct Routing to JumpCalculator (Vertical Jump Tab)
- In `src/JumpCalculator.jsx`, tab selection is managed by the state variable `activeTab` which defaults to `'calculator'` (the Vertical Jump tab):
  ```javascript
  // src/JumpCalculator.jsx line 35:
  const [activeTab, setActiveTab] = useState('calculator');
  ```
- Rendering of the vertical jump tab is governed by:
  ```javascript
  // src/JumpCalculator.jsx line 2217:
  {activeTab === 'rsi' && <RSICalculator ... />}
  {activeTab === 'fvp' && <FVPCalculator ... />}
  {activeTab === 'vbt' && <VBTCamera />}
  {activeTab === 'profile' && <PlayerProfile ... />}
  ```
  If `activeTab` is `'calculator'` and a player is selected, it renders the vertical jump workspace.
- **Recommendation**: To implement direct deep-linking or routing without full state loss, a query parameter parser or hash-routing mechanism should be added in `App.tsx`/`JumpCalculator.jsx` to synchronize the URL (e.g., `/#/jump`, `/#/rsi`, etc.) with `activeTab`.

---

## R2: Supabase Database Structure and Coach-Player Relationships

### Database Tables and Queries
The application queries three tables in active use:
1. **`invite_codes`**: Verified during coach sign-up in `src/App.tsx` (cols: `code`, `is_used`, `created_at`).
2. **`lab_players`**: Stores player demographics in `src/JumpCalculator.jsx` (cols: `id`, `full_name`, `date_of_birth`, `weight_kg`, `leg_length_m`, `gender`, `created_at`).
3. **`lab_jump_measurements`**: Stores standard and reactive strength index test logs in `src/JumpCalculator.jsx` and `src/RSICalculator.jsx` (cols: `id`, `player_id`, `test_type` ('standard' or 'rsi'), `jump_height_cm`, `flight_time_sec`, `contact_time_sec`, `rsi_score`, `takeoff_velocity_ms`, `mean_power_watts`, `peak_power_watts`, `mean_force_newtons`, `leg_used`, `created_at`).

*Note: There is a component `src/JumpDashboard.jsx` referencing tables `players` and `jump_measurements` instead of `lab_players` and `lab_jump_measurements`, but this file has no imports and appears to be a legacy component.*

### Player-Coach Relationships (Current & Proposed)
- **Current State**: All queries for players (`lab_players`) and measurements select all records globally without filtering by the logged-in coach's ID. Any registered user sees all players.
- **Proposed Migration**:
  1. Add a `coach_id` column to the `lab_players` table, referencing `auth.users(id)`:
     ```sql
     ALTER TABLE lab_players ADD COLUMN coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
     ```
  2. Set Row Level Security (RLS) policies on `lab_players` and `lab_jump_measurements` so coaches can only select/update/delete their own data:
     ```sql
     CREATE POLICY "Coaches can manage their own players" 
     ON lab_players FOR ALL 
     USING (auth.uid() = coach_id);
     ```
  3. Update queries in `src/JumpCalculator.jsx` to filter by the coach's ID (which can be passed as a prop from the user session in `App.tsx`).

---

## R3: Lucide Icon Audit in `RSICalculator.jsx`

An audit of `src/RSICalculator.jsx` revealed that several Lucide React icons are used in the JSX but are **missing from the import statement**, which will throw a `ReferenceError` during execution:

### Missing Imports:
- **`ChevronsRight`**: Used on line 636: `<ChevronsRight size={18} />`
- **`ChevronsLeft`**: Used on line 644: `<ChevronsLeft size={18} />`
- **`Sparkles`**: Used on line 757: `<Sparkles size={14} className="animate-pulse" />`

### Current Import Statement:
```javascript
// src/RSICalculator.jsx line 3:
import { Zap, Play, Pause, X, Save, Info, ChevronRight, ChevronLeft, Activity } from 'lucide-react';
```

### Proposed Fix:
Replace the import statement to include the three missing icons:
```javascript
import { Zap, Play, Pause, X, Save, Info, ChevronRight, ChevronLeft, Activity, ChevronsRight, ChevronsLeft, Sparkles } from 'lucide-react';
```

---

## R4: Force-Velocity Profile (FVP) Calculations and Season-Sensitive Logic

### FVP 3-Jump Calculation & Inputs
In `src/FVPCalculator.jsx` (Subtab `'fvp'`), the athlete conducts 3 jumps with different external loads (usually Bodyweight, Bodyweight + 10kg, Bodyweight + 20kg).
- **Inputs**:
  - The athlete's mass ($m$) is synced from `activePlayer.weight_kg`.
  - Leg length ($L$) is fetched from `activePlayer.leg_length_m` (defaulting to 1.0m).
  - Standing vertical reach is not explicitly input here; rather, the vertical push-off distance ($h_{po}$) is estimated as $h_{po} = L \cdot 0.45$.
  - Flight times for the three jumps are input via sliders/ranges and stored in the `jumps` array.
- **Formulas**:
  - Jump height: $h = \frac{g \cdot ft^2}{8}$
  - Takeoff velocity: $v_0 = \frac{g \cdot ft}{2}$
  - Mean velocity: $\overline{v} = \frac{v_0}{2}$
  - Mean force: $\overline{f} = (m + extra\_weight) \cdot g \cdot (\frac{h}{h_{po}} + 1)$
- **Regression**:
  - A simple linear regression is performed on the 3 points $(mean\_v, mean\_f)$ to compute the slope and intercept.
  - It extrapolates:
    - Max Force: $F_0 = \text{Intercept}$ (at $v = 0$)
    - Max Velocity: $V_0 = -\frac{F_0}{\text{Slope}}$ (at $f = 0$)
    - Max Power: $P_{max} = \frac{F_0 \cdot V_0}{4}$

### Season-Sensitive Logic Integration
Athletes' training priorities change depending on the season phase:
- **Pre-Season**: High training capacity; focus on structural strength correction (solving Force Deficits).
- **In-Season**: Focus on speed-strength maintenance, stiffness, and avoiding neurological fatigue (solving Velocity Deficits without massive training volumes).
- **Off-Season**: General development and rebuilding.
- **Proposed Integration**: Add a "Season Phase" dropdown selector in the FVP component (`pre-season`, `in-season`, `off-season`) and modify the diagnostic recommendations based on both the profile deficit and the selected season phase. For instance, an in-season Force Deficit recommendation would shift from heavy squats (+85% 1RM) to cluster-set velocity-based training (+65% 1RM) to preserve energy for competition.

---

## R5: Player Profile Styling and Metric Calculations

### Styling and Architecture
- `src/PlayerProfile.jsx` uses a dark-themed glassmorphism style (`glass-panel`, `glass-card`) matching the rest of the application.
- Utilizes `framer-motion` (`AnimatePresence`, `motion.div`) for card hover effects and modal slide-ins.
- Uses `recharts` for an interactive, responsive performance trajectory line chart.

### Metric Calculations
- **Age**: Calculated dynamically using `date_of_birth` year vs. current year.
- **Benchmarking Engine (`evaluateMetric`)**:
  - Adjusts threshold limits dynamically. If age is under 17, it applies a `youthFactor = 0.85` (15% reduction) to all thresholds.
  - Splits thresholds by gender (`female` vs. `male`).
  - Classifies metrics (Jump Height, Flight Time, Relative Power) into scale levels: Under Average, Fair, Good, Excellent, Elite.
- **Dynamic Power Estimations**:
  - Sayers Peak Power: $60.7 \cdot heightCm + 45.3 \cdot mass - 2055$
  - Harman Peak Power: $61.9 \cdot heightCm + 36.0 \cdot mass - 1822$
  - Harman Mean Power: $21.2 \cdot heightCm + 23.0 \cdot mass - 1393$

### Benchmark Modal Layout
- Triggered by the "الجداول المعيارية" button, showing standard reference ranges for adult males and females.
- Visually warns that youth profiles are scaled automatically by -15%.

---

## R6: Timeline Scrubber and Frame-by-Frame Duration Logic

Both `JumpCalculator.jsx` and `RSICalculator.jsx` implement highly synchronized video frame-by-frame scrubbers:

### Timeline Scrubber Pointer Events
- The scrubber track (`timelineTrackRef`) uses pointer/touch event bindings (`onPointerDown`, `pointermove`, `pointerup`).
- It calculates the timeline seek percentage using the bounding rect, adjusted for **RTL layout**:
  `const pct = rtl ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;`
- Video seeking is throttled (`performSeek`) to a maximum frequency of 40ms to avoid DOM rendering lags.

### Manual Frame-by-Frame Duration with FPS Scaling
- Users can input both the capture camera frame rate (`cameraFps`, e.g., 240fps) and the decoded video file frame rate (`videoFps`, e.g., 30fps).
- **Time Calculation Method**:
  1. **Auto FPS**: Calculates real-world time by scaling playhead timestamps by the slow-motion ratio:
     $$\text{Real Time} = \Delta \text{Video Time} \cdot \left(\frac{\text{videoFps}}{\text{cameraFps}}\right)$$
  2. **Manual Frame Duration**: Directly multiplies the count of raw video frames by a user-defined frame duration (e.g., 0.033 seconds per frame).
     $$\text{Real Time} = \left(\Delta \text{Video Time} \cdot \text{videoFps}\right) \cdot \text{manualFrameDuration}$$
- **Auto-Detection**: Both files implement `requestVideoFrameCallback` to calculate the real interval between frames when the video is loaded, dynamically proposing the correct frame duration.
