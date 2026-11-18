import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowUpDown,
  BookOpen,
  Copy,
  Cpu,
  Download,
  Flag,
  HelpCircle,
  RefreshCw,
  Share2,
  Square as StopIcon,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import Board from "./Board";
import MovesPanel from "./MovesPanel";
import CapturedPieces from "./CapturedPieces";
import BotBubble from "./BotBubble";
import { Card } from "./ui";
import { useGame } from "../hooks/useGame";
import { useAiPlayer } from "../hooks/useAiPlayer";
import { act, ApiError, serverNow, type ActionResult } from "../lib/api";
import { errMsg, fmtClock, resultText } from "../lib/format";
import { navigate } from "../lib/router";
import { detectOpening } from "../lib/openings";
import {
  isMuted,
  playCaptureSound,
  playCastleSound,
  playCheckSound,
  playGameEndSound,
  playMoveSound,
  setMuted,
} from "../lib/sounds";
import type { Game, MoveRow, Side } from "../lib/types";
import {
  claimableDraw,
  remainingAt,
  replay,
  START_FEN,
} from "../../supabase/functions/game-action/rules.ts";

export default function GameView({
  gameId,
  userId,
  backTo,
}: {
  gameId: string;
  userId: string;
  backTo: string;
}) {
  const g = useGame(gameId);

  if (!g.game) {
    return (
      <Card className="mx-auto mt-12 max-w-md text-center liquid-glass p-8">
        {g.loading ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-[#81b64c]" />
            <p className="text-sm font-semibold text-stone-200">Loading arena…</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-stone-300">{g.error ?? "Game not found."}</p>
            <button className="btn btn-primary" onClick={g.sync}>
              <RefreshCw size={16} /> Retry
            </button>
          </>
        )}
      </Card>
    );
  }

  if (g.game.status === "waiting") {
    return (
      <Card className="mx-auto mt-12 max-w-md text-center liquid-glass p-8">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="animate-spin text-[#81b64c]" />
          <h2 className="text-lg font-bold text-stone-100 font-heading">Matchmaking Arena</h2>
          <p className="text-sm text-stone-400">Waiting for an opponent to join the match…</p>
        </div>
        <button className="btn mt-6 w-full" onClick={() => navigate(backTo)}>
          Cancel & Return to Lobby
        </button>
      </Card>
    );
  }

  return (
    <Play
      key={g.game.id}
      game={g.game}
      moves={g.moves}
      live={g.live}
      online={g.online}
      sync={g.sync}
      apply={g.apply}
      userId={userId}
      backTo={backTo}
    />
  );
}

interface PlayProps {
  game: Game;
  moves: MoveRow[];
  live: "connecting" | "live" | "offline";
  online: boolean;
  sync: () => Promise<void>;
  apply: (r: ActionResult) => void;
  userId: string;
  backTo: string;
}

