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
      // Store style preference in session for the player hook
      sessionStorage.setItem(`game_style_${r.game.id}`, botStyle);
      navigate(`/computer/${r.game.id}`);
    } catch (e) {
      setErr(errMsg(e));
      setBusy(false);
    }
  }

  const styleIcons: Record<string, React.ReactNode> = {
    balanced: <Sparkles size={16} className="text-moss" />,
    aggressive: <Swords size={16} className="text-danger" />,
    defensive: <Shield size={16} className="text-blue-600" />,
    beginner: <Zap size={16} className="text-amber-500" />,
  };

  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-5">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Play the computer</h1>
          <p className="text-sm text-ink-soft">
            Stockfish engine running client-side inside a background Web Worker.
          </p>
        </div>
        {engineErr && (
          <p className="text-sm text-danger" role="alert">
            {engineErr}
          </p>
        )}
        {!engines && !engineErr && <p className="text-sm">Checking bundled engines…</p>}
        {engines && (
          <>
            <div>
              <p className="mb-2 text-sm font-medium">Bot Personality</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {BOT_STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setBotStyle(st.id)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                      botStyle === st.id
                        ? "border-moss bg-moss-soft"
                        : "border-line bg-paper/60 hover:bg-[#efece3]"
                    }`}
                  >
                    <span className="mt-0.5">{styleIcons[st.id]}</span>
                    <div>
                      <div className="text-sm font-semibold">{st.name}</div>
                      <div className="text-xs text-ink-soft">{st.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Difficulty Rating</p>
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

            <div>
              <p className="mb-2 text-sm font-medium">You play</p>
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

            <div>
              <p className="mb-2 text-sm font-medium">Time control</p>
              <TimeControlPicker value={tc} onChange={setTc} />
            </div>

            <button
              className="btn btn-primary w-full"
              disabled={busy || !entry}
              onClick={start}
            >
              <Cpu size={16} /> {busy ? "Starting…" : "Start game"}
            </button>
            {err && (
              <p className="text-sm text-danger" role="alert">
                {err}
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
