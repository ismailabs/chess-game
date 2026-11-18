import { beforeEach, describe, expect, it } from "vitest";
import {
  createGuestGame,
  getGuestGame,
  handleGuestAction,
  isGuestGameId,
} from "../src/lib/guestGame";

describe("guest bot game system", () => {
  beforeEach(() => {
    // Clear mock or in-memory sessionStorage
    sessionStorage.clear();
  });

  it("identifies guest game IDs correctly", () => {
    expect(isGuestGameId("guest-12345")).toBe(true);
    expect(isGuestGameId("guest-abc-xyz")).toBe(true);
    expect(isGuestGameId("abc-123")).toBe(false);
    expect(isGuestGameId("")).toBe(false);
    expect(isGuestGameId(null)).toBe(false);
  });

  it("creates a guest game with correct defaults", () => {
    const { game, moves } = createGuestGame({
      tc: "10+0",
      humanColor: "w",
      level: 2,
      engine: "stockfish-lite",
      aiName: "Biscuit (800)",
      botId: "biscuit",
      botStyle: "balanced",
    });

    expect(game.id).toMatch(/^guest-/);
    expect(game.mode).toBe("ai");
    expect(game.status).toBe("active");
    expect(game.white_id).toBe("guest");
    expect(game.black_id).toBeNull();
    expect(game.white_name).toBe("Guest");
    expect(game.black_name).toBe("Biscuit (800)");
    expect(game.ai_color).toBe("b");
    expect(game.ai_level).toBe(2);
    expect(game.tc).toBe("10+0");
    expect(game.white_ms).toBe(600_000);
    expect(game.black_ms).toBe(600_000);
    expect(game.ply).toBe(0);
    expect(game.turn).toBe("w");
    expect(moves).toHaveLength(0);

    // Verifies retrieval from session storage
    const retrieved = getGuestGame(game.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.game.id).toBe(game.id);
  });

  it("handles guest move, updates clocks, turn, and ply", () => {
    const { game } = createGuestGame({
      tc: "10+0",
      humanColor: "w",
      level: 2,
      engine: "stockfish-lite",
      aiName: "Biscuit (800)",
    });

    // Human plays 1. e4 (e2e4)
    const result = handleGuestAction({
      action: "move",
      gameId: game.id,
      uci: "e2e4",
      ai: false,
    });

    expect(result.game.ply).toBe(1);
    expect(result.game.turn).toBe("b");
    expect(result.move?.uci).toBe("e2e4");
    expect(result.move?.san).toBe("e4");
    expect(result.moves).toHaveLength(1);
    expect(result.game.status).toBe("active");

    // Bot plays 1... e5 (e7e5)
    const botResult = handleGuestAction({
      action: "move",
      gameId: game.id,
      uci: "e7e5",
      ai: true,
    });

    expect(botResult.game.ply).toBe(2);
    expect(botResult.game.turn).toBe("w");
    expect(botResult.move?.uci).toBe("e7e5");
    expect(botResult.move?.san).toBe("e5");
    expect(botResult.moves).toHaveLength(2);
  });

  it("prevents moving out of turn", () => {
    const { game } = createGuestGame({
      tc: "10+0",
      humanColor: "w",
      level: 2,
      engine: "stockfish-lite",
      aiName: "Biscuit (800)",
    });

    // Engine tries to move on White's turn
    expect(() =>
      handleGuestAction({
        action: "move",
        gameId: game.id,
        uci: "e7e5",
        ai: true,
      })
    ).toThrow();
  });

  it("handles guest resignation cleanly", () => {
    const { game } = createGuestGame({
      tc: "10+0",
      humanColor: "w",
      level: 2,
      engine: "stockfish-lite",
      aiName: "Biscuit (800)",
    });

    const result = handleGuestAction({
      action: "resign",
      gameId: game.id,
    });

    expect(result.game.status).toBe("finished");
    expect(result.game.result).toBe("0-1");
    expect(result.game.termination).toBe("resignation");
  });
});
