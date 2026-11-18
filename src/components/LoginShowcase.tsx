import { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Bot, Swords, TrendingUp } from "lucide-react";
import { Button } from "./ui";
import { navigate } from "../lib/router";

interface Props {
  onSignIn: () => void;
  authError: string | null;
  onGuestPlay?: () => void;
}

// Famous Opera Game (Morphy vs Duke of Brunswick & Count Isouard, Paris 1858)
const OPERA_GAME_MOVES = [
  { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", from: "e2", to: "e4", label: "1. e4" },
  { fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", from: "e7", to: "e5", label: "1... e5" },
  { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", from: "g1", to: "f3", label: "2. Nf3" },
  { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", from: "d7", to: "d6", label: "2... d6 (Philidor Defense)" },
  { fen: "rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3", from: "d2", to: "d4", label: "3. d4" },
  { fen: "rnbqkbnr/ppp2ppp/3p4/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3", from: "c8", to: "g4", label: "3... Bg4" },
  { fen: "rn1qkbnr/ppp2ppp/3p4/4p3/3PP1b1/5N2/PPP2PPP/RNBQKB1R w KQkq - 1 4", from: "d4", to: "e5", label: "4. dxe5" },
  { fen: "rn1qkbnr/ppp2ppp/3p4/4P3/4P1b1/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 4", from: "g4", to: "f3", label: "4... Bxf3" },
  { fen: "rn1qkbnr/ppp2ppp/3p4/4P3/4P3/5b2/PPP2PPP/RNBQKB1R w KQkq - 0 5", from: "d1", to: "f3", label: "5. Qxf3" },
  { fen: "rn1qkbnr/ppp2ppp/3p4/4P3/4P3/5Q2/PPP2PPP/RNB1KB1R b KQkq - 0 5", from: "d6", to: "e5", label: "5... dxe5" },
  { fen: "rn1qkbnr/ppp2ppp/8/4p3/4P3/5Q2/PPP2PPP/RNB1KB1R w KQkq - 0 6", from: "f1", to: "c4", label: "6. Bc4" },
  { fen: "rn1qkbnr/ppp2ppp/8/4p3/2B1P3/5Q2/PPP2PPP/RNB1K2R b KQkq - 1 6", from: "g8", to: "f6", label: "6... Nf6" },
  { fen: "rn1qkb1r/ppp2ppp/5n2/4p3/2B1P3/5Q2/PPP2PPP/RNB1K2R w KQkq - 2 7", from: "f3", to: "b3", label: "7. Qb3" },
];

export default function LoginShowcase({ onSignIn, authError, onGuestPlay }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % OPERA_GAME_MOVES.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  const cur = OPERA_GAME_MOVES[step];
  const squareStyles = cur
    ? {
        [cur.from]: { backgroundColor: "rgba(255, 235, 59, 0.36)" },
        [cur.to]: { backgroundColor: "rgba(255, 235, 59, 0.45)" },
      }
    : {};

  return (
    <div className="relative min-h-dvh flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden bg-[#1d1c1a]">
      {/* Subtle ambient lighting */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-[#81b64c]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-[#e5b84b]/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Headline, Live Demo Board & Value Points */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-stone-100 font-heading">
              Play chess. <br className="hidden sm:inline" />
              <span className="text-[#81b64c]">Get better.</span>
            </h1>
            <p className="max-w-xl text-base sm:text-lg text-stone-400 font-medium">
              Challenge friends, beat bots at your level, and climb the ladder.
            </p>
          </div>

          {/* Quietly Animating Classic Board (Solid Surface Bezel per Law §2.2) */}
          <div className="bg-[#262522] border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl max-w-[360px] sm:max-w-[400px] w-full">
            <div className="rounded-xl overflow-hidden border border-white/10">
              <Chessboard
                options={{
                  id: "showcase-board",
                  position: cur.fen,
                  boardOrientation: "white",
                  squareStyles,
                  lightSquareStyle: { backgroundColor: "#eeeed2" },
                  darkSquareStyle: { backgroundColor: "#769656" },
                  animationDurationInMs: 250,
                  allowDragging: false,
                }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between px-2 text-xs font-mono text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#81b64c]" />
                Opera Game (1858)
              </span>
              <span className="font-semibold text-stone-300">{cur.label}</span>
            </div>
          </div>

          {/* Three Short Value Points (No Jargon) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl text-left">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#262522] p-3 shadow-sm">
              <div className="grid size-10 place-items-center rounded-xl bg-[#81b64c]/15 text-[#81b64c] shrink-0">
                <Swords size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-100 truncate">Play friends</div>
                <div className="text-[11px] text-stone-400 truncate">Live invites & presence</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#262522] p-3 shadow-sm">
              <div className="grid size-10 place-items-center rounded-xl bg-[#e5b84b]/15 text-[#e5b84b] shrink-0">
                <Bot size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-100 truncate">14 bots</div>
                <div className="text-[11px] text-stone-400 truncate">From 250 to 3000+</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#262522] p-3 shadow-sm">
              <div className="grid size-10 place-items-center rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
                <TrendingUp size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-100 truncate">Elo rating</div>
                <div className="text-[11px] text-stone-400 truncate">Progress tracking</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Liquid Glass Auth Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="liquid-glass w-full max-w-md rounded-3xl p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden">
            <div className="mx-auto mb-4 size-16 sm:size-20 flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="Chess Logo"
                className="size-full drop-shadow-md transition hover:scale-105"
              />
            </div>

            <h2 className="mb-2 text-2xl sm:text-3xl font-black tracking-tight text-stone-100 font-heading">
              Welcome
            </h2>

            <p className="mb-8 text-sm text-stone-400 font-medium">
              Sign in to save your rating, compete on the leaderboard, and challenge friends.
            </p>

            <div className="space-y-3">
              <button
                onClick={onSignIn}
                type="button"
                className="group relative flex w-full items-center justify-center gap-3.5 rounded-xl border border-white/20 bg-white py-3.5 px-5 font-semibold text-stone-900 shadow-xl transition-all duration-150 hover:bg-stone-100 hover:shadow-2xl active:scale-[0.98] cursor-pointer"
              >
                <img src="/google-logo.svg" alt="" className="size-5 shrink-0" />
                <span className="text-sm sm:text-base font-bold tracking-tight">
                  Continue with Google
                </span>
              </button>

              <Button
                variant="outlined"
                className="w-full text-stone-300 border-white/15 hover:bg-white/5"
                onClick={() => {
                  if (onGuestPlay) onGuestPlay();
                  else navigate("/bots");
                }}
              >
                Try a bot first
              </Button>
            </div>

            {authError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-300"
              >
                {authError}
              </div>
            )}

            <div className="mt-8 border-t border-white/10 pt-4 text-[11px] text-stone-400 flex items-center justify-center gap-4">
              <span>Engine by Stockfish</span>
              <span>•</span>
              <a
                href="https://www.gnu.org/licenses/gpl-3.0.html"
                target="_blank"
                rel="noreferrer"
                className="text-stone-400 hover:text-stone-200 underline"
              >
                GPL-3.0
              </a>
              <span>•</span>
              <span>Free & Open</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
