import { useEffect, useState } from "react";
import GameView from "../components/GameView";
import { Card } from "../components/ui";
import { errMsg, fmtDate } from "../lib/format";
import { navigate } from "../lib/router";
import { supabase } from "../lib/supabase";
import type { Game } from "../lib/types";

type Row = Pick<Game, "id" | "mode" | "status" | "result" | "tc" | "white_id" | "black_id" | "white_name" | "black_name" | "ai_color" | "ply" | "updated_at">;

export default function History({ userId, gameId }: { userId: string; gameId?: string }) {
  if (gameId) return <GameView gameId={gameId} userId={userId} backTo="/history" />;
  return <List userId={userId} />;
}

function List({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setErr(null);
    supabase.from("games")
      .select("id,mode,status,result,tc,white_id,black_id,white_name,black_name,ai_color,ply,updated_at")
      .in("status", ["active", "finished"]).order("updated_at", { ascending: false }).limit(50)
      .then(({ data, error }) => { if (error) setErr(errMsg(error)); else setRows((data as Row[]) ?? []); });
  };
  useEffect(load, []);

  const info = (g: Row) => {
    const me = g.mode === "ai" ? (g.ai_color === "w" ? "b" : "w") : g.white_id === userId ? "w" : "b";
    const opp = (me === "w" ? g.black_name : g.white_name) ?? "Opponent";
    let outcome = "In progress";
    if (g.status === "finished") outcome = g.result === "1/2-1/2" ? "Draw" : (g.result === "1-0") === (me === "w") ? "Win" : "Loss";
    return { opp, outcome };
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <h1 className="mb-3 text-xl font-semibold">Game history</h1>
        {err && <p className="text-sm text-danger" role="alert">{err} <button className="underline" onClick={load}>Retry</button></p>}
        {!rows && !err && <p className="text-sm">Loading…</p>}
        {rows && rows.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">No games yet. Play online or against the computer and they will appear here.</p>}
        <ul className="divide-y divide-line">
          {rows?.map((g) => {
            const { opp, outcome } = info(g);
            return (
              <li key={g.id}>
                <button onClick={() => navigate(`/history/${g.id}`)} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-paper/70">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{g.mode === "ai" ? "Computer" : "Online"} · {opp}</div>
                    <div className="text-xs text-ink-soft">{fmtDate(g.updated_at)} · {g.tc === "unlimited" ? "Unlimited" : g.tc} · {Math.ceil(g.ply / 2)} moves</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${outcome === "Win" ? "bg-moss-soft text-moss-dark" : outcome === "Loss" ? "bg-[#f1dcd8] text-danger" : "bg-line"}`}>
                    {g.status === "active" ? "Resume" : outcome}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
