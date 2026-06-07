# E2E Test Setup Strategy & Codebase Analysis Report

This discovery report outlines the E2E testing infrastructure setup strategy for **The Lab**. The proposed testing architecture uses **Vitest** + **JSDOM** + **React Testing Library** to execute headless, offline, deterministic tests mimicking real-world user interactions.

---

## 1. Codebase Analysis & Core Feature Boundaries

### A. Routing & State Flow (`src/App.tsx`)
- **State-Based Entry**: The app uses conditional rendering to gate content based on the presence of a Supabase session (`session` state).
  - If `session === null`, it renders the auth screens (`Login` / `Signup` / `Invite Code`).
  - If authenticated, it renders the main dashboard (`JumpCalculator`).
- **Super Admin vs. Coach**: 
  - Access is statically verified using `ADMIN_EMAIL = 'mahmoud@thelab.com'`.
  - Non-admin coaches require an **invite code** validated against the `invite_codes` database table.
- **Milestone 1 Auth Bypass Requirement**: In the final setup, a bypass route/mechanism will allow landing directly on the `JumpCalculator` workspace. Testing needs to cover both the standard auth gate (F1) and the direct bypass entry (F2).

### B. Supabase Client Config (`src/supabaseClient.js`)
- Exports a singular client instance (`supabase`) initialized with `createClient(supabaseUrl, supabaseAnonKey)`.
- It relies on direct HTTP connection to Supabase Auth endpoints and REST APIs.
- To prevent network leakage and speed up test execution, this client **must** be mocked in the test runner.

### C. Missing Lucide Icons (`src/RSICalculator.jsx`)
- The audit in Milestone 2 highlights missing imports in `src/RSICalculator.jsx` on line 3:
  - **`ChevronsRight`**, **`ChevronsLeft`**, and **`Sparkles`** are used in the JSX (lines 636, 644, and 757) but not imported.
  - *Impact on Tests*: Mounting `RSICalculator.jsx` in JSDOM will throw a `ReferenceError: ChevronsRight is not defined` unless the imports are corrected or the global namespace is patched. This is a critical edge case to document.

### D. Calculator Inputs and Demographics
1. **Vertical Jump (`src/JumpCalculator.jsx`)**:
   - Inputs: Jump Type (`cmj`, `sj`, `dj`), body mass (kg), leg length (m), video file (preset / FPS custom values), and timeline markers (`takeoffTime`, `landingTime`, and `boxTouchdownTime`).
   - Hooks: Uses custom hook `useJumpMechanics` to dynamically calculate jump height (Bosco), takeoff velocity, Samozino power, and Sayers/Harman empirical power estimations.
2. **Reactive Strength Index (`src/RSICalculator.jsx`)**:
   - Inputs: Camera FPS, Video FPS, and timeline markers (`touchdownTime`, `takeoffTime`, `landingTime`).
   - Outputs: Contact Time ($T_c$), Flight Time ($T_f$), Jump Height, Modified RSI, and Leg Stiffness (Morin/Brenner spring-mass formula).
3. **Force-Velocity Profile (`src/FVPCalculator.jsx`)**:
   - Subtab **`ftc`**: Mass, Sampling Rate, Movement Type, Input Mode (Raw array or direct metrics).
   - Subtab **`fvp`**: Mass, Leg Length, and 3-jump external loads (e.g. 0kg, 10kg, 20kg) with flight times.
4. **Player Profile (`src/PlayerProfile.jsx`)**:
   - Inputs: Demographics (age, gender, weight) and jump history logs.
   - Outputs: Benchmarking levels (Under Average, Fair, Good, Excellent, Elite) with 15% discount for youth (<17).

---

## 2. Stateful In-Memory Supabase Client Mock

The mock must act as an in-memory transactional database, maintaining state across queries so that creating a coach or selecting a player behaves deterministically and runs offline.

Create a mock file at `tests/mocks/supabaseClient.ts`:

