import { useEffect, useState } from "react";
import { Check, Clock, Swords, X } from "lucide-react";
import { Button } from "./ui";
import type { GameInvite } from "../lib/types";

interface Props {
  invite: GameInvite;
  onAccept: (inviteId: string) => void;
  onDecline: (inviteId: string) => void;
  busy?: boolean;
}

export default function ChallengeToast({ invite, onAccept, onDecline, busy }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const ms = new Date(invite.expires_at).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  });

  useEffect(() => {
    const t = setInterval(() => {
      const ms = new Date(invite.expires_at).getTime() - Date.now();
      const s = Math.max(0, Math.floor(ms / 1000));
      setSecondsLeft(s);
      if (s <= 0) {
        clearInterval(t);
        onDecline(invite.id);
      }
    }, 1000);

    return () => clearInterval(t);
  }, [invite.expires_at, invite.id, onDecline]);

  const sender = invite.sender_profile;
  const name = sender?.display_name ?? "A friend";
  const colorText =
    invite.color_preference === "w"
      ? "You play Black"
      : invite.color_preference === "b"
      ? "You play White"
      : "Random color";

  return (
    <div
      role="alert"
      className="fixed bottom-16 md:bottom-6 right-4 sm:right-6 z-50 flex max-w-sm items-center gap-3.5 rounded-2xl border border-[var(--primary)] bg-[var(--surface-container-high)] p-4 shadow-2xl ring-1 ring-[var(--primary)]/40 animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="relative shrink-0">
        {sender?.avatar_url ? (
          <img
            src={sender.avatar_url}
            alt=""
            className="size-11 rounded-xl object-cover border border-[var(--outline)]"
          />
        ) : (
          <span className="grid size-11 place-items-center rounded-xl bg-[var(--surface-container)] font-bold text-[var(--on-surface)] text-base">
            {name[0]?.toUpperCase()}
          </span>
        )}
        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-[var(--primary)] text-white shadow-sm">
          <Swords size={11} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-[var(--on-surface)]">{name} challenged you!</div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--on-surface-variant)]">
          <Clock size={12} className="text-[var(--primary)]" />
          <span className="font-mono">{invite.tc}</span>
          <span>·</span>
          <span>{colorText}</span>
          <span>·</span>
          <span className="font-mono text-[var(--primary)] font-bold tabular-nums">{secondsLeft}s</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
        <Button
          variant="filled"
          size="sm"
          className="!h-8 !px-3 text-xs font-bold shrink-0"
          disabled={busy}
          onClick={() => onAccept(invite.id)}
          title="Accept challenge"
        >
          <Check size={14} /> Accept
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="!h-8 !px-2 text-xs text-[var(--on-surface-variant)] hover:text-red-500 shrink-0"
          disabled={busy}
          onClick={() => onDecline(invite.id)}
          title="Decline challenge"
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
