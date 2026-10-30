# 投资命题验证器 Implementation Plan

Goal: deploy a traceable Chinese A-share thesis research workbench, with honest data gaps and deterministic fallback.
Architecture: Next.js client workbench → validated API → DataProvider adapters → evidence engine → guarded structured AI output. Research tasks remain local to the browser.
Tech stack: Next.js App Router, TypeScript, Vercel AI SDK/Gateway, Zod, Vitest, Playwright.

1. Probe each real endpoint from shell; retain probe results. Test number provenance, decomposition and provider failures first.
2. Implement typed evidence records (raw payload, normalized values, period, source, fetchedAt); concurrent isolated provider calls. No sample financial numbers.
3. Clarify company/period/metric, revise thesis, map questions to concrete requests. Use conservative rules when model unavailable.
4. Render three columns, conflict/flip panels, source drawer, follow-up, side-by-side comparison and local task persistence/export/import.
5. Run Vitest, typecheck, build and Playwright; deploy production as explicitly authorized. Verify live API and browser flow.
6. Record 90–150 second live walkthrough with captions and screenshots. Document actual limitations, AI verification and final status.

Scope choices: bounded company selector with three examples plus supported A-share code; no PDF-body extraction, paid data contract invention, authentication, DB, trade actions, target prices, Git operations or financial sample fixtures in production. No additional approval gate: user explicitly requested completion in this run.