```typescript
import { vi } from 'vitest';

export interface InviteCode {
  code: string;
  is_used: boolean;
  created_at: string;
}

export interface Player {
  id: string;
  full_name: string;
  date_of_birth: string;
  weight_kg: number;
  leg_length_m: number;
  gender: 'male' | 'female';
  created_at: string;
  coach_id?: string;
}

export interface Measurement {
  id: string;
  player_id: string;
  test_type: 'standard' | 'rsi';
  jump_height_cm: number;
  flight_time_sec: number;
  contact_time_sec?: number;
  rsi_score?: number;
  takeoff_velocity_ms?: number;
  mean_power_watts?: number;
  peak_power_watts?: number;
  created_at: string;
}

// Stateful In-Memory Arrays representing DB tables
export let mockSession: any = null;
export let authStateCallbacks: Array<(event: string, session: any) => void> = [];

export const mockDb = {
  invite_codes: [
    { code: 'LAB-TEST01', is_used: false, created_at: new Date().toISOString() },
    { code: 'LAB-USED02', is_used: true, created_at: new Date().toISOString() },
  ] as InviteCode[],
  lab_players: [] as Player[],
  lab_jump_measurements: [] as Measurement[]
};

export const resetMockDb = () => {
  mockSession = null;
  authStateCallbacks = [];
  mockDb.invite_codes = [
    { code: 'LAB-TEST01', is_used: false, created_at: new Date().toISOString() },
    { code: 'LAB-USED02', is_used: true, created_at: new Date().toISOString() },
  ];
  mockDb.lab_players = [];
  mockDb.lab_jump_measurements = [];
};

class MockQueryBuilder {
  private table: keyof typeof mockDb;
  private filters: Array<(item: any) => boolean> = [];
  private sortField: string | null = null;
  private sortAscending: boolean = true;
  private fetchSingle: boolean = false;

  constructor(table: keyof typeof mockDb) {
    this.table = table;
  }

  select(columns: string = '*') {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.sortField = column;
    this.sortAscending = ascending;
    return this;
  }

  single() {
    this.fetchSingle = true;
    return this;
  }

  // Thenable implementation to await builder chain directly
  async then(resolve: any, reject: any) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }

  private async execute() {
    let data = [...(mockDb[this.table] as any[])];

    for (const filterFn of this.filters) {
      data = data.filter(filterFn);
    }

    if (this.sortField) {
      data.sort((a, b) => {
        const valA = a[this.sortField!];
        const valB = b[this.sortField!];
        if (valA < valB) return this.sortAscending ? -1 : 1;
        if (valA > valB) return this.sortAscending ? 1 : -1;
        return 0;
      });
    }

    if (this.fetchSingle) {
      if (data.length === 0) {
        return { data: null, error: new Error('Row not found') };
      }
      return { data: data[0], error: null };
    }

    return { data, error: null };
  }

  async insert(rows: any[]) {
    const tableData = mockDb[this.table] as any[];
    const inserted = rows.map((row) => {
      const newRow = {
        id: Math.random().toString(36).substring(7),
        created_at: new Date().toISOString(),
        ...row,
      };
      tableData.push(newRow);
      return newRow;
    });
    return { 
      data: inserted, 
      error: null,
      select() {
        return {
          then(resolve: any) {
            resolve({ data: inserted, error: null });
          }
        };
      }
    };
  }

  async update(changes: any) {
    const tableData = mockDb[this.table] as any[];
    const updatedRows: any[] = [];
    
    mockDb[this.table] = tableData.map((item) => {
      const matches = this.filters.every((filterFn) => filterFn(item));
      if (matches) {
        const updated = { ...item, ...changes };
        updatedRows.push(updated);
        return updated;
      }
      return item;
    }) as any;

    return { data: updatedRows, error: null };
  }

  async delete() {
    const tableData = mockDb[this.table] as any[];
    const remaining: any[] = [];
    const deleted: any[] = [];

    tableData.forEach((item) => {
      const matches = this.filters.every((filterFn) => filterFn(item));
      if (matches) {
        deleted.push(item);
      } else {
        remaining.push(item);
      }
    });

    mockDb[this.table] = remaining as any;
    return { data: deleted, error: null };
  }
}

export const supabase = {
  auth: {
    async getSession() {
      return { data: { session: mockSession }, error: null };
    },
    onAuthStateChange(callback: any) {
      authStateCallbacks.push(callback);
      // Trigger initial trigger
      callback('INITIAL_SESSION', mockSession);
      return {
        data: {
          subscription: {
            unsubscribe() {
              authStateCallbacks = authStateCallbacks.filter(cb => cb !== callback);
            }
          }
        }
      };
    },
    async signInWithPassword({ email, password }: any) {
      if (password === 'wrongpassword') {
        return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } };
      }
      mockSession = {
        user: { id: 'test-coach-uuid', email },
        access_token: 'mock-jwt-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
      authStateCallbacks.forEach(cb => cb('SIGNED_IN', mockSession));
      return { data: { user: mockSession.user, session: mockSession }, error: null };
    },
    async signUp({ email, password }: any) {
      mockSession = {
        user: { id: 'test-coach-uuid', email },
        access_token: 'mock-jwt-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
      authStateCallbacks.forEach(cb => cb('SIGNED_IN', mockSession));
      return { data: { user: mockSession.user, session: mockSession }, error: null };
    },
    async signOut() {
      mockSession = null;
      authStateCallbacks.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    }
  },
  from(table: keyof typeof mockDb) {
    return new MockQueryBuilder(table);
  }
};
```

