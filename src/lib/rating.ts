// Elo Rating Calculation & Anti-Abuse Logic
// Conforms strictly to Chess by Ismail Studio v2 Rating Specification (§7.1)

export const START_RATING = 800;
export const RATING_FLOOR = 100;
export const PROVISIONAL_THRESHOLD = 20;

export const DAILY_BOT_ELO_CAP = 100;
export const DAILY_BOT_GAMES_CAP = 60;

/**
 * Computes expected score using the logistic curve:
 * E = 1 / (1 + 10^((opponent - player) / 400))
 */
export const expectedScore = (player: number, opponent: number): number => {
  return 1 / (1 + Math.pow(10, (opponent - player) / 400));
};

/**
 * Dynamic K-Factor:
 * - K=40 for provisional/early players (< 30 games)
 * - K=20 for regular club players (>= 30 games)
 * - K=10 for master level players (>= 2400 rating)
 */
export const kFactor = (gamesPlayed: number, rating: number): number => {
  if (gamesPlayed < 30) return 40;
  if (rating >= 2400) return 10;
  return 20;
};

export interface RatingDeltaParams {
  rating: number;
  gamesPlayed: number;
  opponentRating: number;
  score: 0 | 0.5 | 1;
  kScale?: number; // 1.0 for PvP, 0.5 for bots
}

/**
 * Calculates rating delta with 400-point opponent clamping.
 * Rating delta = round(K * kScale * (score - E))
 */
export function ratingDelta(p: RatingDeltaParams): number {
  // Opponent rating clamped within 400 points of player rating
  const clampedOpponent = Math.max(
    p.rating - 400,
    Math.min(p.rating + 400, p.opponentRating)
  );

  const e = expectedScore(p.rating, clampedOpponent);
  const k = kFactor(p.gamesPlayed, p.rating) * (p.kScale ?? 1);
  const raw = k * (p.score - e);

  return Math.round(raw);
}

/**
 * Calculates new rating with floor enforcement:
 * New Rating = max(RATING_FLOOR, rating + delta)
 */
export function applyDelta(rating: number, delta: number): number {
  return Math.max(RATING_FLOOR, rating + delta);
}

/**
 * Anti-farming guard:
 * Players cannot gain positive Elo from bots rated 400+ points below them.
 * Losses still deduct rating.
 */
export function isBotGainEligible(playerRating: number, botRating: number): boolean {
  return playerRating < botRating + 400;
}
