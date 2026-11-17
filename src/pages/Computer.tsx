import { useEffect, useState } from "react";
import { Cpu } from "lucide-react";
import GameView from "../components/GameView";
import { Card, Segmented, TimeControlPicker } from "../components/ui";
import { act } from "../lib/api";
import { loadManifest, type EngineEntry } from "../lib/engine";
import { errMsg } from "../lib/format";
import { navigate } from "../lib/router";
import { AI_LEVELS } from "../../supabase/functions/game-action/rules.ts";

export default function Computer({ userId, gameId }: { userId: string; gameId?: string }) {
  if (gameId) return <GameView gameId={gameId} userId={userId} backTo="/computer" />;
  return <Setup />;
}

function Setup() {
  const [engines, setEngines] = useState<EngineEntry[] | null>(null);
  const [engineErr, setEngineErr] = useState<string | null>(null);
  const [engineId, setEngineId] = useState("");
  const [level, setLevel] = useState(3);
  const [color, setColor] = useState<"w" | "b" | "random">("w");
  const [tc, setTc] = useState("10+0");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadManifest().then((m) => { setEngines(m); setEngineId(m[0].id); }).catch((e) => setEngineErr(errMsg(e)));
  }, []);
  const entry = engines?.find((e) => e.id === engineId);

  async function start() {
    if (!entry) return;
    setBusy(true); setErr(null);
    try {
      const human = color === "random" ? (Math.random() < 0.5 ? "w" : "b") : color;
      const lv = AI_LEVELS.find((l) => l.id === level)!;
      const r = await act({ action: "new_ai", tc, humanColor: human, level, engine: entry.id, aiName: `${entry.name.split(" (")[0]} · ${lv.label}` });
      navigate(`/computer/${r.game.id}`);
    } catch (e) { setErr(errMsg(e)); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-5">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Play the computer</h1>
          <p className="text-sm text-ink-soft">A real Stockfish engine runs in a Web Worker inside your browser.</p>
        </div>
        {engineErr && <p className="text-sm text-danger" role="alert">{engineErr}</p>}
        {!engines && !engineErr && <p className="text-sm">Checking bundled engines…</p>}
        {engines && (
          <>
            <label className="block text-sm font-medium">Engine
              <select className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2" value={engineId} onChange={(e) => setEngineId(e.target.value)}>
                {engines.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
            <div><p className="mb-2 text-sm font-medium">Strength</p>
              <Segmented label="Strength" value={level} onChange={setLevel}
                options={AI_LEVELS.map((l) => ({ value: l.id, label: l.elo ? `${l.label} · ${l.elo}` : l.label }))} />
            </div>
            <div><p className="mb-2 text-sm font-medium">You play</p>
              <Segmented label="Colour" value={color} onChange={setColor}
                options={[{ value: "w", label: "White" }, { value: "b", label: "Black" }, { value: "random", label: "Random" }]} />
            </div>
            <div><p className="mb-2 text-sm font-medium">Time control</p><TimeControlPicker value={tc} onChange={setTc} /></div>
            <button className="btn btn-primary w-full" disabled={busy || !entry} onClick={start}><Cpu size={16} /> {busy ? "Starting…" : "Start game"}</button>
            {err && <p className="text-sm text-danger" role="alert">{err}</p>}
          </>
        )}
      </Card>
    </div>
  );
}
