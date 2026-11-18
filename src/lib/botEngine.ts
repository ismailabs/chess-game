// Bot Engine Orchestrator & Human-Like Weakening Layer
// Implements MultiPV softmax candidate selection, blunder probability injection,
// Pebble weighted-random engine, and lazy Stockfish worker lifecycle.

import { Chess } from "chess.js";
import type { BotConfig } from "./bots";

export interface CandidateMove {
  move: string; // UCI format e.g. "e2e4"
  scoreCp: number; // Centipawn score from bot's perspective
}

export interface BotMoveResult {
  uci: string;
  san?: string;
  scoreCp?: number;
  delayMs?: number;
}

/**
 * Weighted random move generator for Pebble (250).
 * Prioritizes captures and checks, but ignores tactical safety.
 */
export function selectPebbleMove(fen: string): string {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return "";

  // Assign heuristic weights
  const weighted = moves.map((m) => {
    let weight = 1;
    if (m.captured) weight += 5;
    if (m.san.includes("+")) weight += 3;
    // Slight preference for central pawn pushes
    if (m.piece === "p" && (m.to[1] === "4" || m.to[1] === "5")) weight += 2;
    return { move: `${m.from}${m.to}${m.promotion ?? ""}`, weight };
  });

  const totalWeight = weighted.reduce((acc, curr) => acc + curr.weight, 0);
  let randomVal = Math.random() * totalWeight;

  for (const item of weighted) {
    randomVal -= item.weight;
    if (randomVal <= 0) {
      return item.move;
    }
  }

  return weighted[0].move;
}

/**
 * Softmax probability selection over centipawn scores.
 * Temperature controls exploration:
 * Higher T (e.g. 2.5) -> flatter probabilities, frequent mistakes.
 * Lower T (e.g. 0.5) -> sharp bias toward best move.
 */
export function softmaxSelect(candidates: CandidateMove[], temperature: number): string {
  if (candidates.length === 0) return "";
  if (candidates.length === 1) return candidates[0].move;

  // Scale temp: temp * 100 cp
  const t = Math.max(0.1, temperature) * 100;

  // Find max score to prevent floating point overflow in exp()
  const maxScore = Math.max(...candidates.map((c) => c.scoreCp));

  const exps = candidates.map((c) => Math.exp((c.scoreCp - maxScore) / t));
  const sumExps = exps.reduce((acc, val) => acc + val, 0);

  let randomVal = Math.random() * sumExps;
  for (let i = 0; i < candidates.length; i++) {
    randomVal -= exps[i];
    if (randomVal <= 0) {
      return candidates[i].move;
    }
  }

  return candidates[0].move;
}

export class BotEngineService {
  private worker: Worker | null = null;
  private isReady = false;
  private currentBotId: string | null = null;
  private searching = false;
  private cancelled = false;

