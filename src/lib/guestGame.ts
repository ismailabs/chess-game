import { Chess } from "chess.js";
import {
  applyUci,
  automaticOutcome,
  buildPgn,
  claimableDraw,
  clockAfterMove,
  findTimeControl,
  replay,
  START_FEN,
  timeoutOutcome,
  type Side,
} from "../../supabase/functions/game-action/rules.ts";
import type { Game, MoveRow } from "./types";
import { ApiError, type ActionResult } from "./api";

interface StoredGuestGame {
  game: Game;
  moves: MoveRow[];
}

const STORAGE_PREFIX = "guest_game_";

export function isGuestGameId(id: unknown): boolean {
  return typeof id === "string" && id.startsWith("guest-");
}

export function createGuestGame(params: {
  tc: string;
  humanColor: "w" | "b";
  level: number;
  engine: string;
  aiName: string;
  botId?: string;
  botStyle?: string;
}): { game: Game; moves: MoveRow[] } {
  const tc = findTimeControl(params.tc) ?? findTimeControl("10+0")!;
  const id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const game: Game = {
    id,
    mode: "ai",
    status: "active",
    white_id: params.humanColor === "w" ? "guest" : null,
    black_id: params.humanColor === "b" ? "guest" : null,
    white_name: params.humanColor === "w" ? "Guest" : params.aiName,
    black_name: params.humanColor === "b" ? "Guest" : params.aiName,
    white_avatar: null,
    black_avatar: null,
    ai_engine: params.engine,
    ai_level: params.level,
    ai_color: params.humanColor === "w" ? "b" : "w",
    tc: tc.id,
    initial_ms: tc.initial,
    increment_ms: tc.increment,
    white_ms: tc.initial,
    black_ms: tc.initial,
    turn: "w",
    turn_started_at: now,
    fen: START_FEN,
    pgn: "",
    ply: 0,
    result: null,
    termination: null,
    draw_offer_by: null,
    revision: 0,
    created_at: now,
    started_at: now,
    updated_at: now,
    ended_at: null,
  };

  const stored: StoredGuestGame = { game, moves: [] };
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(stored));
    if (params.botStyle) {
      sessionStorage.setItem(`game_style_${id}`, params.botStyle);
    }
    if (params.botId) {
      sessionStorage.setItem(`bot_id_${id}`, params.botId);
    }
  } catch {
    /* fallback to memory if sessionStorage quota is exceeded */
  }

  return stored;
}

export function getGuestGame(id: string): StoredGuestGame | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as StoredGuestGame;
  } catch {
    return null;
  }
}

function saveGuestGame(stored: StoredGuestGame) {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${stored.game.id}`, JSON.stringify(stored));
  } catch {
    /* ignore */
  }
}

export function handleGuestAction(body: Record<string, unknown>): ActionResult {
  const action = String(body.action);
  const gameId = String(body.gameId);

  if (action === "new_ai") {
    const humanColor = (body.humanColor as "w" | "b") || "w";
    const tc = String(body.tc || "10+0");
    const level = Number(body.level || 3);
    const engine = String(body.engine || "stockfish-lite");
    const aiName = String(body.aiName || "Bot");
    const botId = body.botId ? String(body.botId) : undefined;
    const botStyle = body.botStyle ? String(body.botStyle) : undefined;

    const stored = createGuestGame({
      tc,
      humanColor,
      level,
      engine,
      aiName,
      botId,
      botStyle,
    });

    return { game: stored.game, moves: stored.moves, serverNow: Date.now() };
  }

  const stored = getGuestGame(gameId);
  if (!stored) {
    throw new ApiError("Guest game not found", "not_found", 404);
  }

  const { game, moves } = stored;

  if (action === "sync") {
    return { game, moves, serverNow: Date.now() };
  }

  if (action === "move") {
    if (game.status !== "active") {
      throw new ApiError("Game is over", "not_active", 409);
    }

    const uci = String(body.uci);
    const isAi = body.ai === true;

    // Validate turn
    if (isAi && game.turn !== game.ai_color) {
      throw new ApiError("Not engine's turn", "bad_turn", 400);
    }
    if (!isAi && game.turn === game.ai_color) {
      throw new ApiError("Not your turn", "bad_turn", 400);
    }

    const now = Date.now();
    const clock = clockAfterMove(game, now);
    const chess = new Chess(game.fen);
    const moveObj = applyUci(chess, uci);

    const allUcis = [...moves.map((m) => m.uci), uci];
    const { keys } = replay(allUcis);

    let outcome = clock.flagged ? timeoutOutcome(chess, game.turn) : automaticOutcome(chess, keys);

    const moveRow: MoveRow = {
      game_id: game.id,
      ply: game.ply,
      player_id: isAi ? null : "guest",
      san: moveObj.san,
      uci,
      fen: chess.fen(),
      white_ms: clock.white_ms,
      black_ms: clock.black_ms,
      created_at: new Date().toISOString(),
    };

    const nextPly = game.ply + 1;
    const nextTurn: Side = chess.turn() as Side;

    const nextPgn = buildPgn(allUcis, {
      white: game.white_name ?? "White",
      black: game.black_name ?? "Black",
      result: outcome ? outcome.result : "*",
      tc: game.tc,
      initial: game.initial_ms,
      inc: game.increment_ms,
      date: game.created_at,
      mode: game.mode,
    });

    const updatedGame: Game = {
      ...game,
      ply: nextPly,
      turn: nextTurn,
      fen: chess.fen(),
      pgn: nextPgn,
      white_ms: clock.white_ms,
      black_ms: clock.black_ms,
      turn_started_at: outcome ? null : new Date().toISOString(),
      revision: game.revision + 1,
      status: outcome ? "finished" : "active",
      result: outcome ? outcome.result : null,
      termination: outcome ? outcome.termination : null,
      ended_at: outcome ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const nextMoves = [...moves, moveRow];
    saveGuestGame({ game: updatedGame, moves: nextMoves });

    return {
      game: updatedGame,
      move: moveRow,
      moves: nextMoves,
      flagged: clock.flagged,
      serverNow: Date.now(),
    };
  }

  if (action === "resign") {
    if (game.status !== "active") return { game, serverNow: Date.now() };

    const humanSide = game.ai_color === "w" ? "b" : "w";
    const result = humanSide === "w" ? "0-1" : "1-0";
    const updatedGame: Game = {
      ...game,
      status: "finished",
      result,
      termination: "resignation",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveGuestGame({ game: updatedGame, moves });
    return { game: updatedGame, serverNow: Date.now() };
  }

  if (action === "timeout") {
    if (game.status !== "active") return { game, serverNow: Date.now() };

    const chess = new Chess(game.fen);
    const outcome = timeoutOutcome(chess, game.turn);
    const updatedGame: Game = {
      ...game,
      status: "finished",
      result: outcome.result,
      termination: outcome.termination,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveGuestGame({ game: updatedGame, moves });
    return { game: updatedGame, serverNow: Date.now() };
  }

  if (action === "claim_draw") {
    if (game.status !== "active") return { game, serverNow: Date.now() };

    const ucis = moves.map((m) => m.uci);
    const { chess, keys } = replay(ucis);
    const claim = claimableDraw(chess, keys);

    if (!claim) {
      throw new ApiError("No draw can be claimed in this position", "not_claimable", 409);
    }

    const updatedGame: Game = {
      ...game,
      status: "finished",
      result: claim.result,
      termination: claim.termination,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveGuestGame({ game: updatedGame, moves });
    return { game: updatedGame, serverNow: Date.now() };
  }

  throw new ApiError(`Unsupported guest action: ${action}`, "bad_action", 400);
}