To bind this mock automatically inside tests, configure Vitest's aliasing in config or use a mock hook in setup:
```typescript
vi.mock('./supabaseClient', () => ({
  supabase: supabase
}));
```

---

## 3. Resolving React 19, JSDOM & SVG Framework Issues

Headless JSDOM environments lack several media, canvas, and layout engines required by Recharts and MediaPipe. The following configuration and mock strategy ensures tests run seamlessly.

### A. Dynamic CDN Scripts & MediaPipe Pose Mocking
The calculators check `window.Pose` periodically to detect library initialization.
**Mock Strategy**: Define a mock `Pose` class in the JSDOM global scope inside the test setup script.

```typescript
// Define global MediaPipe mocks
global.Pose = class MockPose {
  private onResultsCallback: any;
  public options: any;

  constructor() {}
  
  setOptions(options: any) {
    this.options = options;
  }
  
  onResults(callback: any) {
    this.onResultsCallback = callback;
  }
  
  async send({ image }: { image: any }) {
    if (this.onResultsCallback) {
      // Simulate landmark points (e.g. ankles at y=0.8, hips at y=0.5)
      this.onResultsCallback({
        image: { width: 640, height: 480 },
        poseLandmarks: Array.from({ length: 33 }, (_, idx) => ({
          x: 0.5,
          y: idx === 27 || idx === 28 ? 0.8 : 0.5, // ankles lower down
          visibility: 0.95
        }))
      });
    }
  }
  
  close() {}
};

// Mock the MediaPipe connections objects
global.POSE_CONNECTIONS = [];
global.drawConnectors = vi.fn();
global.drawLandmarks = vi.fn();
```

### B. Recharts SVG Layout Issues (`ResponsiveContainer`)
In JSDOM, components rendering SVG layouts (like `LineChart`) collapse because parent dimensions read $0 \times 0$ (layout engines are absent in JSDOM). `ResizeObserver` is also undefined.
**Mock Strategy**: Mock `ResizeObserver` and mock `recharts` to render a fixed-dimension wrapper instead of `ResponsiveContainer`.

```typescript
// Mock ResizeObserver
global.ResizeObserver = class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock recharts ResponsiveContainer
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: '800px', height: '600px' }}>{children}</div>
    ),
  };
});
```

### C. Missing Browser/Audio/Video APIs
- **URL object URLs**: `createObjectURL` and `revokeObjectURL` must be mocked to load dummy videos.
- **HTMLMediaElement Video elements**: `.play()`, `.pause()`, `.load()` will throw errors under JSDOM because JSDOM does not load audio/video codecs.
- **requestVideoFrameCallback**: The FPS auto-detector requires this callback on the video elements.
- **Navigator Clipboard**: `navigator.clipboard.writeText` is used to copy codes.
- **window.alert**: The app heavily alerts users upon error or success.

Patch these on global/prototype objects in `tests/setup.ts`:

```typescript
// Mock URL Object methods
window.URL.createObjectURL = vi.fn(() => 'mock-video-stream-url');
window.URL.revokeObjectURL = vi.fn();

// Mock Alert dialogs
window.alert = vi.fn();

// Mock Clipboard APIs
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

// Mock Video prototypes
window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.load = vi.fn();

// Mock requestVideoFrameCallback on HTMLVideoElement
(window.HTMLVideoElement.prototype as any).requestVideoFrameCallback = vi.fn().mockImplementation((cb) => {
  const metadata = { mediaTime: 0.2, presentationTime: 1234 };
  const timer = setTimeout(() => cb(Date.now(), metadata), 16); // simulate 60fps frame tick
  return timer;
});
```

---

## 4. Package Config & Runner Execution

### A. Required Dependencies (`devDependencies`)
Ensure these packages are added to `package.json` for React 19 + Vitest setup:
- `"vitest": "^3.0.0"`
- `"@testing-library/react": "^16.1.0"` (React 19 support)
- `"@testing-library/jest-dom": "^6.6.3"`
- `"@testing-library/user-event": "^14.6.1"`
- `"jsdom": "^26.0.0"`
- `"@vitejs/plugin-react": "^6.0.1"`

