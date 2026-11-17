import { Chess } from "chess.js";
import type { Move } from "chess.js";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export type Side = "w" | "b";
export type Result = "1-0" | "0-1" | "1/2-1/2";
export type Termination =
  | "checkmate" | "stalemate" | "insufficient_material" | "fivefold_repetition" | "seventyfive_move"
  | "threefold_repetition" | "fifty_move" | "timeout" | "resignation" | "agreement";
export interface Outcome { result: Result; termination: Termination }

export const TIME_CONTROLS = [
  { id: "1+0", initial: 60_000, increment: 0, kind: "Bullet" },
  { id: "2+1", initial: 120_000, increment: 1_000, kind: "Bullet" },
  { id: "3+2", initial: 180_000, increment: 2_000, kind: "Blitz" },
  { id: "5+0", initial: 300_000, increment: 0, kind: "Blitz" },
  { id: "10+0", initial: 600_000, increment: 0, kind: "Rapid" },
  { id: "10+5", initial: 600_000, increment: 5_000, kind: "Rapid" },
] as const;
export const findTimeControl = (id: unknown) => TIME_CONTROLS.find((t) => t.id === id);

export const AI_LEVELS = [
  { id: 1, label: "Beginner", elo: 1320, skill: 1 },
  { id: 2, label: "Casual", elo: 1600, skill: 5 },
  { id: 3, label: "Club", elo: 1900, skill: 9 },
  { id: 4, label: "Strong", elo: 2200, skill: 13 },
  { id: 5, label: "Expert", elo: 2600, skill: 17 },
  { id: 6, label: "Maximum", elo: null, skill: 20 },
] as const;

export const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
export const positionKey = (fen: string) => fen.split(" ").slice(0, 4).join(" ");
const halfmove = (c: Chess) => Number(c.fen().split(" ")[4]);

export function applyUci(chess: Chess, uci: string): Move {
  if (!UCI_RE.test(uci)) throw new Error("Malformed move");
  return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}

/** Replays a game from the start; keys[i] is the repetition key after ply i (keys[0] = start). */
export function replay(ucis: string[]) {
  const chess = new Chess();
  const keys = [positionKey(chess.fen())];
  for (const u of ucis) { applyUci(chess, u); keys.push(positionKey(chess.fen())); }
  return { chess, keys };
}

const repCount = (keys: string[]) => keys.filter((k) => k === keys[keys.length - 1]).length;
const draw = (termination: Termination): Outcome => ({ result: "1/2-1/2", termination });

/** Endings that happen automatically (no claim needed). Checkmate always takes precedence. */
export function automaticOutcome(chess: Chess, keys: string[] = [positionKey(chess.fen())]): Outcome | null {
  if (chess.isCheckmate()) {
    return { result: chess.turn() === "w" ? "0-1" : "1-0", termination: "checkmate" };
  }
  if (chess.isStalemate()) return draw("stalemate");
  if (chess.isInsufficientMaterial()) return draw("insufficient_material");
  if (repCount(keys) >= 5) return draw("fivefold_repetition");
  if (halfmove(chess) >= 150) return draw("seventyfive_move");
  return null;
}

/** Draws a player may claim (threefold repetition, 50-move rule). Not automatic. */
export function claimableDraw(chess: Chess, keys: string[] = [positionKey(chess.fen())]): Outcome | null {
  if (repCount(keys) >= 3) return draw("threefold_repetition");
  if (halfmove(chess) >= 100) return draw("fifty_move");
  return null;
}

/** Can `side` still checkmate with the material on the board (so a flag fall is a real win)? */
export function hasMatingMaterial(chess: Chess, side: Side): boolean {
  let strong = false, knights = 0, light = 0, dark = 0, oppPieces = 0, oppNP = 0;
  chess.board().forEach((row, r) => row.forEach((cell, c) => {
    if (!cell) return;
    if (cell.color === side) {
      if (cell.type === "p" || cell.type === "r" || cell.type === "q") strong = true;
      else if (cell.type === "n") knights++;
      else if (cell.type === "b") ((r + c) % 2 === 0 ? light++ : dark++);
    } else if (cell.type !== "k") {
      oppPieces++;
      if (cell.type === "n" || cell.type === "p") oppNP++;
    }
  }));
  if (strong || (light > 0 && dark > 0) || knights >= 2 || (knights >= 1 && light + dark >= 1)) return true;
  if (knights === 1) return oppPieces > 0;
  if (light + dark > 0) return oppNP > 0;
  return false;
}

export function timeoutOutcome(chess: Chess, flagged: Side): Outcome {
  const winner: Side = flagged === "w" ? "b" : "w";
  if (!hasMatingMaterial(chess, winner)) return draw("timeout");
  return { result: winner === "w" ? "1-0" : "0-1", termination: "timeout" };
}

export interface ClockState {
  white_ms: number; black_ms: number; increment_ms: number;
  turn: Side; turn_started_at: string | null; ply: number; status: string;
}
export const clockRunning = (g: Pick<ClockState, "status" | "ply" | "turn_started_at">) =>
  g.status === "active" && g.ply >= 2 && !!g.turn_started_at;

/** Visible remaining time for both sides at `nowMs` (client display; nothing is written per second). */
export function remainingAt(g: ClockState, nowMs: number) {
  let w = g.white_ms, b = g.black_ms;
  if (clockRunning(g)) {
    const el = Math.max(0, nowMs - Date.parse(g.turn_started_at!));
    if (g.turn === "w") w = Math.max(0, w - el); else b = Math.max(0, b - el);
  }
  return { w, b };
}

/** Server-side clock update for a move made now. Clocks start after each side's first move; no increment on those. */
export function clockAfterMove(g: ClockState, nowMs: number) {
  const running = g.ply >= 2 && !!g.turn_started_at;
  const elapsed = running ? Math.max(0, nowMs - Date.parse(g.turn_started_at!)) : 0;
  const key = g.turn === "w" ? "white_ms" : "black_ms";
  const left = g[key] - elapsed;
  const out = { white_ms: g.white_ms, black_ms: g.black_ms, flagged: false };
  if (left <= 0) { out[key] = 0; out.flagged = true; return out; }
  out[key] = left + (running ? g.increment_ms : 0);
  return out;
}

export function buildPgn(
  ucis: string[],
  m: { white: string; black: string; result: Result | "*"; tc: string; initial: number; inc: number; date: string; mode: string },
): string {
  const c = new Chess();
  for (const u of ucis) applyUci(c, u);
  c.setHeader("Event", m.mode === "ai" ? "Computer game" : "Online game");
  c.setHeader("Site", "Chess");
  c.setHeader("Date", m.date.slice(0, 10).replace(/-/g, "."));
  c.setHeader("White", m.white);
  c.setHeader("Black", m.black);
  c.setHeader("Result", m.result);
  c.setHeader("TimeControl", `${m.initial / 1000}+${m.inc / 1000}`);
  return c.pgn();
}
