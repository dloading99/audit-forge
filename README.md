<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Audit Forge

A full-stack web audit tool that crawls a site, runs on-server analyzers (SEO, performance, accessibility, content, UX/design), and surfaces results through a React + Vite frontend.

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies: `npm install`
2. (Optional) Add a Google PageSpeed Insights API key to `.env` as `PAGESPEED_API_KEY=<your-key>` for live performance scores.
3. Start the app: `npm run dev`
   - Runs the Vite frontend and Express backend together (frontend proxies `/api`).
4. Open http://localhost:5173 and start a new audit by entering a URL.

## API
- `POST /api/audits` `{ url: string, maxPages?: number }` – create and run an audit.
- `GET /api/audits` – list audits.
- `GET /api/audits/:id` – fetch a completed audit with per-page results.

## Notes
- Crawling stays on the same domain and is capped by default to 20 pages / depth 2.
- If no PageSpeed API key is provided, performance issues are reported with limited data and a warning.
- Audit data is stored on disk in `data/audits.json` for simplicity.
