## 2026-06-07T16:45:27Z
You are the E2E Infra Setup Worker. Your working directory is C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\worker_e2e_setup.
Your task is to set up the headless E2E testing infrastructure.
Please perform the following steps:
1. Update `package.json` to include the following devDependencies:
   - "vitest": "^3.0.0"
   - "jsdom": "^26.0.0"
   - "@testing-library/react": "^16.1.0"
   - "@testing-library/jest-dom": "^6.6.3"
   - "@testing-library/user-event": "^14.6.1"
   Also add scripts:
   - "test:e2e": "vitest run"
   - "test:e2e:watch": "vitest"
2. Run `npm install` to install these dependencies. If there are peer dependency warnings, resolve them.
3. Implement the Vitest configuration file `vitest.config.ts` in the root of the project.
4. Implement the test setup file `tests/setup.ts` containing the global mocks for JSDOM, MediaPipe, Recharts, ResizeObserver, URL methods, HTMLMediaElement, and requestVideoFrameCallback as proposed in `C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\explorer_e2e_setup\discovery.md`.
5. Implement the stateful, in-memory local Supabase client mock at `tests/mocks/supabaseClient.ts` as proposed in `discovery.md`.
6. Write a simple sanity/verification test file (e.g. `tests/e2e/sanity.test.tsx`) that mounts `<App />` and checks that the application renders without crashing.
7. Run the test command `npm run test:e2e` to verify that the environment is fully working and the sanity test passes.
8. Document all steps taken, the commands run, and the outputs in a handoff report at `C:\Users\memob\.gemini\antigravity\scratch\The-Lab\.agents\worker_e2e_setup\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
