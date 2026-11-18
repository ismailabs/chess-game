import { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Bot, Swords, Users } from "lucide-react";

interface Props {
  onSignIn: () => void;
  authError: string | null;
}

// Sample tactical opening demonstration: 1. e4 e5 2. Nf3 Nc6 3. Bb5
const DEMO_POSITIONS = [
  { fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", from: "e2", to: "e4" },
  { fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1", from: "e7", to: "e5" },
  { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", from: "g1", to: "f3" },
  { fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", from: "b8", to: "c6" },
  { fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", from: "f1", to: "b5" },
  { fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3", from: "a7", to: "a6" },
];

export default function LoginShowcase({ onSignIn, authError }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % DEMO_POSITIONS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const cur = DEMO_POSITIONS[step];
  const lastMove = cur ? { [cur.from]: { backgroundColor: "rgba(255, 255, 0, 0.45)" }, [cur.to]: { backgroundColor: "rgba(255, 255, 0, 0.45)" } } : {};

  return (
    <div className="relative min-h-dvh flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden">
      {/* Background ambient radial gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-[#81b64c]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-[#e5b84b]/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Interactive Showcase Chessboard & Feature Badges */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[#81b64c]">
              <span className="size-2 rounded-full bg-[#81b64c] animate-pulse" />
              <span>Next-Generation Chess Arena</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-stone-100 font-heading">
              Master the Board in <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#81b64c] via-[#a3d969] to-[#e5b84b] bg-clip-text text-transparent">
                Dark Studio Luxury
              </span>
            </h1>
            <p className="max-w-xl text-sm sm:text-base text-stone-400">
              Real-time competitive multiplayer, Stockfish 17 AI sparring bots, and instant friend challenges wrapped in an Apple Liquid Glass design system.
            </p>
          </div>

          {/* Interactive Demo Board in Liquid Glass Bezel */}
          <div className="liquid-glass rounded-2xl p-3 sm:p-4 shadow-2xl max-w-[380px] sm:max-w-[420px] w-full">
            <div className="rounded-xl overflow-hidden shadow-inner border border-white/10">
              <Chessboard
                options={{
                  id: "showcase-board",
                  position: cur.fen,
                  boardOrientation: "white",
                  squareStyles: lastMove,
                  lightSquareStyle: { backgroundColor: "#eeeed2" },
                  darkSquareStyle: { backgroundColor: "#769656" },
                  animationDurationInMs: 300,
                  allowDragging: false,
                }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between px-2 text-xs font-mono text-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#81b64c]" />
                Ruy Lopez: Morphy Defense
              </span>
              <span>1. e4 e5 2. Nf3 Nc6 3. Bb5 a6</span>
            </div>
          </div>

          {/* 3 Concise Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#302e2b]/80 p-3 shadow-md backdrop-blur-md">
              <div className="grid size-9 place-items-center rounded-lg bg-[#81b64c]/15 text-[#81b64c]">
                <Swords size={18} />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-stone-200 truncate">Real-Time PvP</div>
                <div className="text-[11px] text-stone-400 truncate">Zero-lag matchmaking</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#302e2b]/80 p-3 shadow-md backdrop-blur-md">
              <div className="grid size-9 place-items-center rounded-lg bg-[#e5b84b]/15 text-[#e5b84b]">
                <Bot size={18} />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-stone-200 truncate">Stockfish 17</div>
                <div className="text-[11px] text-stone-400 truncate">Client-side WASM bots</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#302e2b]/80 p-3 shadow-md backdrop-blur-md">
              <div className="grid size-9 place-items-center rounded-lg bg-sky-500/15 text-sky-400">
                <Users size={18} />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-stone-200 truncate">Live Friends</div>
                <div className="text-[11px] text-stone-400 truncate">Instant match invites</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Liquid Glass Auth Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="liquid-glass w-full max-w-md rounded-3xl p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden">
            {/* Top specular reflection line */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            <div className="mx-auto mb-5 size-16 sm:size-20 flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="Chess | Ismail Studio Emblem"
                className="size-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] transition hover:scale-105"
              />
            </div>

            <h2 className="mb-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-100 font-heading">
              Chess | Ismail Studio
            </h2>

            <p className="mb-8 text-sm text-stone-400">
              Sign in with your Google account to track ratings, play rated matches, and challenge friends.
            </p>

            <button
              onClick={onSignIn}
              type="button"
              className="group relative flex w-full items-center justify-center gap-3.5 rounded-xl border border-white/20 bg-white py-3.5 px-5 font-semibold text-stone-900 shadow-xl transition-all duration-150 hover:bg-stone-100 hover:shadow-2xl active:translate-y-[2px]"
            >
              <img src="/google-logo.svg" alt="Google" className="size-5 shrink-0" />
              <span className="text-sm sm:text-base font-bold tracking-tight">Continue with Google</span>
            </button>

            {authError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-300"
              >
                {authError}
              </div>
            )}

            <div className="mt-8 border-t border-white/10 pt-4 text-xs text-stone-400">
              <span>Official domain: </span>
              <a
                href="https://chess.ismailstudio.my"
                className="font-medium text-[#81b64c] hover:underline"
              >
                chess.ismailstudio.my
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
