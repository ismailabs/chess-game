import { useEffect, useState } from "react";
import {
  Trophy,
  Medal,
  Search,
  User,
  ArrowUpRight,
  RefreshCw,
  Flame,
} from "lucide-react";
import { Card, Input, RatingBadge, Skeleton, Button } from "../components/ui";
import { supabase } from "../lib/supabase";
import { Link, navigate } from "../lib/router";
import { errMsg } from "../lib/format";

export interface LeaderboardEntry {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  rating: number;
  peak_rating: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
}

interface Props {
  currentUserId?: string;
}

export default function Leaderboard({ currentUserId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc("leaderboard", {
        p_limit: 100,
      });
      if (rpcErr) {
        // Fallback to direct table query if RPC is not available
        const { data: tableData, error: tableErr } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, rating, peak_rating, games_played, wins, draws, losses")
          .gte("games_played", 1)
          .order("rating", { ascending: false })
          .limit(100);

        if (tableErr) {
          setError(errMsg(tableErr));
        } else {
          setEntries((tableData as LeaderboardEntry[]) ?? []);
        }
      } else {
        setEntries((data as LeaderboardEntry[]) ?? []);
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const filtered = entries?.filter((entry) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const u = (entry.username ?? "").toLowerCase();
    const d = (entry.display_name ?? "").toLowerCase();
    return u.includes(q) || d.includes(q);
  });

  const currentUserEntry = entries?.find((e) => e.id === currentUserId);
  const currentUserRank = currentUserEntry
    ? entries!.findIndex((e) => e.id === currentUserId) + 1
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-stone-300 mb-2">
            <Trophy size={13} className="text-[#e5b84b]" />
            Global Rankings
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-stone-100">
            Leaderboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            Top rated players across all time controls. Win matches to climb the ladder.
          </p>
        </div>

        <Button
          variant="tonal"
          size="sm"
          onClick={loadLeaderboard}
          disabled={loading}
          icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
        >
          Refresh
        </Button>
      </div>

      {/* Pinned User Standing (if user has played games) */}
      {currentUserEntry && currentUserRank && (
        <Card className="bg-[#262522] border-[#81b64c]/40 p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#81b64c]/5 rounded-bl-full pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid size-12 place-items-center rounded-2xl bg-[#81b64c]/20 text-[#81b64c] font-black font-mono text-base shrink-0 border border-[#81b64c]/30">
                #{currentUserRank}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#81b64c]">
                    Your Standing
                  </span>
                  <RatingBadge rating={currentUserEntry.rating} size="sm" />
                </div>
                <div className="text-base font-bold text-stone-100 truncate">
                  {currentUserEntry.display_name || currentUserEntry.username || "You"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
              <div>
                <span className="block text-[11px] font-mono text-stone-400">Rating</span>
                <span className="text-base font-black font-mono text-stone-100">
                  {currentUserEntry.rating}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-mono text-stone-400">Peak</span>
                <span className="text-base font-black font-mono text-stone-300">
                  {currentUserEntry.peak_rating}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-mono text-stone-400">Win Rate</span>
                <span className="text-base font-black font-mono text-[#81b64c]">
                  {currentUserEntry.games_played > 0
                    ? `${Math.round((currentUserEntry.wins / currentUserEntry.games_played) * 100)}%`
                    : "—"}
                </span>
              </div>
              <Button
                variant="outlined"
                size="sm"
                onClick={() => navigate("/profile")}
                icon={<ArrowUpRight size={14} />}
              >
                View Profile
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search Input */}
      <div className="relative">
        <Input
          placeholder="Search by username or display name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leadingIcon={<Search size={16} className="text-stone-400" />}
          className="bg-[#262522] border-white/10"
        />
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300 flex items-center justify-between"
        >
          <span>{error}</span>
          <Button variant="outlined" size="sm" onClick={loadLeaderboard}>
            Retry
          </Button>
        </div>
      )}

      {/* Leaderboard Table / Cards */}
      <Card className="bg-[#262522] border-white/10 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 px-2 border-b border-white/5 last:border-none">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-6 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Leaderboard table">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-mono uppercase text-stone-400">
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-4 text-center">Rating</th>
                  <th className="py-3.5 px-4 text-center hidden sm:table-cell">Tier</th>
                  <th className="py-3.5 px-4 text-center hidden md:table-cell">Record (W/D/L)</th>
                  <th className="py-3.5 px-4 text-right pr-6">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((player, idx) => {
                  const rank = idx + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;
                  const isMe = player.id === currentUserId;
                  const winRate =
                    player.games_played > 0
                      ? Math.round((player.wins / player.games_played) * 100)
                      : 0;

                  return (
                    <tr
                      key={player.id}
                      className={`hover:bg-white/[0.04] transition-colors ${
                        isMe ? "bg-[#81b64c]/10 font-medium" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 text-center">
                        {isTop1 ? (
                          <div className="inline-grid size-8 place-items-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Trophy size={16} />
                          </div>
                        ) : isTop2 ? (
                          <div className="inline-grid size-8 place-items-center rounded-xl bg-slate-300/20 text-slate-200 border border-slate-300/30">
                            <Medal size={16} />
                          </div>
                        ) : isTop3 ? (
                          <div className="inline-grid size-8 place-items-center rounded-xl bg-amber-700/20 text-amber-500 border border-amber-700/30">
                            <Medal size={16} />
                          </div>
                        ) : (
                          <span className="font-mono text-xs font-bold text-stone-400">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Player Profile */}
                      <td className="py-3 px-4">
                        <Link
                          to={isMe ? "/profile" : player.username ? `/u/${player.username}` : "#"}
                          className="group inline-flex items-center gap-3 hover:opacity-90 transition-opacity"
                        >
                          {player.avatar_url ? (
                            <img
                              src={player.avatar_url}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="size-9 rounded-full ring-1 ring-white/10 shrink-0 object-cover"
                            />
                          ) : (
                            <div className="grid size-9 place-items-center rounded-full bg-[#383632] text-xs font-bold text-stone-300 shrink-0">
                              {(player.username || player.display_name || "P")[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-100 group-hover:text-[#81b64c] transition-colors truncate">
                                {player.display_name || player.username || "Anonymous Player"}
                              </span>
                              {isMe && (
                                <span className="rounded bg-[#81b64c]/20 px-1.5 py-0.2 text-[10px] font-bold text-[#81b64c]">
                                  YOU
                                </span>
                              )}
                            </div>
                            {player.username && (
                              <span className="block text-xs font-mono text-stone-400 truncate">
                                @{player.username}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-sm font-black text-stone-100">
                          {player.rating}
                        </span>
                        {player.peak_rating > player.rating && (
                          <span className="block text-[10px] font-mono text-stone-500">
                            Peak {player.peak_rating}
                          </span>
                        )}
                      </td>

                      {/* Tier Badge */}
                      <td className="py-3 px-4 text-center hidden sm:table-cell">
                        <RatingBadge rating={player.rating} size="sm" />
                      </td>

                      {/* Record */}
                      <td className="py-3 px-4 text-center hidden md:table-cell font-mono text-xs text-stone-300">
                        <span className="text-[#81b64c] font-bold">{player.wins}W</span>
                        <span className="text-stone-500 mx-1">/</span>
                        <span className="text-stone-400">{player.draws}D</span>
                        <span className="text-stone-500 mx-1">/</span>
                        <span className="text-red-400">{player.losses}L</span>
                      </td>

                      {/* Win Rate */}
                      <td className="py-3 px-4 text-right pr-6">
                        <div className="inline-flex items-center gap-1.5">
                          {winRate >= 60 && <Flame size={13} className="text-amber-400" />}
                          <span className="font-mono text-xs font-bold text-stone-200">
                            {winRate}%
                          </span>
                        </div>
                        <span className="block text-[10px] font-mono text-stone-500">
                          {player.games_played} {player.games_played === 1 ? "game" : "games"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-stone-400 space-y-2">
            <Trophy size={36} className="mx-auto text-stone-600 mb-3" />
            <p className="text-base font-bold text-stone-300">No players found</p>
            <p className="text-xs text-stone-500">
              {search.trim()
                ? "Try searching for a different username or display name."
                : "Play a match to earn a rating and be the first on the leaderboard!"}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
