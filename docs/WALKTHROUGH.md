# WALKTHROUGH.md — Chess by Ismail Studio v2 System Tour

A comprehensive walkthrough of the v2 upgrade of Chess by Ismail Studio (`https://chess.ismailstudio.my`).

---

## 1. Design System & Visual Polish
Built around **Material 3 Expressive** and **Apple Liquid Glass** design tokens, adhering to strict Design Laws:
- **Liquid Glass strictly on the functional layer**: Nav rail, mobile frosted tab bar, modals, bottom sheets, toasts.
- **Never on content**: Board bezels, bot cards, match tables, and profile stats use solid or lightly tinted standard surfaces (`#262522`, `#302e2b`).
- **Zero Theme Flash**: Pre-paint inline script in `index.html` resolves `localStorage` and `prefers-color-scheme` before the first frame renders.
- **Palette**:
  - Dark Theme: Surface `#262522`, Container `#302e2b`, Primary `#81b64c`, On-Surface `#eef0ea`.
  - Light Theme: Surface `#ffffff`, Container `#e9ede4`, Primary `#5d9a30`, On-Surface `#1b1f17`.
  - Contrast: All text/background pairs exceed WCAG 2.2 AA (4.5:1 text, 3:1 UI).
- **Typography**: Plus Jakarta Sans for headings and display, Inter for body copy, with tabular numerals for clocks, Elo ratings, and move notations.

---

## 2. Brand Identity & Share Assets
- **Original Minimal Geometric Pawn Mark**: Custom vector geometry designed from scratch. Zero knight emblems.
- **Adaptive SVG Favicons**: Renders light `#5d9a30` on light background, bright `#81b64c` on dark background. Includes `favicon.ico`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and `apple-touch-icon.png`.
- **1200x630 WhatsApp & Social Preview (`og-preview.png`)**: High-contrast card (22 KB, well below the 300 KB WhatsApp ceiling) featuring the brand pawn mark, live board vignette, headline "Play chess. Get better.", and stockfish credits.
- **Licensing**: Licensed under the GNU General Public License v3.0 (GPL-3.0), honoring Stockfish WASM copyleft terms.

---

## 3. Elo Rating Architecture & Backend
Integrated with Supabase database ref `fhlpgtkftfhqcgppfnud`:
- **Rating Parameters**: Starting rating 800, strict mathematical floor 100, 400-point opponent clamp.
- **K Schedule**:
  - Provisional ($< 30$ games): $K = 40$
  - Established ($\ge 30$ games): $K = 20$
  - High Master ($\ge 2400$): $K = 10$
- **Atomic Online Game Rating (`apply_online_game_rating`)**:
  - PostgreSQL transaction function locking game and both player profiles.
  - Pre-game ratings locked in history log.
  - Short games ($< 4$ plies) marked unrated to prevent rating abuse.
  - Executable strictly by `service_role`; public/anon access revoked.
- **Verified Bot Rating (`record-bot-game` Edge Function)**:
  - Replays client PGN server-side with `chess.js` to ensure legality and compute plies.
  - Anti-farming limits: Rated bot games capped at +100 gain/day and max 60 games/day. Minimum 10 plies.
  - Bot games use a scaled $K$-factor ($kScale = 0.5$).
- **Rating History Log**: Every rated match records timestamp, opponent label, rating before, rating after, and delta.

---

## 4. 14-Level Bot Ladder & Humanized Weakening Engine
A complete 14-bot ladder spanning from beginner to engine master:
1. **Pebble (250)**: Plays weighted random legal moves with tactical blunder injection.
2. **Mochi (400)**: Friendly, captures impulsively, misses hanging pieces.
3. **Timber (600)**: Likes pawns, develops slowly, occasionally drops pieces.
4. **Rusty (800)**: Casual player, understands basic checks, blunders under pressure.
5. **Biscuit (1000)**: Club junior, knows basic opening principles.
6. **Piper (1200)**: Solid club player, values king safety, defends solidly.
7. **Bramble (1400)**: Positional enthusiast, plays for center control.
8. **Finn (1600)**: Tactical attacker, calculates short 2-move combinations.
9. **Kite (1800)**: Aggressive attacking style, creates tactical threats.
10. **Sterling (2000)**: Strong candidate master, punishes positional errors.
11. **Valkyrie (2200)**: Master level, deep piece coordination and opening preparation.
12. **Garrison (2400)**: Grandmaster strength, ruthless endgame technique.
13. **Zenith (2600)**: Near-engine precision, deep positional calculation.
14. **Stockfish Max (3000+)**: Full Stockfish 18 WASM strength.
*Plus Adaptive Coach*: Dynamically matches player rating within $\pm 25$ points with encouraging coaching dialogues.

