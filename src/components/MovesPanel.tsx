import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Chess } from "chess.js";
import type { MoveRow } from "../lib/types";

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export default function MovesPanel({
  moves,
  viewPly,
  onSelect,
}: {
  moves: MoveRow[];
  viewPly: number | null;
  onSelect: (ply: number | null) => void;
}) {
  const current = viewPly ?? moves.length;
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // FIX: Internal container scroll ONLY, strictly preventing window/document scroll jumps on mobile
  useEffect(() => {
    const container = containerRef.current;
    const el = activeRef.current;
    if (!container || !el) return;

    const relTop = el.offsetTop - container.offsetTop;
    const isOutOfView =
      relTop < container.scrollTop ||
      relTop + el.clientHeight > container.scrollTop + container.clientHeight;

    if (isOutOfView) {
      container.scrollTo({
        top: Math.max(0, relTop - container.clientHeight / 2 + el.clientHeight / 2),
        behavior: "smooth",
      });
    }
  }, [current]);

  const rows: [MoveRow, MoveRow | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) rows.push([moves[i], moves[i + 1]]);

  // Calculate material balance at current ply
  const material = useMemo(() => {
    if (moves.length === 0) return { whiteAdv: 0, capturedWhite: [], capturedBlack: [] };
    const plyIdx = viewPly === null ? moves.length : viewPly;
    const fen = plyIdx === 0 ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" : moves[plyIdx - 1]?.fen;
    if (!fen) return { whiteAdv: 0, capturedWhite: [], capturedBlack: [] };

    try {
      const c = new Chess(fen);
      let wScore = 0, bScore = 0;
      for (const row of c.board()) {
        for (const sq of row) {
          if (!sq) continue;
          const val = PIECE_VALUES[sq.type] ?? 0;
          if (sq.color === "w") wScore += val;
          else bScore += val;
        }
      }
      return { whiteAdv: wScore - bScore };
    } catch {
      return { whiteAdv: 0 };
    }
  }, [moves, viewPly]);

  const cell = (m?: MoveRow) =>
    m ? (
      <button
        ref={m.ply === current ? activeRef : undefined}
        onClick={() => onSelect(m.ply)}
        aria-current={m.ply === current ? "step" : undefined}
        className={`rounded px-2 py-1 text-left text-sm font-medium transition ${
          m.ply === current
            ? "bg-moss text-white shadow-xs"
            : "hover:bg-moss-soft text-ink"
        }`}
      >
        {m.san}
      </button>
    ) : (
      <span />
    );

  const nav = (label: string, icon: React.ReactNode, ply: number | null, disabled: boolean) => (
    <button
      className="btn !px-2.5 !py-1.5"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onSelect(ply)}
    >
      {icon}
    </button>
  );

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {nav("First move", <ChevronsLeft size={16} />, 0, current === 0)}
          {nav("Previous move", <ChevronLeft size={16} />, Math.max(0, current - 1), current === 0)}
          {nav("Next move", <ChevronRight size={16} />, current + 1, current >= moves.length)}
          {nav("Latest move", <ChevronsRight size={16} />, null, current >= moves.length)}
        </div>

        <div className="flex items-center gap-2">
          {material.whiteAdv !== 0 && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                material.whiteAdv > 0
                  ? "bg-stone-200 text-stone-800"
                  : "bg-zinc-800 text-white"
              }`}
            >
              {material.whiteAdv > 0 ? `+${material.whiteAdv}` : material.whiteAdv}
            </span>
          )}
          {viewPly !== null && (
            <button
              className="btn btn-primary !py-1 !px-2.5 text-xs"
              onClick={() => onSelect(null)}
            >
              Live Game
            </button>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        tabIndex={-1}
        className="max-h-60 overflow-y-auto rounded-xl border border-line bg-paper/60 p-2 scrollbar-thin"
        aria-label="Move history list"
      >
        {rows.length === 0 ? (
          <p className="p-3 text-sm text-ink-soft">No moves played yet.</p>
        ) : (
          <div className="grid grid-cols-[2.2rem_1fr_1fr] items-center gap-y-0.5">
            {rows.map(([w, b], i) => (
              <div key={w.ply} className="contents">
                <span className="text-xs font-medium text-ink-soft select-none">{i + 1}.</span>
                {cell(w)}
                {cell(b)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
