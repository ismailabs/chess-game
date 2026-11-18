// Bots Screen (14-Level Ladder & Personality Picker)
// Horizontal swipe on mobile, responsive grid on desktop.
// Side picker, time control selector, recommended bot badge.

import { useEffect, useState } from "react";
import { Bot, Sparkles, Check, Play, RefreshCw, LogIn } from "lucide-react";
import { BOTS, getRecommendedBot, type BotConfig, type BotDifficulty } from "../lib/bots";
import { Button, Chip, Segmented, TimeControlPicker } from "../components/ui";
import GameView from "../components/GameView";
import { act } from "../lib/api";
import { errMsg } from "../lib/format";
import { navigate } from "../lib/router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

interface Props {
  userId: string;
  gameId?: string;
}

const DIFFICULTY_TABS: { label: string; value: BotDifficulty | "all" }[] = [
  { label: "All Bots", value: "all" },
  { label: "Beginner", value: "beginner" },
  { label: "Casual", value: "casual" },
  { label: "Club", value: "club" },
  { label: "Advanced", value: "advanced" },
  { label: "Master", value: "master" },
  { label: "Engine", value: "engine" },
];

export default function Bots({ userId, gameId }: Props) {
  if (gameId) {
    return <GameView gameId={gameId} userId={userId} backTo="/bots" />;
  }

  return <BotPicker userId={userId} />;
}

