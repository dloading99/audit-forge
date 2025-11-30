# Audit Forge Code Review Report

## Application Purpose
Audit Forge is a full-stack web auditing tool that crawls a target site, runs heuristic analyzers for SEO, accessibility, performance, content, and UX, and surfaces the results through a React dashboard. Users can trigger new audits, monitor status, and review per-page issues and generated Markdown reports.

## Architecture Snapshot
- **Frontend:** React (hash-based navigation) with Tailwind utility classes, custom components (`Layout`, `ScoreGauge`), and feature pages (`Dashboard`, `AuditDetail`).
- **Backend:** Express API that stores audits in a JSON file (`server/storage.ts`), triggers crawl + analysis orchestration (`server/runner.ts`), and exposes REST endpoints under `/api/audits`.
- **Analysis Pipeline:** `crawler.ts` fetches internal pages, `analyzers.ts` computes heuristic issue lists/scores, `scoring.ts` aggregates scores/issue summaries, and `runner.ts` optionally requests an AI-generated report.

## Issues Found & Fixes Implemented
1. **Undefined crypto usage (TypeScript/runtime failure).** `storage.ts` and `runner.ts` used `crypto.randomUUID()` without importing `crypto`, which breaks `tsc` and runtime in Node ESM. Added explicit `randomUUID` import and usage in both modules.
2. **Incorrect Gemini client + env var mismatch.** AI report generation referenced a non-existent `@google/genai` package and `process.env.API_KEY`, diverging from the documented `GEMINI_API_KEY`. Switched to the published `@google/generative-ai` client, used the correct env variable, and updated generation flow accordingly.

## Outstanding Risks / Follow-ups
- **Dependency install blocked:** Installing `@google/generative-ai` from npm fails with HTTP 403 in this environment. The new dependency is declared, but you may need to mirror/whitelist the package or vend it manually before running `npm install` or `npm run build`.
- **External API requirement:** Gemini report generation still depends on a valid `GEMINI_API_KEY`; without it, the code falls back to a simple static report.

## Recommendations
- Re-run `npm install` in an environment with npm registry access to pull the Gemini SDK and lock dependencies.
- Add automated tests (unit/integration) for the crawler and analyzers to prevent regressions and to validate scoring/issue aggregation logic.
- Consider robust routing (e.g., React Router) and error handling for fetch failures on the client.
