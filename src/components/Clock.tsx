// Isolated Chess Clock Component
// Ticking interval is encapsulated here so parent components (Board, GameView) do NOT re-render every 100ms.
// Under 10 seconds: turns red, pulses, and emits subtle acoustic tick.

import { useEffect, useState } from "react";
import { fmtClock } from "../lib/format";
import { remainingAt } from "../../supabase/functions/game-action/rules.ts";
import { serverNow } from "../lib/api";
import type { Game, Side } from "../lib/types";
import { playClockTickSound } from "../lib/sounds";
import { triggerHaptic } from "../lib/haptics";

export default function Clock({
  game,
  color,
}: {
  game: Game;
  color: Side;
}) {
  const [now, setNow] = useState(() => serverNow());
  const toMove = game.status === "active" && game.turn === color;
  const running = toMove && game.ply >= 2 && game.tc !== "unlimited";

  useEffect(() => {
    setNow(serverNow());
    if (!running) return;
    const interval = setInterval(() => {
      setNow(serverNow());
    }, 100);
    return () => clearInterval(interval);
  }, [running, game.revision]);

  const ms = remainingAt(game, now)[color];
  const isLowTime = ms < 10_000 && ms > 0 && running;
  const secondsLeft = Math.floor(ms / 1000);

  useEffect(() => {
    if (isLowTime) {
      playClockTickSound();
      triggerHaptic("light");
    }
  }, [isLowTime, secondsLeft]);

  return (
    <div
      aria-label={`${color === "w" ? "White" : "Black"} clock`}
      className={`rounded-lg px-2.5 py-1 font-mono text-base sm:text-lg font-bold tabular-nums transition-all duration-150 ${
        toMove
          ? "bg-[var(--surface-container-high)] text-[var(--on-surface)] border border-[var(--outline)] shadow-sm"
          : "bg-[var(--surface-container)] text-[var(--on-surface-variant)] border border-transparent opacity-85"
      } ${
        isLowTime
          ? "!bg-red-500/20 !text-red-500 !border-red-500 animate-pulse"
          : ""
      }`}
    >
      {game.tc === "unlimited" ? "∞" : fmtClock(ms)}
    </div>
  );
}
