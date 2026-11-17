import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  applyUci, automaticOutcome, buildPgn, claimableDraw, clockAfterMove, hasMatingMaterial,
  remainingAt, replay, timeoutOutcome, TIME_CONTROLS,
} from "../supabase/functions/game-action/rules.ts";

const shuffle = ["g1f3", "g8f6", "f3g1", "f6g8"];
const out = (ucis: string[]) => { const r = replay(ucis); return { r, auto: automaticOutcome(r.chess, r.keys), claim: claimableDraw(r.chess, r.keys) }; };

describe("game endings", () => {
  it("detects checkmate (fool's mate)", () => {
    expect(out(["f2f3", "e7e5", "g2g4", "d8h4"]).auto).toEqual({ result: "0-1", termination: "checkmate" });
  });
  it("detects stalemate", () => {
    expect(automaticOutcome(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"))?.termination).toBe("stalemate");
  });
  it("detects insufficient material", () => {
    expect(automaticOutcome(new Chess("8/8/8/4k3/8/8/4K3/4N3 w - - 0 1"))?.termination).toBe("insufficient_material");
  });
  it("threefold repetition is claimable, not automatic", () => {
    const o = out([...shuffle, ...shuffle]);
    expect(o.auto).toBeNull();
    expect(o.claim?.termination).toBe("threefold_repetition");
  });
  it("fivefold repetition ends the game automatically", () => {
    expect(out(Array(4).fill(shuffle).flat()).auto?.termination).toBe("fivefold_repetition");
  });
  it("50-move rule is claimable; 75-move rule is automatic", () => {
    const c50 = new Chess("8/8/8/4k3/8/8/4K3/7R w - - 100 80");
    expect(automaticOutcome(c50)).toBeNull();
    expect(claimableDraw(c50)?.termination).toBe("fifty_move");
    expect(automaticOutcome(new Chess("8/8/8/4k3/8/8/4K3/7R w - - 150 100"))?.termination).toBe("seventyfive_move");
  });
  it("checkmate takes precedence over the 75-move rule", () => {
    expect(automaticOutcome(new Chess("R5k1/5ppp/8/8/8/8/8/6K1 b - - 150 90"))?.termination).toBe("checkmate");
  });
});

describe("move validation", () => {
  it("rejects illegal and malformed moves", () => {
    expect(() => applyUci(new Chess(), "e2e5")).toThrow();
    expect(() => applyUci(new Chess(), "e2")).toThrow();
    expect(() => applyUci(new Chess(), "e7e5")).toThrow(); // not black's turn
  });
  it("supports en passant and castling", () => {
    const c = replay(["e2e4", "a7a6", "e4e5", "d7d5"]).chess;
    expect(applyUci(c, "e5d6").flags).toContain("e");
    const k = new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    expect(applyUci(k, "e1g1").san).toBe("O-O");
  });
  it("requires an explicit promotion piece and offers all four", () => {
    const fen = "8/P6k/8/8/8/8/8/K7 w - - 0 1";
    expect(() => applyUci(new Chess(fen), "a7a8")).toThrow();
    expect(applyUci(new Chess(fen), "a7a8n").promotion).toBe("n");
    expect(new Chess(fen).moves({ square: "a7", verbose: true }).filter((m) => m.promotion)).toHaveLength(4);
  });
});

describe("timeout and mating material", () => {
  it("timeout is a draw when the opponent cannot mate", () => {
    const c = new Chess("8/8/8/4k3/8/8/4K3/4N3 b - - 0 1");
    expect(timeoutOutcome(c, "b")).toEqual({ result: "1/2-1/2", termination: "timeout" });
  });
  it("timeout is a win when the opponent has mating material", () => {
    const c = new Chess("8/8/8/4k3/8/8/4K3/4R3 b - - 0 1");
    expect(timeoutOutcome(c, "b")).toEqual({ result: "1-0", termination: "timeout" });
  });
  it("evaluates mating material", () => {
    expect(hasMatingMaterial(new Chess("8/8/8/4k3/8/8/4K3/4B3 w - - 0 1"), "w")).toBe(false);
    expect(hasMatingMaterial(new Chess("8/8/8/4k3/8/8/4K3/2B1B3 w - - 0 1"), "w")).toBe(false);
    expect(hasMatingMaterial(new Chess("8/8/8/4k3/8/8/4K3/3NN3 w - - 0 1"), "w")).toBe(true);
  });
});

describe("clocks", () => {
  const g = {
    white_ms: 60_000, black_ms: 60_000, increment_ms: 2_000, turn: "w" as const,
    turn_started_at: new Date(1_000_000).toISOString(), ply: 2, status: "active",
  };
  it("deducts elapsed time and adds the increment after a valid move", () => {
    expect(clockAfterMove(g, 1_010_000)).toEqual({ white_ms: 52_000, black_ms: 60_000, flagged: false });
  });
  it("flags when elapsed time reaches the remaining time", () => {
    expect(clockAfterMove(g, 1_060_000)).toMatchObject({ white_ms: 0, flagged: true });
  });
  it("does not run (or add increment) before both sides have moved", () => {
    const r = clockAfterMove({ ...g, ply: 1, turn: "b" }, 99_999_999);
    expect(r).toEqual({ white_ms: 60_000, black_ms: 60_000, flagged: false });
  });
  it("shows a countdown only for the side to move", () => {
    expect(remainingAt(g, 1_005_000)).toEqual({ w: 55_000, b: 60_000 });
    expect(remainingAt({ ...g, status: "finished" }, 1_005_000)).toEqual({ w: 60_000, b: 60_000 });
  });
  it("offers the six required time controls", () => {
    expect(TIME_CONTROLS.map((t) => t.id)).toEqual(["1+0", "2+1", "3+2", "5+0", "10+0", "10+5"]);
  });
});

describe("pgn", () => {
  it("builds PGN with headers", () => {
    const pgn = buildPgn(["e2e4", "e7e5"], { white: "A", black: "B", result: "*", tc: "5+0", initial: 300_000, inc: 0, date: "2026-11-17T00:00:00Z", mode: "online" });
    expect(pgn).toContain('[White "A"]');
    expect(pgn).toContain("1. e4 e5");
  });
});
