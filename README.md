# Chess by Ismail Studio (v2)

Play real-time chess with friends, challenge a 14-level bot ladder powered by Stockfish WASM, and climb the global Elo rating leaderboard.

Live at: **https://chess.ismailstudio.my**

---

## Features

- **Material 3 Expressive + Apple Liquid Glass**: Refined glass functional layer (navigation rail, mobile tab bar, action docks, result sheets) paired with solid content surfaces and zero-flash theme switching (System / Light / Dark).
- **Tactile Board & Game Feel**: Pieces lift on drag (1.1x scale + drop shadow), smooth spring on release, legal move hints, radial crimson check glow, isolated non-re-rendering clocks, premove staging, and native haptic feedback.
- **Synthesized Web Audio**: Realistic wooden piece clicks generated via physical acoustic noise transients and resonant filters with a master volume slider.
- **Elo Rating System**: Single unified rating (starting at 800, mathematical floor at 100, 400-point clamp, K schedule 40/20/10) with anti-farming guards and complete rating history tracking.
- **14-Level Bot Ladder**:
  - Pebble (250) to Zenith (2600) + Stockfish Max (3000+) + Adaptive Coach.
  - Custom humanized weakening layer (MultiPV candidate selection, softmax centipawn loss temperature, and tactical blunder injection).
  - Server-verified bot rating submission via `record-bot-game` Edge Function.
- **Comprehensive Screens**:
  - Home: Play hub with rating card, SVG sparkline, resume game banner, and recent match history.
  - Bots: 14 bot cards with difficulty filters and recommended bot badge.
  - Leaderboard: Top 100 global players with podium styling and pinned personal rank.
  - Profile: Public (`/u/:username`) and private (`/profile`) views with SVG rating progress chart, comprehensive stats, and match history.
  - Settings: Board colors (Green, Slate, Walnut), theme toggles, audio volume, haptics, and gameplay assists.
- **Performance & PWA**:
  - Code-split routes with lazy-loaded Stockfish WASM.
  - Initial JS bundle strictly **< 180 KB gzip** (~150 KB gzip).
  - Offline bot play supported via PWA Service Worker (`/sw.js`).
  - Security headers and immutable asset caching via `vercel.json`.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS 4, Lucide React, chess.js, react-chessboard
- **Backend & Database**: Supabase (PostgreSQL 15, Auth, Realtime presence, Storage)
- **Serverless**: Deno / Supabase Edge Functions (`game-action`, `record-bot-game`)
- **Chess Engine**: Stockfish 18 lite WASM (single-threaded Web Worker)
- **License**: GNU General Public License v3.0 (GPL-3.0)

---

## Local Development

### 1. Prerequisites
- Node.js 20+
- npm 10+

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/ismailabs/chess-game.git
cd chess-game

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### 3. Development Server
```bash
# Pre-bundles Stockfish WASM into public/engine and starts Vite
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Tests & Quality Gates
```bash
# Typecheck TypeScript definitions
npm run typecheck

# Run Vitest test suite (rating math, rules, bots ladder)
npm test

# Production build and chunk analysis
npm run build
```

---

## Database Migrations & Edge Functions

### Schema Migrations (`supabase/migrations/`)
- `0001_chess.sql`: Core multiplayer matches, clocks, and moves table.
- `0002_friends_and_invites.sql`: Friends system, social invites, and presence tracking.
- `0003_profiles_elo.sql`: Elo rating system, anti-forgery profile triggers, atomic `apply_online_game_rating`, `rating_history`, `bot_games`, and `leaderboard` RPC.

### Edge Functions (`supabase/functions/`)
- `game-action`: Handles online matchmaking, move validation, flag timeouts, draw claims, and rating application.
- `record-bot-game`: Replays and verifies completed bot games, computes rating delta, and enforces anti-farming caps.

---

## License

This project is free and open-source software licensed under the **GNU General Public License v3.0 (GPL-3.0)**. See [LICENSE](LICENSE) for details. Stockfish is copyright the Stockfish developers and licensed under GPL-3.0.
