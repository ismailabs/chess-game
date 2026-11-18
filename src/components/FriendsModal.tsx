import { useEffect, useState } from "react";
import { Check, Search, Swords, UserMinus, UserPlus, Users, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { errMsg } from "../lib/format";
import type { Friendship, OnlineStatus, Profile } from "../lib/types";

interface Props {
  currentUserId: string;
  getStatus: (userId: string) => OnlineStatus;
  onChallenge: (friend: Profile) => void;
  onClose: () => void;
}

export default function FriendsModal({
  currentUserId,
  getStatus,
  onChallenge,
  onClose,
}: Props) {
  const [tab, setTab] = useState<"friends" | "requests" | "search">("friends");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingIn, setPendingIn] = useState<Friendship[]>([]);
  const [pendingOut, setPendingOut] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFriendships = async () => {
    try {
      const { data, error: err } = await supabase
        .from("friendships")
        .select(`id, user_id, friend_id, status, created_at, updated_at`)
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (err) throw err;
      const all = (data as Friendship[]) ?? [];

      const otherIds = Array.from(
        new Set(
          all.map((f) => (f.user_id === currentUserId ? f.friend_id : f.user_id))
        )
      );

      let profilesMap: Record<string, Profile> = {};
      if (otherIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, email")
          .in("id", otherIds);
        if (pData) {
          for (const p of pData) profilesMap[p.id] = p as Profile;
        }
      }

      const hydrated = all.map((f) => {
        const otherId = f.user_id === currentUserId ? f.friend_id : f.user_id;
        return { ...f, friend_profile: profilesMap[otherId] };
      });

      setFriends(hydrated.filter((f) => f.status === "accepted"));
      setPendingIn(
        hydrated.filter((f) => f.status === "pending" && f.friend_id === currentUserId)
      );
      setPendingOut(
        hydrated.filter((f) => f.status === "pending" && f.user_id === currentUserId)
      );
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriendships();

    const channel = supabase
      .channel(`friendships:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => loadFriendships()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Search players with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error: err } = await supabase.rpc("search_players", {
          p_query: searchQuery.trim(),
          p_limit: 10,
        });
        if (err) throw err;
        setSearchResults((data as Profile[]) ?? []);
      } catch (e) {
        setError(errMsg(e));
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [searchQuery]);

  async function handleSendRequest(targetId: string) {
    try {
      setError(null);
      const { error: err } = await supabase.rpc("send_friend_request", {
        p_target_id: targetId,
      });
      if (err) throw err;
      await loadFriendships();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function handleRespond(
    friendshipId: string,
    action: "accept" | "decline" | "cancel"
  ) {
    try {
      setError(null);
      const { error: err } = await supabase.rpc("respond_friend_request", {
        p_friendship_id: friendshipId,
        p_action: action,
      });
      if (err) throw err;
      await loadFriendships();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function handleRemoveFriend(targetId: string) {
    if (!confirm("Remove this friend?")) return;
    try {
      setError(null);
      const { error: err } = await supabase.rpc("remove_friend", {
        p_target_id: targetId,
      });
      if (err) throw err;
      await loadFriendships();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  const isFriend = (id: string) => friends.some((f) => f.friend_profile?.id === id);
  const isPendingOut = (id: string) => pendingOut.some((f) => f.friend_profile?.id === id);
  const isPendingIn = (id: string) => pendingIn.some((f) => f.friend_profile?.id === id);

  return (
    <div
      role="dialog"
      aria-label="Friends & Social"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="flex h-[38rem] w-full max-w-lg flex-col rounded-3xl border border-white/15 bg-[#262522] text-stone-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#302e2b]">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-[#81b64c]/20 text-[#81b64c]">
              <Users size={18} />
            </div>
            <h2 className="text-lg font-bold font-heading text-stone-100">Friends & Social</h2>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-white/10 hover:text-white transition-colors"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#1e1d1b] px-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setTab("friends")}
            className={`border-b-2 py-3 px-3 transition-colors ${
              tab === "friends"
                ? "border-[#81b64c] text-[#81b64c]"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={`relative border-b-2 py-3 px-3 transition-colors ${
              tab === "requests"
                ? "border-[#81b64c] text-[#81b64c]"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            Requests
            {pendingIn.length > 0 && (
              <span className="ml-1.5 rounded-full bg-[#81b64c] px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendingIn.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("search")}
            className={`border-b-2 py-3 px-3 transition-colors ${
              tab === "search"
                ? "border-[#81b64c] text-[#81b64c]"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            Find Players
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {error && (
            <div
              className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* TAB 1: FRIENDS LIST */}
          {tab === "friends" && (
            <div>
              {loading ? (
                <p className="py-12 text-center text-sm text-stone-400">Loading friends…</p>
              ) : friends.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-white/5 text-stone-500">
                    <Users size={24} />
                  </div>
                  <p className="font-bold text-stone-200 font-heading">No friends added yet</p>
                  <p className="mt-1 text-xs text-stone-400 max-w-xs mx-auto">
                    Search for players by username or email to send challenge invites.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary mt-4"
                    onClick={() => setTab("search")}
                  >
                    <Search size={14} /> Find Players
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {friends.map((f) => {
                    const profile = f.friend_profile;
                    if (!profile) return null;
                    const st = getStatus(profile.id);
                    return (
                      <li
                        key={f.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        {/* User identity capsule */}
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="relative shrink-0">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="size-10 rounded-xl object-cover border border-white/10"
                              />
                            ) : (
                              <span className="grid size-10 place-items-center rounded-xl bg-[#383632] font-bold text-stone-200 text-sm">
                                {profile.display_name[0]?.toUpperCase()}
                              </span>
                            )}
                            <span
                              title={`Status: ${st}`}
                              className={`absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#262522] ${
                                st === "online"
                                  ? "bg-[#81b64c]"
                                  : st === "in-game"
                                  ? "bg-amber-400 animate-pulse"
                                  : "bg-stone-500"
                              }`}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-stone-100">
                              {profile.display_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-stone-400">
                              <span className="truncate">@{profile.username}</span>
                              <span>·</span>
                              <span
                                className={`font-semibold capitalize ${
                                  st === "online"
                                    ? "text-[#81b64c]"
                                    : st === "in-game"
                                    ? "text-amber-400"
                                    : "text-stone-500"
                                }`}
                              >
                                {st}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                          <button
                            type="button"
                            className="btn btn-primary !py-1 !px-3 text-xs shrink-0 whitespace-nowrap"
                            onClick={() => {
                              onChallenge(profile);
                              onClose();
                            }}
                            title="Challenge to a match"
                          >
                            <Swords size={14} />
                            Challenge
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost !p-2 text-stone-400 hover:text-red-400 shrink-0"
                            onClick={() => handleRemoveFriend(profile.id)}
                            title="Remove friend"
                          >
                            <UserMinus size={15} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* TAB 2: REQUESTS */}
          {tab === "requests" && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-stone-400">
                  Incoming Requests ({pendingIn.length})
                </h3>
                {pendingIn.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-stone-400">
                    No pending incoming friend requests
                  </p>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {pendingIn.map((r) => {
                      const profile = r.friend_profile;
                      if (!profile) return null;
                      return (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-3 py-2.5"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="size-8 rounded-lg shrink-0"
                              />
                            ) : (
                              <span className="grid size-8 place-items-center rounded-lg bg-[#383632] text-xs font-bold shrink-0">
                                {profile.display_name[0]?.toUpperCase()}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">
                                {profile.display_name}
                              </div>
                              <div className="truncate text-xs text-stone-400">
                                @{profile.username}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0 whitespace-nowrap">
                            <button
                              type="button"
                              className="btn btn-primary !py-1 !px-2.5 text-xs shrink-0 whitespace-nowrap"
                              onClick={() => handleRespond(r.id, "accept")}
                            >
                              <Check size={13} /> Accept
                            </button>
                            <button
                              type="button"
                              className="btn !py-1 !px-2 text-xs shrink-0 whitespace-nowrap"
                              onClick={() => handleRespond(r.id, "decline")}
                            >
                              Decline
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-stone-400">
                  Outgoing Requests ({pendingOut.length})
                </h3>
                {pendingOut.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-stone-400">
                    No pending outgoing requests
                  </p>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {pendingOut.map((r) => {
                      const profile = r.friend_profile;
                      if (!profile) return null;
                      return (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-3 py-2.5"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="size-8 rounded-lg shrink-0"
                              />
                            ) : (
                              <span className="grid size-8 place-items-center rounded-lg bg-[#383632] text-xs font-bold shrink-0">
                                {profile.display_name[0]?.toUpperCase()}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">
                                {profile.display_name}
                              </div>
                              <div className="truncate text-xs text-stone-400">
                                @{profile.username}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn !py-1 !px-2.5 text-xs text-stone-400 hover:text-stone-200 shrink-0 whitespace-nowrap"
                            onClick={() => handleRespond(r.id, "cancel")}
                          >
                            Cancel
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SEARCH PLAYERS */}
          {tab === "search" && (
            <div>
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search by username or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1e1d1b] py-2.5 pl-10 pr-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-[#81b64c] focus:outline-hidden"
                  autoFocus
                />
              </div>

              {searching && (
                <p className="py-4 text-center text-xs text-stone-400">Searching players…</p>
              )}

              {!searching && searchResults.length === 0 && searchQuery.trim() && (
                <p className="py-8 text-center text-sm text-stone-400">
                  No players found matching &ldquo;{searchQuery}&rdquo;.
                </p>
              )}

              <ul className="divide-y divide-white/10">
                {searchResults.map((p) => {
                  const alreadyFriend = isFriend(p.id);
                  const requested = isPendingOut(p.id);
                  const hasIncoming = isPendingIn(p.id);

                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt=""
                            className="size-9 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <span className="grid size-9 place-items-center rounded-xl bg-[#383632] text-xs font-bold shrink-0">
                            {p.display_name[0]?.toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{p.display_name}</div>
                          <div className="truncate text-xs text-stone-400">@{p.username}</div>
                        </div>
                      </div>

                      <div className="shrink-0 whitespace-nowrap">
                        {alreadyFriend ? (
                          <span className="rounded-full bg-[#81b64c]/20 px-3 py-1 text-xs font-semibold text-[#81b64c]">
                            Friends
                          </span>
                        ) : requested ? (
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-stone-400">
                            Request Sent
                          </span>
                        ) : hasIncoming ? (
                          <button
                            type="button"
                            className="btn btn-primary !py-1 !px-3 text-xs shrink-0 whitespace-nowrap"
                            onClick={() => setTab("requests")}
                          >
                            Respond
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary !py-1 !px-3 text-xs shrink-0 whitespace-nowrap"
                            onClick={() => handleSendRequest(p.id)}
                          >
                            <UserPlus size={13} /> Add Friend
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
