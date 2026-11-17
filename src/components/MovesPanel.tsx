import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { MoveRow } from "../lib/types";

export default function MovesPanel({ moves, viewPly, onSelect }: {
  moves: MoveRow[]; viewPly: number | null; onSelect: (ply: number | null) => void;
}) {
  const current = viewPly ?? moves.length;
  const activeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: "nearest" }); }, [current]);

  const rows: [MoveRow, MoveRow | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) rows.push([moves[i], moves[i + 1]]);

  const cell = (m?: MoveRow) =>
    m ? (
      <button ref={m.ply === current ? activeRef : undefined} onClick={() => onSelect(m.ply)}
        aria-current={m.ply === current ? "step" : undefined}
        className={`rounded px-2 py-1 text-left text-sm font-medium ${m.ply === current ? "bg-moss text-white" : "hover:bg-moss-soft"}`}>
        {m.san}
      </button>
    ) : <span />;

  const nav = (label: string, icon: React.ReactNode, ply: number | null, disabled: boolean) => (
    <button className="btn !px-2" aria-label={label} title={label} disabled={disabled} onClick={() => onSelect(ply)}>{icon}</button>
  );

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {nav("First move", <ChevronsLeft size={18} />, 0, current === 0)}
        {nav("Previous move", <ChevronLeft size={18} />, Math.max(0, current - 1), current === 0)}
        {nav("Next move", <ChevronRight size={18} />, current + 1, current >= moves.length)}
        {nav("Latest move", <ChevronsRight size={18} />, null, current >= moves.length)}
        {viewPly !== null && <button className="btn btn-primary ml-auto" onClick={() => onSelect(null)}>Back to live</button>}
      </div>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-line bg-paper/60 p-2" aria-label="Move list">
        {rows.length === 0 ? (
          <p className="p-3 text-sm text-ink-soft">No moves yet.</p>
        ) : (
          <div className="grid grid-cols-[2rem_1fr_1fr] items-center gap-y-0.5">
            {rows.map(([w, b], i) => (
              <div key={w.ply} className="contents">
                <span className="text-xs text-ink-soft">{i + 1}.</span>
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
