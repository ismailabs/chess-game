import { useEffect, useState } from "react";
import { History as HistoryIcon, Swords, Bot } from "lucide-react";
import GameView from "../components/GameView";
import { Card } from "../components/ui";
import { errMsg, fmtDate } from "../lib/format";
import { navigate } from "../lib/router";
import { supabase } from "../lib/supabase";
import type { Game } from "../lib/types";

type Row = Pick<
  Game,
  | "id"
  | "mode"
  | "status"
  | "result"
  | "tc"
  | "white_id"
  | "black_id"
  | "white_name"
  | "black_name"
  | "ai_color"
  | "ply"
  | "updated_at"
>;

export default function History({ userId, gameId }: { userId: string; gameId?: string }) {
  if (gameId) return <GameView gameId={gameId} userId={userId} backTo="/history" />;
  return <List userId={userId} />;
}

function List({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setErr(null);
    supabase
      .from("games")
      .select(
        "id,mode,status,result,tc,white_id,black_id,white_name,black_name,ai_color,ply,updated_at"
      )
      .in("status", ["active", "finished"])
      .order("updated_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) setErr(errMsg(error));
        else setRows((data as Row[]) ?? []);
      });
  };
  useEffect(load, []);

  const info = (g: Row) => {
    const me =
      g.mode === "ai"
        ? g.ai_color === "w"
          ? "b"
          : "w"
        : g.white_id === userId
        ? "w"
        : "b";
    const opp = (me === "w" ? g.black_name : g.white_name) ?? "Opponent";
    let outcome = "In progress";
    if (g.status === "finished") {
      outcome =
        g.result === "1/2-1/2"
          ? "Draw"
          : (g.result === "1-0") === (me === "w")
          ? "Win"
          : "Loss";
    }
    return { opp, outcome };
  };

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <Card className="bg-[#262522] border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-stone-300 mb-2">
            <HistoryIcon size={13} className="text-[#81b64c]" />
            Match Archives
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight font-heading text-stone-100">
            Game History
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            Review past games, analyze move notations, and export PGN archives.
          </p>
        </div>

        {err && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
          >
            {err}{" "}
            <button type="button" className="underline font-bold ml-1" onClick={load}>
              Retry
            </button>
          </div>
        )}

        {!rows && !err && (
          <p className="py-8 text-center text-sm text-stone-400">Loading match archives…</p>
        )}

        {rows && rows.length === 0 && (
          <p className="py-12 text-center text-sm text-stone-400">
            No games recorded yet. Play online or against Stockfish to build your match history.
          </p>
        )}

        <ul className="divide-y divide-white/10">
          {rows?.map((g) => {
            const { opp, outcome } = info(g);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/history/${g.id}`)}
                  className="flex w-full items-center justify-between gap-4 py-3.5 text-left rounded-xl px-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid size-9 place-items-center rounded-xl bg-[#383632] text-stone-300 shrink-0">
                      {g.mode === "ai" ? <Bot size={18} /> : <Swords size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-sm text-stone-100">
                        {g.mode === "ai" ? "Computer" : "Online"} · {opp}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-stone-400 mt-0.5">
                        <span>{fmtDate(g.updated_at)}</span>
                        <span>·</span>
                        <span>{g.tc === "unlimited" ? "Unlimited" : g.tc}</span>
                        <span>·</span>
                        <span>{Math.ceil(g.ply / 2)} moves</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold font-mono shrink-0 whitespace-nowrap ${
                      outcome === "Win"
                        ? "bg-[#81b64c]/20 text-[#81b64c] border border-[#81b64c]/30"
                        : outcome === "Loss"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : outcome === "Draw"
                        ? "bg-white/10 text-stone-300 border border-white/10"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {g.status === "active" ? "In Progress" : outcome}
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