function BotPicker({ userId }: { userId: string }) {
  const { signIn } = useAuth();
  const [selectedBot, setSelectedBot] = useState<BotConfig>(BOTS[3]); // Default Biscuit (800)
  const [filter, setFilter] = useState<BotDifficulty | "all">("all");
  const [color, setColor] = useState<"w" | "b" | "random">("w");
  const [tc, setTc] = useState("10+0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number>(800);

  const isGuest = !userId || userId === "guest";

  // Fetch player rating to set recommended bot (if signed in)
  useEffect(() => {
    if (isGuest) return;
    supabase
      .from("profiles")
      .select("rating")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.rating) {
          setUserRating(data.rating);
          const rec = getRecommendedBot(data.rating);
          setSelectedBot(rec);
        }
      });
  }, [userId, isGuest]);

  const recommended = getRecommendedBot(userRating);
  const filteredBots = filter === "all" ? BOTS : BOTS.filter((b) => b.difficulty === filter);

  async function handleStartMatch() {
    if (isGuest) {
      setError("Sign in with Google to start matches, record game history, and climb the rating ladder.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const humanColor = color === "random" ? (Math.random() < 0.5 ? "w" : "b") : color;

      // Map bot level to integer 1-6 for backend rules
      let levelNumber = 3;
      if (selectedBot.elo <= 400) levelNumber = 1;
      else if (selectedBot.elo <= 800) levelNumber = 2;
      else if (selectedBot.elo <= 1300) levelNumber = 3;
      else if (selectedBot.elo <= 1800) levelNumber = 4;
      else if (selectedBot.elo <= 2300) levelNumber = 5;
      else levelNumber = 6;

      const r = await act({
        action: "new_ai",
        tc,
        humanColor,
        level: levelNumber,
        engine: "stockfish-lite",
        aiName: `${selectedBot.name} (${selectedBot.elo})`,
      });

      // Store bot metadata in session
      sessionStorage.setItem(`game_style_${r.game.id}`, selectedBot.style);
      sessionStorage.setItem(`bot_id_${r.game.id}`, selectedBot.id);

      navigate(`/bots/${r.game.id}`);
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--outline)] bg-[var(--surface)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)] mb-2 shadow-xs">
          <Bot size={13} className="text-[var(--primary)]" />
          Sparring Engine
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--on-surface)] font-heading">
          Choose a Bot
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--on-surface-variant)]">
          14 calibrated sparring bots with human-like weakening and unique playstyles.
        </p>
      </div>

      {/* Difficulty Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {DIFFICULTY_TABS.map((tab) => (
          <Chip
            key={tab.value}
            label={tab.label}
            selected={filter === tab.value}
            onClick={() => setFilter(tab.value)}
          />
        ))}
      </div>

      {/* Main Layout: Ladder Cards (Left/Center) + Setup Sheet (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Bot Cards: Horizontal Scroll on Mobile, Grid on Desktop */}
        <div className="lg:col-span-8 flex sm:grid sm:grid-cols-2 xl:grid-cols-3 gap-3 overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 snap-x">
          {filteredBots.map((bot) => {
            const isSelected = selectedBot.id === bot.id;
            const isRec = recommended.id === bot.id;

            return (
              <button
                key={bot.id}
                type="button"
                onClick={() => setSelectedBot(bot)}
                className={`relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-150 cursor-pointer snap-start min-w-[260px] sm:min-w-0 ${
                  isSelected
                    ? "bg-[var(--surface-container-high)] border-2 border-[var(--primary)] shadow-md ring-1 ring-[var(--primary)]/50"
                    : "bg-[var(--surface)] border border-[var(--outline)] hover:border-[var(--outline-variant)] hover:bg-[var(--surface-container-high)]/60"
                }`}
              >
                {/* Recommended Badge */}
                {isRec && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--on-primary)] shadow-sm flex items-center gap-1">
                    <Sparkles size={11} /> Recommended
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-3">
                    <img
                      src={bot.avatar}
                      alt={bot.name}
                      className="size-12 rounded-xl object-cover shrink-0 shadow-sm border border-[var(--outline)]"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-black text-base text-[var(--on-surface)] truncate">
                          {bot.name}
                        </span>
                        <span className="rounded bg-[var(--surface-container)] border border-[var(--outline)] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[var(--tertiary)]">
                          {bot.elo}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--on-surface-variant)] capitalize block mt-0.5">
                        {bot.difficulty}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-[var(--on-surface-variant)] line-clamp-2">
                    {bot.tagline}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--outline)] flex items-center justify-between text-[11px] text-[var(--on-surface-variant)]">
                  <span className="truncate pr-2">{bot.style}</span>
                  {isSelected && (
                    <span className="text-[var(--primary)] shrink-0 font-bold flex items-center gap-1">
                      <Check size={14} /> Selected
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Match Configuration Panel */}
        <div className="lg:col-span-4 rounded-3xl bg-[var(--surface)] border border-[var(--outline)] p-6 shadow-sm space-y-6 sticky top-20 text-[var(--on-surface)]">
          {/* Active Bot Preview Card */}
          <div className="flex items-center gap-3.5 pb-5 border-b border-[var(--outline)]">
            <img
              src={selectedBot.avatar}
              alt=""
              className="size-14 rounded-2xl object-cover border border-[var(--outline)] shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black font-heading text-[var(--on-surface)]">
                  {selectedBot.name}
                </h3>
                <span className="rounded-md bg-[var(--surface-container)] border border-[var(--outline)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--tertiary)]">
                  {selectedBot.elo}
                </span>
              </div>
              <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">{selectedBot.tagline}</p>
            </div>
          </div>

          {/* Side Picker */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] block mb-2.5">
              Play As
            </label>
            <Segmented
              label="Choose side"
              value={color}
              onChange={(c) => setColor(c as "w" | "b" | "random")}
              options={[
                { label: "White", value: "w" },
                { label: "Random", value: "random" },
                { label: "Black", value: "b" },
              ]}
            />
          </div>

          {/* Time Control Picker */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] block mb-2.5">
              Time Control
            </label>
            <TimeControlPicker value={tc} onChange={setTc} />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 dark:text-red-400 font-medium space-y-2"
            >
              <p>{error}</p>
              {isGuest && (
                <button
                  type="button"
                  onClick={signIn}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] font-bold text-xs shadow-sm cursor-pointer hover:bg-[var(--primary-hover)] transition-all"
                >
                  <LogIn size={13} /> Sign In with Google
                </button>
              )}
            </div>
          )}

          {/* Start Game Button */}
          <Button
            variant="filled"
            onClick={handleStartMatch}
            disabled={busy}
            className="w-full font-bold text-base py-3"
          >
            {busy ? (
              <>
                <RefreshCw size={18} className="animate-spin mr-2" /> Initializing engine…
              </>
            ) : (
              <>
                <Play size={18} className="mr-2" /> Start Match
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
