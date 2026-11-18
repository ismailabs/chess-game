import { useState } from "react";
import { Clock, RefreshCw, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { errMsg } from "../lib/format";
import { Button } from "./ui";
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
        initial_ms:
          tc === "1+0" ? 60000 : tc === "3+2" ? 180000 : tc === "10+0" ? 600000 : 86400000,
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
    <div
      role="dialog"
      aria-label="Challenge Friend"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-3xl border border-[var(--outline)] bg-[var(--surface)] text-[var(--on-surface)] p-6 shadow-2xl relative overflow-hidden">
        {/* Top header */}
        <div className="mb-5 flex items-center justify-between border-b border-[var(--outline)] pb-4">
          <div className="flex items-center gap-3">
            {friend.avatar_url ? (
              <img
                src={friend.avatar_url}
                alt=""
                className="size-11 rounded-xl object-cover border border-[var(--outline)] shrink-0"
              />
            ) : (
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--surface-container-high)] font-bold text-[var(--on-surface)] text-base shrink-0">
                {friend.display_name[0]?.toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold font-heading text-[var(--on-surface)]">
                Challenge {friend.display_name}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-[var(--on-surface-variant)]">
                <span
                  className={`size-2 rounded-full ${
                    status === "online"
                      ? "bg-[var(--primary)]"
                      : status === "in-game"
                      ? "bg-amber-400"
                      : "bg-stone-500"
                  }`}
                />
                <span className="capitalize">{status}</span>
                <span>·</span>
                <span className="truncate">@{friend.username}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Time control selection */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
              Time Control
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TIME_PRESETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTc(t.id)}
                  className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                    tc === t.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--on-surface)] ring-1 ring-[var(--primary)] shadow-sm font-bold"
                      : "border-[var(--outline)] bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                  }`}
                >
                  <Clock
                    size={16}
                    className={tc === t.id ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)]"}
                  />
                  <span className="mt-1 font-mono text-sm">{t.label}</span>
                  <span className="text-[10px] text-[var(--on-surface-variant)]">{t.kind}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color selection */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
              Your Pieces
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setColor("w")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  color === "w"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--on-surface)] ring-1 ring-[var(--primary)]"
                    : "border-[var(--outline)] bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                }`}
              >
                <span className="size-3.5 rounded-full border border-black/30 bg-stone-100 shadow-xs" />
                White
              </button>
              <button
                type="button"
                onClick={() => setColor("b")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  color === "b"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--on-surface)] ring-1 ring-[var(--primary)]"
                    : "border-[var(--outline)] bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                }`}
              >
                <span className="size-3.5 rounded-full border border-white/30 bg-stone-900 shadow-xs" />
                Black
              </button>
              <button
                type="button"
                onClick={() => setColor("random")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  color === "random"
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--on-surface)] ring-1 ring-[var(--primary)]"
                    : "border-[var(--outline)] bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                }`}
              >
                <span className="size-3.5 rounded-full border border-white/20 bg-gradient-to-r from-stone-100 to-stone-900 shadow-xs" />
                Random
              </button>
            </div>
          </div>

          {err && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500"
            >
              {err}
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <Button
              variant="outlined"
              className="flex-1"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              className="flex-1 font-bold"
              onClick={handleSend}
              disabled={busy}
            >
              {busy ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Sending…
                </>
              ) : (
                "Send Challenge"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