function Play({ game, moves, live, online, sync, apply, userId, backTo }: PlayProps) {
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [tick, setTick] = useState(0);
  const [muted, setMutedState] = useState(() => isMuted());
  const [hint, setHint] = useState<string | null>(null);
  const prevMoveCountRef = useRef(moves.length);
  const prevStatusRef = useRef(game.status);

  // Retrieve stored bot personality style from session
  const botStyle = useMemo(() => {
    try {
      return sessionStorage.getItem(`game_style_${game.id}`) ?? "balanced";
    } catch {
      return "balanced";
    }
  }, [game.id]);

  const myColor: Side | null =
    game.mode === "ai"
      ? game.ai_color === "w"
        ? "b"
        : "w"
      : game.white_id === userId
      ? "w"
      : game.black_id === userId
      ? "b"
      : null;
  const active = game.status === "active";

  // Audio trigger on opponent moves
  useEffect(() => {
    if (moves.length > prevMoveCountRef.current && prevMoveCountRef.current > 0) {
      const last = moves[moves.length - 1];
      if (last) {
        const movedByOpponent =
          (game.mode === "ai" && game.turn !== game.ai_color) ||
          (game.mode === "online" && last.player_id !== userId);
        if (movedByOpponent) {
          if (last.san.includes("#") || last.san.includes("+")) playCheckSound();
          else if (last.san.includes("x")) playCaptureSound();
          else if (last.san.startsWith("O-O")) playCastleSound();
          else playMoveSound();
        }
      }
    }
    prevMoveCountRef.current = moves.length;
  }, [moves.length, game.mode, game.turn, game.ai_color, userId]);

  // Audio trigger on game finish
  useEffect(() => {
    if (prevStatusRef.current === "active" && game.status === "finished") {
      const won =
        game.result === "1/2-1/2"
          ? null
          : (game.result === "1-0" && myColor === "w") ||
            (game.result === "0-1" && myColor === "b");
      playGameEndSound(won);
    }
    prevStatusRef.current = game.status;
  }, [game.status, game.result, myColor]);

  function toggleMute() {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  }

  const submit = useCallback(
    async (uci: string, asAi = false): Promise<boolean> => {
      setBusy(true);
      setHint(null);
      if (!asAi) {
        try {
          const c = new Chess(game.fen);
          c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
          setPending(c.fen());
        } catch {
          /* server will reject */
        }
      }
      try {
        const r = await act({
          action: "move",
          gameId: game.id,
          uci,
          expectedRevision: game.revision,
          ai: asAi,
        });
        apply(r);
        if (r.flagged) setNotice("Time ran out.");
        setNotice((n) => (r.flagged ? n : null));
        return true;
      } catch (e) {
        setNotice(errMsg(e));
        await sync();
        return false;
      } finally {
        setPending(null);
        setBusy(false);
      }
    },
    [game.id, game.fen, game.revision, apply, sync]
  );

  const ai = useAiPlayer(game, (uci) => submit(uci, true));

  async function run(action: string) {
    setBusy(true);
    try {
      apply(await act({ action, gameId: game.id }));
      setNotice(null);
    } catch (e) {
      setNotice(errMsg(e));
      await sync();
    } finally {
      setBusy(false);
      setConfirmResign(false);
    }
  }

  // Claim the flag when the visible clock reaches zero (if not unlimited)
  useEffect(() => {
    if (!active || game.ply < 2 || game.tc === "unlimited") return;
    const left = remainingAt(game, serverNow())[game.turn];
    if (left > 0) {
      const t = setTimeout(() => setTick((x) => x + 1), left + 50);
      return () => clearTimeout(t);
    }
    let alive = true,
      tries = 0;
    const attempt = async () => {
      try {
        const r = await act({ action: "timeout", gameId: game.id });
        if (alive) apply(r);
      } catch (e) {
        if (alive && e instanceof ApiError && e.code === "not_flagged" && tries++ < 6)
          setTimeout(attempt, 400);
      }
    };
    attempt();
    return () => {
      alive = false;
    };
  }, [game.revision, game.status, game.tc, tick]);

  const select = useCallback(
    (p: number | null) =>
      setViewPly(p === null || p >= moves.length ? null : Math.max(0, p)),
    [moves.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
      const cur = viewPly ?? moves.length;
      if (e.key === "ArrowLeft") select(Math.max(0, cur - 1));
      else if (e.key === "ArrowRight") select(cur + 1);
      else if (e.key === "Home") select(0);
      else if (e.key === "End") select(null);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [viewPly, moves.length, select]);

  const atLive = viewPly === null;
  const fen = !atLive
    ? viewPly === 0
      ? START_FEN
      : moves[viewPly! - 1]?.fen ?? game.fen
    : pending ?? game.fen;
  const idx = atLive ? moves.length : viewPly!;
  const lm = idx > 0 ? moves[idx - 1] : undefined;
  const lastMove = lm ? { from: lm.uci.slice(0, 2), to: lm.uci.slice(2, 4) } : null;
  const interactive = atLive && active && !!myColor && game.turn === myColor && !busy && online;
  const orientation: "white" | "black" = (myColor === "b") !== flipped ? "black" : "white";
  const top: Side = orientation === "white" ? "b" : "w";

  // Opening Explorer recognition
  const opening = useMemo(() => detectOpening(moves), [moves]);

  const claim = useMemo(() => {
    if (!active || moves.length !== game.ply) return null;
    try {
      const r = replay(moves.map((m) => m.uci));
      return claimableDraw(r.chess, r.keys);
    } catch {
      return null;
    }
  }, [active, game.ply, moves]);

  const offerByOpp = !!game.draw_offer_by && game.draw_offer_by !== userId;
  const offerByMe = game.draw_offer_by === userId;

  // Winner determination for bot bubble
  const winner = useMemo(() => {
    if (game.status !== "finished") return null;
    if (game.result === "1/2-1/2") return "draw";
    if (game.mode === "ai") {
      const aiWon =
        (game.result === "1-0" && game.ai_color === "w") ||
        (game.result === "0-1" && game.ai_color === "b");
      return aiWon ? "ai" : "human";
    }
    return null;
  }, [game.status, game.result, game.mode, game.ai_color]);

  async function copyPgn() {
    try {
      await navigator.clipboard.writeText(game.pgn);
      setNotice("PGN copied to clipboard.");
    } catch {
      setNotice("Copy failed. Use Download PGN instead.");
    }
  }

  function downloadPgn() {
    const url = URL.createObjectURL(
      new Blob([game.pgn], { type: "application/x-chess-pgn" })
    );
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `chess-${game.id.slice(0, 8)}.pgn`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const url = `${window.location.origin}/online/${game.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Chess | Ismail Studio Match",
          text: `Spectate or review this live chess game on Ismail Studio Chess!`,
          url,
        });
        return;
      } catch {
        /* fallback to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Match link copied to clipboard!");
    } catch {
      setNotice("Could not copy match link.");
    }
  }

  function handleHint() {
    try {
      const chess = new Chess(fen);
      const legalMoves = chess.moves({ verbose: true });
      if (legalMoves.length === 0) {
        setHint("No legal moves available.");
        return;
      }
      // Suggest a tactically solid move (prefer captures or center controls)
      const capture = legalMoves.find((m) => m.captured);
      const chosen = capture ?? legalMoves[0];
      setHint(`Suggested tactical idea: ${chosen.san} (${chosen.from} → ${chosen.to})`);
    } catch {
      setHint("Analyze center control and piece development.");
    }
  }

  const turnName = game.turn === "w" ? "White" : "Black";
  const sr = active
    ? `${lm ? `Last move ${lm.san}. ` : ""}${turnName} to move.`
    : resultText(game);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px] items-start pb-8">
      {/* LEFT COLUMN: Board & Flush Player Bars */}
      <div
        className="mx-auto flex w-full flex-col justify-center space-y-2"
        style={{
          maxWidth: "min(100%, calc(100dvh - 13rem))",
          minWidth: "min(100%, 18rem)",
        }}
      >
        {(!online || live === "offline") && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-200"
          >
            <WifiOff size={15} />{" "}
            {online ? "Reconnecting to live match…" : "Offline mode."} Position preserved on server.
          </div>
        )}

        {/* Flush Top (Opponent) Player Bar */}
        <PlayerBar
          game={game}
          color={top}
          you={myColor === top}
          fen={fen}
        />

        {/* The Centered Chessboard */}
        <div className="aspect-square w-full">
          <Board
            fen={fen}
            orientation={orientation}
            myColor={myColor}
            interactive={interactive}
            lastMove={lastMove}
            onMove={(u) => submit(u)}
          />
        </div>

        {/* Flush Bottom (Player) Bar */}
        <PlayerBar
          game={game}
          color={top === "w" ? "b" : "w"}
          you={myColor !== null && myColor !== top}
          fen={fen}
        />

        <p className="sr-only" aria-live="polite">
          {sr}
        </p>
      </div>

      {/* RIGHT COLUMN: Liquid Glass Telemetry & Action Dock */}
      <div className="flex flex-col gap-3">
        {/* Game Status & Mode Card */}
        <div className="liquid-glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#81b64c] animate-pulse" />
              <span className="font-heading text-sm font-bold text-stone-100">
                {game.mode === "ai" ? "Computer Match" : "Online Live Match"}
              </span>
            </div>
            <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs font-bold text-stone-300">
              {game.tc === "unlimited" ? "Unlimited" : game.tc}
            </span>
          </div>

          {/* Bot Speech Bubble (in AI Mode) */}
          {game.mode === "ai" && (
            <BotBubble
              botStyle={botStyle}
              aiName={game.black_name ?? "Stockfish"}
              gameStatus={game.status}
              isAiTurn={game.turn === game.ai_color && active}
              inCheck={new Chess(fen).inCheck()}
              winner={winner}
              ply={game.ply}
            />
          )}

          {/* Opening Explorer Bar */}
          <div className="flex items-center gap-2 rounded-xl bg-[#262522] border border-white/10 px-3 py-2 text-xs">
            <BookOpen size={15} className="text-[#81b64c] shrink-0" />
            <div className="min-w-0 flex-1 truncate">
              <span className="font-semibold text-stone-200">{opening.name}</span>
              {opening.eco && (
                <span className="ml-1.5 font-mono text-[11px] text-stone-400">({opening.eco})</span>
              )}
            </div>
          </div>

          {/* Turn status message */}
          {game.status === "finished" ? (
            <div className="rounded-xl border border-[#81b64c]/30 bg-[#81b64c]/10 p-3 text-center">
              <p className="font-heading text-base font-extrabold text-[#81b64c]">
                {resultText(game)}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{game.ply} plies completed</p>
              <button
                type="button"
                className="btn btn-primary mt-3 w-full font-bold"
                onClick={() => navigate(backTo)}
              >
                Done / Back to Arena
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs font-medium text-stone-300 px-1">
              <span>
                {atLive
                  ? interactive || game.turn === myColor
                    ? "🟢 Your turn to move"
                    : `⏳ Waiting for ${turnName}…`
                  : "🔍 Inspecting historical move"}
              </span>
              <button
                type="button"
                className="text-stone-400 hover:text-stone-200 transition-colors"
                onClick={toggleMute}
                title={muted ? "Unmute sounds" : "Mute sounds"}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          )}

          {notice && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300"
            >
              {notice}
            </div>
          )}

          {hint && (
            <div className="rounded-xl border border-[#81b64c]/30 bg-[#81b64c]/10 p-2.5 text-xs text-stone-200 flex items-start gap-2">
              <HelpCircle size={15} className="text-[#81b64c] shrink-0 mt-0.5" />
              <span>{hint}</span>
            </div>
          )}

          {/* Engine Status indicator in AI Mode */}
          {game.mode === "ai" && active && (
            <div className="flex items-center justify-between text-xs text-stone-400 pt-1 border-t border-white/5">
              <span className="flex items-center gap-1.5">
                <Cpu size={14} className="text-[#81b64c]" />
                {ai.status === "loading" && "Loading WASM engine…"}
                {ai.status === "thinking" && "Stockfish calculating…"}
                {ai.status === "ready" && !ai.paused && "Engine ready"}
                {ai.paused && "Engine paused"}
                {ai.status === "error" && <span className="text-red-400">{ai.error}</span>}
              </span>
              {ai.status === "thinking" && (
                <button
                  type="button"
                  className="btn !min-h-7 !py-0.5 !px-2 text-xs"
                  onClick={ai.stop}
                >
                  <StopIcon size={12} /> Stop
                </button>
              )}
            </div>
          )}
        </div>

        {/* Algebraic Move Table Card */}
        <div className="liquid-glass rounded-2xl p-4">
          <MovesPanel moves={moves} viewPly={viewPly} onSelect={select} />
        </div>

        {/* Bottom Tactile Action Dock */}
        <div className="liquid-glass rounded-2xl p-3 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn !min-h-8 !px-2.5 text-xs"
              onClick={() => setFlipped((f) => !f)}
              title="Flip board perspective"
              aria-label="Flip board"
            >
              <ArrowUpDown size={14} /> Flip
            </button>
            <button
              type="button"
              className="btn !min-h-8 !px-2.5 text-xs"
              onClick={handleHint}
              title="Show tactical move hint"
            >
              <HelpCircle size={14} /> Hint
            </button>
            <button
              type="button"
              className="btn !min-h-8 !px-2.5 text-xs"
              onClick={handleShare}
              title="Share match link"
            >
              <Share2 size={14} /> Share
            </button>
            <button
              type="button"
              className="btn !min-h-8 !px-2.5 text-xs"
              onClick={copyPgn}
              title="Copy PGN notation"
            >
              <Copy size={14} /> PGN
            </button>
            <button
              type="button"
              className="btn !min-h-8 !px-2.5 text-xs"
              onClick={downloadPgn}
              title="Export PGN file"
            >
              <Download size={14} /> Export
            </button>
          </div>

          {/* Resign / Draw Actions */}
          {active && myColor && (
            <div className="flex items-center gap-1.5 ml-auto">
              {claim && (
                <button
                  type="button"
                  className="btn !min-h-8 !px-2.5 text-xs"
                  disabled={busy}
                  onClick={() => run("claim_draw")}
                >
                  Claim draw ({claim.termination === "fifty_move" ? "50-move" : "3-fold"})
                </button>
              )}

              {game.mode === "online" && !offerByOpp && (
                <button
                  type="button"
                  className="btn !min-h-8 !px-2.5 text-xs"
                  disabled={busy || offerByMe}
                  onClick={() => run("offer_draw")}
                >
                  {offerByMe ? "Draw Offered" : "Offer Draw"}
                </button>
              )}

              {offerByOpp && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn-primary !min-h-8 !px-2.5 text-xs"
                    disabled={busy}
                    onClick={() => run("accept_draw")}
                  >
                    Accept Draw
                  </button>
                  <button
                    type="button"
                    className="btn !min-h-8 !px-2 text-xs"
                    disabled={busy}
                    onClick={() => run("decline_draw")}
                  >
                    Decline
                  </button>
                </div>
              )}

              {!confirmResign ? (
                <button
                  type="button"
                  className="btn btn-danger !min-h-8 !px-2.5 text-xs"
                  disabled={busy}
                  onClick={() => setConfirmResign(true)}
                  title="Resign game"
                >
                  <Flag size={14} /> Resign
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger-solid !min-h-8 !px-3 text-xs font-bold"
                  disabled={busy}
                  onClick={() => run("resign")}
                >
                  Confirm Resign?
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerBar({
  game,
  color,
  you,
  fen,
}: {
  game: Game;
  color: Side;
  you: boolean;
  fen: string;
}) {
  const [now, setNow] = useState(() => serverNow());
  const running =
    game.status === "active" &&
    game.ply >= 2 &&
    game.turn === color &&
    game.tc !== "unlimited";

  useEffect(() => {
    setNow(serverNow());
    if (!running) return;
    const t = setInterval(() => setNow(serverNow()), 100);
    return () => clearInterval(t);
  }, [running, game.revision]);

  const ms = remainingAt(game, now)[color];
  const name =
    (color === "w" ? game.white_name : game.black_name) ??
    (color === "w" ? "White" : "Black");
  const avatar = color === "w" ? game.white_avatar : game.black_avatar;
  const isAi = game.mode === "ai" && game.ai_color === color;
  const toMove = game.status === "active" && game.turn === color;

  // Derive Elo badge for AI or player
  const eloBadge = useMemo(() => {
    if (isAi && game.ai_level) {
      const match = name.match(/\((\d+)\)/);
      return match ? match[1] : "Bot";
    }
    return null;
  }, [isAi, game.ai_level, name]);

  const isLowTime = ms < 15_000 && game.status === "active" && game.tc !== "unlimited";

  return (
    <div
      className={`flex items-center justify-between rounded-xl px-3.5 py-2 transition-all duration-200 border ${
        toMove
          ? "border-[#81b64c] bg-[#302e2b] shadow-[0_0_16px_rgba(129,182,76,0.2)] ring-1 ring-[#81b64c]"
          : "border-white/10 bg-[#262522]"
      }`}
    >
      {/* Left: Avatar, Username, Elo, Captured Pieces */}
      <div className="flex min-w-0 items-center gap-3">
        {/* 36px Rounded Avatar */}
        <div className="relative shrink-0">
          {isAi ? (
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#81b64c] to-[#446824] text-white shadow-md">
              <Cpu size={18} />
            </span>
          ) : avatar ? (
            <img
              src={avatar}
              alt=""
              referrerPolicy="no-referrer"
              className="size-9 rounded-xl border border-white/20 object-cover shadow-sm"
            />
          ) : (
            <span className="grid size-9 place-items-center rounded-xl bg-[#383632] border border-white/10 text-sm font-bold text-stone-200">
              {name[0]?.toUpperCase()}
            </span>
          )}
          {toMove && (
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#81b64c] ring-2 ring-[#262522] animate-pulse" />
          )}
        </div>

        {/* Name, Elo Badge & Captured Material */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-stone-100">
              {name}
              {you && <span className="font-normal text-stone-400"> (You)</span>}
            </span>
            {eloBadge && (
              <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-[10px] font-bold text-[#e5b84b]">
                {eloBadge}
              </span>
            )}
          </div>
          {/* Captured Pieces & Advantage */}
          <CapturedPieces fen={fen} side={color} />
        </div>
      </div>

      {/* Right: Tabular Numeral Clock */}
      <div
        aria-label={`${color === "w" ? "White" : "Black"} clock`}
        className={`rounded-lg px-3 py-1 font-mono text-lg font-bold tabular-nums transition-all ${
          toMove
            ? "bg-[#383632] text-white border border-white/15 shadow-inner"
            : "bg-[#1e1d1b] text-stone-400"
        } ${isLowTime ? "!bg-red-950 !text-red-400 !border-red-600 animate-pulse" : ""}`}
      >
        {game.tc === "unlimited" ? "∞" : fmtClock(ms)}
      </div>
    </div>
  );
}
