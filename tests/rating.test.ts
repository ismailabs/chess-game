import { describe, expect, it } from "vitest";
import {
  applyDelta,
  expectedScore,
  isBotGainEligible,
  kFactor,
  ratingDelta,
  RATING_FLOOR,
  START_RATING,
} from "../src/lib/rating";

describe("Elo rating constants & schedule", () => {
  it("initializes at starting rating 800 and floor 100", () => {
    expect(START_RATING).toBe(800);
    expect(RATING_FLOOR).toBe(100);
  });

  it("assigns correct K-factor based on games played and rating", () => {
    expect(kFactor(0, 800)).toBe(40);
    expect(kFactor(29, 1200)).toBe(40);
    expect(kFactor(30, 1200)).toBe(20);
    expect(kFactor(100, 2399)).toBe(20);
    expect(kFactor(100, 2400)).toBe(10);
    expect(kFactor(100, 2800)).toBe(10);
  });
});

describe("Expected score calculation", () => {
  it("computes 0.5 for equal ratings", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 4);
  });

  it("computes ~0.0909 for 800 vs 1200", () => {
    expect(expectedScore(800, 1200)).toBeCloseTo(0.0909, 3);
  });
});

describe("Rating delta calculations (§7.1 exact test matrix)", () => {
  it("1200 vs 1200, 30+ games (K=20): win +10, draw 0, loss -10", () => {
    const win = ratingDelta({ rating: 1200, gamesPlayed: 35, opponentRating: 1200, score: 1 });
    const draw = ratingDelta({ rating: 1200, gamesPlayed: 35, opponentRating: 1200, score: 0.5 });
    const loss = ratingDelta({ rating: 1200, gamesPlayed: 35, opponentRating: 1200, score: 0 });

    expect(win).toBe(10);
    expect(draw).toBe(0);
    expect(loss).toBe(-10);
  });

  it("New player 800 (K=40) beats 1200 opponent online: expected delta +36", () => {
    const delta = ratingDelta({
      rating: 800,
      gamesPlayed: 5,
      opponentRating: 1200,
      score: 1,
      kScale: 1.0,
    });
    expect(delta).toBe(36);
  });

  it("New player 800 beats 1200 bot (kScale 0.5): expected delta +18", () => {
    const delta = ratingDelta({
      rating: 800,
      gamesPlayed: 5,
      opponentRating: 1200,
      score: 1,
      kScale: 0.5,
    });
    expect(delta).toBe(18);
  });

  it("Opponent 1900 vs player 1200: clamped to 1600 before computing delta", () => {
    // 1200 vs 1900 clamped to 1600 (a 400 point difference)
    const deltaClamped = ratingDelta({
      rating: 1200,
      gamesPlayed: 40,
      opponentRating: 1900,
      score: 1,
    });
    const deltaExact400 = ratingDelta({
      rating: 1200,
      gamesPlayed: 40,
      opponentRating: 1600,
      score: 1,
    });
    expect(deltaClamped).toBe(deltaExact400);
    expect(deltaClamped).toBe(18); // K=20 * (1 - 0.0909) = 20 * 0.9091 = 18.18 -> 18
  });

  it("Rating never drops below floor of 100", () => {
    const delta = ratingDelta({
      rating: 105,
      gamesPlayed: 50,
      opponentRating: 105,
      score: 0,
    });
    expect(delta).toBe(-10);
    const newRating = applyDelta(105, delta);
    expect(newRating).toBe(100); // 105 - 10 = 95, clamped to 100
    expect(applyDelta(100, -20)).toBe(100);
  });

  it("Anti-farming guard correctly blocks gain from bots rated 400+ points below player", () => {
    expect(isBotGainEligible(1500, 1000)).toBe(false); // 500 diff >= 400
    expect(isBotGainEligible(1400, 1000)).toBe(false); // 400 diff >= 400
    expect(isBotGainEligible(1399, 1000)).toBe(true);  // 399 diff < 400
  });
});
