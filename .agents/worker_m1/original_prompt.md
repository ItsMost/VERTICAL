## 2026-06-07T19:43:52Z
Implement the changes for Milestone 1: DB Schema, Coach Management & Auth Bypass.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions for Implementation:
1. Define the SQL migrations by creating a file `supabase/migrations/20260607164000_create_coaches_table.sql` containing the SQL to:
   - Create the `lab_coaches` table (id UUID primary key default gen_random_uuid(), full_name TEXT NOT NULL, created_at TIMESTAMPTZ default now()).
   - Add `coach_id` (UUID foreign key referencing `lab_coaches(id)`) to `lab_players` table.
   - Seed the default coach with id `'d3b07384-d113-4956-a5db-630d7830be1e'` and full_name `'Bypassed Coach'`.
2. Modify `src/App.tsx` to bypass authentication:
   - Preset `session` state to a mock coach session using the UUID `'d3b07384-d113-4956-a5db-630d7830be1e'` and email `'coach@thelab.com'`.
   - Disable Supabase auth listeners on mount so they do not overwrite the mock session.
   - Update `handleLogout` to be an alert or no-op so the user remains logged in as the bypassed coach.
3. Modify `src/JumpCalculator.jsx` to support coach management and grouped player lists:
   - Define states for `coaches`, `showCoachModal`, and `newCoachName`.
   - Fetch coaches list from `lab_coaches` table ordered by created_at descending on mount.
   - Implement `handleRegisterCoach` function to insert a new coach into `lab_coaches` and update state.
   - Add the registration dialog modal UI in the JSX layout.
   - Put a registration button/icon (using `Plus` or a similar icon) in the UI header (both desktop sidebar and mobile header next to the theme toggle).
   - In the "Add Player" form (both desktop sidebar and mobile form), add a "Coach Selector" dropdown linking player records to `newPlayer.coachId`.
   - Update `handleAddPlayer` to insert the selected `coach_id` along with other player details.
   - Group the player dropdowns (both desktop sidebar and mobile header dropdowns) by their coach name using `<optgroup>` elements. Unassigned players should be grouped under a label like "لاعبون بدون مدرب".
4. Verify your implementation by running `npm run build` and `npm run lint` in the project directory C:\Users\memob\.gemini\antigravity\scratch\The-Lab. Ensure that there are no TypeScript or build errors.

Write a handoff report at C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\worker_m1\handoff.md detailing the files modified, changes made, and build/lint results.
