# Codebase Investigation Findings — Milestone 1

This document outlines the findings of the codebase exploration for Milestone 1, detailing the current architecture of authentication, database access, and component hierarchies, and outlining a precise roadmap and proposed changes for the implementation worker.

---

## 1. Database Client Analysis (`src/supabaseClient.js`)

The project uses `@supabase/supabase-js` to establish connection with a Supabase database instance.

### Details:
- **Location**: `src/supabaseClient.js`
- **Configuration**:
  - `supabaseUrl` is set to `https://koakdlbwsjekmtiunfhr.supabase.co`.
  - `supabaseAnonKey` is configured with an anonymous API key.
- **Export**: Exposes the `supabase` client via `export const supabase = createClient(supabaseUrl, supabaseAnonKey);`.
- **Usage**: Directly imported in components like `App.tsx` and `JumpCalculator.jsx` to execute queries (`select`, `insert`, `update`, etc.).
- **Impact for Milestone 1**: The client is fully functional and requires no changes. It will be used to execute queries against the new `lab_coaches` table and to update records in `lab_players` with a `coach_id`.

---

## 2. Authentication Architecture (`src/App.tsx`)

The authentication layer is managed at the root level in `src/App.tsx`.

### Current Flow:
1. **State Tracking**:
   - `session` (lines 7): Stores the active Supabase session (null when unauthenticated).
   - `isAuthLoading` (lines 8): A boolean indicating whether auth state verification is ongoing.
2. **Lifecycle Hooks**:
   - `useEffect` (lines 32-43): Requests `supabase.auth.getSession()` and registers `supabase.auth.onAuthStateChange` to listen for logins/logouts.
3. **Routing / Conditional Rendering**:
   - **Loading Screen**: If `isAuthLoading` or the custom UI chemical flask animation is running (`!isAppLoadingFinished`), it displays a animated loading progress bar.
   - **Auth Screen**: If `!session`, it returns the Login/Signup views.
   - **Admin Workspace**: If `session.user.email === 'mahmoud@thelab.com'` and `viewMode === 'admin'`, it shows the `InviteCodeManager` component.
   - **Coach Workspace**: If a session exists and the email is not the administrator, or the admin switches views, it renders `JumpCalculator` (which contains the athletic testing calculators).

---

## 3. Player Loading and Saving Operations (`src/JumpCalculator.jsx`)

The main feature state (including players, history, and active player details) is housed in `src/JumpCalculator.jsx`.

### Key Operations:
1. **State Management**:
   - `players` (line 396): Array of players loaded from the database.
   - `selectedPlayerId` (line 397): UUID of the currently selected player.
   - `activePlayer` (line 398): Object representing the selected player metadata.
2. **Fetching Players**:
   - `fetchPlayers` (lines 405-407) queries `lab_players` table:
     ```javascript
     const { data, error } = await supabase.from('lab_players').select('*').order('created_at', { ascending: false });
     ```
3. **Adding Players**:
   - `handleAddPlayer` (lines 427-446) reads values from `newPlayer` state and inserts them into `lab_players`:
     ```javascript
     const { data, error } = await supabase.from('lab_players').insert([{
       full_name: newPlayer.name,
       date_of_birth: formattedDate,
       weight_kg: weight,
       leg_length_m: legLen,
       gender: newPlayer.gender
     }]).select();
     ```
4. **Child Component State Access**:
   - The other calculators (`RSICalculator`, `FVPCalculator`, `PlayerProfile`) are rendered conditionally based on the active tab and receive `activePlayer`, `selectedPlayerId`, and related states via props.
   - Player selection controls reside in `JumpCalculator.jsx` (desktop sidebar and mobile header), meaning any changes to grouping in these selector lists will automatically synchronize the active player across all calculators.

---

## 4. Proposed SQL Migrations

To support coach management, a new `lab_coaches` table is required, and the `lab_players` table must establish a foreign key relation to it.

> ⚠️ **CRITICAL POSTGRES UUID COMPATIBILITY NOTE**: Postgres UUID fields strict-match a 36-character standard UUID string. If a mock context attempts to use `'default-coach-uuid'`, Postgres will throw a type error: `invalid input syntax for type uuid`. Therefore, the seed and mock sessions MUST use a valid UUID format (e.g. `'d3b07384-d113-4956-a5db-630d7830be1e'`).

