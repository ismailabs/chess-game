import { useMemo } from "react";
import { Chess, type PieceSymbol } from "chess.js";

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const PIECE_ORDER: PieceSymbol[] = ["q", "r", "b", "n", "p"];

// Mini SVG silhouettes for captured pieces
const PIECE_ICONS: Record<PieceSymbol, { w: string; b: string }> = {
  p: { w: "♟", b: "♙" },
  n: { w: "♞", b: "♘" },
  b: { w: "♝", b: "♗" },
  r: { w: "♜", b: "♖" },
  q: { w: "♛", b: "♕" },
  k: { w: "♚", b: "♔" },
};

interface Props {
  fen: string;
  side: "w" | "b"; // Which player's bar this is for
}

export default function CapturedPieces({ fen, side }: Props) {
  const { capturedPieces, advantage } = useMemo(() => {
    try {
      const chess = new Chess(fen);
      const startingCount: Record<PieceSymbol, number> = {
        p: 8,
        n: 2,
        b: 2,
        r: 2,
        q: 1,
        k: 1,
      };

      const wCount: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
      const bCount: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

      let wScore = 0;
      let bScore = 0;

      for (const row of chess.board()) {
        for (const sq of row) {
          if (!sq) continue;
          if (sq.color === "w") {
            wCount[sq.type]++;
            wScore += PIECE_VALUES[sq.type];
          } else {
            bCount[sq.type]++;
            bScore += PIECE_VALUES[sq.type];
          }
        }
      }

      // If this player is White, White captured opponent's (Black's) lost pieces
      // If this player is Black, Black captured opponent's (White's) lost pieces
      const oppColor = side === "w" ? "b" : "w";
      const oppRemaining = oppColor === "w" ? wCount : bCount;

      const captured: { type: PieceSymbol; count: number }[] = [];
      for (const p of PIECE_ORDER) {
        const lost = Math.max(0, startingCount[p] - oppRemaining[p]);
        if (lost > 0) {
          captured.push({ type: p, count: lost });
        }
      }

      const netAdvantage = side === "w" ? wScore - bScore : bScore - wScore;

      return {
        capturedPieces: captured,
        advantage: netAdvantage > 0 ? `+${netAdvantage}` : null,
      };
    } catch {
      return { capturedPieces: [], advantage: null };
    }
  }, [fen, side]);

  if (capturedPieces.length === 0 && !advantage) {
    return null;
  }

  // The pieces displayed were originally the opponent's color
  const oppColor = side === "w" ? "b" : "w";

  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--on-surface-variant)] select-none">
      <div className="flex items-center tracking-tighter">
        {capturedPieces.map(({ type, count }) => {
          const glyph = oppColor === "w" ? PIECE_ICONS[type].w : PIECE_ICONS[type].b;
          return (
            <span
              key={type}
              className={`text-sm leading-none ${
                oppColor === "w" ? "opacity-75" : "opacity-95"
              }`}
              title={`${count} captured ${type}`}
            >
              {glyph.repeat(count)}
            </span>
          );
        })}
      </div>
      {advantage && (
        <span className="rounded bg-[var(--surface-container-high)] px-1 py-0.2 text-[10px] font-bold text-[var(--on-surface)] tabular-nums border border-[var(--outline)]">
          {advantage}
        </span>
      )}
    </div>
  );
}
