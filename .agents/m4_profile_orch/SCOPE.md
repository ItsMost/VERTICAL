# Scope: Milestone 4 - Player Profile Redesign & Localized Egyptian Benchmarks

## Architecture
- React component: `src/PlayerProfile.jsx`
- Displays individual athlete metrics, biomechanical power estimations (Sayers and Harman), and custom athletic critique.
- Dynamic regional benchmark comparisons.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Design | Identify code blocks to modify, design CSS/Tailwind cyberpunk classes, plan Arabic critique logic, and Egyptian club benchmark tables. | None | PLANNED |
| 2 | Implementation | Redesign CSS with electric cyan (#00f5d4) and orange (#f97316) outlines, dual units display, Arabic performance critique block, and benchmarks modal with 15% scaling for <17. | M1.1 | PLANNED |
| 3 | Verification & Code Review | Run build, tests (unit tests if any), perform code review, and run Forensic Auditor checks. | M1.2 | PLANNED |

## Interface Contracts
### `PlayerProfile` props
- `activePlayer`: `{ id, full_name, date_of_birth, weight_kg, gender, coach_id, ... }`
- `playerHistory`: `[ { id, jump_height_cm, flight_time_sec, takeoff_velocity_ms, peak_power_watts, mean_power_watts, rsi_score, test_type, created_at, ... } ]`
