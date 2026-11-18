import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { navigate } from "../lib/router";
import { playInviteSound } from "../lib/sounds";
import type { GameInvite, Profile } from "../lib/types";

export function useFriendInvites(userId: string | undefined) {
  const [incomingInvite, setIncomingInvite] = useState<GameInvite | null>(null);
  const [outgoingInvite, setOutgoingInvite] = useState<GameInvite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to fetch sender profile
  const hydrateSender = async (invite: GameInvite): Promise<GameInvite> => {
    if (invite.sender_profile) return invite;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", invite.sender_id)
      .maybeSingle();
    return { ...invite, sender_profile: (data as Profile) ?? undefined };
  };

  // Check initial pending incoming invites
  useEffect(() => {
    if (!userId) return;

    supabase
      .from("game_invites")
      .select("*, sender_profile:profiles!game_invites_sender_id_fkey(id, username, display_name, avatar_url)")
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .then(async ({ data }) => {
        if (data && data.length > 0) {
          const inv = data[0] as unknown as GameInvite;
          setIncomingInvite(await hydrateSender(inv));
          playInviteSound();
        }
      });
  }, [userId]);

  // Realtime subscription for incoming & outgoing invites
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`invites:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_invites",
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const inv = payload.new as unknown as GameInvite;
            if (inv.status === "pending" && new Date(inv.expires_at) > new Date()) {
              setIncomingInvite(await hydrateSender(inv));
              playInviteSound();
            } else if (inv.id === incomingInvite?.id && inv.status !== "pending") {
              setIncomingInvite(null);
            }
          } else if (payload.eventType === "DELETE") {
            setIncomingInvite(null);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_invites",
          filter: `sender_id=eq.${userId}`,
        },
        (payload) => {
          const inv = payload.new as unknown as GameInvite;
          if (inv.status === "accepted" && inv.game_id) {
            setOutgoingInvite(null);
            navigate(`/online/${inv.game_id}`);
          } else if (inv.status === "declined" || inv.status === "cancelled" || inv.status === "expired") {
            setOutgoingInvite(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, incomingInvite?.id]);

  const acceptInvite = useCallback(
    async (inviteId: string) => {
      setBusy(true);
      setError(null);
      try {
        const { data, error: rpcErr } = await supabase.rpc("accept_game_invite", {
          p_invite_id: inviteId,
        });
        if (rpcErr) throw rpcErr;
        const res = data as { success: boolean; game_id?: string };
        setIncomingInvite(null);
        if (res.game_id) {
          navigate(`/online/${res.game_id}`);
        }
      } catch (err: any) {
        setError(err.message ?? "Failed to accept invite");
        setIncomingInvite(null);
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const declineInvite = useCallback(async (inviteId: string) => {
    setBusy(true);
    try {
      await supabase.rpc("decline_game_invite", { p_invite_id: inviteId });
      setIncomingInvite(null);
    } catch {
      setIncomingInvite(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const cancelOutgoingInvite = useCallback(async (inviteId: string) => {
    try {
      await supabase.rpc("cancel_game_invite", { p_invite_id: inviteId });
      setOutgoingInvite(null);
    } catch {
      setOutgoingInvite(null);
    }
  }, []);

  return {
    incomingInvite,
    outgoingInvite,
    setOutgoingInvite,
    acceptInvite,
    declineInvite,
    cancelOutgoingInvite,
    busy,
    error,
  };
}
