// Profile Page (/profile for current user, /u/:username for public views)
// Features rating card, inline SVG rating history chart, comprehensive stats,
// filterable match history with Elo deltas, and inline profile editing.

import { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Flame,
  Swords,
  Bot,
  Calendar,
  Edit2,
  Check,
  X,
  Globe,
  Share2,
  ArrowRight,
} from "lucide-react";
import { Button, Input, Skeleton, Chip } from "../components/ui";
import { supabase } from "../lib/supabase";
import type { Profile as ProfileType } from "../lib/types";

interface Props {
  currentUserId: string;
  targetUsername?: string; // If viewing /u/:username
}

interface RatingPoint {
  id: number;
  rating_after: number;
  delta: number;
  opponent_label: string;
  result: "win" | "draw" | "loss";
  created_at: string;
}

interface MatchHistoryItem {
  id: number;
  mode: "online" | "bot";
  opponent_label: string;
  opponent_rating: number;
  result: "win" | "draw" | "loss";
  rating_before: number;
  rating_after: number;
  delta: number;
  time_control: string | null;
  created_at: string;
}

export default function Profile({ currentUserId, targetUsername }: Props) {
  const isOwnProfile = !targetUsername;

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // History & Stats
  const [ratingPoints, setRatingPoints] = useState<RatingPoint[]>([]);
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"all" | "online" | "bot" | "win" | "loss">("all");

  useEffect(() => {
    let alive = true;

    async function fetchProfileData() {
      setLoading(true);
      setError(null);

      try {
        let query = supabase.from("profiles").select("*");
        if (targetUsername) {
          query = query.ilike("username", targetUsername);
        } else {
          query = query.eq("id", currentUserId);
        }

        const { data: prof, error: profErr } = await query.maybeSingle();
        if (profErr || !prof) {
          if (alive) setError("User profile not found.");
          return;
        }

        if (!alive) return;
        setProfile(prof as ProfileType);
        setDisplayName(prof.display_name ?? "");
        setUsername(prof.username ?? "");
        setBio(prof.bio ?? "");
        setCountry(prof.country ?? "");

        // Fetch rating history points for chart
        const { data: points } = await supabase
          .from("rating_history")
          .select("id, rating_after, delta, opponent_label, result, created_at")
          .eq("user_id", prof.id)
          .order("created_at", { ascending: true })
          .limit(50);

        if (points && alive) {
          setRatingPoints(points as RatingPoint[]);
        }

        // Fetch match history
        const { data: matchData } = await supabase
          .from("rating_history")
          .select("*")
          .eq("user_id", prof.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (matchData && alive) {
          setMatches(matchData as MatchHistoryItem[]);
        }
      } catch (err: any) {
        if (alive) setError(err.message ?? "Failed to load profile.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchProfileData();
    return () => {
      alive = false;
    };
  }, [currentUserId, targetUsername]);

  async function handleSaveProfile() {
    if (!profile) return;
    setSaveBusy(true);
    setSaveError(null);

    // Validate username: 3-20 chars, lowercase alnum + underscore, cannot start with underscore
    const cleanUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9_]{2,19}$/.test(cleanUsername)) {
      setSaveError("Username must be 3-20 alphanumeric characters and cannot start with an underscore.");
      setSaveBusy(false);
      return;
    }

    try {
      const updates: Record<string, any> = {
        display_name: displayName.trim().slice(0, 32),
        bio: bio.trim().slice(0, 160),
        country: country.trim().slice(0, 40),
        updated_at: new Date().toISOString(),
      };

      // Check if username was changed (14 day throttle)
      if (cleanUsername !== profile.username.toLowerCase()) {
        if (profile.username_changed_at) {
          const daysSinceChange = (Date.now() - Date.parse(profile.username_changed_at)) / (1000 * 60 * 60 * 24);
          if (daysSinceChange < 14) {
            const waitDays = Math.ceil(14 - daysSinceChange);
            setSaveError(`You can change your username again in ${waitDays} day${waitDays > 1 ? "s" : ""}.`);
            setSaveBusy(false);
            return;
          }
        }
        updates.username = cleanUsername;
        updates.username_changed_at = new Date().toISOString();
      }

      const { data, error: updateErr } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      setProfile(data as ProfileType);
      setIsEditing(false);
    } catch (e: any) {
      if (e.code === "23505") {
        setSaveError("This username is already taken. Please choose another.");
      } else {
        setSaveError(e.message ?? "Failed to save profile.");
      }
    } finally {
      setSaveBusy(false);
    }
  }

  // Filtered Matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (historyFilter === "all") return true;
      if (historyFilter === "online") return m.mode === "online";
      if (historyFilter === "bot") return m.mode === "bot";
      if (historyFilter === "win") return m.result === "win";
      if (historyFilter === "loss") return m.result === "loss";
      return true;
    });
  }, [matches, historyFilter]);

  // Sparkline SVG renderer
  const ratingChart = useMemo(() => {
    if (ratingPoints.length < 2) return null;
    const values = ratingPoints.map((p) => p.rating_after);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 600;
    const height = 140;
    const padding = 20;

    const coords = values.map((val, i) => {
      const x = padding + (i / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y, val };
    });

    const pathData = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

    return (
      <div className="w-full overflow-x-auto py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xl mx-auto overflow-visible">
          {/* Subtle grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

          {/* Line Chart */}
          <path d={pathData} fill="none" stroke="#81b64c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots on points */}
          {coords.map((c, idx) => (
            <circle
              key={idx}
              cx={c.x}
              cy={c.y}
              r="3.5"
              fill="#81b64c"
              className="hover:r-5 transition-all cursor-pointer"
            >
              <title>{`${c.val} Elo (${ratingPoints[idx]?.result})`}</title>
            </circle>
          ))}
        </svg>
      </div>
    );
  }, [ratingPoints]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-stone-200">{error ?? "User not found."}</h2>
        <Button variant="outlined" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const gamesCount = profile.games_played ?? 0;
  const isProvisional = gamesCount < 20;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Profile Header Card */}
      <div className="rounded-3xl bg-[#262522] border border-white/10 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="size-24 rounded-2xl object-cover border-2 border-white/15 shadow-md"
              />
            ) : (
              <div className="grid size-24 place-items-center rounded-2xl bg-[#302e2b] border border-white/10 text-3xl font-black font-heading text-stone-200">
                {profile.display_name[0]?.toUpperCase() ?? "P"}
              </div>
            )}
          </div>

          {/* Info & Bio */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black font-heading text-stone-100 tracking-tight">
                  {profile.display_name}
                </h1>
                <p className="text-xs sm:text-sm text-stone-400 font-mono mt-0.5">
                  @{profile.username}
                </p>
              </div>

              {isOwnProfile && !isEditing && (
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1.5 self-center sm:self-auto text-xs"
                >
                  <Edit2 size={13} /> Edit Profile
                </Button>
              )}
            </div>

            {profile.bio && (
              <p className="mt-3 text-sm text-stone-300 font-medium max-w-xl">
                {profile.bio}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-stone-400">
              {profile.country && (
                <span className="flex items-center gap-1.5">
                  <Globe size={14} className="text-stone-400" />
                  {profile.country}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-stone-400" />
                Joined {new Date(profile.created_at || Date.now()).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Inline Edit Form */}
        {isEditing && (
          <div className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">
                  Display Name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={32}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">
                  Username (unique, 14-day lock)
                </label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  maxLength={20}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-400 block mb-1">
                Bio (max 160 characters)
              </label>
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                placeholder="A short chess bio or favorite opening..."
              />
            </div>

            {saveError && (
              <p className="text-xs text-red-400 font-medium">{saveError}</p>
            )}

            <div className="flex items-center gap-2 justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setSaveError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="filled"
                size="sm"
                onClick={handleSaveProfile}
                disabled={saveBusy}
                className="font-bold"
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Rating & Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Rating Card */}
        <div className="md:col-span-5 rounded-3xl bg-[#262522] border border-white/10 p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Elo Rating
              </span>
              <span className="flex items-center gap-1 text-xs text-[#e5b84b] font-semibold">
                <Trophy size={14} /> Peak: {profile.peak_rating}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-mono text-5xl font-black text-stone-100 tracking-tight">
                {profile.rating}
              </span>
              {isProvisional && (
                <span className="rounded-full border border-[#e5b84b]/40 bg-[#e5b84b]/10 px-2 py-0.5 font-mono text-xs font-bold text-[#e5b84b]">
                  Provisional
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2 border-t border-white/10 pt-4 text-center">
            <div>
              <span className="text-[10px] text-stone-400 block font-medium">Played</span>
              <span className="font-mono text-sm font-bold text-stone-200">{gamesCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block font-medium">Wins</span>
              <span className="font-mono text-sm font-bold text-[#81b64c]">{profile.wins}</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block font-medium">Draws</span>
              <span className="font-mono text-sm font-bold text-amber-400">{profile.draws}</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block font-medium">Losses</span>
              <span className="font-mono text-sm font-bold text-red-400">{profile.losses}</span>
            </div>
          </div>
        </div>

        {/* Rating History Chart Card */}
        <div className="md:col-span-7 rounded-3xl bg-[#262522] border border-white/10 p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Rating Progress
            </span>
            <span className="text-xs font-mono text-stone-400">
              Last {ratingPoints.length} games
            </span>
          </div>

          <div className="my-auto py-2">
            {ratingChart ? (
              ratingChart
            ) : (
              <p className="py-8 text-center text-xs text-stone-400">
                Not enough match history to chart yet.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-400 border-t border-white/5 pt-2 font-mono">
            <span>Low: {ratingPoints.length ? Math.min(...ratingPoints.map((p) => p.rating_after)) : profile.rating}</span>
            <span>High: {profile.peak_rating}</span>
          </div>
        </div>
      </div>

      {/* Match History Table Card */}
      <div className="rounded-3xl bg-[#262522] border border-white/10 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold font-heading text-stone-100">
            Match History
          </h2>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(["all", "online", "bot", "win", "loss"] as const).map((f) => (
              <Chip
                key={f}
                label={f.toUpperCase()}
                selected={historyFilter === f}
                onClick={() => setHistoryFilter(f)}
              />
            ))}
          </div>
        </div>

        {filteredMatches.length === 0 ? (
          <p className="py-10 text-center text-xs text-stone-400">
            No matches found in this category.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-lg px-2 py-0.5 font-mono text-xs font-bold uppercase ${
                      match.result === "win"
                        ? "bg-[#81b64c]/20 text-[#81b64c]"
                        : match.result === "loss"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {match.result}
                  </span>

                  <div>
                    <span className="text-sm font-semibold text-stone-200 block">
                      vs {match.opponent_label}{" "}
                      <span className="font-mono text-xs text-stone-400">
                        ({match.opponent_rating})
                      </span>
                    </span>
                    <span className="text-[11px] text-stone-400 capitalize">
                      {match.mode} • {match.time_control ?? "Standard"}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-mono text-sm font-bold block ${
                      match.delta > 0
                        ? "text-[#81b64c]"
                        : match.delta < 0
                        ? "text-red-400"
                        : "text-stone-400"
                    }`}
                  >
                    {match.delta > 0 ? `+${match.delta}` : match.delta}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {new Date(match.created_at).toLocaleDateString()}
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
