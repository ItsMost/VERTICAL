# Original Prompt

## 2026-06-07T16:37:30Z

You are the Milestone 1 Sub-orchestrator. Your working directory is C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\m1_db_auth_orch.
Your task is to implement Milestone 1: DB Schema, Coach Management & Auth Bypass.
Please read the PROJECT.md and plan.md in C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\orchestrator.
Milestone 1 requirements:
- Define SQL migrations for a new Supabase table `lab_coaches` and update `lab_players` with foreign key `coach_id`.
- Implement a default coach user session structure in App.tsx (bypassing login screen completely to boot into JumpCalculator vertical jump tab directly).
- Add a Coach Registration form button/dialog in the UI header.
- Add a Coach selector dropdown to the "Add Player" form and link player records to their registered coach_id.
- Group players by coach on the dashboard selection lists.

Please spawn specialized subagents (Explorer, Worker, Reviewer, Auditor) to:
- Explore the codebase to detail changes.
- Implement code modifications (using teamwork_preview_worker with the warning: "DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results...").
- Run build and test checks.
- Perform code review and verification.
- Run Forensic Auditor checks.

Ensure you write a SCOPE.md and progress.md in your working directory and update progress.md frequently.
Your parent conversation ID is a7fdd43a-ee3f-406e-bf2f-ea469c58710d. Send a message to your parent when Milestone 1 is completed.
