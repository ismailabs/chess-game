import type { Game, Termination } from "./types";

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function fmtClock(ms: number) {
  if (ms < 10_000) return (Math.max(0, ms) / 1000).toFixed(1);
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export const fmtDate = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

const TERM: Record<Termination, string> = {
  checkmate: "checkmate", stalemate: "stalemate", insufficient_material: "insufficient material",
  fivefold_repetition: "fivefold repetition", seventyfive_move: "the 75-move rule",
  threefold_repetition: "threefold repetition (claimed)", fifty_move: "the 50-move rule (claimed)",
  timeout: "timeout", resignation: "resignation", agreement: "agreement",
};

export function resultText(g: Game): string {
  if (!g.result) return "";
  if (g.result === "1/2-1/2") {
    return g.termination === "timeout"
      ? "Draw: time ran out, but the opponent cannot checkmate with the remaining material"
      : `Draw by ${g.termination ? TERM[g.termination] : "agreement"}`;
  }
  return `${g.result === "1-0" ? "White" : "Black"} wins by ${g.termination ? TERM[g.termination] : "result"}`;
}
