import { useState } from "react";
import {
  Sun,
  Moon,
  Laptop,
  Volume2,
  VolumeX,
  Vibrate,
  Sliders,
  CheckCircle2,
  Sparkles,
  Info,
  LogOut,
  Palette,
  Eye,
  Shield,
  Layers,
} from "lucide-react";
import { Card, Button, Switch, Segmented } from "../components/ui";
import { useTheme, type ThemePreference } from "../lib/theme";
import {
  isMuted,
  setMuted,
  getVolume,
  setVolume,
  playMoveSound,
} from "../lib/sounds";
import {
  isHapticsEnabled,
  setHapticsEnabled,
  triggerHaptic,
} from "../lib/haptics";
import { useAuth } from "../lib/auth";
import { navigate } from "../lib/router";

export default function Settings() {
  const { preference, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  // Audio settings
  const [muted, setMutedState] = useState(() => isMuted());
  const [volume, setVolumeState] = useState(() => getVolume());

  // Haptics settings
  const [haptics, setHapticsState] = useState(() => isHapticsEnabled());

  // Board appearance
  const [boardTheme, setBoardTheme] = useState<"green" | "slate" | "walnut">(() => {
    try {
      const stored = localStorage.getItem("chess_board_theme");
      if (stored === "slate" || stored === "walnut" || stored === "green") {
        return stored;
      }
    } catch {
      /* ignore */
    }
    return "green";
  });

  // Gameplay preferences
  const [hints, setHints] = useState(() => {
    try {
      return localStorage.getItem("chess_move_hints") !== "false";
    } catch {
      return true;
    }
  });

  const [premoves, setPremoves] = useState(() => {
    try {
      return localStorage.getItem("chess_premoves") !== "false";
    } catch {
      return true;
    }
  });

  const [autoQueen, setAutoQueen] = useState(() => {
    try {
      return localStorage.getItem("chess_auto_queen") === "true";
    } catch {
      return false;
    }
  });

  const [coordinates, setCoordinates] = useState(() => {
    try {
      return localStorage.getItem("chess_show_coords") !== "false";
    } catch {
      return true;
    }
  });

  function handleMuteChange(next: boolean) {
    setMutedState(next);
    setMuted(next);
    if (!next) {
      playMoveSound();
    }
  }

  function handleVolumeChange(next: number) {
    setVolumeState(next);
    setVolume(next);
    if (!muted) {
      playMoveSound();
    }
  }

  function handleHapticsChange(next: boolean) {
    setHapticsState(next);
    setHapticsEnabled(next);
    if (next) {
      triggerHaptic("medium");
    }
  }

  function handleBoardThemeChange(next: "green" | "slate" | "walnut") {
    setBoardTheme(next);
    try {
      localStorage.setItem("chess_board_theme", next);
    } catch {
      /* ignore */
    }
    triggerHaptic("light");
  }

  function handleHintsChange(next: boolean) {
    setHints(next);
    try {
      localStorage.setItem("chess_move_hints", String(next));
    } catch {
      /* ignore */
    }
    triggerHaptic("light");
  }

  function handlePremovesChange(next: boolean) {
    setPremoves(next);
    try {
      localStorage.setItem("chess_premoves", String(next));
    } catch {
      /* ignore */
    }
    triggerHaptic("light");
  }

  function handleAutoQueenChange(next: boolean) {
    setAutoQueen(next);
    try {
      localStorage.setItem("chess_auto_queen", String(next));
    } catch {
      /* ignore */
    }
    triggerHaptic("light");
  }

  function handleCoordinatesChange(next: boolean) {
    setCoordinates(next);
    try {
      localStorage.setItem("chess_show_coords", String(next));
    } catch {
      /* ignore */
    }
    triggerHaptic("light");
  }

  const boardThemeOptions = [
    {
      id: "green" as const,
      name: "Classic Green",
      light: "#eeeed2",
      dark: "#769656",
    },
    {
      id: "slate" as const,
      name: "Ocean Slate",
      light: "#e0e4eb",
      dark: "#6c7d93",
    },
    {
      id: "walnut" as const,
      name: "Warm Walnut",
      light: "#f0d9b5",
      dark: "#b58863",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-stone-300 mb-2">
          <Sliders size={13} className="text-[#81b64c]" />
          Preferences
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-stone-100">
          Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-stone-400">
          Customize board colors, game feel, sound effects, and gameplay assists.
        </p>
      </div>

      {/* 1. Appearance Section */}
      <Card className="bg-[#262522] border-white/10 p-5 sm:p-6 space-y-6 shadow-md">
        <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
          <Palette size={18} className="text-[#81b64c]" />
          <h2 className="text-base font-bold text-stone-100 font-heading">Appearance</h2>
        </div>

        {/* Theme mode */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-stone-200">
            Interface Theme
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "system" as const, label: "System", icon: Laptop },
              { id: "light" as const, label: "Light", icon: Sun },
              { id: "dark" as const, label: "Dark", icon: Moon },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = preference === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                    isSelected
                      ? "border-[#81b64c] bg-[#81b64c]/15 text-[#81b64c] shadow-sm"
                      : "border-white/10 bg-[#302e2b] text-stone-300 hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Board Color Theme */}
        <div className="space-y-3 pt-2">
          <label className="block text-sm font-semibold text-stone-200">
            Board Colors
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {boardThemeOptions.map((opt) => {
              const isSelected = boardTheme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleBoardThemeChange(opt.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-[#81b64c] bg-[#81b64c]/10 ring-1 ring-[#81b64c]"
                      : "border-white/10 bg-[#302e2b] hover:bg-white/5"
                  }`}
                >
                  {/* Mini 4-square board preview */}
                  <div className="grid grid-cols-2 size-10 rounded-lg overflow-hidden border border-white/20 shrink-0 shadow-inner">
                    <div style={{ backgroundColor: opt.light }} />
                    <div style={{ backgroundColor: opt.dark }} />
                    <div style={{ backgroundColor: opt.dark }} />
                    <div style={{ backgroundColor: opt.light }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-stone-100 truncate">
                      {opt.name}
                    </div>
                    {isSelected && (
                      <span className="text-[11px] font-semibold text-[#81b64c]">Active</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 2. Audio & Tactile Section */}
      <Card className="bg-[#262522] border-white/10 p-5 sm:p-6 space-y-6 shadow-md">
        <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
          <Volume2 size={18} className="text-[#81b64c]" />
          <h2 className="text-base font-bold text-stone-100 font-heading">Audio & Haptics</h2>
        </div>

        {/* Sound toggle */}
        <Switch
          label="Game Sound Effects"
          description="Synthesized physical acoustic wood tap, capture, and check tones"
          checked={!muted}
          onChange={(active) => handleMuteChange(!active)}
        />

        {/* Master volume slider */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-stone-200">Master Volume</span>
            <span className="font-mono text-xs font-bold text-stone-400">
              {muted ? "Muted" : `${Math.round(volume * 100)}%`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            disabled={muted}
            value={muted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-[#81b64c] h-2 bg-[#302e2b] rounded-lg cursor-pointer disabled:opacity-40"
            aria-label="Master volume slider"
          />
        </div>

        {/* Haptics toggle */}
        <div className="pt-2">
          <Switch
            label="Tactile Haptic Feedback"
            description="Subtle vibration pulses on piece moves, captures, and checks (mobile devices)"
            checked={haptics}
            onChange={handleHapticsChange}
          />
        </div>
      </Card>

      {/* 3. Gameplay Preferences */}
      <Card className="bg-[#262522] border-white/10 p-5 sm:p-6 space-y-5 shadow-md">
        <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
          <Eye size={18} className="text-[#81b64c]" />
          <h2 className="text-base font-bold text-stone-100 font-heading">Gameplay Assists</h2>
        </div>

        {/* Legal move hints */}
        <Switch
          label="Legal Move Hints"
          description="Display green dots on legal destination squares and rings on capturable pieces"
          checked={hints}
          onChange={handleHintsChange}
        />

        {/* Premoves */}
        <div className="pt-2">
          <Switch
            label="Premoves"
            description="Queue a move while waiting for your opponent to play (auto-plays instantly on turn)"
            checked={premoves}
            onChange={handlePremovesChange}
          />
        </div>

        {/* Auto Queen */}
        <div className="pt-2">
          <Switch
            label="Auto-Promote to Queen"
            description="Automatically promote pawns reaching the 8th rank to a Queen without asking"
            checked={autoQueen}
            onChange={handleAutoQueenChange}
          />
        </div>

        {/* Coordinates */}
        <div className="pt-2">
          <Switch
            label="Show Board Coordinates"
            description="Display algebraic letters (a-h) and numbers (1-8) along the edge of the board"
            checked={coordinates}
            onChange={handleCoordinatesChange}
          />
        </div>
      </Card>

      {/* 4. Account & Sign Out */}
      {user && (
        <Card className="bg-[#262522] border-white/10 p-5 sm:p-6 space-y-4 shadow-md">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
            <Shield size={18} className="text-[#81b64c]" />
            <h2 className="text-base font-bold text-stone-100 font-heading">Account</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="block text-sm font-bold text-stone-100 truncate">
                {user.email}
              </span>
              <span className="block text-xs font-mono text-stone-400 mt-0.5">
                Player ID: {user.id.slice(0, 8)}…
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                size="sm"
                onClick={() => navigate("/profile")}
              >
                Edit Profile
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={signOut}
                icon={<LogOut size={14} />}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 5. About & License */}
      <Card className="bg-[#262522] border-white/10 p-5 sm:p-6 space-y-3 shadow-md text-xs text-stone-400">
        <div className="flex items-center gap-2 text-stone-200 font-bold text-sm">
          <Info size={16} className="text-[#81b64c]" />
          <span>Chess by Ismail Studio</span>
          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono font-normal text-stone-300">
            v2.0.0
          </span>
        </div>
        <p className="leading-relaxed">
          Free and open-source chess platform featuring real-time multiplayer, 14-level bot ladder powered by Stockfish WASM, and Elo rating tracking.
        </p>
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
          <span>License: GNU General Public License v3.0 (GPL-3.0)</span>
          <span>© Ismail Studio</span>
        </div>
      </Card>
    </div>
  );
}
