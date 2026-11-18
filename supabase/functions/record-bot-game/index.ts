import { createClient } from "@supabase/supabase-js";
import { Chess } from "chess.js";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SERVICE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

interface RecordBotGameBody {
  botId: string;
  botName?: string;
  botElo: number;
  userColor: "w" | "b";
  pgn: string;
  tc?: string;
  hintsUsed?: number;
  takebacksUsed?: number;
  resignedBy?: "user" | "bot";
  flaggedBy?: "user" | "bot";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    if (req.method !== "POST") throw new HttpError(405, "POST only");

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData.user) {
      throw new HttpError(401, "Please sign in again", "unauthenticated");
    }
    const user = authData.user;

    const b = (await req.json().catch(() => {
      throw new HttpError(400, "Invalid JSON");
    })) as RecordBotGameBody;

    if (!b || typeof b.botId !== "string" || !b.botId.trim()) {
      throw new HttpError(400, "Missing botId");
    }
    if (typeof b.botElo !== "number" || b.botElo < 100 || b.botElo > 3500) {
      throw new HttpError(400, "Invalid botElo");
    }
    if (b.userColor !== "w" && b.userColor !== "b") {
      throw new HttpError(400, "Invalid userColor");
    }
    if (typeof b.pgn !== "string" || !b.pgn.trim()) {
      throw new HttpError(400, "Missing PGN");
    }

    const chess = new Chess();
    try {
      chess.loadPgn(b.pgn);
    } catch {
      throw new HttpError(400, "Malformed PGN");
    }

    const plies = chess.history().length;
    let result: "1-0" | "0-1" | "1/2-1/2";
    let reason: string;

    if (chess.isCheckmate()) {
      const winner = chess.turn() === "w" ? "b" : "w";
      result = winner === "w" ? "1-0" : "0-1";
      reason = "checkmate";
    } else if (chess.isDraw()) {
      result = "1/2-1/2";
      reason = chess.isStalemate()
        ? "stalemate"
        : chess.isThreefoldRepetition()
        ? "threefold_repetition"
        : chess.isInsufficientMaterial()
        ? "insufficient_material"
        : "draw";
    } else if (b.resignedBy === "user") {
      result = b.userColor === "w" ? "0-1" : "1-0";
      reason = "resignation";
    } else if (b.resignedBy === "bot") {
      result = b.userColor === "w" ? "1-0" : "0-1";
      reason = "resignation";
    } else if (b.flaggedBy === "user") {
      result = b.userColor === "w" ? "0-1" : "1-0";
      reason = "timeout";
    } else if (b.flaggedBy === "bot") {
      result = b.userColor === "w" ? "1-0" : "0-1";
      reason = "timeout";
    } else {
      throw new HttpError(400, "Game is not completed");
    }

    // Rated eligibility check:
    // At least 10 plies, no hints, no takebacks
    const hintsCount = Number(b.hintsUsed ?? 0);
    const takebacksCount = Number(b.takebacksUsed ?? 0);
    const isRatedEligible = plies >= 10 && hintsCount === 0 && takebacksCount === 0;

    // Fetch user profile
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id, rating, peak_rating, games_played, wins, draws, losses")
      .eq("id", user.id)
      .single();

    if (profErr || !profile) {
      throw new HttpError(404, "User profile not found");
    }

    let delta = 0;
    let newRating = profile.rating;
    let newPeak = profile.peak_rating;
    let historyResult: "win" | "draw" | "loss" = "draw";

    if (isRatedEligible) {
      const userScore: 0 | 0.5 | 1 =
        result === "1/2-1/2"
          ? 0.5
          : (result === "1-0" && b.userColor === "w") || (result === "0-1" && b.userColor === "b")
          ? 1
          : 0;

      historyResult = userScore === 1 ? "win" : userScore === 0.5 ? "draw" : "loss";

      // 24h rolling anti-farming query
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { count: dailyCount } = await admin
        .from("bot_games")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("rated", true)
        .gte("created_at", twentyFourHoursAgo);

      const { data: recentHistory } = await admin
        .from("rating_history")
        .select("delta")
        .eq("user_id", user.id)
        .eq("mode", "bot")
        .gte("created_at", twentyFourHoursAgo);

      const dailyGain = (recentHistory ?? [])
        .filter((h: { delta: number }) => h.delta > 0)
        .reduce((acc: number, h: { delta: number }) => acc + h.delta, 0);

      const gamesCount = dailyCount ?? 0;

      // Elo formula
      const k = profile.games_played < 30 ? 40 : profile.rating >= 2400 ? 10 : 20;
      const oppClamped = Math.max(profile.rating - 400, Math.min(profile.rating + 400, b.botElo));
      const expected = 1 / (1 + 10 ** ((oppClamped - profile.rating) / 400));
      let calculatedDelta = Math.round(k * 0.5 * (userScore - expected));

      // Anti-farming guards:
      // 1. No gain if player is 400 or more above the bot
      if (calculatedDelta > 0 && profile.rating >= b.botElo + 400) {
        calculatedDelta = 0;
      }
      // 2. Rolling 24h cap +100 gain (losses always count)
      if (calculatedDelta > 0) {
        if (dailyGain >= 100) {
          calculatedDelta = 0;
        } else if (dailyGain + calculatedDelta > 100) {
          calculatedDelta = 100 - dailyGain;
        }
      }
      // 3. Max 60 rated bot games per day
      if (gamesCount >= 60) {
        calculatedDelta = 0;
      }

      delta = calculatedDelta;
      newRating = Math.max(100, profile.rating + delta);
      newPeak = Math.max(profile.peak_rating, newRating);
    }

    // Insert bot_games record
    const { data: botGame, error: botGameErr } = await admin
      .from("bot_games")
      .insert({
        user_id: user.id,
        bot_id: b.botId,
        bot_elo: b.botElo,
        user_color: b.userColor,
        pgn: b.pgn,
        result,
        reason,
        plies,
        rated: isRatedEligible,
        rating_applied_at: isRatedEligible ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (botGameErr) {
      console.error("Bot game insert error:", botGameErr);
      throw new HttpError(500, "Failed to record bot game");
    }

    if (isRatedEligible) {
      // Insert into rating_history
      const { error: histErr } = await admin.from("rating_history").insert({
        user_id: user.id,
        bot_game_id: botGame.id,
        mode: "bot",
        opponent_label: b.botName || b.botId,
        opponent_rating: b.botElo,
        result: historyResult,
        rating_before: profile.rating,
        rating_after: newRating,
        delta,
        time_control: b.tc ?? null,
        pgn: b.pgn,
      });

      if (histErr) {
        console.error("Rating history insert error:", histErr);
      }

      // Update profile
      const { error: updateProfErr } = await admin
        .from("profiles")
        .update({
          rating: newRating,
          peak_rating: newPeak,
          games_played: profile.games_played + 1,
          wins: profile.wins + (historyResult === "win" ? 1 : 0),
          draws: profile.draws + (historyResult === "draw" ? 1 : 0),
          losses: profile.losses + (historyResult === "loss" ? 1 : 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateProfErr) {
        console.error("Profile update error:", updateProfErr);
      }
    }

    return json({
      success: true,
      botGameId: botGame.id,
      rated: isRatedEligible,
      result,
      reason,
      plies,
      ratingBefore: profile.rating,
      ratingAfter: newRating,
      delta,
    });
  } catch (e: any) {
    if (e instanceof HttpError) {
      return json({ error: e.message, code: e.code }, e.status);
    }
    console.error("record-bot-game error:", e);
    return json({ error: "Server error" }, 500);
  }
});
