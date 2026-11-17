// Single trusted endpoint. Authenticates the caller, validates everything with chess.js, and commits via
// compare-and-swap on `revision`. The browser never writes game state directly.
import { createClient } from "@supabase/supabase-js";
import {
  AI_LEVELS, applyUci, automaticOutcome, buildPgn, claimableDraw, clockAfterMove, findTimeControl,
  positionKey, replay, timeoutOutcome, UCI_RE, type Outcome, type Side,
} from "./rules.ts";

type Row = Record<string, any>;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SERVICE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

const displayName = (u: any) =>
  String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split("@")[0] ?? "Player").slice(0, 40);
const avatarOf = (u: any) => {
  const a = u.user_metadata?.avatar_url ?? u.user_metadata?.picture;
  return typeof a === "string" && a.startsWith("https://") ? a.slice(0, 500) : null;
};

async function getGame(id: unknown): Promise<Row> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "Bad game id");
  const { data, error } = await admin.from("games").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Game not found");
  return data;
}
function mySide(g: Row, uid: string): Side {
  if (g.white_id === uid) return "w";
  if (g.black_id === uid) return "b";
  throw new HttpError(403, "Not your game");
}
async function fetchMoves(id: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("game_moves").select("*").eq("game_id", id).order("ply").range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
async function ucisOf(g: Row): Promise<string[]> {
  const ucis = (await fetchMoves(g.id)).map((m) => m.uci as string);
  if (ucis.length !== g.ply) throw new HttpError(409, "Game is out of sync, try again", "stale");
  return ucis;
}

function finishPatch(g: Row, ucis: string[], out: Outcome, extra: Row = {}): Row {
  return {
    status: "finished", result: out.result, termination: out.termination, ended_at: new Date().toISOString(),
    draw_offer_by: null,
    pgn: buildPgn(ucis, {
      white: g.white_name ?? "White", black: g.black_name ?? "Black", result: out.result, tc: g.tc,
      initial: g.initial_ms, inc: g.increment_ms, date: g.created_at, mode: g.mode,
    }),
    ...extra,
  };
}

async function casUpdate(g: Row, patch: Row): Promise<Row | null> {
  const { data, error } = await admin.from("games")
    .update({ ...patch, revision: g.revision + 1, updated_at: new Date().toISOString() })
    .eq("id", g.id).eq("revision", g.revision).eq("status", "active")
    .select().maybeSingle();
  if (error) throw error;
  return data;
}
async function mutate(gameId: unknown, uid: string, fn: (g: Row, me: Side) => Promise<Row> | Row): Promise<Row> {
  for (let i = 0; i < 4; i++) {
    const g = await getGame(gameId);
    const me = mySide(g, uid);
    if (g.status !== "active") throw new HttpError(409, "Game is not active", "not_active");
    const row = await casUpdate(g, await fn(g, me));
    if (row) return row;
  }
  throw new HttpError(409, "The game changed, please retry", "stale");
}

async function doMove(user: any, b: Row): Promise<Row> {
  const g = await getGame(b.gameId);
  const me = mySide(g, user.id);
  if (g.status !== "active") throw new HttpError(409, "Game is over", "not_active");
  const asAi = b.ai === true;
  if (asAi && g.mode !== "ai") throw new HttpError(400, "Not an engine game");
  const mover: Side = asAi ? g.ai_color : me;
  if (!asAi && g.mode === "ai" && mover === g.ai_color) throw new HttpError(403, "Not your side");
  if (g.turn !== mover) throw new HttpError(409, "It is not your turn", "not_your_turn");
  if (b.expectedRevision !== g.revision) throw new HttpError(409, "Position changed, reloading", "stale");

  const ucis = await ucisOf(g);
  const { chess, keys } = replay(ucis);
  const clk = clockAfterMove(g as any, Date.now());
  if (clk.flagged) {
    const out = timeoutOutcome(chess, mover);
    const row = await casUpdate(g, finishPatch(g, ucis, out, { [mover === "w" ? "white_ms" : "black_ms"]: 0 }));
    if (!row) throw new HttpError(409, "Position changed, reloading", "stale");
    return { game: row, flagged: true };
  }
  if (typeof b.uci !== "string" || !UCI_RE.test(b.uci)) throw new HttpError(400, "Malformed move");
  let mv;
  try { mv = applyUci(chess, b.uci); } catch { throw new HttpError(400, "Illegal move", "illegal"); }
  const uci = `${mv.from}${mv.to}${mv.promotion ?? ""}`;
  keys.push(positionKey(chess.fen()));
  const out = automaticOutcome(chess, keys);
  const pgn = buildPgn([...ucis, uci], {
    white: g.white_name ?? "White", black: g.black_name ?? "Black", result: out?.result ?? "*", tc: g.tc,
    initial: g.initial_ms, inc: g.increment_ms, date: g.created_at, mode: g.mode,
  });
  const fen = chess.fen();
  const { data, error } = await admin.rpc("commit_move", {
    p_game: g.id, p_expected_rev: g.revision, p_ply: g.ply + 1, p_player: asAi ? null : user.id,
    p_san: mv.san, p_uci: uci, p_fen: fen, p_pgn: pgn, p_white_ms: clk.white_ms, p_black_ms: clk.black_ms,
    p_turn: chess.turn(), p_result: out?.result ?? null, p_termination: out?.termination ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new HttpError(409, "Position changed, reloading", "stale");
  return {
    game: row,
    move: { game_id: g.id, ply: g.ply + 1, player_id: asAi ? null : user.id, san: mv.san, uci, fen,
      white_ms: clk.white_ms, black_ms: clk.black_ms },
  };
}

async function handle(user: any, b: Row): Promise<Row> {
  switch (b.action) {
    case "queue": {
      const tc = findTimeControl(b.tc);
      if (!tc) throw new HttpError(400, "Unknown time control");
      const { data, error } = await admin.rpc("queue_game", {
        p_user: user.id, p_name: displayName(user), p_avatar: avatarOf(user),
        p_tc: tc.id, p_initial: tc.initial, p_inc: tc.increment,
      });
      if (error) {
        if (error.code === "23505") throw new HttpError(409, "You are already in the queue", "duplicate");
        throw error;
      }
      return { game: Array.isArray(data) ? data[0] : data };
    }
    case "touch_queue": {
      const { data, error } = await admin.from("games").update({ updated_at: new Date().toISOString() })
        .eq("id", b.gameId).eq("white_id", user.id).eq("status", "waiting").select().maybeSingle();
      if (error) throw error;
      return { game: data ?? await getGame(b.gameId) };
    }
    case "cancel_queue": {
      const { data, error } = await admin.from("games").delete()
        .eq("id", b.gameId).eq("white_id", user.id).eq("status", "waiting").eq("mode", "online").select().maybeSingle();
      if (error) throw error;
      if (data) return { game: { ...data, status: "aborted" } };
      const g = await getGame(b.gameId);
      mySide(g, user.id);
      return { game: g };
    }
    case "new_ai": {
      const tc = findTimeControl(b.tc);
      const level = AI_LEVELS.find((l) => l.id === b.level);
      const human: Side | null = b.humanColor === "w" || b.humanColor === "b" ? b.humanColor : null;
      if (!tc || !level || !human) throw new HttpError(400, "Invalid game settings");
      if (typeof b.engine !== "string" || !/^[a-z0-9.-]{1,64}$/.test(b.engine)) throw new HttpError(400, "Invalid engine");
      const aiName = String(b.aiName ?? "Stockfish").slice(0, 60);
      const now = new Date().toISOString();
      const { data, error } = await admin.from("games").insert({
        mode: "ai", status: "active", ai_engine: b.engine, ai_level: level.id, ai_color: human === "w" ? "b" : "w",
        white_id: human === "w" ? user.id : null, black_id: human === "b" ? user.id : null,
        white_name: human === "w" ? displayName(user) : aiName, black_name: human === "b" ? displayName(user) : aiName,
        white_avatar: human === "w" ? avatarOf(user) : null, black_avatar: human === "b" ? avatarOf(user) : null,
        tc: tc.id, initial_ms: tc.initial, increment_ms: tc.increment, white_ms: tc.initial, black_ms: tc.initial,
        started_at: now, turn_started_at: now,
      }).select().single();
      if (error) throw error;
      return { game: data };
    }
    case "sync": {
      const g = await getGame(b.gameId);
      mySide(g, user.id);
      return { game: g, moves: await fetchMoves(g.id) };
    }
    case "move": return await doMove(user, b);
    case "resign":
      return { game: await mutate(b.gameId, user.id, async (g, me) =>
        finishPatch(g, await ucisOf(g), { result: me === "w" ? "0-1" : "1-0", termination: "resignation" })) };
    case "offer_draw":
      return { game: await mutate(b.gameId, user.id, async (g) => {
        if (g.mode !== "online") throw new HttpError(400, "Draw offers are for online games");
        if (g.draw_offer_by && g.draw_offer_by !== user.id) {
          return finishPatch(g, await ucisOf(g), { result: "1/2-1/2", termination: "agreement" });
        }
        return { draw_offer_by: user.id };
      }) };
    case "accept_draw":
      return { game: await mutate(b.gameId, user.id, async (g) => {
        if (!g.draw_offer_by || g.draw_offer_by === user.id) throw new HttpError(409, "There is no draw offer to accept", "no_offer");
        return finishPatch(g, await ucisOf(g), { result: "1/2-1/2", termination: "agreement" });
      }) };
    case "decline_draw":
      return { game: await mutate(b.gameId, user.id, (g) => {
        if (!g.draw_offer_by || g.draw_offer_by === user.id) throw new HttpError(409, "There is no draw offer to decline", "no_offer");
        return { draw_offer_by: null };
      }) };
    case "claim_draw":
      return { game: await mutate(b.gameId, user.id, async (g) => {
        const ucis = await ucisOf(g);
        const { chess, keys } = replay(ucis);
        const claim = claimableDraw(chess, keys);
        if (!claim) throw new HttpError(409, "No draw can be claimed in this position", "not_claimable");
        return finishPatch(g, ucis, claim);
      }) };
    case "timeout":
      return { game: await mutate(b.gameId, user.id, async (g) => {
        const key = g.turn === "w" ? "white_ms" : "black_ms";
        const elapsed = g.ply >= 2 && g.turn_started_at ? Date.now() - Date.parse(g.turn_started_at) : 0;
        if (g.ply < 2 || g[key] - elapsed > 0) throw new HttpError(409, "The clock has not expired", "not_flagged");
        const ucis = await ucisOf(g);
        return finishPatch(g, ucis, timeoutOutcome(replay(ucis).chess, g.turn), { [key]: 0 });
      }) };
    default:
      throw new HttpError(400, "Unknown action");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (req.method !== "POST") throw new HttpError(405, "POST only");
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, "Please sign in again", "unauthenticated");
    const body = await req.json().catch(() => { throw new HttpError(400, "Invalid JSON"); });
    const out = await handle(data.user, body ?? {});
    return json({ ...out, serverNow: Date.now() });
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
    console.error(e);
    return json({ error: "Server error" }, 500);
  }
});