### SQL script:
```sql
-- 1. Create lab_coaches table
CREATE TABLE IF NOT EXISTS lab_coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add coach_id foreign key column to lab_players
ALTER TABLE lab_players
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES lab_coaches(id) ON DELETE SET NULL;

-- 3. Seed default coach record with a valid UUID for bypass session
INSERT INTO lab_coaches (id, full_name)
VALUES ('d3b07384-d113-4956-a5db-630d7830be1e', 'Bypassed Coach')
ON CONFLICT (id) DO NOTHING;
```

---

## 5. Detailed Proposed React Code Changes

Below are the concrete code snippets and modifications proposed for the implementation worker.

### Part A. Bypassing Authentication in `src/App.tsx`
Initialize the `session` state with a mock coach session, and bypass the Supabase session check to prevent it from resetting the mock state to null.

#### Proposed Code Changes:
Replace lines 7-8 and 32-43 in `src/App.tsx` with:

```typescript
  // Mock Coach Session to bypass Login Screen completely
  const [session, setSession] = useState<any>({
    user: {
      id: 'd3b07384-d113-4956-a5db-630d7830be1e',
      email: 'coach@thelab.com',
      user_metadata: {
        full_name: 'Bypassed Coach'
      }
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
```

And update the session initialization `useEffect`:

```typescript
  useEffect(() => {
    // Auth checks bypassed for direct developer entry routing
    setIsAuthLoading(false);
  }, []);
```

For the logout handler, disable Supabase signOut and instead display an alert or keep it as a no-op:

```typescript
  const handleLogout = async () => {
    alert("تسجيل الخروج معطل في وضع التجاوز (Bypass Mode).");
  };
```

---

### Part B. Modifying `src/JumpCalculator.jsx` for Coach Management

#### 1. Add Coach States & Fetching Logic
In `src/JumpCalculator.jsx`, define states for storing the coaches list, showing the modal, and the new coach name inputs.

```javascript
  // Coach Management States
  const [coaches, setCoaches] = useState([]);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [newCoachName, setNewCoachName] = useState('');
```

Update `useEffect` on mount to fetch both players and coaches:

```javascript
  const fetchCoaches = async () => {
    const { data, error } = await supabase
      .from('lab_coaches')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setCoaches(data);
  };

  useEffect(() => {
    fetchPlayers();
    fetchCoaches();
  }, []);
```

#### 2. Coach Registration Handler and Dialog Modal UI
Create a submission handler for registering a new coach:

```javascript
  const handleRegisterCoach = async (e) => {
    e.preventDefault();
    if (!newCoachName.trim()) return;

    const { data, error } = await supabase
      .from('lab_coaches')
      .insert([{ full_name: newCoachName.trim() }])
      .select();

    if (!error && data) {
      setCoaches([data[0], ...coaches]);
      setNewCoachName('');
      setShowCoachModal(false);
      alert("✅ تم تسجيل المدرب بنجاح!");
    } else {
      alert("حدث خطأ أثناء تسجيل المدرب: " + (error?.message || ""));
    }
  };
```

Insert the modal interface rendering markup within the return block:

```jsx
      {/* Coach Registration Modal */}
      <AnimatePresence>
        {showCoachModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="glass-panel p-6 shadow-2xl w-full max-w-md relative text-right" style={{ direction: 'rtl' }}>
              <button onClick={() => setShowCoachModal(false)} className="absolute top-4 right-4 p-2 bg-[var(--bg-input)] hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                <X size={20}/>
              </button>
              
              <div className="text-center mb-6">
                <Plus size={40} className="mx-auto text-[var(--brand-main)] mb-2" />
                <h2 className="text-2xl font-black text-white">تسجيل مدرب جديد</h2>
                <p className="text-gray-400 text-sm">أضف مدرباً جديداً لقاعدة البيانات لإدارة اللاعبين</p>
              </div>

              <form onSubmit={handleRegisterCoach} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-bold">الاسم الكامل للمدرب</label>
                  <input
                    required
                    type="text"
                    value={newCoachName}
                    onChange={e => setNewCoachName(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] py-2.5 px-4 text-sm text-white rounded-xl outline-none focus:border-[var(--brand-main)]"
                    placeholder="الاسم الكامل للمدرب"
                  />
                </div>

                <button type="submit" className="w-full btn-orange-gradient py-3 rounded-xl font-bold flex justify-center items-center gap-2">
                  <Save size={18} /> تسجيل المدرب
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
```

