# Scope: Milestone 3 - Upgrade FVP Calculator & LaTeX Reporting

## Architecture
- `src/FVPCalculator.jsx`: Upgraded to take 4 jumps instead of 3. Performs linear regression over 4 points, handles positive slopes gracefully, features season and training age selectors, renders LaTeX equations and results, and generates season-sensitive recommendations.
- Mathematical logic: Body weight + external weight load, flight time to jump height conversion, least-squares regression.
- Rendering: Renders SVG scatter plot showing actual data points, flags "profiling distortion" dynamically, and displays recommendations.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Analysis | Explorer reviews FVPCalculator.jsx, dependencies, math, UI, and details the plan | None | PLANNED |
| 2 | Implementation | Worker implements 4-jump UI, upgraded regression, positive slope handling, selectors, LaTeX equations, and recommendations | M3.1 | PLANNED |
| 3 | Review & Verification | Reviewer reviews code, checks correctness, layout, edge cases | M3.2 | PLANNED |
| 4 | Forensic Audit | Auditor runs forensics checks to verify genuine implementation | M3.3 | PLANNED |

## Interface Contracts
- `FVPCalculator.jsx` operates within the main dashboard layout. It must maintain all existing functionality (like player selection, saving profiles, or updating database records) while upgrading the mathematical and reporting engine.