  private initWorker(): Promise<void> {
    if (this.worker && this.isReady) return Promise.resolve();

    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker("/engine/stockfish-18-lite-single.js");
        const timeout = setTimeout(() => {
          reject(new Error("Engine initialization timed out."));
        }, 15000);

        const onMessage = (e: MessageEvent) => {
          const text = typeof e.data === "string" ? e.data : "";
          if (text.includes("uciok")) {
            this.worker?.postMessage("isready");
          } else if (text.includes("readyok")) {
            clearTimeout(timeout);
            this.isReady = true;
            this.worker?.removeEventListener("message", onMessage);
            resolve();
          }
        };

        this.worker.addEventListener("message", onMessage);
        this.worker.onerror = (err) => {
          clearTimeout(timeout);
          reject(err);
        };

        this.worker.postMessage("uci");
      } catch (err) {
        reject(err);
      }
    });
  }

  private async configureForBot(bot: BotConfig): Promise<void> {
    if (!this.worker) await this.initWorker();
    if (!this.worker) throw new Error("Worker unavailable");

    // Don't reconfigure if same bot
    if (this.currentBotId === bot.id) return;

    const eng = bot.engine;
    if (eng.type === "stockfish") {
      if (eng.uciElo) {
        this.worker.postMessage("setoption name UCI_LimitStrength value true");
        this.worker.postMessage(`setoption name UCI_Elo value ${eng.uciElo}`);
      } else {
        this.worker.postMessage("setoption name UCI_LimitStrength value false");
        this.worker.postMessage("setoption name Skill Level value 20");
      }
      this.worker.postMessage("setoption name MultiPV value 1");
    } else if (eng.type === "weakened") {
      this.worker.postMessage("setoption name UCI_LimitStrength value false");
      this.worker.postMessage(`setoption name Skill Level value ${eng.skillLevel ?? 0}`);
      this.worker.postMessage(`setoption name MultiPV value ${eng.multiPV ?? 3}`);
    }

    this.worker.postMessage("ucinewgame");
    await this.waitForReady();
    this.currentBotId = bot.id;
  }

  private waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.worker) return resolve();
      const handler = (e: MessageEvent) => {
        const text = typeof e.data === "string" ? e.data : "";
        if (text.includes("readyok")) {
          this.worker?.removeEventListener("message", handler);
          resolve();
        }
      };
      this.worker.addEventListener("message", handler);
      this.worker.postMessage("isready");
    });
  }

  async getMove(fen: string, bot: BotConfig): Promise<BotMoveResult> {
    this.cancelled = false;

    // Check opening bias first if in starting or early position
    const chess = new Chess(fen);
    const ply = chess.history().length;
    if (ply === 0 && bot.openingBias && bot.openingBias.length > 0) {
      // Pick random opening bias move if legal
      const legalMoves = chess.moves();
      const candidates = bot.openingBias.filter((b) => legalMoves.includes(b));
      if (candidates.length > 0) {
        const chosenSan = candidates[Math.floor(Math.random() * candidates.length)];
        const moveObj = chess.move(chosenSan);
        if (moveObj) {
          const uci = `${moveObj.from}${moveObj.to}${moveObj.promotion ?? ""}`;
          const delay = Math.floor(Math.random() * (bot.thinkTime.max - bot.thinkTime.min)) + bot.thinkTime.min;
          await new Promise((r) => setTimeout(r, delay));
          return { uci, san: moveObj.san, delayMs: delay };
        }
      }
    }

    // 1. Pebble: pure random
    if (bot.engine.type === "random") {
      const uci = selectPebbleMove(fen);
      const delay = Math.floor(Math.random() * (bot.thinkTime.max - bot.thinkTime.min)) + bot.thinkTime.min;
      await new Promise((r) => setTimeout(r, delay));
      if (this.cancelled) throw new Error("Search cancelled");
      return { uci, delayMs: delay };
    }

    // 2. Stockfish-backed bot (weakened or full)
    await this.initWorker();
    await this.configureForBot(bot);

    if (this.searching) {
      this.worker?.postMessage("stop");
    }
    this.searching = true;

    try {
      this.worker?.postMessage(`position fen ${fen}`);

      const candidates: CandidateMove[] = [];
      let bestMoveFound = "";

      const searchPromise = new Promise<string>((resolve) => {
        const onMsg = (e: MessageEvent) => {
          const line = typeof e.data === "string" ? e.data : "";

          // Parse MultiPV candidates
          // Example: info depth 2 seldepth 2 multipv 1 score cp 34 pv e2e4 g8f6
          if (line.startsWith("info ") && line.includes("multipv ") && line.includes(" score ")) {
            const pvMatch = line.match(/multipv\s+(\d+)\s+score\s+(cp|mate)\s+(-?\d+).*?pv\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
            if (pvMatch) {
              const [, , scoreType, scoreVal, moveUci] = pvMatch;
              let score = parseInt(scoreVal, 10);
              if (scoreType === "mate") {
                score = score > 0 ? 10000 - score * 10 : -10000 - score * 10;
              }
              const existingIdx = candidates.findIndex((c) => c.move === moveUci);
              if (existingIdx >= 0) {
                candidates[existingIdx].scoreCp = score;
              } else {
                candidates.push({ move: moveUci, scoreCp: score });
              }
            }
          }

          if (line.startsWith("bestmove")) {
            const match = line.match(/^bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
            bestMoveFound = match ? match[1] : "";
            this.worker?.removeEventListener("message", onMsg);
            resolve(bestMoveFound);
          }
        };

        this.worker?.addEventListener("message", onMsg);

        if (bot.engine.type === "weakened") {
          const depth = bot.engine.depth ?? 2;
          this.worker?.postMessage(`go depth ${depth}`);
        } else {
          const movetime = bot.engine.movetime ?? 500;
          this.worker?.postMessage(`go movetime ${movetime}`);
        }
      });

      const moveFromEngine = await searchPromise;
      if (this.cancelled) throw new Error("Search cancelled");

      let finalMove = moveFromEngine;

      // Weakened bot candidate selection & blunder injection
      if (bot.engine.type === "weakened") {
        const blunderProb = bot.engine.blunderProb ?? 0;
        const willBlunder = Math.random() < blunderProb;

        if (willBlunder && candidates.length > 1) {
          // Sort by score ascending (worst first)
          candidates.sort((a, b) => a.scoreCp - b.scoreCp);
          // Pick the worst move, or second worst if queen would hang on move 1 for >= 600
          finalMove = candidates[0].move;
        } else if (candidates.length > 0) {
          const temp = bot.engine.temperature ?? 1.0;
          finalMove = softmaxSelect(candidates, temp);
        }
      }

      if (!finalMove) {
        finalMove = bestMoveFound || selectPebbleMove(fen);
      }

      // Add human-like simulated thinking delay
      const thinkMin = bot.thinkTime.min;
      const thinkMax = bot.thinkTime.max;
      const delay = Math.floor(Math.random() * (thinkMax - thinkMin)) + thinkMin;

      await new Promise((r) => setTimeout(r, delay));
      if (this.cancelled) throw new Error("Search cancelled");

      return { uci: finalMove, delayMs: delay };
    } finally {
      this.searching = false;
    }
  }

  cancel() {
    this.cancelled = true;
    if (this.searching && this.worker) {
      this.worker.postMessage("stop");
      this.searching = false;
    }
  }

  dispose() {
    this.cancel();
    if (this.worker) {
      try {
        this.worker.postMessage("quit");
      } catch {
        // worker may already be disposed
      }
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.currentBotId = null;
    }
  }
}

export const botEngine = new BotEngineService();
