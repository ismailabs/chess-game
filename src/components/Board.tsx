import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { playCaptureSound, playCastleSound, playCheckSound, playMoveSound } from "../lib/sounds";
import type { Side } from "../lib/types";

interface Props {
  fen: string;
  orientation: "white" | "black";
  myColor: Side | null;
  interactive: boolean;
  lastMove: { from: string; to: string } | null;
  onMove: (uci: string) => void;
}

function kingSquare(chess: Chess, color: Side): string | null {
  for (const row of chess.board()) {
    for (const c of row) {
      if (c && c.type === "k" && c.color === color) return c.square;
    }
  }
  return null;
}

export default function Board({
  fen,
  orientation,
  myColor,
  interactive,
  lastMove,
  onMove,
}: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const [sel, setSel] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    setSel(null);
    setPromo(null);
  }, [fen, interactive]);

  const canMove = interactive && !!myColor && chess.turn() === myColor;
  const legal = useMemo(
    () => (sel ? chess.moves({ square: sel as Square, verbose: true }) : []),
    [sel, chess]
  );

  function triggerMoveAudio(m: { captured?: string; san: string }) {
    if (m.captured) playCaptureSound();
    else if (m.san.startsWith("O-O")) playCastleSound();
    else if (m.san.includes("+") || m.san.includes("#")) playCheckSound();
    else playMoveSound();
  }

  function attempt(from: string, to: string): boolean {
    const cands = chess
      .moves({ square: from as Square, verbose: true })
      .filter((m) => m.to === to);
    if (!cands.length) return false;
    if (cands.some((m) => m.promotion)) {
      setPromo({ from, to });
      return false;
    }
    setSel(null);
    triggerMoveAudio(cands[0]);
    onMove(from + to);
    return true;
  }

  const squareStyles = useMemo(() => {
    const s: Record<string, CSSProperties> = {};
    const add = (sq: string, st: CSSProperties) => {
      s[sq] = { ...s[sq], ...st };
    };

    // Yellow last-move highlight: rgba(255, 255, 0, 0.45)
    if (lastMove) {
      add(lastMove.from, { backgroundColor: "rgba(255, 255, 0, 0.40)" });
      add(lastMove.to, { backgroundColor: "rgba(255, 255, 0, 0.48)" });
    }

    // Selected piece highlight: Emerald glow
    if (sel) {
      add(sel, {
        backgroundColor: "rgba(129, 182, 76, 0.55)",
        boxShadow: "inset 0 0 0 2px #81b64c",
      });
    }

    // King in check highlight: Soft crimson radial glow
    if (chess.inCheck()) {
      const k = kingSquare(chess, chess.turn());
      if (k) {
        add(k, {
          backgroundImage:
            "radial-gradient(circle, rgba(220, 38, 38, 0.9) 0%, rgba(220, 38, 38, 0.4) 60%, transparent 80%)",
        });
      }
    }

    // Legal move indicators: dot for empty square, ring for capture
    for (const m of legal) {
      const isCapture = !!m.captured || m.flags.includes("e");
      add(m.to, {
        backgroundImage: isCapture
          ? "radial-gradient(circle, transparent 54%, rgba(0, 0, 0, 0.35) 56%, rgba(0, 0, 0, 0.35) 74%, transparent 76%)"
          : "radial-gradient(circle, rgba(0, 0, 0, 0.28) 22%, transparent 25%)",
      });
    }

    return s;
  }, [chess, sel, legal, lastMove]);

  const options = {
    id: "main-board",
    position: fen,
    boardOrientation: orientation,
    squareStyles,
    lightSquareStyle: { backgroundColor: "#eeeed2" },
    darkSquareStyle: { backgroundColor: "#769656" },
    boardStyle: {
      borderRadius: "10px",
      boxShadow: "0 16px 36px -8px rgba(0, 0, 0, 0.6)",
    },
    animationDurationInMs: 180,
    canDragPiece: ({ piece }: { piece: { pieceType: string } }) =>
      canMove && piece.pieceType[0] === myColor,
    onPieceDrop: ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => (canMove && !!targetSquare ? attempt(sourceSquare, targetSquare) : false),
    onSquareClick: ({ square }: { square: string }) => {
      if (!canMove) return;
      if (sel && legal.some((m) => m.to === square)) {
        attempt(sel, square);
        return;
      }
      const p = chess.get(square as Square);
      setSel(p && p.color === myColor && square !== sel ? square : null);
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
      className="relative touch-manipulation liquid-glass p-1.5 sm:p-2 rounded-2xl shadow-2xl"
      role="group"
      aria-label="Interactive chess board"
    >
      <div className="rounded-xl overflow-hidden border border-white/10">
        <Chessboard options={options} />
      </div>

      {/* Pawn Promotion Modal */}
      {promo && (
        <div
          role="dialog"
          aria-label="Choose promotion piece"
          className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="liquid-glass rounded-2xl border border-white/15 p-5 shadow-2xl max-w-xs w-full text-center">
            <p className="mb-3 text-sm font-bold text-stone-100 font-heading">
              Promote Pawn To
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["q", "r", "b", "n"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className="btn btn-primary !py-2 font-bold"
                  onClick={() => {
                    const { from, to } = promo;
                    setPromo(null);
                    setSel(null);
                    playMoveSound();
                    onMove(from + to + p);
                  }}
                >
                  {glyph[p]}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-ghost mt-3 w-full text-xs text-stone-400"
              onClick={() => setPromo(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
