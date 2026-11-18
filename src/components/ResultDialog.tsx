// Animated Result Sheet & Dialog for Completed Games
// Features animated Elo count-up (e.g. 1243 → 1258 +15), termination detail, and quick rematch actions.

import { useEffect, useState } from "react";
import { Trophy, Award, RotateCcw, ArrowRight, Eye, Flag, Handshake } from "lucide-react";
import { Dialog, Button } from "./ui";
import { triggerHaptic } from "../lib/haptics";

export interface ResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: "1-0" | "0-1" | "1/2-1/2" | string;
  termination: string | null;
  myColor: "w" | "b" | null;
  opponentName?: string;
  ratingBefore?: number;
  ratingAfter?: number;
  delta?: number;
  onRematch?: () => void;
  onHome?: () => void;
}

export default function ResultDialog({
  isOpen,
  onClose,
  result,
  termination,
  myColor,
  opponentName,
  ratingBefore = 800,
  ratingAfter = 800,
  delta = 0,
  onRematch,
  onHome,
}: ResultDialogProps) {
  const isDraw = result === "1/2-1/2";
  const isWin = !isDraw && ((result === "1-0" && myColor === "w") || (result === "0-1" && myColor === "b"));
  const isLoss = !isDraw && !isWin && myColor !== null;

  // Animated Elo count-up state
  const [animatedElo, setAnimatedElo] = useState(ratingBefore);

  useEffect(() => {
    if (!isOpen) return;

    if (isWin) triggerHaptic("success");
    else if (isLoss) triggerHaptic("error");
    else triggerHaptic("medium");

    const startTime = performance.now();
    const duration = 900; // ms

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(ratingBefore + (ratingAfter - ratingBefore) * eased);
      setAnimatedElo(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isOpen, ratingBefore, ratingAfter, isWin, isLoss]);

  const outcomeTitle = isWin ? "Victory" : isLoss ? "Defeat" : "Draw";
  const outcomeColor = isWin ? "text-[#81b64c]" : isLoss ? "text-red-400" : "text-amber-400";
  const bannerBg = isWin
    ? "bg-[#81b64c]/10 border-[#81b64c]/30"
    : isLoss
    ? "bg-red-500/10 border-red-500/30"
    : "bg-amber-500/10 border-amber-500/30";

  const terminationLabel = (() => {
    switch (termination) {
      case "checkmate":
        return "by checkmate";
      case "resignation":
        return "by resignation";
      case "timeout":
        return "on time";
      case "stalemate":
        return "by stalemate";
      case "threefold_repetition":
      case "fivefold_repetition":
        return "by repetition";
      case "insufficient_material":
        return "insufficient material";
      case "fifty_move":
      case "seventyfive_move":
        return "by 50-move rule";
      case "agreement":
        return "by mutual agreement";
      default:
        return "game finished";
    }
  })();

  return (
    <Dialog open={isOpen} onClose={onClose} title="">
      <div className="flex flex-col items-center text-center space-y-4 pt-2">
        {/* Outcome Icon */}
        <div className={`grid size-16 place-items-center rounded-2xl border ${bannerBg} shadow-lg`}>
          {isWin ? (
            <Trophy size={32} className="text-[#81b64c] animate-bounce" />
          ) : isLoss ? (
            <Flag size={32} className="text-red-400" />
          ) : (
            <Handshake size={32} className="text-amber-400" />
          )}
        </div>

        {/* Title & Detail */}
        <div>
          <h2 className={`text-2xl font-black font-heading tracking-tight ${outcomeColor}`}>
            {outcomeTitle}
          </h2>
          <p className="text-xs text-stone-400 mt-1 capitalize">
            {terminationLabel} {opponentName ? `vs ${opponentName}` : ""}
          </p>
        </div>

        {/* Animated Elo Card */}
        <div className="w-full rounded-2xl bg-[#262522] border border-white/10 p-4 shadow-inner">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
            Rating Update
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl font-black text-white tabular-nums tracking-tight">
              {animatedElo}
            </span>
            {delta !== 0 && (
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-black shadow-sm ${
                  delta > 0
                    ? "bg-[#81b64c]/20 text-[#81b64c] border border-[#81b64c]/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-400 mt-2 font-mono">
            {ratingBefore} → {ratingAfter}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2 pt-2">
          {onRematch && (
            <Button variant="filled" onClick={onRematch} className="w-full font-bold">
              <RotateCcw size={16} /> Play Again
            </Button>
          )}
          <Button variant="outlined" onClick={onClose} className="w-full">
            <Eye size={16} /> Review Board
          </Button>
          {onHome && (
            <Button variant="ghost" onClick={onHome} className="w-full text-stone-400 text-xs">
              Return to Home
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