Add the registration button triggers in both the Desktop Sidebar header and Mobile Header (next to the theme toggles):

```jsx
{/* Desktop Sidebar Header Trigger */}
<button onClick={() => setShowCoachModal(true)} className="p-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white transition-all border border-[var(--border-light)] shadow-sm" title="تسجيل مدرب جديد">
  <Plus size={16}/>
</button>
```

#### 3. Update "Add Player" form with Coach Selector
Modify the default `newPlayer` form state schema:

```javascript
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    birthYear: '',
    weight: '',
    leg: '',
    gender: 'male',
    height: '',
    standingReach: '',
    coachId: '' // Add coachId field
  });
```

Add the dropdown UI inside both the Desktop sidebar player registration form and Mobile registration form:

```jsx
<div>
  <label className="text-[10px] text-gray-400 block mb-0.5">المدرب المسؤول (Coach)</label>
  <select
    value={newPlayer.coachId}
    onChange={e => setNewPlayer({ ...newPlayer, coachId: e.target.value })}
    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]"
  >
    <option value="">-- اختر مدرب --</option>
    {coaches.map(c => (
      <option key={c.id} value={c.id}>{c.full_name}</option>
    ))}
  </select>
</div>
```

Ensure `handleAddPlayer` inserts the `coach_id` field:

```javascript
    const { data, error } = await supabase
      .from('lab_players')
      .insert([{
        full_name: newPlayer.name,
        date_of_birth: formattedDate,
        weight_kg: weight,
        leg_length_m: legLen,
        gender: newPlayer.gender,
        coach_id: newPlayer.coachId || null // Link the player to the selected coach_id
      }])
      .select();
```

#### 4. Group Players by Coach in Selector Lists
Add a helper mapping function to organize players under their respective coaches for the selection dropdowns:

```javascript
  const getGroupedPlayers = () => {
    const groups = {};
    
    // Add coaches to groups
    coaches.forEach(coach => {
      groups[coach.id] = {
        name: coach.full_name,
        players: []
      };
    });
    
    // Add unassigned group
    const unassignedKey = 'unassigned';
    groups[unassignedKey] = {
      name: 'لاعبون بدون مدرب',
      players: []
    };
    
    // Distribute players
    players.forEach(player => {
      if (player.coach_id && groups[player.coach_id]) {
        groups[player.coach_id].players.push(player);
      } else {
        groups[unassignedKey].players.push(player);
      }
    });
    
    return groups;
  };
```

Rewrite the HTML selection dropdowns (desktop & mobile) to group options using `<optgroup>`:

```jsx
<select value={selectedPlayerId} onChange={handlePlayerSelect} className="...">
  <option value="" className="text-gray-900 bg-white">-- اختر لاعب --</option>
  {Object.entries(getGroupedPlayers()).map(([key, group]) => {
    if (group.players.length === 0) return null;
    return (
      <optgroup key={key} label={group.name} className="text-gray-500 font-bold bg-gray-100">
        {group.players.map(p => (
          <option key={p.id} value={p.id} className="text-gray-900 bg-white font-normal">
            {p.full_name}
          </option>
        ))}
      </optgroup>
    );
  })}
</select>
```

---

## 6. Verification Steps for Implementer

1. **Verify Login Bypass**: Start the local server (`npm run dev`). Verify the app loads straight to the main `JumpCalculator` dashboard tab without displaying the authentication panel.
2. **Verify Coach Registration**: Click the `+` user/plus icon next to the dark mode switch in the desktop or mobile header. Verify that submitting the modal inserts the record into `lab_coaches` and automatically updates the selectors.
3. **Verify Player Mapping**: Select a coach in the "Add Player" form and save. Inspect the Supabase table `lab_players` to confirm the record was saved with the correct `coach_id` UUID foreign key.
4. **Verify Grouping**: Open the player selection dropdowns. Verify that players are clearly separated under bold headers indicating their designated coach (or grouped under "لاعبون بدون مدرب" if unassigned).
