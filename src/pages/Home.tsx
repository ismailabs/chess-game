// Home (Play Hub)
// Clean central hub featuring Rating Card with sparkline, quick match actions,
// active game resume card, recent matches, and online friends strip.

import { useEffect, useState } from "react";
import { Swords, Bot, Users, Play, ArrowRight, Trophy } from "lucide-react";
import { Button, Skeleton } from "../components/ui";
import { navigate } from "../lib/router";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

interface Props {
  userId: string;
  onOpenFriends: () => void;
  onlineFriendsCount: number;
}

interface RatingPoint {
  rating_after: number;
  created_at: string;
}

interface RecentGame {
  id: string;
  opponent: string;
  result: "win" | "draw" | "loss";
  delta: number;
  mode: "online" | "bot";
  created_at: string;
}

export default function Home({ userId, onOpenFriends, onlineFriendsCount }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<RatingPoint[]>([]);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadData() {
      try {
        // 1. Fetch user profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (prof && alive) setProfile(prof as Profile);

        // 2. Fetch rating history for sparkline
        const { data: hist } = await supabase
          .from("rating_history")
          .select("rating_after, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(30);

        if (hist && alive) setHistory(hist);

        // 3. Fetch recent 3 games
        const { data: recents } = await supabase
          .from("rating_history")
          .select("id, opponent_label, result, delta, mode, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(3);

        if (recents && alive) {
          setRecentGames(
            recents.map((r: any) => ({
              id: String(r.id),
              opponent: r.opponent_label,
              result: r.result,
              delta: r.delta,
              mode: r.mode,
              created_at: r.created_at,
            }))
          );
        }

        // 4. Check for active game
        const { data: activeGame } = await supabase
          .from("games")
          .select("id")
          .eq("status", "active")
          .or(`white_id.eq.${userId},black_id.eq.${userId}`)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeGame && alive) {
          setActiveGameId(activeGame.id);
        }
      } catch {
        // degrade gracefully
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();
    return () => {
      alive = false;
    };
  }, [userId]);

  // Generate SVG sparkline points
  const sparklineSvg = (() => {
    if (history.length < 2) return null;
    const ratings = history.map((h) => h.rating_after);
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    const range = max - min || 1;
    const width = 160;
    const height = 40;

    const points = ratings
      .map((r, i) => {
        const x = (i / (ratings.length - 1)) * width;
        const y = height - ((r - min) / range) * (height - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  })();

  const currentElo = profile?.rating ?? 800;
  const peakElo = profile?.peak_rating ?? 800;
  const gamesPlayed = profile?.games_played ?? 0;
  const isProvisional = gamesPlayed < 20;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner: Active Game in Progress (if any) */}
      {activeGameId && (
        <div className="flex items-center justify-between rounded-2xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 p-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary)] text-white">
              <Play size={20} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--on-surface)] font-heading">
                Match in progress
              </h2>
              <p className="text-xs text-[var(--on-surface-variant)]">
                You have an active game waiting for you.
              </p>
            </div>
          </div>
          <Button
            variant="filled"
            onClick={() => navigate(`/online/${activeGameId}`)}
            className="font-bold text-xs"
          >
            Continue Match <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* Hero Grid: Rating Card & Quick Play Actions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* Rating & Stats Card (Solid Surface per Law §2.2) */}
        <div className="md:col-span-5 rounded-3xl bg-[var(--surface)] border border-[var(--outline)] p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
                Your Elo Rating
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--tertiary)] font-semibold">
                <Trophy size={14} /> Peak: {peakElo}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              {loading ? (
                <Skeleton className="h-12 w-28" />
              ) : (
                <>
                  <span className="font-mono text-5xl font-black text-[var(--on-surface)] tracking-tight">
                    {currentElo}
                  </span>
                  {isProvisional && (
                    <span
                      title="Provisional rating (< 20 games)"
                      className="rounded-full border border-[var(--tertiary)]/40 bg-[var(--tertiary)]/10 px-2 py-0.5 font-mono text-xs font-bold text-[var(--tertiary)]"
                    >
                      Provisional
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Sparkline Visual */}
            <div className="mt-4 h-12 flex items-center">
              {sparklineSvg ? (
                sparklineSvg
              ) : (
                <p className="text-xs text-[var(--on-surface-variant)]">
                  Play rated games to see your rating curve.
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[var(--outline)] pt-4 text-center">
            <div>
              <span className="text-[11px] text-[var(--on-surface-variant)] block font-medium">Games</span>
              <span className="font-mono text-base font-bold text-[var(--on-surface)]">
                {gamesPlayed}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[var(--on-surface-variant)] block font-medium">Wins</span>
              <span className="font-mono text-base font-bold text-[var(--primary)]">
                {profile?.wins ?? 0}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[var(--on-surface-variant)] block font-medium">Win Rate</span>
              <span className="font-mono text-base font-bold text-[var(--on-surface)]">
                {gamesPlayed > 0
                  ? `${Math.round(((profile?.wins ?? 0) / gamesPlayed) * 100)}%`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Big Action Buttons (Play Hub) */}
        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Action 1: Play Online */}
          <button
            type="button"
            onClick={() => navigate("/play")}
            className="group relative flex flex-col justify-between rounded-3xl bg-[var(--surface)] border border-[var(--outline)] p-6 text-left shadow-sm transition-all duration-200 hover:border-[var(--primary)]/50 hover:bg-[var(--surface-container-high)] active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="grid size-12 place-items-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
                <Swords size={24} />
              </div>
              <span className="rounded-full bg-[var(--primary)]/20 px-2.5 py-1 text-[11px] font-bold text-[var(--primary)]">
                Rated
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-xl font-black font-heading text-[var(--on-surface)] group-hover:text-[var(--primary)] transition-colors">
                Play online
              </h3>
              <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
                Match with players in Bullet, Blitz, or Rapid.
              </p>
            </div>
          </button>

          {/* Action 2: Play a Bot */}
          <button
            type="button"
            onClick={() => navigate("/bots")}
            className="group relative flex flex-col justify-between rounded-3xl bg-[var(--surface)] border border-[var(--outline)] p-6 text-left shadow-sm transition-all duration-200 hover:border-[var(--tertiary)]/50 hover:bg-[var(--surface-container-high)] active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="grid size-12 place-items-center rounded-2xl bg-[var(--tertiary)]/15 text-[var(--tertiary)]">
                <Bot size={24} />
              </div>
              <span className="rounded-full bg-[var(--surface-container)] border border-[var(--outline)] px-2.5 py-1 text-[11px] font-bold text-[var(--on-surface-variant)]">
                14 Levels
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-xl font-black font-heading text-[var(--on-surface)] group-hover:text-[var(--tertiary)] transition-colors">
                Play a bot
              </h3>
              <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
                Climb the ladder from Pebble (250) to Zenith (3000+).
              </p>
            </div>
          </button>

          {/* Action 3: Challenge a Friend */}
          <button
            type="button"
            onClick={onOpenFriends}
            className="sm:col-span-2 flex items-center justify-between rounded-2xl bg-[var(--surface)] border border-[var(--outline)] px-6 py-4 shadow-sm transition-all duration-200 hover:border-[var(--outline-variant)] hover:bg-[var(--surface-container-high)] active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="grid size-10 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
                <Users size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--on-surface)] font-heading">
                  Challenge a friend
                </h4>
                <p className="text-xs text-[var(--on-surface-variant)]">
                  {onlineFriendsCount > 0
                    ? `${onlineFriendsCount} friend${onlineFriendsCount > 1 ? "s" : ""} online right now`
                    : "Invite friends to play custom matches"}
                </p>
              </div>
            </div>
            <ArrowRight size={18} className="text-[var(--on-surface-variant)]" />
          </button>
        </div>
      </div>

      {/* Bottom Section: Recent Matches */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--outline)] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--on-surface)] font-heading">
            Recent matches
          </h2>
          <Button
            variant="ghost"
            onClick={() => navigate("/history")}
            className="text-xs text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
          >
            View all history <ArrowRight size={14} />
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : recentGames.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--on-surface-variant)]">
            No games played yet. Start your first match above!
          </p>
        ) : (
          <div className="divide-y divide-[var(--outline-variant)]">
            {recentGames.map((game) => (
              <div
                key={game.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-lg px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                      game.result === "win"
                        ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                        : game.result === "loss"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-500"
                    }`}
                  >
                    {game.result}
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-[var(--on-surface)] block">
                      vs {game.opponent}
                    </span>
                    <span className="text-[11px] text-[var(--on-surface-variant)] capitalize">
                      {game.mode} game
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-mono text-sm font-bold block ${
                      game.delta > 0
                        ? "text-[var(--primary)]"
                        : game.delta < 0
                        ? "text-red-400"
                        : "text-[var(--on-surface-variant)]"
                    }`}
                  >
                    {game.delta > 0 ? `+${game.delta}` : game.delta}
                  </span>
                  <span className="text-[10px] text-[var(--on-surface-variant)]">
                    {new Date(game.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
