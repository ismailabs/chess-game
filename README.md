# Chess

Play online (Supabase matchmaking + Realtime), play Stockfish (WASM in a Web Worker), and replay your games.
Stack: React + TypeScript + Vite, Tailwind 4, chess.js, react-chessboard, Supabase (Auth, Postgres, Realtime, one Edge Function).

## 1. Create the project (empty repo)
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install @supabase/supabase-js chess.js react-chessboard stockfish lucide-react
npm install -D tailwindcss @tailwindcss/vite vitest
```
Overwrite/add the files from this answer, delete the template leftovers (`src/App.css`, `src/assets`, `public/vite.svg`,
`tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`) and replace only the `scripts` block in `package.json`.

```bash
cp .env.example .env.local
npm run dev            # copies Stockfish into public/engine, then starts Vite on http://localhost:5173
npm run typecheck && npm test
npm run build          # output: dist
```

## 2. Database
Open Supabase → SQL Editor → paste all of `supabase/migrations/0001_chess.sql` → Run. It is idempotent, adds the
two tables to the existing `supabase_realtime` publication (it never drops or recreates it), and enables RLS.

## 3. Edge Function `game-action`
```bash
npx supabase login
npx supabase functions deploy game-action --project-ref fhlpgtkftfhqcgppfnud --no-verify-jwt
```
- JWT verification is done inside the function (`auth.getUser`) so it works with the new API-key system; hence `--no-verify-jwt`.
- Required secrets: **none**. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in hosted functions.
  Only if your project has the legacy service-role key disabled: `npx supabase secrets set SERVICE_KEY=<your secret key>` (server-side only).
- Never put a secret/service-role key in any `VITE_` variable.

## 4. Auth redirect URLs (Supabase → Authentication → URL Configuration → Redirect URLs)
Add only these (the Google provider itself is untouched):
- `http://localhost:5173/**`
- `https://chess.ismailstudio.my/**`
- `https://*-<team>.vercel.app/**` (for preview deployments)

## 5. Vercel
Framework preset: Vite. Build command `npm run build`, output directory `dist`. Environment variables (Production + Preview):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. `vercel.json` handles SPA routing.

## Notes
- **Engine**: Stockfish.js lite single-threaded WASM, copied from `node_modules/stockfish` by `scripts/copy-stockfish.mjs`, which also writes
  `public/engine/manifest.json`. The engine picker lists only what that manifest contains; the version shown is the installed one.
  No cross-origin-isolation headers are needed.
- **Licence**: Stockfish and Stockfish.js are GPL-3.0. Because the app distributes them, publish this repository's source under
  GPL-3.0-compatible terms and add the licence text (`curl -o LICENSE https://www.gnu.org/licenses/gpl-3.0.txt`). The footer links to the
  Stockfish and stockfish.js sources. This is not legal advice.
- **Clocks**: server stores remaining ms + `turn_started_at`; clients count down locally. Clocks start after each side's first move
  (no increment on those two moves). The function validates elapsed time on every move and timeout claim.
- **Draws**: threefold and 50-move are claimable (button appears when available); fivefold, 75-move, stalemate and insufficient material are automatic.
  A flag fall is a draw when the opponent cannot possibly mate. Draw offers are online-only.
- **Queue**: a waiting `games` row is the queue entry (unique per user); it is refreshed every 45 s and ignored by matchmaking after 2 min.
