import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Game, MoveRow } from "./types";
import { handleGuestAction, isGuestGameId } from "./guestGame";

export class ApiError extends Error {
  constructor(message: string, public code?: string, public status?: number) { super(message); }
}
export interface ActionResult { game: Game; move?: MoveRow; moves?: MoveRow[]; flagged?: boolean; serverNow: number }

let offset = 0; // server clock minus local clock, refreshed on every response
export const serverNow = () => Date.now() + offset;

export async function act(body: Record<string, unknown>): Promise<ActionResult> {
  // Offline / Guest Bot Game handling
  if (body.guest === true || isGuestGameId(body.gameId)) {
    return handleGuestAction(body);
  }

  const { data, error } = await supabase.functions.invoke("game-action", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const j = await error.context.json().catch(() => null);
      throw new ApiError(j?.error ?? "Request failed", j?.code, error.context.status);
    }
    throw new ApiError("Network problem. Check your connection.", "network");
  }
  const r = data as ActionResult;
  if (typeof r?.serverNow === "number") offset = r.serverNow - Date.now();
  return r;
}
