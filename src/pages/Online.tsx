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
    <div className="mx-auto max-w-xl space-y-4">
      <Card className="space-y-4">
        <div>
          <h1 className="mb-1 text-xl font-bold tracking-tight">Play online</h1>
          <p className="text-sm text-ink-soft">
            Get paired with an online player or challenge your friends directly.
          </p>
        </div>

        {waiting ? (
          <div role="status" className="flex flex-col items-center gap-3 py-6">
            <RefreshCw className="animate-spin text-moss" size={24} />
            <p className="font-semibold">
              Looking for a {tc === "unlimited" ? "Unlimited" : tc} opponent… {secs}s
            </p>
            <p className="text-xs text-ink-soft">Colors will be assigned at random.</p>
            <button className="btn mt-2" onClick={cancel}>
              Cancel matchmaking
            </button>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Choose Time Control
              </p>
              <TimeControlPicker value={tc} onChange={setTc} />
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <button
                className="btn btn-primary flex-1 !py-2.5 font-semibold"
                disabled={busy}
                onClick={find}
              >
                <Zap size={16} /> {busy ? "Finding Match…" : "Find Opponent"}
              </button>

              {onOpenFriends && (
                <button
                  type="button"
                  className="btn flex-1 !py-2.5 font-medium"
                  onClick={onOpenFriends}
                >
                  <Users size={16} className="text-moss" /> Challenge a Friend
                </button>
              )}
            </div>
          </>
        )}
        {err && (
          <p className="text-xs text-danger" role="alert">
            {err}
          </p>
        )}
      </Card>

      {active.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-soft">
            Active Games
          </h2>
          <ul className="space-y-2">
            {active.map((g) => {
              const oppId = g.white_id === userId ? g.black_id : g.white_id;
              const oppName = g.white_id === userId ? g.black_name : g.white_name;
              const oppStatus = oppId && getStatus ? getStatus(oppId) : "online";
              return (
                <li key={g.id}>
                  <button
                    className="btn w-full justify-between"
                    onClick={() => navigate(`/online/${g.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${
                          oppStatus === "online"
                            ? "bg-emerald-500"
                            : oppStatus === "in-game"
                            ? "bg-amber-500"
                            : "bg-gray-400"
                        }`}
                      />
                      <span>vs {oppName ?? "Opponent"}</span>
                    </div>
                    <span className="text-xs font-medium text-moss-dark bg-moss-soft px-2 py-0.5 rounded-md">
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
