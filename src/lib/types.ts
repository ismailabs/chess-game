import type { Result, Side, Termination } from "../../supabase/functions/game-action/rules.ts";
export type { Result, Side, Termination };

export interface Game {
  id: string;
  mode: "online" | "ai";
  status: "waiting" | "active" | "finished" | "aborted";
  white_id: string | null; black_id: string | null;
  white_name: string | null; black_name: string | null;
  white_avatar: string | null; black_avatar: string | null;
  ai_engine: string | null; ai_level: number | null; ai_color: Side | null;
  tc: string; initial_ms: number; increment_ms: number;
  white_ms: number; black_ms: number;
  turn: Side; turn_started_at: string | null;
  fen: string; pgn: string; ply: number;
  result: Result | null; termination: Termination | null;
  draw_offer_by: string | null; revision: number;
  created_at: string; started_at: string | null; updated_at: string; ended_at: string | null;
}

export interface MoveRow {
  game_id: string; ply: number; player_id: string | null;
  san: string; uci: string; fen: string; white_ms: number; black_ms: number; created_at?: string;
}
