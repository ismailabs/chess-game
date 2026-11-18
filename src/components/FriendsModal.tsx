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

export default function FriendsModal({ currentUserId, getStatus, onChallenge, onClose }: Props) {
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
        .select(`
          id, user_id, friend_id, status, created_at, updated_at
        `)
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (err) throw err;
      const all = (data as Friendship[]) ?? [];

      // Collect user IDs to hydrate profiles
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
      setPendingIn(hydrated.filter((f) => f.status === "pending" && f.friend_id === currentUserId));
      setPendingOut(hydrated.filter((f) => f.status === "pending" && f.user_id === currentUserId));
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

  async function handleRespond(friendshipId: string, action: "accept" | "decline" | "cancel") {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs">
      <div className="flex h-[36rem] w-full max-w-lg flex-col rounded-2xl border border-line bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-moss" />
            <h2 className="text-lg font-semibold">Friends & Social</h2>
          </div>
          <button className="btn !p-2" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-line bg-paper/50 px-5 text-sm font-medium">
          <button
            onClick={() => setTab("friends")}
            className={`border-b-2 py-3 px-3 transition ${
              tab === "friends"
                ? "border-moss text-moss-dark font-semibold"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setTab("requests")}
            className={`relative border-b-2 py-3 px-3 transition ${
              tab === "requests"
                ? "border-moss text-moss-dark font-semibold"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            Requests
            {pendingIn.length > 0 && (
              <span className="ml-1.5 rounded-full bg-moss px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingIn.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("search")}
            className={`border-b-2 py-3 px-3 transition ${
              tab === "search"
                ? "border-moss text-moss-dark font-semibold"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            Find Players
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-danger" role="alert">
              {error}
            </div>
          )}

          {/* TAB 1: FRIENDS LIST */}
          {tab === "friends" && (
            <div>
              {loading ? (
                <p className="py-8 text-center text-sm text-ink-soft">Loading friends…</p>
              ) : friends.length === 0 ? (
                <div className="py-12 text-center">
                  <Users size={32} className="mx-auto mb-2 text-ink-soft opacity-40" />
                  <p className="font-medium">No friends added yet</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Switch to &ldquo;Find Players&rdquo; to search by username or email.
                  </p>
                  <button
                    className="btn btn-primary mt-4"
                    onClick={() => setTab("search")}
                  >
                    <Search size={14} /> Find Players
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {friends.map((f) => {
                    const profile = f.friend_profile;
                    if (!profile) return null;
                    const st = getStatus(profile.id);
                    return (
                      <li
                        key={f.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="size-10 rounded-full"
                              />
                            ) : (
                              <span className="grid size-10 place-items-center rounded-full bg-line font-bold">
                                {profile.display_name[0]?.toUpperCase()}
                              </span>
                            )}
                            <span
                              title={`Status: ${st}`}
                              className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${
                                st === "online"
                                  ? "bg-emerald-500"
                                  : st === "in-game"
                                  ? "bg-amber-500 animate-pulse"
                                  : "bg-gray-400"
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {profile.display_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                              <span>@{profile.username}</span>
                              <span>·</span>
                              <span
                                className={`font-medium capitalize ${
                                  st === "online"
                                    ? "text-emerald-700"
                                    : st === "in-game"
                                    ? "text-amber-700"
                                    : "text-ink-soft"
                                }`}
                              >
                                {st}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            className="btn btn-primary !py-1 !px-2.5 text-xs"
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
                            className="btn !py-1 !px-2 text-ink-soft hover:text-danger"
                            onClick={() => handleRemoveFriend(profile.id)}
                            title="Remove friend"
                          >
                            <UserMinus size={14} />
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
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Incoming Requests ({pendingIn.length})
                </h3>
                {pendingIn.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-soft">
                    No pending incoming requests
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {pendingIn.map((r) => {
                      const profile = r.friend_profile;
                      if (!profile) return null;
                      return (
                        <li key={r.id} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2.5">
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="size-8 rounded-full" />
                            ) : (
                              <span className="grid size-8 place-items-center rounded-full bg-line text-xs font-bold">
                                {profile.display_name[0]?.toUpperCase()}
                              </span>
                            )}
                            <div>
                              <div className="text-sm font-medium">{profile.display_name}</div>
                              <div className="text-xs text-ink-soft">@{profile.username}</div>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              className="btn btn-primary !py-1 !px-2.5 text-xs"
                              onClick={() => handleRespond(r.id, "accept")}
                            >
                              <Check size={13} /> Accept
                            </button>
                            <button
                              className="btn !py-1 !px-2 text-xs"
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
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Outgoing Requests ({pendingOut.length})
                </h3>
                {pendingOut.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-soft">
                    No pending outgoing requests
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {pendingOut.map((r) => {
                      const profile = r.friend_profile;
                      if (!profile) return null;
                      return (
                        <li key={r.id} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2.5">
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="size-8 rounded-full" />
                            ) : (
                              <span className="grid size-8 place-items-center rounded-full bg-line text-xs font-bold">
                                {profile.display_name[0]?.toUpperCase()}
                              </span>
                            )}
                            <div>
                              <div className="text-sm font-medium">{profile.display_name}</div>
                              <div className="text-xs text-ink-soft">@{profile.username}</div>
                            </div>
                          </div>
                          <button
                            className="btn !py-1 !px-2 text-xs text-ink-soft"
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
                <Search size={16} className="absolute left-3 top-3 text-ink-soft" />
                <input
                  type="text"
                  placeholder="Search by username or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-line bg-paper py-2.5 pl-9 pr-3 text-sm focus:border-moss focus:outline-hidden"
                  autoFocus
                />
              </div>

              {searching && (
                <p className="py-4 text-center text-xs text-ink-soft">Searching players…</p>
              )}

              {!searching && searchResults.length === 0 && searchQuery.trim() && (
                <p className="py-8 text-center text-sm text-ink-soft">
                  No players found matching &ldquo;{searchQuery}&rdquo;.
                </p>
              )}

              <ul className="divide-y divide-line">
                {searchResults.map((p) => {
                  const alreadyFriend = isFriend(p.id);
                  const requested = isPendingOut(p.id);
                  const hasIncoming = isPendingIn(p.id);

                  return (
                    <li key={p.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="size-9 rounded-full" />
                        ) : (
                          <span className="grid size-9 place-items-center rounded-full bg-line text-xs font-bold">
                            {p.display_name[0]?.toUpperCase()}
                          </span>
                        )}
                        <div>
                          <div className="text-sm font-semibold">{p.display_name}</div>
                          <div className="text-xs text-ink-soft">@{p.username}</div>
                        </div>
                      </div>

                      <div>
                        {alreadyFriend ? (
                          <span className="rounded-full bg-moss-soft px-2.5 py-1 text-xs font-semibold text-moss-dark">
                            Friends
                          </span>
                        ) : requested ? (
                          <span className="rounded-full bg-line px-2.5 py-1 text-xs font-medium text-ink-soft">
                            Request Sent
                          </span>
                        ) : hasIncoming ? (
                          <button
                            className="btn btn-primary !py-1 !px-2.5 text-xs"
                            onClick={() => setTab("requests")}
                          >
                            Respond
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary !py-1 !px-2.5 text-xs"
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
