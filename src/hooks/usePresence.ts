import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { OnlineStatus, UserPresence } from "../lib/types";

export function usePresence(userId: string | undefined, inGameId?: string | null) {
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel("presence:global", {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    const syncState = () => {
      const state = channel.presenceState();
      const nextMap: Record<string, UserPresence> = {};
      for (const [key, presences] of Object.entries(state)) {
        if (Array.isArray(presences) && presences.length > 0) {
          const latest = presences[presences.length - 1] as unknown as UserPresence;
          nextMap[key] = {
            user_id: latest.user_id ?? key,
            status: latest.status ?? "online",
            game_id: latest.game_id ?? null,
          };
        }
      }
      setPresenceMap(nextMap);
    };

    channel
      .on("presence", { event: "sync" }, syncState)
      .on("presence", { event: "join" }, syncState)
      .on("presence", { event: "leave" }, syncState)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({
            user_id: userId,
            status: inGameId ? "in-game" : "online",
            game_id: inGameId ?? null,
            updated_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId]);

  // Update status when entering or leaving a game
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch || !userId) return;
    ch.track({
      user_id: userId,
      status: inGameId ? "in-game" : "online",
      game_id: inGameId ?? null,
      updated_at: new Date().toISOString(),
    });
  }, [userId, inGameId]);

  const getStatus = useCallback(
    (targetUserId: string): OnlineStatus => {
      const p = presenceMap[targetUserId];
      if (!p) return "offline";
      return p.status === "in-game" ? "in-game" : "online";
    },
    [presenceMap]
  );

  return { presenceMap, getStatus };
}
