# RATING.md — Elo Rating System & Calibration Spec

Comprehensive specification of the unified Elo rating system, anti-abuse trust model, and bot calibration.

---

## 1. System Constants & Mathematical Model

Unified rating system across both online multiplayer and rated bot games.

### 1.1 Constants
- `START_RATING = 800` (Beginner-friendly entry point)
- `RATING_FLOOR = 100` (Rating can never fall below 100)
- `PROVISIONAL_THRESHOLD = 20` (Displays `?` badge when `games_played < 20`)

### 1.2 K-Factor Schedule
- `K = 40` when `games_played < 30` (Rapid initial convergence)
- `K = 20` when `games_played >= 30` and `rating < 2400` (Standard competitive play)
- `K = 10` when `rating >= 2400` (Grandmaster stability)

### 1.3 400-Point Opponent Clamping
To prevent extreme rating swings against much higher or lower opponents, the opponent's rating is clamped to within 400 points of the player's rating before computing expected score:
$$\text{clampedOpponent} = \max(\text{rating} - 400, \min(\text{rating} + 400, \text{opponentRating}))$$

### 1.4 Expected Score Formula
$$E = \frac{1}{1 + 10^{(\text{clampedOpponent} - \text{rating}) / 400}}$$

### 1.5 Rating Delta Formula
$$\Delta = \text{round}(K \times k_{\text{scale}} \times (\text{score} - E))$$
- $\text{score} \in \{1 \text{ (win)}, 0.5 \text{ (draw)}, 0 \text{ (loss)}\}$
- $k_{\text{scale}} = 1.0$ for online PvP
- $k_{\text{scale}} = 0.5$ for rated bot matches

New Rating:
$$\text{New Rating} = \max(\text{RATING\_FLOOR}, \text{rating} + \Delta)$$

---

## 2. Benchmark Unit Test Values

| Scenario | Player Rating | Opponent | Games | Score | $k_{\text{scale}}$ | Expected $\Delta$ |
|---|---|---|---|---|---|---|
| Equal Club Match | 1200 | 1200 | 35 | Win (1) | 1.0 | **+10** |
| Equal Club Match | 1200 | 1200 | 35 | Draw (0.5) | 1.0 | **0** |
| Equal Club Match | 1200 | 1200 | 35 | Loss (0) | 1.0 | **-10** |
| Beginner Upset | 800 | 1200 | 10 | Win (1) | 1.0 | **+36** |
| Beginner Upset vs Bot | 800 | 1200 | 10 | Win (1) | 0.5 | **+18** |
| Extreme Opponent Clamp | 1200 | 1900 | 40 | Win (1) | 1.0 | Clamped to 1600 before calculation |
| Rating Floor Clamp | 105 | 1500 | 50 | Loss (0) | 1.0 | Clamped to **100** |

---

## 3. Bot Anti-Farming & Trust Model

Bot games run client-side in Web Workers for instant latency. To prevent tampering:
1. **Server-Side Replay:** On game completion, the browser submits the complete PGN to the `record-bot-game` Edge Function.
2. **Move Legality & Outcome Verification:** `chess.js` replays every move from the start FEN. If any move is illegal or the result does not match the final board state, the submission is rejected.
3. **Rating Eligibility Criteria:**
   - Minimum 10 plies (5 full moves).
   - No hints or takebacks were requested.
   - Game ended normally (checkmate, resignation, timeout, or valid draw).
4. **Anti-Exploit Limits:**
   - **No Rating Gain:** If player rating is $\ge \text{bot rating} + 400$, winning awards **+0 Elo** (losses still deduct points).
   - **Daily Gain Cap:** Maximum **+100 Elo** gain per 24-hour rolling window from bot games.
   - **Daily Volume Cap:** Maximum **60 rated bot games** per day.

---

## 4. Bot Ladder & Starting Calibration (14 Levels)

| Level | Bot Name | Target Elo | Engine Configuration | Blunder % | Style & Personality |
|---|---|---|---|---|---|
| 1 | Pebble | 250 | Weighted random legal moves | n/a | Chaotic beginner, loves immediate captures |
| 2 | Mochi | 400 | Skill 0, Depth 1, MultiPV 5, Temp high | 35% | Plays fast, forgets piece protection |
| 3 | Sprout | 600 | Skill 0, Depth 1, MultiPV 4, Temp med | 25% | Developing basic opening concepts |
| 4 | Biscuit | 800 | Skill 1, Depth 2, MultiPV 4 | 18% | Friendly, notices 1-move tactical threats |
| 5 | Juniper | 1000 | Skill 3, Depth 3, MultiPV 3 | 12% | Develops pieces soundly, misses subtle tactics |
| 6 | Ollie | 1200 | Skill 6, Depth 4, MultiPV 3 | 8% | Solid club beginner |
| 7 | Marlow | 1400 | UCI_Elo 1400, movetime 300ms | 0% | Positional, steady pawn play |
| 8 | Sasha | 1600 | UCI_Elo 1600, movetime 400ms | 0% | Sharp tactical attacker |
| 9 | Kai | 1800 | UCI_Elo 1800, movetime 500ms | 0% | Aggressive king hunt, open files |
| 10 | Vesper | 2000 | UCI_Elo 2000, movetime 700ms | 0% | Prophylactic, patient defensive maestro |
| 11 | Atlas | 2200 | UCI_Elo 2200, movetime 900ms | 0% | Endgame technician |
| 12 | Ember | 2400 | UCI_Elo 2400, movetime 1200ms | 0% | Deep tactical calculation |
| 13 | Titan | 2700 | UCI_Elo 2700, movetime 1500ms | 0% | Near-grandmaster evaluation |
| 14 | Zenith | 3000+ | Full Stockfish 18, movetime 2000ms | 0% | Maximum engine evaluation |

*Headless calibration via `scripts/calibrate-bots.mjs` will be executed and recorded in Phase 4.*
