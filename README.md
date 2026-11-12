# VERTICAL LAB

A mobile-first jump-testing lab for coaches (Arabic first, English toggle).
It keeps a roster of athletes and their tests, and turns video timings or
manually entered numbers into jump height, power, reactive strength and
force-velocity profiles.

Live: <https://vertical-pi.vercel.app> (access code required).

## Screens

Four tabs (bottom bar on phones, side rail on desktop). The app reopens the
athlete you looked at last.

| Tab | What it does |
|---|---|
| Athletes | Search, coach / gender filters, sort, favourites; best CMJ, approach and RSI with level dots; add/edit athletes (incl. hPO), coaches, levels guide. |
| Test | Pick athlete → method: **Video** (mark take-off/landing, or touch-down for drop jumps; AI pose tracking; FPS, frame duration, landing correction, calibration, touch-height comparison and video export under "Advanced"), **Numbers** (any test incl. strength, RSI typed or computed), **F-V session** (3–5 loaded squat jumps on one day, live profile preview). |
| Rankings | Per test (CMJ arms / no arms, SJ, approach, RSI), filter by gender and coach. |
| Profile | Best CMJ + change vs last test, 14-day readiness, best RSI + contact time; EUR, reach & court margins, strength; F-V profile from the latest F-V session; progress chart; all jumps & power; editable history; share card; print. |

## Run it

```bash
npm ci
npm run dev        # http://localhost:5173
npm run dev:mock   # same UI with demo data (no access code, no database)
npm test           # vitest (unit + UI smoke tests)
npm run build      # type-check + production build into dist/
```

Environment (optional — defaults point to the lab project):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Stack: React 19, Vite, TypeScript, Tailwind CSS v4, Recharts, Supabase.
Deployed on Vercel from `main`.

### Data & access

Tables: `lab_players`, `lab_jump_measurements`, `lab_coaches`. Every request
sends the access code in the `x-lab-key` header and RLS on the `lab_*` tables
checks it with `public.lab_key_ok()`. Migrations live in `supabase/migrations`.

`test_type` values (see `src/lib/testTypes.ts`): `cmj_arms`, `cmj_no_arms`,
`sj_no_arms`, `sj_arms`, `approach`, `rsi` (drop jump), `power_clean`,
`full_squat`, `bench_press`.

## Formulas

All formulas live in **`src/lib/biomechanics.ts`** and are covered by
`tests/biomechanics.test.ts`. `g = 9.81 m/s²`. When a value cannot be computed
honestly (missing weight, implausible leg length, model not valid for the test)
the app shows **"—"** instead of estimating it.

| Quantity | Formula | Reference |
|---|---|---|
| Jump height (flight time) | h = g·tf² / 8 | Bosco et al. 1983, *Eur J Appl Physiol* 50:273 |
| Take-off velocity | v = √(2·g·h) | — |
| Peak power (main) | PP = 60.7·h(cm) + 45.3·BM − 2055 | Sayers et al. 1999, *MSSE* 31:572 |
| Peak power (secondary) | PP = 61.9·h(cm) + 36.0·BM + 1822 | Harman et al. 1991, *J Appl Sport Sci Res* 5:116 |
| Mean push-off force | F = m·g·(h / hPO + 1) | Samozino et al. 2008, *J Biomech* 41:2940 |
| Mean push-off velocity | v̄ = √(g·h / 2) | Samozino et al. 2008 |
| F-V profile | linear fit F(v); F0 = intercept, V0 = −F0/Sfv, Pmax = F0·V0/4 | Samozino et al. 2012, *MSSE* 44:313 |
| Optimal slope | Sfv,opt maximising h for the athlete's Pmax and hPO (closed form; verified numerically in tests) | Samozino et al. 2012 |
| FVimb | 100 · Sfv / Sfv,opt — 90–110 % balanced, 60–90 / 110–140 % moderate, beyond = large deficit | Samozino et al. 2014, *Int J Sports Med* 35:505 |
| RSI (drop jump) | h(m) / contact time(s) (or flight / contact) | Flanagan & Comyns 2008, *Strength Cond J* 30:32 |
| RSImod (CMJ, force plate only) | h / time-to-take-off | Ebben & Petushek 2010, *JSCR* 24:1983 |
| Leg stiffness | K = m·π·(tf + tc) / (tc²·((tf + tc)/π − tc/4)) | Dalleau et al. 2004, *Int J Sports Med* 25:170 |
| EUR | CMJ (no arms) / SJ (no arms) | McGuigan et al. 2006, *JSCR* 20:992 |
| Readiness | latest CMJ vs mean ± SD of CMJ tests in the previous 14 days (latest day excluded, ≥ 3 tests) | — |

The F-V profile is rejected (shown as "invalid profile" with the raw points)
when the slope is ≥ 0 or R² < 0.9.

**hPO (push-off distance)** = leg length (greater trochanter → toes, feet
extended) − height of the greater trochanter in a 90° squat, stored per player
in `lab_players.hpo_m`. When it is empty the app uses leg length × 0.45 and
shows an "estimated hPO" badge. Leg lengths are accepted as 0.6–1.3 m or
60–130 cm; anything else is treated as missing.

Sayers and Samozino describe standing jumps (SJ / CMJ); they are not applied to
approach jumps or drop jumps.

## Scripts

- `scripts/recompute-derived.ts` — dry-run recompute of derived columns from
  stored inputs; writes a CSV/markdown report and SQL, never writes to the DB.
- `scripts/generate-png-icons.js` — regenerates the PWA icons.
