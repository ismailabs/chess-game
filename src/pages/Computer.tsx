import { useEffect, useState } from "react";
import { Cpu, Shield, Sparkles, Swords, Zap } from "lucide-react";
import GameView from "../components/GameView";
import { Card, Segmented, TimeControlPicker } from "../components/ui";
import { act } from "../lib/api";
import { loadManifest, type EngineEntry } from "../lib/engine";
import { errMsg } from "../lib/format";
import { navigate } from "../lib/router";
import { AI_LEVELS, BOT_STYLES } from "../../supabase/functions/game-action/rules.ts";

export default function Computer({ userId, gameId }: { userId: string; gameId?: string }) {
  if (gameId) return <GameView gameId={gameId} userId={userId} backTo="/computer" />;
  return <Setup />;
}

function Setup() {
  const [engines, setEngines] = useState<EngineEntry[] | null>(null);
  const [engineErr, setEngineErr] = useState<string | null>(null);
  const [engineId, setEngineId] = useState("");
  const [level, setLevel] = useState(3);
  const [botStyle, setBotStyle] = useState("balanced");
  const [color, setColor] = useState<"w" | "b" | "random">("w");
  const [tc, setTc] = useState("10+0");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadManifest()
      .then((m) => {
        setEngines(m);
        setEngineId(m[0].id);
      })
      .catch((e) => setEngineErr(errMsg(e)));
  }, []);
  const entry = engines?.find((e) => e.id === engineId);

  async function start() {
    if (!entry) return;
    setBusy(true);
    setErr(null);
    try {
      const human = color === "random" ? (Math.random() < 0.5 ? "w" : "b") : color;
      const lv = AI_LEVELS.find((l) => l.id === level)!;
      const st = BOT_STYLES.find((s) => s.id === botStyle) ?? BOT_STYLES[0];
      const r = await act({
        action: "new_ai",
        tc,
        humanColor: human,
        level,
        engine: entry.id,
        aiName: `${st.name} · ${lv.label}${lv.elo ? ` (${lv.elo})` : ""}`,
      });
      // Store style preference in session for the player hook and speech bubbles
      sessionStorage.setItem(`game_style_${r.game.id}`, botStyle);
      navigate(`/computer/${r.game.id}`);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  const styleIcons: Record<string, React.ReactNode> = {
    balanced: <Sparkles size={16} className="text-[#81b64c]" />,
    aggressive: <Swords size={16} className="text-red-400" />,
    defensive: <Shield size={16} className="text-sky-400" />,
    beginner: <Zap size={16} className="text-amber-400" />,
  };

  return (
    <div className="mx-auto max-w-xl pb-6">
      <Card className="liquid-glass space-y-6 p-6 sm:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-[#e5b84b] mb-2">
            <Cpu size={13} className="text-[#e5b84b]" />
            Stockfish 17 WASM
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight font-heading text-stone-100">
            Play Stockfish Bots
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            Spar against customized AI personalities with tuned Elo ratings running client-side.
          </p>
        </div>

        {engineErr && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
          >
            {engineErr}
          </div>
        )}

        {!engines && !engineErr && (
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <div className="size-3.5 rounded-full border-2 border-[#81b64c] border-t-transparent animate-spin" />
            <span>Checking bundled Stockfish engines…</span>
          </div>
        )}

        {engines && (
          <>
            {/* Bot Personality Selection Grid */}
            <div>
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-stone-400">
                Bot Personality
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {BOT_STYLES.map((st) => {
                  const isSelected = botStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setBotStyle(st.id)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? "border-[#81b64c] bg-[#81b64c]/15 shadow-[0_0_12px_rgba(129,182,76,0.25)] ring-1 ring-[#81b64c]"
                          : "border-white/10 bg-[#302e2b] hover:border-white/20 hover:bg-[#383632]"
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">{styleIcons[st.id]}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-stone-100">{st.name}</div>
                        <div className="text-xs text-stone-400 mt-0.5 line-clamp-2">{st.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty Rating */}
            <div>
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-stone-400">
                Difficulty / Elo Rating
              </p>
              <Segmented
                label="Difficulty Rating"
                value={level}
                onChange={setLevel}
                options={AI_LEVELS.map((l) => ({
                  value: l.id,
                  label: l.elo ? `${l.label} · ${l.elo}` : l.label,
                }))}
              />
            </div>

            {/* Play As White / Black / Random */}
            <div>
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-stone-400">
                You Play As
              </p>
              <Segmented
                label="Colour"
                value={color}
                onChange={setColor}
                options={[
                  { value: "w", label: "White" },
                  { value: "b", label: "Black" },
                  { value: "random", label: "Random" },
                ]}
              />
            </div>

            {/* Time Control Picker */}
            <div>
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-stone-400">
                Time Control
              </p>
              <TimeControlPicker value={tc} onChange={setTc} />
            </div>

            <button
              type="button"
              className="btn btn-primary w-full !py-3.5 text-sm font-bold shadow-md"
              disabled={busy || !entry}
              onClick={start}
            >
              <Cpu size={18} /> {busy ? "Initializing Engine…" : "Start Bot Match"}
            </button>

            {err && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
              >
                {err}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
