// Real Stockfish (UCI) running inside a dedicated Web Worker. Nothing here is simulated.
import { AI_LEVELS } from "../../supabase/functions/game-action/rules.ts";

export interface EngineEntry {
  id: string; name: string; version: string; js: string; wasm: string; license: string; source: string; build: string;
}

export async function loadManifest(): Promise<EngineEntry[]> {
  const r = await fetch("/engine/manifest.json", { cache: "no-cache" });
  if (!r.ok) throw new Error("No engine is bundled in this build (missing /engine/manifest.json).");
  const j = await r.json();
  if (!Array.isArray(j) || j.length === 0) throw new Error("The engine manifest is empty.");
  return j as EngineEntry[];
}

type Listener = (line: string) => void;

export class UciEngine {
  private listeners = new Set<Listener>();
  private opts = new Map<string, { min?: number; max?: number }>();
  private searching = false;
  private cancelled = false;

  private constructor(private worker: Worker) {
    worker.onmessage = (e: MessageEvent) => {
      const raw = typeof e.data === "string" ? e.data : String((e.data as { data?: unknown })?.data ?? e.data);
      for (const line of raw.split("\n")) {
        const t = line.trim();
        if (t) this.listeners.forEach((l) => l(t));
      }
    };
  }

  private send(cmd: string) { this.worker.postMessage(cmd); }

  private waitFor(pred: (l: string) => boolean, ms: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.listeners.delete(fn); reject(new Error("The engine stopped responding.")); }, ms);
      const fn: Listener = (l) => { if (pred(l)) { clearTimeout(timer); this.listeners.delete(fn); resolve(l); } };
      this.listeners.add(fn);
    });
  }

  static async load(entry: EngineEntry): Promise<UciEngine> {
    const worker = new Worker(`/engine/${entry.js}`); // classic worker; the .wasm sits beside it
    const eng = new UciEngine(worker);
    const failed = new Promise<never>((_, rej) => { worker.onerror = () => rej(new Error("Could not start the engine worker.")); });
    const collect: Listener = (l) => {
      const m = /^option name (.+?) type (\w+)(.*)$/.exec(l);
      if (!m) return;
      const min = /min (-?\d+)/.exec(m[3]);
      const max = /max (-?\d+)/.exec(m[3]);
      eng.opts.set(m[1], { min: min ? +min[1] : undefined, max: max ? +max[1] : undefined });
    };
    try {
      eng.listeners.add(collect);
      const ok = eng.waitFor((l) => l === "uciok", 30_000);
      eng.send("uci");
      await Promise.race([ok, failed]);
      eng.listeners.delete(collect);
      await eng.ready();
      return eng;
    } catch (e) {
      worker.terminate();
      throw e;
    }
  }

  async ready() {
    const p = this.waitFor((l) => l === "readyok", 15_000);
    this.send("isready");
    await p;
  }

  /** Uses UCI_LimitStrength/UCI_Elo when the engine reports them, otherwise Skill Level and Bot Style. */
  async configure(levelId: number, styleId?: string) {
    const lv = AI_LEVELS.find((l) => l.id === levelId) ?? AI_LEVELS[2];
    const hasLimit = this.opts.has("UCI_LimitStrength");
    if (lv.elo && hasLimit && this.opts.has("UCI_Elo")) {
      const o = this.opts.get("UCI_Elo")!;
      const elo = Math.min(o.max ?? lv.elo, Math.max(o.min ?? lv.elo, lv.elo));
      this.send("setoption name UCI_LimitStrength value true");
      this.send(`setoption name UCI_Elo value ${elo}`);
    } else {
      if (hasLimit) this.send("setoption name UCI_LimitStrength value false");
      if (this.opts.has("Skill Level")) this.send(`setoption name Skill Level value ${lv.skill}`);
    }

    if (this.opts.has("Contempt")) {
      const opt = this.opts.get("Contempt")!;
      let cVal = 0;
      if (styleId === "aggressive") cVal = Math.min(opt.max ?? 100, 100);
      else if (styleId === "defensive") cVal = Math.max(opt.min ?? -100, -100);
      this.send(`setoption name Contempt value ${cVal}`);
    }

    this.send("ucinewgame");
    await this.ready();
  }

  async bestMove(fen: string, movetimeMs: number): Promise<string | null> {
    if (this.searching) throw new Error("Engine is busy");
    this.searching = true;
    this.cancelled = false;
    try {
      this.send(`position fen ${fen}`);
      const p = this.waitFor((l) => l.startsWith("bestmove"), movetimeMs + 20_000);
      this.send(`go movetime ${Math.round(movetimeMs)}`);
      const line = await p;
      if (this.cancelled) return null;
      const m = /^bestmove (\S+)/.exec(line);
      return m && m[1] !== "(none)" && m[1] !== "0000" ? m[1] : null;
    } finally {
      this.searching = false;
    }
  }

  cancel() { if (this.searching) { this.cancelled = true; this.send("stop"); } }

  dispose() {
    this.listeners.clear();
    try { this.send("quit"); } catch { /* worker already gone */ }
    this.worker.terminate();
  }
}
