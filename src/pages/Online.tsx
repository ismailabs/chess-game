import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, TimeControlPicker } from "../components/ui";
import GameView from "../components/GameView";
import { act } from "../lib/api";
import { errMsg } from "../lib/format";
import { navigate } from "../lib/router";
import { supabase } from "../lib/supabase";
import type { Game } from "../lib/types";

type Resume = Pick<Game, "id" | "tc" | "white_id" | "white_name" | "black_name">;

export default function Online({ userId, gameId }: { userId: string; gameId?: string }) {
  if (gameId) return <GameView gameId={gameId} userId={userId} backTo="/online" />;
  return <Lobby userId={userId} />;
}

function Lobby({ userId }: { userId: string }) {
  const [tc, setTc] = useState("5+0");
  const [waiting, setWaiting] = useState<Game | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [active, setActive] = useState<Resume[]>([]);
  const waitingRef = useRef<Game | null>(null);
  waitingRef.current = waiting;

  useEffect(() => {
    supabase.from("games").select("id,tc,white_id,white_name,black_name")
      .eq("mode", "online").eq("status", "active").order("updated_at", { ascending: false }).limit(3)
      .then(({ data }) => setActive((data as Resume[]) ?? []));
  }, []);

  async function find() {
    setBusy(true); setErr(null);
    try {
      const r = await act({ action: "queue", tc });
      if (r.game.status === "active") navigate(`/online/${r.game.id}`); else setWaiting(r.game);
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  }
  async function cancel() {
    const w = waiting; setWaiting(null);
    if (!w) return;
    try { const r = await act({ action: "cancel_queue", gameId: w.id }); if (r.game.status === "active") navigate(`/online/${r.game.id}`); } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!waiting) return;
    const id = waiting.id, wtc = waiting.tc, t0 = Date.now();
    setSecs(0);
    const tick = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 1000);
    const ch = supabase.channel(`queue:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` },
        (p) => { if ((p.new as Game).status === "active") navigate(`/online/${id}`); })
      .subscribe();
    const poll = setInterval(async () => {
      try { const r = await act({ action: "sync", gameId: id }); if (r.game.status === "active") navigate(`/online/${id}`); } catch { /* retry */ }
    }, 6000);
    const beat = setInterval(() => { act({ action: "touch_queue", gameId: id }).catch(() => {}); }, 45_000);
    void wtc;
    return () => { clearInterval(tick); clearInterval(poll); clearInterval(beat); supabase.removeChannel(ch); };
  }, [waiting?.id]);

  useEffect(() => () => {
    const w = waitingRef.current;
    if (w) act({ action: "cancel_queue", gameId: w.id }).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <h1 className="mb-1 text-xl font-semibold">Play online</h1>
        <p className="mb-4 text-sm text-ink-soft">Get paired with another signed-in player. Colours are assigned at random.</p>
        {waiting ? (
          <div role="status" className="flex flex-col items-center gap-3 py-6">
            <RefreshCw className="animate-spin text-moss" />
            <p className="font-medium">Looking for a {waiting.tc} opponent… {secs}s</p>
            <button className="btn" onClick={cancel}>Cancel</button>
          </div>
        ) : (
          <>
            <TimeControlPicker value={tc} onChange={setTc} />
            <button className="btn btn-primary mt-4 w-full" disabled={busy} onClick={find}>{busy ? "Searching…" : "Find opponent"}</button>
          </>
        )}
        {err && <p className="mt-3 text-sm text-danger" role="alert">{err}</p>}
      </Card>
      {active.length > 0 && (
        <Card>
          <h2 className="mb-2 font-semibold">Resume</h2>
          <ul className="space-y-2">
            {active.map((g) => (
              <li key={g.id}>
                <button className="btn w-full justify-between" onClick={() => navigate(`/online/${g.id}`)}>
                  <span>vs {g.white_id === userId ? g.black_name : g.white_name}</span><span className="text-ink-soft">{g.tc}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
