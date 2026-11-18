import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { playCaptureSound, playCastleSound, playCheckSound, playMoveSound } from "../lib/sounds";
import { triggerHaptic } from "../lib/haptics";
import { Button } from "./ui";
import type { Side } from "../lib/types";

interface Props {
  fen: string;
  orientation: "white" | "black";
  myColor: Side | null;
  interactive: boolean;
  lastMove: { from: string; to: string } | null;
  onMove: (uci: string) => void;
  boardTheme?: "green" | "slate" | "walnut";
}

function kingSquare(chess: Chess, color: Side): string | null {
  for (const row of chess.board()) {
    for (const c of row) {
      if (c && c.type === "k" && c.color === color) return c.square;
    }
  }
  return null;
}

const BOARD_COLORS = {
  green: { light: "#eeeed2", dark: "#769656" },
  slate: { light: "#e0e4eb", dark: "#6c7d93" },
  walnut: { light: "#f0d9b5", dark: "#b58863" },
};

export default function Board({
  fen,
  orientation,
  myColor,
  interactive,
  lastMove,
  onMove,
  boardTheme,
}: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const [sel, setSel] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [premove, setPremove] = useState<{ from: string; to: string } | null>(null);

  const storedTheme =
    typeof window !== "undefined"
      ? (localStorage.getItem("chess_board_theme") as "green" | "slate" | "walnut" | null)
      : null;
  const activeBoardTheme = boardTheme || storedTheme || "green";

  const hintsEnabled =
    typeof window !== "undefined" ? localStorage.getItem("chess_move_hints") !== "false" : true;
  const premovesConfig =
    typeof window !== "undefined" ? localStorage.getItem("chess_premoves") !== "false" : true;
  const autoQueenEnabled =
    typeof window !== "undefined" ? localStorage.getItem("chess_auto_queen") === "true" : false;
  const showCoords =
    typeof window !== "undefined" ? localStorage.getItem("chess_show_coords") !== "false" : true;

  // If premove exists and it is now my turn, execute premove immediately if legal
  useEffect(() => {
    if (premove && interactive && myColor && chess.turn() === myColor) {
      const legalMoves = chess.moves({ square: premove.from as Square, verbose: true });
      const target = legalMoves.find((m) => m.to === premove.to);
      if (target) {
        if (target.promotion) {
          // Default auto-queen for premoves
          onMove(`${premove.from}${premove.to}q`);
        } else {
          onMove(`${premove.from}${premove.to}`);
        }
        triggerMoveAudio(target);
      }
      setPremove(null);
    }
  }, [fen, interactive, myColor, premove, chess, onMove]);

  useEffect(() => {
    setSel(null);
    setPromo(null);
  }, [fen, interactive]);

  const canMove = interactive && !!myColor && chess.turn() === myColor;
  const isPremoveEligible = premovesConfig && !canMove && !!myColor && interactive;

  const legal = useMemo(
    () => (sel ? chess.moves({ square: sel as Square, verbose: true }) : []),
    [sel, chess]
  );

  function triggerMoveAudio(m: { captured?: string; san: string }) {
    if (m.captured) {
      playCaptureSound();
      triggerHaptic("medium");
    } else if (m.san.startsWith("O-O")) {
      playCastleSound();
      triggerHaptic("medium");
    } else if (m.san.includes("+") || m.san.includes("#")) {
      playCheckSound();
      triggerHaptic("heavy");
    } else {
      playMoveSound();
      triggerHaptic("light");
    }
  }

  function attempt(from: string, to: string): boolean {
    if (canMove) {
      const cands = chess
        .moves({ square: from as Square, verbose: true })
        .filter((m) => m.to === to);
      if (!cands.length) return false;
      if (cands.some((m) => m.promotion)) {
        if (autoQueenEnabled) {
          setSel(null);
          triggerMoveAudio(cands[0]);
          onMove(`${from}${to}q`);
          return true;
        }
        setPromo({ from, to });
        return false;
      }
      setSel(null);
      triggerMoveAudio(cands[0]);
      onMove(from + to);
      return true;
    }

    // Handle Premove
    if (isPremoveEligible) {
      setPremove({ from, to });
      setSel(null);
      triggerHaptic("light");
      return true;
    }

    return false;
  }

  const squareStyles = useMemo(() => {
    const s: Record<string, CSSProperties> = {};
    const add = (sq: string, st: CSSProperties) => {
      s[sq] = { ...s[sq], ...st };
    };

    // Yellow last-move highlight
    if (lastMove) {
      add(lastMove.from, { backgroundColor: "rgba(255, 235, 59, 0.36)" });
      add(lastMove.to, { backgroundColor: "rgba(255, 235, 59, 0.45)" });
    }

    // Selected piece highlight: Emerald glow
    if (sel) {
      add(sel, {
        backgroundColor: "rgba(129, 182, 76, 0.55)",
        boxShadow: "inset 0 0 0 2.5px #81b64c",
      });
    }

    // Premove highlight: subtle blue indicator
    if (premove) {
      add(premove.from, {
        backgroundColor: "rgba(59, 130, 246, 0.35)",
        boxShadow: "inset 0 0 0 2px #3b82f6",
      });
      add(premove.to, {
        backgroundColor: "rgba(59, 130, 246, 0.45)",
      });
    }

    // King in check highlight: Soft crimson radial glow
    if (chess.inCheck()) {
      const k = kingSquare(chess, chess.turn());
      if (k) {
        add(k, {
          backgroundImage:
            "radial-gradient(circle, rgba(220, 38, 38, 0.85) 0%, rgba(220, 38, 38, 0.35) 60%, transparent 80%)",
        });
      }
    }

    // Legal move indicators: dot for empty square, ring for capture (if enabled)
    if (hintsEnabled) {
      for (const m of legal) {
        const isCapture = !!m.captured || m.flags.includes("e");
        add(m.to, {
          backgroundImage: isCapture
            ? "radial-gradient(circle, transparent 54%, rgba(0, 0, 0, 0.38) 56%, rgba(0, 0, 0, 0.38) 72%, transparent 75%)"
            : "radial-gradient(circle, rgba(0, 0, 0, 0.30) 22%, transparent 25%)",
        });
      }
    }

    return s;
  }, [chess, sel, legal, lastMove, premove, hintsEnabled]);

  const colors = BOARD_COLORS[activeBoardTheme] ?? BOARD_COLORS.green;

  const options = {
    id: "main-board",
    position: fen,
    boardOrientation: orientation,
    squareStyles,
    showBoardCoordinates: showCoords,
    lightSquareStyle: { backgroundColor: colors.light },
    darkSquareStyle: { backgroundColor: colors.dark },
    boardStyle: {
      borderRadius: "12px",
      boxShadow: "0 12px 32px -8px rgba(0, 0, 0, 0.5)",
    },
    animationDurationInMs: 160,
    canDragPiece: ({ piece }: { piece: { pieceType: string } }) =>
      (canMove || isPremoveEligible) && piece.pieceType[0] === myColor,
    onPieceDrop: ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (targetSquare) {
        return attempt(sourceSquare, targetSquare);
      }
      return false;
    },
    onPieceDragBegin: () => {
      triggerHaptic("light");
    },
    onSquareClick: ({ square }: { square: string }) => {
      if (canMove || isPremoveEligible) {
        if (sel && legal.some((m) => m.to === square)) {
          attempt(sel, square);
          return;
        }
        const p = chess.get(square as Square);
        if (p && p.color === myColor) {
          setSel(square !== sel ? square : null);
          triggerHaptic("light");
        } else if (sel) {
          // Attempt click-click move
          attempt(sel, square);
        } else {
          setSel(null);
        }
      }
    },
  };

  const glyph: Record<string, string> = {
    q: "♕ Queen",
    r: "♖ Rook",
    b: "♗ Bishop",
    n: "♘ Knight",
  };

  return (
    <div
      className="relative touch-manipulation bg-[var(--surface-container)] border border-[var(--outline)] p-1.5 sm:p-2 rounded-2xl shadow-xl transition-colors"
      role="group"
      aria-label="Interactive chess board"
    >
      <div className="rounded-xl overflow-hidden border border-[var(--outline)]">
        <Chessboard options={options} />
      </div>

      {/* Pawn Promotion Modal */}
      {promo && (
        <div
          role="dialog"
          aria-label="Choose promotion piece"
          className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--outline)] p-5 shadow-2xl max-w-xs w-full text-center">
            <p className="mb-3 text-sm font-bold text-[var(--on-surface)] font-heading">
              Promote Pawn To
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["q", "r", "b", "n"] as const).map((p) => (
                <Button
                  key={p}
                  variant="filled"
                  size="sm"
                  className="!py-2 font-bold"
                  onClick={() => {
                    const { from, to } = promo;
                    setPromo(null);
                    setSel(null);
                    triggerHaptic("medium");
                    playMoveSound();
                    onMove(from + to + p);
                  }}
                >
                  {glyph[p]}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-xs text-[var(--on-surface-variant)]"
              onClick={() => {
                setPromo(null);
                triggerHaptic("light");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