### Humanized Weakening Layer (`botEngine.ts`):
Stockfish native UCI Elo only throttles reliably down to ~1320. Sub-1300 bots utilize our custom weakening pipeline:
- Depth throttling (depth 1 to 4).
- MultiPV candidate extraction (captures top 4-8 candidate lines).
- Softmax probability distribution over centipawn evaluations with adjustable temperature.
- Blunder probability injection: Intentionally plays tactical mistakes at lower ratings to mimic real human beginners.

---

## 5. Responsive Board Feel & Audio Synthesizer
- **Board Interactions**: Pieces lift on pickup (1.1x scale + drop shadow), smooth spring transition on drop, full support for both click-click and drag-and-drop.
- **Isolated Clocks (`Clock.tsx`)**: The active clock runs on an isolated internal timer interval, ensuring ticking seconds **never trigger board or parent tree re-renders**. Under 10 seconds, turns crimson, pulses, and ticks softly.
- **Acoustic Wood Tap Synthesizer (`sounds.ts`)**: Pure Web Audio synthesis generating realistic wooden piece clicks via decaying bandpass-filtered noise transients (800Hz-1400Hz) and body resonance. Master volume control and instant mute toggle.
- **Tactile Haptics (`haptics.ts`)**: Native `navigator.vibrate` integration for moves, captures, checks, and game termination.
- **Pawn Promotion & Premoves**: Intuitive promotion modal with auto-queen preference toggle, and responsive blue-highlighted premove staging.
- **Result Dialog (`ResultDialog.tsx`)**: Liquid glass modal on desktop / bottom sheet on mobile featuring an animated count-up Elo delta (`1243 → 1258 +15`).

---

## 6. Screens & Workflows

### Landing Screen (`LoginShowcase.tsx`)
- Headline: "Play chess. Get better."
- Subtitle: "Challenge friends, beat bots at your level, and climb the ladder."
- Live interactive board playing Morphy's Opera Game (1858) move by move.
- Primary CTA "Continue with Google", secondary CTA "Try a bot first".
- Footer with GPL-3.0 license and Stockfish credits. Zero forbidden marketing copy.

### Signed-In Hub (`Home.tsx`)
- **Rating Card**: Large current rating, tier badge (Apprentice, Club, Expert, Master, Grandmaster), peak rating, provisional status, and pure SVG sparkline of the last 15 games.
- **Primary Actions**: Play online, Play a bot, Challenge a friend.
- **Active Game Resume Banner**: Instant 1-click continuation if an active match is in progress.
- **Recent Matches**: Outcome pills (+15 Win, -8 Loss), opponent, time control, relative date.

### Bots Ladder (`Bots.tsx`)
- Responsive cards (horizontal swipe on mobile, grid on desktop) for all 14 bots.
- Difficulty filter chips: All, Beginner, Casual, Club, Advanced, Master, Engine.
- "Recommended For You" badge based on current user rating.
- Side selector (White, Random, Black) and Time Control picker.

### Leaderboard (`Leaderboard.tsx`)
- Pinned "Your Standing" card highlighting current user rank, rating, and win rate.
- Top 100 global players with podium styling: #1 Gold, #2 Silver, #3 Bronze.
- Live search by username or display name.
- Direct links to public profile pages (`/u/:username`).

### Player Profile (`Profile.tsx`)
- Supports `/profile` (current user) and `/u/:username` (public views).
- Inline SVG rating progress chart with hovering data points.
- Comprehensive statistics: Rating, Peak, Win Rate, Wins, Draws, Losses, Total Games.
- Inline profile editor: Change display name, username (with 14-day lock guard), bio, and country.
- Filterable match history list (All, Online, Bots) with Elo deltas and PGN copy.

### Settings (`Settings.tsx`)
- **Appearance**: System / Light / Dark theme selector, Green / Slate / Walnut board themes with mini preview swatches.
- **Audio & Haptics**: Master volume slider (0-100%) with live preview sound, mute toggle, tactile vibration toggle.
- **Assists**: Legal move hints toggle, premoves toggle, auto-queen toggle, coordinates toggle.
- **Account & License**: Edit profile shortcut, player ID, sign out, GPL-3.0 details.

---

## 7. Performance & PWA Architecture
- **Strict Bundle Budget**: Initial JavaScript gzip size is **150 kB** (well under the 180 kB ceiling).
- **Code Splitting**: All routes lazy-loaded via `React.lazy` with Suspense skeletons.
- **Vendor Splitting**:
  - `vendor-react` (React, React DOM)
  - `vendor-supabase` (@supabase/supabase-js)
  - `vendor-chess` (chess.js, react-chessboard)
  - `vendor-icons` (lucide-react)
- **Stockfish WASM Isolation**: The ~1.5 MB engine binary is strictly lazy-loaded on demand when a bot match begins, never blocking app startup.
- **PWA Service Worker (`sw.js`)**: Caches the app shell and pre-caches the Stockfish engine files, allowing users to play offline bot matches with zero internet connectivity.
- **Security & Caching Headers (`vercel.json`)**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - Long-term immutable caching for `/assets/*` and engine files.
