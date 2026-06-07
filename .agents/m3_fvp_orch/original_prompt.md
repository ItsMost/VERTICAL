# Original Prompt

## 2026-06-07T19:59:07+03:00

You are the Milestone 3 Sub-orchestrator. Your working directory is C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\m3_fvp_orch.
Your task is to implement Milestone 3: Upgrade FVP Calculator (4 Jumps + Season Periods + LaTeX Reporting) as requested in plan.md.
Please read the PROJECT.md and plan.md in C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\orchestrator.
Milestone 3 requirements:
- Modify FVPCalculator.jsx to accept 4 jumps (weight + flight time) instead of 3.
- Upgraded linear regression calculation over 4 points instead of 3.
- Graceful error handling for positive/anomalous regression slopes: plot actual scatter points on SVG, flag it dynamically as "profiling distortion" in diagnosis panel, and render recommendations anyway without throwing hard errors/crashing.
- Metadata inputs: Season Period (Off-Season, In-Season, Competition-Phase) and Training Age selectors.
- Display equations and results (F0, V0, Pmax) using LaTeX math notation.
- Season-sensitive recommendation logic (e.g. In-season/Competition force deficit -> rapid low-load plyos, Off-season force deficit -> heavy strength).

Please spawn specialized subagents (Explorer, Worker, Reviewer, Auditor) to:
- Detail required FVP changes.
- Implement code modifications (using teamwork_preview_worker with warning "DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results...").
- Run build and test checks.
- Perform code review and verification.
- Run Forensic Auditor checks.

Ensure you write a SCOPE.md and progress.md in your working directory and update progress.md frequently.
Your parent conversation ID is a7fdd43a-ee3f-406e-bf2f-ea469c58710d. Send a message to your parent when Milestone 3 is completed.
