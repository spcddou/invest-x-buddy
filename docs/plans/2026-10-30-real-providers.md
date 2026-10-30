# Real provider continuation plan

Goal: make authorized Fuyao REST and iFinD MCP data visible as primary provider evidence without conflating metrics.
Architecture: keep typed registry and existing evidence pipeline; select official endpoint per tool; retain public sources as labeled cross-check/fallback. Preserve original fields and explicit conflicts. No git operations.

1. Probe three demo stocks with environment loaded only in process; inspect official envelope and MCP content. Check Gateway OIDC after env pull and available model; stop at confirmed owner billing gate.
2. Add failing regression tests for official field mapping, timestamps, missing data, mismatched tickers, cross-provider conflicts and primary routing.
3. Implement tool-specific Fuyao requests, default official iFinD news endpoint, bounded MCP calls and evidence extraction. Keep fallback and independent evidence; no implicit financial field substitution.
4. Run unit/type/build checks and local real calls through tool registry. Record truncated probe summaries.
5. Deploy production; run eval and Playwright. Refresh screenshots/video because evidence and labels change materially.
6. Update README, AI_LOG, TESTING, FINAL_STATUS and provider specs. Scan for secret-like content without printing matching values; verify ignore policy. No extra defenses or account changes.