### B. Vitest Configuration (`vitest.config.ts`)
Create `vitest.config.ts` in the project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.test.{ts,tsx,js,jsx}'],
    alias: {
      // Direct supabase client resolves to mock when testing
      './supabaseClient': new URL('./tests/mocks/supabaseClient.ts', import.meta.url).pathname
    }
  },
});
```

### C. Runner Script (`package.json`)
Integrate test runners in the `"scripts"` object in `package.json`:
- `"test:e2e": "vitest run"` (Runs test suite once)
- `"test:e2e:watch": "vitest"` (Runs suite in interactive watch mode)

---

## 5. Proposed E2E Test Suite Structure & Simulation

Place test files under a unified structure:
```
/tests
├── setup.ts                 # JSDOM global patches & mock definitions
├── mocks
│   └── supabaseClient.ts    # Stateful Supabase Mock
└── e2e
    ├── F1_coach_mgmt.test.tsx
    ├── F2_auth_bypass.test.tsx
    ├── F3_rsi_calc.test.tsx
    ├── F4_vertical_jump.test.tsx
    ├── F5_fvp_calc.test.tsx
    └── F6_player_profile.test.tsx
```

### Simulation Examples for Test Cases

Here is how tests should construct user interactions for the features:

#### F1: Coach Management Test Case Snippet
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { resetMockDb, mockDb } from '../mocks/supabaseClient';

beforeEach(() => {
  resetMockDb();
});

test('Should sign up coach successfully with valid invite code', async () => {
  render(<App />);
  const user = userEvent.setup();

  // Click on "Signup" mode switch
  const modeSwitch = screen.getByText(/لا تملك حساباً؟/i);
  await user.click(modeSwitch);

  // Fill forms
  const emailInput = screen.getByPlaceholderText('coach@example.com');
  const passwordInput = screen.getByPlaceholderText('••••••••');
  const inviteInput = screen.getByPlaceholderText('LAB-XXXXXX');

  await user.type(emailInput, 'newcoach@thelab.com');
  await user.type(passwordInput, 'secure123');
  await user.type(inviteInput, 'LAB-TEST01'); // preseeded code

  const submitBtn = screen.getByRole('button', { name: /إنشاء حساب جديد/i });
  await user.click(submitBtn);

  // Assert in-memory DB updated
  await waitFor(() => {
    expect(mockDb.invite_codes.find(c => c.code === 'LAB-TEST01')?.is_used).toBe(true);
    expect(screen.getByText(/The Lab 🧪/i)).toBeInTheDocument();
  });
});
```

#### F3/F4: Interactive Scrubber Drag Event Simulation
To test the timeline scrubbers (`JumpCalculator` or `RSICalculator`), we simulate the pointer event workflow:
```typescript
test('Simulate timeline scrubber dragging to set touchdown time', async () => {
  render(<RSICalculator selectedPlayerId="p1" activePlayer={{ weight_kg: 80 }} />);
  
  // Locate timeline track
  const track = screen.getByText(/خط الزمن السينمائي/i).closest('div')?.querySelector('.touch-none');
  expect(track).toBeInTheDocument();

  // Simulate dragging pointer from right to left (RTL support)
  // JSDOM client dimensions can be mocked or triggered via direct fireEvents
  fireEvent.pointerDown(track!, { clientX: 200 });
  fireEvent.pointerMove(window, { clientX: 100 });
  fireEvent.pointerUp(window);

  // Touchdown time indicator should update from 0
  const tdDisplay = screen.getByText(/الملامسة \(s\)/i).nextElementSibling;
  expect(parseFloat(tdDisplay?.textContent || '0')).toBeGreaterThan(0);
});
```

#### F5: FVP Regression Deficit Simulation
We can mock the user inputs for the 3 jumps and check if a positive slope emits the warning.
```typescript
test('FVP Calculator positive slope triggers physical distortion warning', async () => {
  // Render FVPCalculator tab
  render(<FVPCalculator activePlayer={{ weight_kg: 75, leg_length_m: 1.0 }} />);
  const user = userEvent.setup();

  // Switch to FVP subtab
  const fvpTabBtn = screen.getByText(/بروفايل القوة والسرعة/i);
  await user.click(fvpTabBtn);

  // Fill in flight times that INCREASE with heavier weight (physically impossible)
  const jumpInputs = screen.getAllByRole('spinbutton'); // loads inputs
  // jump 0 (0kg) -> 0.4s
  // jump 1 (10kg) -> 0.5s (longer flight time under load -> positive slope)
  await user.clear(jumpInputs[1]);
  await user.type(jumpInputs[1], '0.4');
  await user.clear(jumpInputs[3]);
  await user.type(jumpInputs[3], '0.5');

  const analyzeBtn = screen.getByRole('button', { name: /تحليل/i });
  await user.click(analyzeBtn);

  // Should trigger an alert warning of the physics contradiction
  expect(window.alert).toHaveBeenCalledWith(
    expect.stringContaining('خطأ فيزيائي: لا يمكن أن تزيد سرعتك عندما تحمل وزناً أثقل')
  );
});
```
