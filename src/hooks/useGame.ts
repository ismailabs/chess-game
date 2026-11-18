import { useCallback, useEffect, useState } from "react";
import { act, type ActionResult } from "../lib/api";
import { isGuestGameId } from "../lib/guestGame";
import { errMsg } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { Game, MoveRow } from "../lib/types";

export function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    addEventListener("online", a); addEventListener("offline", b);
    return () => { removeEventListener("online", a); removeEventListener("offline", b); };
  }, []);
  return on;
}

const pick = (cur: Game | null, next: Game) => (!cur || next.revision >= cur.revision ? next : cur);
export function mergeMoves(a: MoveRow[], b: MoveRow[]): MoveRow[] {
  const m = new Map<number, MoveRow>();
  for (const x of [...a, ...b]) m.set(x.ply, x);
  return [...m.values()].sort((x, y) => x.ply - y.ply);
}

/** Authoritative game + full move history, kept live through Realtime and re-synced on reconnect. */
export function useGame(id: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const online = useOnline();

  const sync = useCallback(async () => {
    try {
      const r = await act({ action: "sync", gameId: id });
      setGame((g) => pick(g, r.game));
      setMoves((ms) => mergeMoves(ms, r.moves ?? []));
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const apply = useCallback((r: ActionResult) => {
    setGame((g) => pick(g, r.game));
    if (r.move) setMoves((ms) => mergeMoves(ms, [r.move!]));
  }, []);

  useEffect(() => { if (online) sync(); }, [online, sync]);

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sync]);

  useEffect(() => {
    if (isGuestGameId(id)) {
      setLive("live");
      sync();
      return;
    }
    const ch = supabase.channel(`game:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` },
        (p) => setGame((g) => pick(g, p.new as unknown as Game)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_moves", filter: `game_id=eq.${id}` },
        (p) => setMoves((ms) => mergeMoves(ms, [p.new as unknown as MoveRow])))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setLive("live"); sync(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setLive("offline");
      });
    return () => { supabase.removeChannel(ch); };
  }, [id, sync]);

  // Safety net: poll lightly while a game is active (faster if Realtime is down).
  useEffect(() => {
    if (isGuestGameId(id) || game?.status !== "active") return;
    const t = setInterval(() => { if (document.visibilityState === "visible") sync(); }, live === "live" ? 30_000 : 8_000);
    return () => clearInterval(t);
  }, [id, game?.status, live, sync]);

  // If the move list is behind the game row, reload the full history.
  useEffect(() => {
    if (game && moves.length < game.ply) { const t = setTimeout(sync, 700); return () => clearTimeout(t); }
  }, [game?.ply, moves.length, sync]);

  return { game, moves, loading, error, live, online, sync, apply };
}
