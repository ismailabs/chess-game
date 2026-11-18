import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./ui";
import type { MoveRow } from "../lib/types";

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

  // STRICT internal container scroll ONLY, strictly preventing window/document scroll jumps on mobile
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

  const cell = (m?: MoveRow) =>
    m ? (
      <button
        ref={m.ply === current ? activeRef : undefined}
        onClick={() => onSelect(m.ply)}
        type="button"
        aria-current={m.ply === current ? "step" : undefined}
        className={`rounded-md px-2 py-1 text-left font-mono text-xs sm:text-sm font-semibold transition-all ${
          m.ply === current
            ? "bg-[var(--primary)] text-white shadow-sm"
            : "text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]"
        }`}
      >
        {m.san}
      </button>
    ) : (
      <span />
    );

  const nav = (label: string, icon: React.ReactNode, ply: number | null, disabled: boolean) => (
    <button
      type="button"
      className="p-1.5 rounded-lg text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onSelect(ply)}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col space-y-2">
      {/* Move Navigation & Live Button */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--outline)] pb-2.5">
        <div className="flex items-center gap-1">
          {nav("First move", <ChevronsLeft size={16} />, 0, current === 0)}
          {nav("Previous move", <ChevronLeft size={16} />, Math.max(0, current - 1), current === 0)}
          {nav("Next move", <ChevronRight size={16} />, current + 1, current >= moves.length)}
          {nav("Latest move", <ChevronsRight size={16} />, null, current >= moves.length)}
        </div>

        {viewPly !== null && (
          <Button
            variant="filled"
            size="sm"
            onClick={() => onSelect(null)}
            className="!py-1 !px-2.5 text-xs font-bold"
          >
            Live Game
          </Button>
        )}
      </div>

      {/* Internal Scrollable Move Table */}
      <div
        ref={containerRef}
        tabIndex={-1}
        className="max-h-56 sm:max-h-64 overflow-y-auto rounded-xl border border-[var(--outline)] bg-[var(--surface-container)] p-2 scrollbar-thin"
        aria-label="Algebraic move history list"
      >
        {rows.length === 0 ? (
          <p className="p-4 text-center text-xs text-[var(--on-surface-variant)]">No moves played yet.</p>
        ) : (
          <div className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-y-1">
            {rows.map(([w, b], i) => (
              <div key={w.ply} className="contents">
                <span className="font-mono text-xs font-medium text-[var(--on-surface-variant)] select-none pl-1">
                  {i + 1}.
                </span>
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
