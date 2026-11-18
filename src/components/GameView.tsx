import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowUpDown,
  Copy,
  Cpu,
  Download,
  Flag,
  RefreshCw,
  Square as StopIcon,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import Board from "./Board";
import MovesPanel from "./MovesPanel";
import { Card } from "./ui";
import { useGame } from "../hooks/useGame";
import { useAiPlayer } from "../hooks/useAiPlayer";
import { act, ApiError, serverNow, type ActionResult } from "../lib/api";
import { errMsg, fmtClock, resultText } from "../lib/format";
import { navigate } from "../lib/router";
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
      <Card className="mx-auto mt-10 max-w-md text-center">
        {g.loading ? (
          <p>Loading game…</p>
        ) : (
          <>
            <p className="mb-3">{g.error ?? "Game not found."}</p>
            <button className="btn" onClick={g.sync}>
              <RefreshCw size={16} /> Retry
            </button>
          </>
        )}
      </Card>
    );
  }
  if (g.game.status === "waiting") {
    return (
      <Card className="mx-auto mt-10 max-w-md text-center">
        <p>Still waiting for an opponent.</p>
        <button className="btn mt-3" onClick={() => navigate(backTo)}>
          Back
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
  const prevMoveCountRef = useRef(moves.length);
  const prevStatusRef = useRef(game.status);

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
        // If opponent moved
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

  const turnName = game.turn === "w" ? "White" : "Black";
  const sr = active
    ? `${lm ? `Last move ${lm.san}. ` : ""}${turnName} to move.`
    : resultText(game);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
      {/* Board & Player Area - sized to prevent mobile viewport scroll */}
      <div
        className="mx-auto flex w-full flex-col justify-center"
        style={{
          maxWidth: "min(100%, calc(100dvh - 13rem))",
          minWidth: "min(100%, 18rem)",
        }}
      >
        {(!online || live === "offline") && (
          <div
            role="status"
            className="mb-2 flex items-center gap-2 rounded-xl bg-[#f3e3c3] px-3 py-2 text-sm"
          >
            <WifiOff size={16} />{" "}
            {online ? "Live connection lost. Reconnecting…" : "You are offline."} The game is
            saved on the server.
          </div>
        )}

        <PlayerBar game={game} color={top} you={myColor === top} />
        <div className="my-2 aspect-square w-full">
          <Board
            fen={fen}
            orientation={orientation}
            myColor={myColor}
            interactive={interactive}
            lastMove={lastMove}
            onMove={(u) => submit(u)}
          />
        </div>
        <PlayerBar
          game={game}
          color={top === "w" ? "b" : "w"}
          you={myColor !== null && myColor !== top}
        />
        <p className="sr-only" aria-live="polite">
          {sr}
        </p>
      </div>

      {/* Side Info & Action Panel */}
      <div className="flex flex-col gap-3">
        <Card className="!p-4">
          {game.status === "finished" ? (
            <div>
              <p className="text-base font-semibold">{resultText(game)}</p>
              <p className="text-xs text-ink-soft">
                {game.tc === "unlimited" ? "Unlimited" : game.tc} · {game.ply} plies
              </p>
              <button className="btn btn-primary mt-2.5 w-full" onClick={() => navigate(backTo)}>
                Done
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" role="status">
                {atLive
                  ? interactive || game.turn === myColor
                    ? "Your turn to move"
                    : `${turnName} to move`
                  : "Reviewing earlier move"}
              </p>
              <button
                className="btn !p-1.5 text-ink-soft hover:text-ink"
                onClick={toggleMute}
                title={muted ? "Unmute sounds" : "Mute sounds"}
                aria-label={muted ? "Unmute sounds" : "Mute sounds"}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          )}
          {notice && (
            <p className="mt-2 text-xs text-danger" role="alert">
              {notice}
            </p>
          )}
          {game.mode === "ai" && active && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
              <Cpu size={14} />
              {ai.status === "loading" && <span>Loading engine…</span>}
              {ai.status === "thinking" && <span>Engine thinking…</span>}
              {ai.status === "ready" && !ai.paused && <span>Engine ready</span>}
              {ai.paused && <span>Engine paused</span>}
              {ai.status === "error" && <span className="text-danger">{ai.error}</span>}
              {ai.status === "thinking" && (
                <button className="btn !h-7 !py-0.5 !px-2 text-xs" onClick={ai.stop}>
                  <StopIcon size={12} /> Stop
                </button>
              )}
              {ai.paused && (
                <button className="btn !h-7 !py-0.5 !px-2 text-xs" onClick={ai.resume}>
                  Resume
                </button>
              )}
              {ai.status === "error" && (
                <button className="btn !h-7 !py-0.5 !px-2 text-xs" onClick={ai.retry}>
                  Retry
                </button>
              )}
            </div>
          )}
        </Card>

        <Card className="!p-4">
          <MovesPanel moves={moves} viewPly={viewPly} onSelect={select} />
        </Card>

        <Card className="flex flex-wrap gap-2 !p-3">
          <button
            className="btn !h-8 !px-2.5 text-xs"
            onClick={() => setFlipped((f) => !f)}
            aria-label="Flip board"
          >
            <ArrowUpDown size={14} /> Flip
          </button>
          <button className="btn !h-8 !px-2.5 text-xs" onClick={copyPgn}>
            <Copy size={14} /> PGN
          </button>
          <button className="btn !h-8 !px-2.5 text-xs" onClick={downloadPgn}>
            <Download size={14} /> Export
          </button>
          {active && myColor && (
            <>
              {claim && (
                <button
                  className="btn !h-8 !px-2.5 text-xs"
                  disabled={busy}
                  onClick={() => run("claim_draw")}
                >
                  Claim draw ({claim.termination === "fifty_move" ? "50-move" : "3-fold"})
                </button>
              )}
              {game.mode === "online" && !offerByOpp && (
                <button
                  className="btn !h-8 !px-2.5 text-xs"
                  disabled={busy || offerByMe}
                  onClick={() => run("offer_draw")}
                >
                  {offerByMe ? "Offered" : "Draw"}
                </button>
              )}
              {offerByOpp && (
                <>
                  <button
                    className="btn btn-primary !h-8 !px-2.5 text-xs"
                    disabled={busy}
                    onClick={() => run("accept_draw")}
                  >
                    Accept draw
                  </button>
                  <button
                    className="btn !h-8 !px-2 text-xs"
                    disabled={busy}
                    onClick={() => run("decline_draw")}
                  >
                    Decline
                  </button>
                </>
              )}
              {!confirmResign ? (
                <button
                  className="btn btn-danger !h-8 !px-2.5 text-xs"
                  disabled={busy}
                  onClick={() => setConfirmResign(true)}
                >
                  <Flag size={14} /> Resign
                </button>
              ) : (
                <button
                  className="btn btn-danger !h-8 !px-2.5 text-xs"
                  disabled={busy}
                  onClick={() => run("resign")}
                >
                  Confirm?
                </button>
              )}
            </>
          )}
        </Card>
        {offerByOpp && (
          <p className="text-xs font-medium text-moss-dark">Your opponent offered a draw.</p>
        )}
      </div>
    </div>
  );
}

function PlayerBar({ game, color, you }: { game: Game; color: Side; you: boolean }) {
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

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-3 py-2 transition ${
        toMove ? "border-moss bg-moss-soft shadow-xs" : "border-line bg-card"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {isAi ? (
          <span className="grid size-8 place-items-center rounded-full bg-ink text-paper">
            <Cpu size={16} />
          </span>
        ) : avatar ? (
          <img src={avatar} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full" />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-line text-sm font-semibold">
            {name[0]?.toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {name}
            {you && <span className="text-ink-soft"> (you)</span>}
          </div>
          <div className="text-xs text-ink-soft">
            {color === "w" ? "White" : "Black"}
            {toMove && " · to move"}
          </div>
        </div>
      </div>
      <div
        aria-label={`${color === "w" ? "White" : "Black"} clock`}
        className={`rounded-lg px-2.5 py-1 font-mono text-lg font-semibold tabular-nums ${
          toMove ? "bg-ink text-paper" : "bg-paper text-ink"
        } ${ms < 10_000 && game.status === "active" && game.tc !== "unlimited" ? "!text-[#ff8f80]" : ""}`}
      >
        {game.tc === "unlimited" ? "∞" : fmtClock(ms)}
      </div>
    </div>
  );
}
