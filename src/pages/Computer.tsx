import { useEffect, useState } from "react";
import { Cpu, Shield, Sparkles, Swords, Zap } from "lucide-react";
import GameView from "../components/GameView";
import { Button, Card, Segmented, TimeControlPicker } from "../components/ui";
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
    balanced: <Sparkles size={16} className="text-[var(--primary)]" />,
    aggressive: <Swords size={16} className="text-red-500" />,
    defensive: <Shield size={16} className="text-sky-500" />,
    beginner: <Zap size={16} className="text-amber-500" />,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--outline)] bg-[var(--surface-container)] px-2.5 py-0.5 text-xs font-semibold text-[var(--tertiary)] mb-2">
          <Cpu size={13} className="text-[var(--tertiary)]" />
          Stockfish 17 WASM
        </div>
        <h1 className="text-3xl font-black tracking-tight font-heading text-[var(--on-surface)]">
          Play Stockfish Bots
        </h1>
        <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
          Spar against customized AI personalities with tuned Elo ratings running client-side.
        </p>
      </div>

      <Card className="max-w-xl mx-auto space-y-6 p-6 sm:p-8">
        {engineErr && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500"
          >
            {engineErr}
          </div>
        )}

        {!engines && !engineErr && (
          <div className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
            <div className="size-3.5 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
            <span>Checking bundled Stockfish engines…</span>
          </div>
        )}

        {engines && (
          <>
            {/* Bot Personality Selection Grid */}
            <div>
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
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
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary)]/15 shadow-sm ring-1 ring-[var(--primary)]"
                          : "border-[var(--outline)] bg-[var(--surface-container)] hover:border-[var(--outline-variant)] hover:bg-[var(--surface-container-high)]"
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">{styleIcons[st.id]}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[var(--on-surface)]">{st.name}</div>
                        <div className="text-xs text-[var(--on-surface-variant)] mt-0.5 line-clamp-2">{st.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty Rating */}
            <div>
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
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
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
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
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)]">
                Time Control
              </p>
              <TimeControlPicker value={tc} onChange={setTc} />
            </div>

            <Button
              variant="filled"
              size="lg"
              className="w-full font-bold shadow-md"
              disabled={busy || !entry}
              onClick={start}
            >
              <Cpu size={18} /> {busy ? "Initializing Engine…" : "Start Bot Match"}
            </Button>

            {err && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500"
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
