import { useState } from "react";
import { Clock, RefreshCw, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { errMsg } from "../lib/format";
import type { GameInvite, OnlineStatus, Profile } from "../lib/types";

interface Props {
  friend: Profile;
  status: OnlineStatus;
  onClose: () => void;
  onInviteSent: (invite: GameInvite) => void;
}

const TIME_PRESETS = [
  { id: "1+0", label: "1 min", kind: "Bullet" },
  { id: "3+2", label: "3+2", kind: "Blitz" },
  { id: "10+0", label: "10 min", kind: "Rapid" },
  { id: "unlimited", label: "Unlimited", kind: "Casual" },
];

export default function InviteModal({ friend, status, onClose, onInviteSent }: Props) {
  const [tc, setTc] = useState("3+2");
  const [color, setColor] = useState<"w" | "b" | "random">("random");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSend() {
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await supabase.rpc("create_game_invite", {
        p_receiver_id: friend.id,
        p_tc: tc,
        p_color: color,
      });
      if (error) throw error;
      const res = data as { success: boolean; invite_id: string };
      onInviteSent({
        id: res.invite_id,
        sender_id: "",
        receiver_id: friend.id,
        tc,
        initial_ms: tc === "1+0" ? 60000 : tc === "3+2" ? 180000 : tc === "10+0" ? 600000 : 86400000,
        increment_ms: tc === "3+2" ? 2000 : 0,
        color_preference: color,
        status: "pending",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 120000).toISOString(),
      });
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {friend.avatar_url ? (
              <img src={friend.avatar_url} alt="" className="size-10 rounded-full" />
            ) : (
              <span className="grid size-10 place-items-center rounded-full bg-line font-bold">
                {friend.display_name[0]?.toUpperCase()}
              </span>
            )}
            <div>
              <h2 className="text-base font-semibold">Challenge {friend.display_name}</h2>
              <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                <span
                  className={`size-2 rounded-full ${
                    status === "online"
                      ? "bg-emerald-500"
                      : status === "in-game"
                      ? "bg-amber-500"
                      : "bg-gray-400"
                  }`}
                />
                <span className="capitalize">{status}</span>
                <span>·</span>
                <span>@{friend.username}</span>
              </div>
            </div>
          </div>
          <button className="btn !p-2" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Time Control
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TIME_PRESETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTc(t.id)}
                  className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition ${
                    tc === t.id
                      ? "border-moss bg-moss-soft text-ink font-semibold"
                      : "border-line bg-paper/60 hover:bg-[#efece3]"
                  }`}
                >
                  <Clock size={16} className={tc === t.id ? "text-moss" : "text-ink-soft"} />
                  <span className="mt-1 text-sm font-medium">{t.label}</span>
                  <span className="text-[10px] text-ink-soft">{t.kind}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Your Side
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setColor("w")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-sm font-medium transition ${
                  color === "w" ? "border-moss bg-moss-soft" : "border-line bg-paper/60 hover:bg-[#efece3]"
                }`}
              >
                <span className="size-3.5 rounded-full border border-ink/40 bg-white" />
                White
              </button>
              <button
                type="button"
                onClick={() => setColor("b")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-sm font-medium transition ${
                  color === "b" ? "border-moss bg-moss-soft" : "border-line bg-paper/60 hover:bg-[#efece3]"
                }`}
              >
                <span className="size-3.5 rounded-full border border-white/40 bg-zinc-900" />
                Black
              </button>
              <button
                type="button"
                onClick={() => setColor("random")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-sm font-medium transition ${
                  color === "random" ? "border-moss bg-moss-soft" : "border-line bg-paper/60 hover:bg-[#efece3]"
                }`}
              >
                <span className="size-3.5 rounded-full border border-ink/30 bg-gradient-to-r from-white to-zinc-900" />
                Random
              </button>
            </div>
          </div>

          {err && (
            <p className="text-xs text-danger" role="alert">
              {err}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button className="btn flex-1" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary flex-1" onClick={handleSend} disabled={busy}>
              {busy ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Sending…
                </>
              ) : (
                "Send Challenge"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
