import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard"; // react-chessboard v5 "options" API
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
  for (const row of chess.board()) for (const c of row) if (c && c.type === "k" && c.color === color) return c.square;
  return null;
}

export default function Board({ fen, orientation, myColor, interactive, lastMove, onMove }: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const [sel, setSel] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  useEffect(() => { setSel(null); setPromo(null); }, [fen, interactive]);

  const canMove = interactive && !!myColor && chess.turn() === myColor;
  const legal = useMemo(() => (sel ? chess.moves({ square: sel as Square, verbose: true }) : []), [sel, chess]);

  function attempt(from: string, to: string): boolean {
    const cands = chess.moves({ square: from as Square, verbose: true }).filter((m) => m.to === to);
    if (!cands.length) return false;
    if (cands.some((m) => m.promotion)) { setPromo({ from, to }); return false; }
    setSel(null);
    onMove(from + to);
    return true;
  }

  const squareStyles = useMemo(() => {
    const s: Record<string, CSSProperties> = {};
    const add = (sq: string, st: CSSProperties) => { s[sq] = { ...s[sq], ...st }; };
    if (lastMove) { add(lastMove.from, { backgroundColor: "rgba(205,190,90,.45)" }); add(lastMove.to, { backgroundColor: "rgba(205,190,90,.55)" }); }
    if (sel) add(sel, { backgroundColor: "rgba(77,122,89,.6)" });
    if (chess.inCheck()) {
      const k = kingSquare(chess, chess.turn());
      if (k) add(k, { backgroundImage: "radial-gradient(circle, rgba(168,69,59,.9) 0%, rgba(168,69,59,0) 70%)" });
    }
    for (const m of legal) {
      const capture = !!m.captured || m.flags.includes("e");
      add(m.to, {
        backgroundImage: capture
          ? "radial-gradient(circle, transparent 58%, rgba(30,50,38,.4) 60%, rgba(30,50,38,.4) 72%, transparent 74%)"
          : "radial-gradient(circle, rgba(30,50,38,.35) 20%, transparent 22%)",
      });
    }
    return s;
  }, [chess, sel, legal, lastMove]);

  const options = {
    id: "main-board",
    position: fen,
    boardOrientation: orientation,
    squareStyles,
    lightSquareStyle: { backgroundColor: "#ece8dc" },
    darkSquareStyle: { backgroundColor: "#86a08b" },
    boardStyle: { borderRadius: "8px", boxShadow: "0 8px 30px rgba(37,40,45,.14)" },
    animationDurationInMs: 150,
    canDragPiece: ({ piece }: { piece: { pieceType: string } }) => canMove && piece.pieceType[0] === myColor,
    onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) =>
      canMove && !!targetSquare ? attempt(sourceSquare, targetSquare) : false,
    onSquareClick: ({ square }: { square: string }) => {
      if (!canMove) return;
      if (sel && legal.some((m) => m.to === square)) { attempt(sel, square); return; }
      const p = chess.get(square as Square);
      setSel(p && p.color === myColor && square !== sel ? square : null);
    },
  };

  const glyph: Record<string, string> = { q: "♕ Queen", r: "♖ Rook", b: "♗ Bishop", n: "♘ Knight" };

  return (
    <div className="relative" role="group" aria-label="Chess board">
      <Chessboard options={options} />
      {promo && (
        <div role="dialog" aria-label="Choose promotion piece"
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-ink/35">
          <div className="rounded-2xl border border-line bg-card p-4 shadow-xl">
            <p className="mb-3 text-sm font-medium">Promote to</p>
            <div className="grid grid-cols-2 gap-2">
              {(["q", "r", "b", "n"] as const).map((p) => (
                <button key={p} className="btn" onClick={() => { const { from, to } = promo; setPromo(null); setSel(null); onMove(from + to + p); }}>
                  {glyph[p]}
                </button>
              ))}
            </div>
            <button className="btn mt-2 w-full" onClick={() => setPromo(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
