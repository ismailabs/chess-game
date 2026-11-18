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

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string;
  description?: string;
  country?: string | null;
  theme_pref?: "system" | "light" | "dark";
  rating?: number;
  peak_rating?: number;
  games_played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  username_changed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  updated_at: string;
  friend_profile?: Profile;
}

export interface GameInvite {
  id: string;
  sender_id: string;
  receiver_id: string;
  tc: string;
  initial_ms: number;
  increment_ms: number;
  color_preference: "w" | "b" | "random";
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  game_id?: string | null;
  created_at: string;
  expires_at: string;
  sender_profile?: Profile;
}

export type OnlineStatus = "online" | "in-game" | "offline";

export interface UserPresence {
  user_id: string;
  status: "online" | "in-game";
  game_id?: string | null;
  updated_at?: string;
}
