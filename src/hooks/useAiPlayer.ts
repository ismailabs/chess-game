import { useCallback, useEffect, useRef, useState } from "react";
import { serverNow } from "../lib/api";
import { loadManifest, UciEngine } from "../lib/engine";
import { errMsg } from "../lib/format";
import type { Game } from "../lib/types";
import { remainingAt } from "../../supabase/functions/game-action/rules.ts";

type Status = "off" | "loading" | "ready" | "thinking" | "error";

/** Loads the bundled engine, and plays the engine side by asking it for real UCI moves. */
export function useAiPlayer(game: Game, submit: (uci: string) => Promise<boolean>) {
  const [state, setState] = useState<{ status: Status; error?: string }>({ status: "off" });
  const [paused, setPaused] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [kick, setKick] = useState(0);
  const [ready, setReady] = useState(false);
  const engineRef = useRef<UciEngine | null>(null);
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const enabled = game.mode === "ai" && game.status === "active";

  useEffect(() => {
    if (!enabled) return;
    let dead = false;
    setReady(false);
    setState({ status: "loading" });
    (async () => {
      try {
        const entry = (await loadManifest()).find((e) => e.id === game.ai_engine);
        if (!entry) throw new Error(`Engine "${game.ai_engine}" is not bundled in this build.`);
        const eng = await UciEngine.load(entry);
        if (dead) { eng.dispose(); return; }
        await eng.configure(game.ai_level ?? 3);
        if (dead) { eng.dispose(); return; }
        engineRef.current = eng;
        setReady(true);
        setState({ status: "ready" });
      } catch (e) {
        if (!dead) setState({ status: "error", error: errMsg(e) });
      }
    })();
    return () => { dead = true; engineRef.current?.dispose(); engineRef.current = null; setReady(false); };
  }, [enabled, game.ai_engine, game.ai_level, attempt]);

  useEffect(() => {
    const eng = engineRef.current;
    if (!enabled || !ready || !eng || paused) return;
    if (game.turn !== game.ai_color) { setState((s) => (s.status === "thinking" ? { status: "ready" } : s)); return; }
    let stale = false;
    const rem = remainingAt(game, serverNow())[game.ai_color!];
    const movetime = Math.min(2000, Math.max(150, rem / 40 + game.increment_ms * 0.6));
    setState({ status: "thinking" });
    eng.bestMove(game.fen, movetime)
      .then(async (uci) => {
        if (stale) return;
        if (!uci) throw new Error("The engine returned no move.");
        const ok = await submitRef.current(uci);
        if (!ok && !stale) setTimeout(() => setKick((k) => k + 1), 1200);
      })
      .catch((e) => { if (!stale) setState({ status: "error", error: errMsg(e) }); });
    return () => { stale = true; eng.cancel(); };
  }, [enabled, ready, paused, game.revision, game.turn, game.status, kick]);

  return {
    ...state, paused,
    stop: useCallback(() => setPaused(true), []),
    resume: useCallback(() => setPaused(false), []),
    retry: useCallback(() => { setAttempt((a) => a + 1); setKick((k) => k + 1); }, []),
  };
}
