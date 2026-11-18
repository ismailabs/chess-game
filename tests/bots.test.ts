import { describe, expect, it } from "vitest";
import { BOTS, getBot, getCoachBot, getRecommendedBot } from "../src/lib/bots";
import { selectPebbleMove, softmaxSelect } from "../src/lib/botEngine";
import { Chess } from "chess.js";

describe("Bots Ladder Configuration", () => {
  it("defines exactly 14 ladder bots with ascending nominal Elo", () => {
    expect(BOTS).toHaveLength(14);

    for (let i = 0; i < BOTS.length - 1; i++) {
      expect(BOTS[i + 1].elo).toBeGreaterThan(BOTS[i].elo);
    }

    expect(BOTS[0].id).toBe("pebble");
    expect(BOTS[0].elo).toBe(250);
    expect(BOTS[BOTS.length - 1].id).toBe("zenith");
    expect(BOTS[BOTS.length - 1].elo).toBe(3000);
  });

  it("ensures all bot IDs are unique and valid slugs", () => {
    const ids = BOTS.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(BOTS.length);

    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("verifies every bot has rich dialogue with at least 4 variants per category", () => {
    const categories = [
      "greeting",
      "capture",
      "check",
      "blunder",
      "winning",
      "losing",
      "win",
      "loss",
      "draw",
    ] as const;

    const forbiddenTerms = [
      /liquid glass/i,
      /dark studio/i,
      /next-generation/i,
      /arena/i,
      /https?:\/\//i,
    ];

    for (const bot of BOTS) {
      for (const cat of categories) {
        const lines = bot.lines[cat];
        expect(lines, `${bot.name} missing category ${cat}`).toBeDefined();
        expect(lines.length, `${bot.name} ${cat} has less than 4 lines`).toBeGreaterThanOrEqual(4);

        for (const line of lines) {
          expect(line.trim().length).toBeGreaterThan(5);
          for (const forbidden of forbiddenTerms) {
            expect(line).not.toMatch(forbidden);
          }
        }
      }
    }
  });

  it("supports adaptive Coach bot with dynamic Elo calibration", () => {
    const beginnerCoach = getCoachBot(500);
    expect(beginnerCoach.id).toBe("coach");
    expect(beginnerCoach.elo).toBe(500);
    expect(beginnerCoach.engine.type).toBe("weakened");

    const masterCoach = getCoachBot(2400);
    expect(masterCoach.elo).toBe(2400);
    expect(masterCoach.engine.type).toBe("stockfish");
    expect(masterCoach.engine.uciElo).toBe(2400);

    const botLookup = getBot("coach", 1200);
    expect(botLookup).toBeDefined();
    expect(botLookup?.elo).toBe(1200);
  });

  it("recommends appropriate bot based on user rating", () => {
    expect(getRecommendedBot(200).id).toBe("pebble");
    expect(getRecommendedBot(420).id).toBe("mochi");
    expect(getRecommendedBot(610).id).toBe("sprout");
    expect(getRecommendedBot(800).id).toBe("biscuit");
    expect(getRecommendedBot(1190).id).toBe("ollie");
    expect(getRecommendedBot(1620).id).toBe("sasha");
    expect(getRecommendedBot(2200).id).toBe("atlas");
    expect(getRecommendedBot(2950).id).toBe("zenith");
  });
});

describe("Bot Engine Weakening & Pebble Logic", () => {
  it("Pebble generates legal UCI moves across various positions", () => {
    const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const move = selectPebbleMove(startFen);
    expect(move).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);

    const chess = new Chess(startFen);
    const legalUcis = chess.moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ""}`);
    expect(legalUcis).toContain(move);

    // Tactical position with check
    const checkFen = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
    // This is Fool's Mate (checkmate), so 0 moves
    expect(selectPebbleMove(checkFen)).toBe("");

    // Position with captures available
    const captureFen = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2";
    const capMove = selectPebbleMove(captureFen);
    const capChess = new Chess(captureFen);
    const capLegalUcis = capChess.moves({ verbose: true }).map((m) => `${m.from}${m.to}${m.promotion ?? ""}`);
    expect(capLegalUcis).toContain(capMove);
  });

  it("Softmax selection returns valid candidate move and respects temperature", () => {
    const candidates = [
      { move: "e2e4", scoreCp: 50 },
      { move: "d2d4", scoreCp: 30 },
      { move: "g1f3", scoreCp: 20 },
      { move: "f2f3", scoreCp: -150 },
    ];

    // High temperature (flat distribution)
    const moveHighTemp = softmaxSelect(candidates, 2.5);
    expect(["e2e4", "d2d4", "g1f3", "f2f3"]).toContain(moveHighTemp);

    // Low temperature (strongly favors e2e4: theoretical ~84.5% probability)
    let bestCount = 0;
    for (let i = 0; i < 50; i++) {
      const selected = softmaxSelect(candidates, 0.1);
      if (selected === "e2e4") bestCount++;
    }
    expect(bestCount).toBeGreaterThanOrEqual(35);
  });
});
