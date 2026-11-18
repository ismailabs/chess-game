import { useEffect, useState } from "react";
import { Check, Search, Swords, UserMinus, UserPlus, Users, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { errMsg } from "../lib/format";
import { Button } from "./ui";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="flex h-[38rem] w-full max-w-lg flex-col rounded-3xl border border-[var(--outline)] bg-[var(--surface)] text-[var(--on-surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--outline)] px-6 py-4 bg-[var(--surface-container)]">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-[var(--primary)]/20 text-[var(--primary)]">
              <Users size={18} />
            </div>
            <h2 className="text-lg font-bold font-heading text-[var(--on-surface)]">Friends & Social</h2>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--outline)] bg-[var(--surface-container-low)] px-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setTab("friends")}
            className={`border-b-2 py-3 px-3 transition-colors cursor-pointer ${
              tab === "friends"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={`relative border-b-2 py-3 px-3 transition-colors cursor-pointer ${
              tab === "requests"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
            }`}
          >
            Requests
            {pendingIn.length > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--primary)] px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendingIn.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("search")}
            className={`border-b-2 py-3 px-3 transition-colors cursor-pointer ${
              tab === "search"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
            }`}
          >
            Find Players
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {error && (
            <div
              className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* TAB 1: FRIENDS LIST */}
          {tab === "friends" && (
            <div>
              {loading ? (
                <p className="py-12 text-center text-sm text-[var(--on-surface-variant)]">Loading friends…</p>
              ) : friends.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-[var(--surface-container)] text-[var(--on-surface-variant)]">
                    <Users size={24} />
                  </div>
                  <p className="font-bold text-[var(--on-surface)] font-heading">No friends added yet</p>
                  <p className="mt-1 text-xs text-[var(--on-surface-variant)] max-w-xs mx-auto">
                    Search for players by username or email to send challenge invites.
                  </p>
                  <Button
                    variant="filled"
                    className="mt-4"
                    onClick={() => setTab("search")}
                  >
                    <Search size={14} /> Find Players
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--outline)]">
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
                                className="size-10 rounded-xl object-cover border border-[var(--outline)]"
                              />
                            ) : (
                              <span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-container-high)] font-bold text-[var(--on-surface)] text-sm">
                                {profile.display_name[0]?.toUpperCase()}
                              </span>
                            )}
                            <span
                              title={`Status: ${st}`}
                              className={`absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[var(--surface)] ${
                                st === "online"
                                  ? "bg-[var(--primary)]"
                                  : st === "in-game"
                                  ? "bg-amber-400 animate-pulse"
                                  : "bg-stone-500"
                              }`}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-[var(--on-surface)]">
                              {profile.display_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[var(--on-surface-variant)]">
                              <span className="truncate">@{profile.username}</span>
                              <span>·</span>
                              <span
                                className={`font-semibold capitalize ${
                                  st === "online"
                                    ? "text-[var(--primary)]"
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
                          <Button
                            variant="filled"
                            size="sm"
                            className="!py-1 !px-3 text-xs shrink-0 whitespace-nowrap"
                            onClick={() => {
                              onChallenge(profile);
                              onClose();
                            }}
                            title="Challenge to a match"
                          >
                            <Swords size={14} />
                            Challenge
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="!p-2 text-[var(--on-surface-variant)] hover:text-red-500 shrink-0"
                            onClick={() => handleRemoveFriend(profile.id)}
                            title="Remove friend"
                          >
                            <UserMinus size={15} />
                          </Button>
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
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
                  Incoming Requests ({pendingIn.length})
                </h3>
                {pendingIn.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--outline)] p-4 text-center text-xs text-[var(--on-surface-variant)]">
                    No pending incoming friend requests
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--outline)]">
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
                              <span className="grid size-8 place-items-center rounded-lg bg-[var(--surface-container-high)] text-xs font-bold shrink-0">
                                {profile.display_name[0]?.toUpperCase()}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-[var(--on-surface)]">
                                {profile.display_name}
                              </div>
                              <div className="truncate text-xs text-[var(--on-surface-variant)]">
                                @{profile.username}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0 whitespace-nowrap">
                            <Button
                              variant="filled"
                              size="sm"
                              className="!py-1 !px-2.5 text-xs shrink-0 whitespace-nowrap"
                              onClick={() => handleRespond(r.id, "accept")}
                            >
                              <Check size={13} /> Accept
                            </Button>
                            <Button
                              variant="outlined"
                              size="sm"
                              className="!py-1 !px-2 text-xs shrink-0 whitespace-nowrap"
                              onClick={() => handleRespond(r.id, "decline")}
                            >
                              Decline
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
                  Outgoing Requests ({pendingOut.length})
                </h3>
                {pendingOut.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--outline)] p-4 text-center text-xs text-[var(--on-surface-variant)]">
                    No pending outgoing requests
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--outline)]">
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
                              <span className="grid size-8 place-items-center rounded-lg bg-[var(--surface-container-high)] text-xs font-bold shrink-0">
                                {profile.display_name[0]?.toUpperCase()}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-[var(--on-surface)]">
                                {profile.display_name}
                              </div>
                              <div className="truncate text-xs text-[var(--on-surface-variant)]">
                                @{profile.username}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="!py-1 !px-2.5 text-xs text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] shrink-0 whitespace-nowrap"
                            onClick={() => handleRespond(r.id, "cancel")}
                          >
                            Cancel
                          </Button>
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
                <Search size={16} className="absolute left-3.5 top-3 text-[var(--on-surface-variant)]" />
                <input
                  type="text"
                  placeholder="Search by username or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[var(--outline)] bg-[var(--surface-container-low)] py-2.5 pl-10 pr-4 text-sm text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:border-[var(--primary)] focus:outline-hidden"
                  autoFocus
                />
              </div>

              {searching && (
                <p className="py-4 text-center text-xs text-[var(--on-surface-variant)]">Searching players…</p>
              )}

              {!searching && searchResults.length === 0 && searchQuery.trim() && (
                <p className="py-8 text-center text-sm text-[var(--on-surface-variant)]">
                  No players found matching &ldquo;{searchQuery}&rdquo;.
                </p>
              )}

              <ul className="divide-y divide-[var(--outline)]">
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
                          <span className="grid size-9 place-items-center rounded-xl bg-[var(--surface-container-high)] text-xs font-bold shrink-0">
                            {p.display_name[0]?.toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[var(--on-surface)]">{p.display_name}</div>
                          <div className="truncate text-xs text-[var(--on-surface-variant)]">@{p.username}</div>
                        </div>
                      </div>

                      <div className="shrink-0 whitespace-nowrap">
                        {alreadyFriend ? (
                          <span className="rounded-full bg-[var(--primary)]/20 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                            Friends
                          </span>
                        ) : requested ? (
                          <span className="rounded-full bg-[var(--surface-container-high)] px-3 py-1 text-xs font-medium text-[var(--on-surface-variant)]">
                            Request Sent
                          </span>
                        ) : hasIncoming ? (
                          <Button
                            variant="filled"
                            size="sm"
                            className="!py-1 !px-3 text-xs shrink-0 whitespace-nowrap"
                            onClick={() => setTab("requests")}
                          >
                            Respond
                          </Button>
                        ) : (
                          <Button
                            variant="filled"
                            size="sm"
                            className="!py-1 !px-3 text-xs shrink-0 whitespace-nowrap"
                            onClick={() => handleSendRequest(p.id)}
                          >
                            <UserPlus size={13} /> Add Friend
                          </Button>
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
