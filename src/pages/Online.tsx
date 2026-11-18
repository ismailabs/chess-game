import { useEffect, useRef, useState } from "react";
import { RefreshCw, Users, Zap } from "lucide-react";
import { Card, TimeControlPicker } from "../components/ui";
import GameView from "../components/GameView";
import { act } from "../lib/api";
import { errMsg } from "../lib/format";
import { navigate } from "../lib/router";
import { supabase } from "../lib/supabase";
import type { Game, OnlineStatus } from "../lib/types";

type Resume = Pick<Game, "id" | "tc" | "white_id" | "white_name" | "black_name" | "black_id">;

interface OnlineProps {
  userId: string;
  gameId?: string;
  onOpenFriends?: () => void;
  getStatus?: (id: string) => OnlineStatus;
}

export default function Online({ userId, gameId, onOpenFriends, getStatus }: OnlineProps) {
  if (gameId) return <GameView gameId={gameId} userId={userId} backTo="/online" />;
  return <Lobby userId={userId} onOpenFriends={onOpenFriends} getStatus={getStatus} />;
}

function Lobby({
  userId,
  onOpenFriends,
  getStatus,
}: {
  userId: string;
  onOpenFriends?: () => void;
  getStatus?: (id: string) => OnlineStatus;
}) {
  const [tc, setTc] = useState("3+2");
  const [waiting, setWaiting] = useState<Game | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [active, setActive] = useState<Resume[]>([]);
  const waitingRef = useRef<Game | null>(null);
  waitingRef.current = waiting;

  useEffect(() => {
    supabase
      .from("games")
      .select("id,tc,white_id,black_id,white_name,black_name")
      .eq("mode", "online")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setActive((data as Resume[]) ?? []));
  }, []);

  async function find() {
    setBusy(true);
    setErr(null);
    try {
      const r = await act({ action: "queue", tc });
      if (r.game.status === "active") navigate(`/online/${r.game.id}`);
      else setWaiting(r.game);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    const w = waiting;
    setWaiting(null);
    if (!w) return;
    try {
      const r = await act({ action: "cancel_queue", gameId: w.id });
      if (r.game.status === "active") navigate(`/online/${r.game.id}`);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!waiting) return;
    const id = waiting.id,
      t0 = Date.now();
    setSecs(0);
    const tick = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 1000);
    const ch = supabase
      .channel(`queue:${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` },
        (p) => {
          if ((p.new as Game).status === "active") navigate(`/online/${id}`);
        }
      )
      .subscribe();
    const poll = setInterval(async () => {
      try {
        const r = await act({ action: "sync", gameId: id });
        if (r.game.status === "active") navigate(`/online/${id}`);
      } catch {
        /* retry */
      }
    }, 6000);
    const beat = setInterval(() => {
      act({ action: "touch_queue", gameId: id }).catch(() => {});
    }, 45_000);

    return () => {
      clearInterval(tick);
      clearInterval(poll);
      clearInterval(beat);
      supabase.removeChannel(ch);
    };
  }, [waiting?.id]);

  useEffect(
    () => () => {
      const w = waitingRef.current;
      if (w) act({ action: "cancel_queue", gameId: w.id }).catch(() => {});
    },
    []
  );

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {/* Matchmaking Card */}
      <Card className="bg-[#262522] border-white/10 space-y-5 p-6 sm:p-8 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-[#81b64c] mb-2">
            <span className="size-1.5 rounded-full bg-[#81b64c] animate-pulse" />
            Live Matches
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight font-heading text-stone-100">
            Play Online
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            Get paired instantly with players across the globe or challenge friends directly.
          </p>
        </div>

        {waiting ? (
          <div role="status" className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="relative">
              <div className="size-16 rounded-full border-2 border-[#81b64c]/20 border-t-[#81b64c] animate-spin" />
              <div className="absolute inset-0 grid place-items-center text-[#81b64c]">
                <Zap size={22} />
              </div>
            </div>
            <div>
              <p className="text-base font-bold text-stone-100 font-heading">
                Searching for a {tc === "unlimited" ? "Unlimited" : tc} opponent…
              </p>
              <p className="text-xs font-mono text-[#81b64c] font-bold mt-1">Elapsed: {secs}s</p>
              <p className="text-xs text-stone-400 mt-0.5">Colors will be assigned randomly upon pairing.</p>
            </div>
            <button type="button" className="btn mt-2 !px-6" onClick={cancel}>
              Cancel Matchmaking
            </button>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-stone-400">
                Choose Time Control
              </p>
              <TimeControlPicker value={tc} onChange={setTc} />
            </div>

            <div className="flex flex-col gap-2.5 pt-3 sm:flex-row">
              <button
                type="button"
                className="btn btn-primary flex-1 !py-3 text-sm font-bold shadow-md"
                disabled={busy}
                onClick={find}
              >
                <Zap size={16} /> {busy ? "Connecting…" : "Find Opponent"}
              </button>

              {onOpenFriends && (
                <button
                  type="button"
                  className="btn flex-1 !py-3 text-sm font-semibold"
                  onClick={onOpenFriends}
                >
                  <Users size={16} className="text-[#81b64c]" /> Challenge Friend
                </button>
              )}
            </div>
          </>
        )}

        {err && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
          >
            {err}
          </div>
        )}
      </Card>

      {/* Active Ongoing Games */}
      {active.length > 0 && (
        <Card className="bg-[#262522] border-white/10 p-5 shadow-xl">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">
            Active Games in Progress
          </h2>
          <ul className="space-y-2">
            {active.map((g) => {
              const oppId = g.white_id === userId ? g.black_id : g.white_id;
              const oppName = g.white_id === userId ? g.black_name : g.white_name;
              const oppStatus = oppId && getStatus ? getStatus(oppId) : "online";
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    className="btn w-full justify-between !py-2.5 !px-3.5 bg-[#302e2b] hover:bg-[#383632]"
                    onClick={() => navigate(`/online/${g.id}`)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`size-2.5 rounded-full ${
                          oppStatus === "online"
                            ? "bg-[#81b64c]"
                            : oppStatus === "in-game"
                            ? "bg-amber-400"
                            : "bg-stone-500"
                        }`}
                      />
                      <span className="font-semibold text-stone-200">vs {oppName ?? "Opponent"}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#81b64c] bg-[#81b64c]/15 px-2.5 py-0.5 rounded-lg border border-[#81b64c]/20">
                      {g.tc === "unlimited" ? "Unlimited" : g.tc} · Resume
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
