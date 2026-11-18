import { useMemo } from "react";
import { Bot, MessageSquare } from "lucide-react";

interface Props {
  botStyle?: string;
  aiName: string;
  gameStatus: string;
  isAiTurn: boolean;
  inCheck: boolean;
  winner: "ai" | "human" | "draw" | null;
  ply: number;
}

const BOT_QUOTES: Record<string, { start: string[]; active: string[]; check: string[]; win: string[]; lose: string[] }> = {
  balanced: {
    start: ["Let's play a classical, solid game.", "May the best strategist win."],
    active: ["Calculating harmonious piece coordinates...", "Solidifying control over the center squares.", "Every piece has a purpose.", "A balanced position invites deep tactics."],
    check: ["Careful! Your King is exposed.", "Check! Solidify your defense."],
    win: ["A well-fought contest. Good game!", "Classical precision prevails."],
    lose: ["Impressive tactical execution. You played wonderfully!"],
  },
  aggressive: {
    start: ["Tactics will decide this battlefield!", "Prepare your defenses, I attack relentlessly!"],
    active: ["An open file is an invitation to attack!", "I seek dynamic initiative, not passive retreat!", "Are you ready for the tactical fireworks?", "Forward march!"],
    check: ["Check! Feel the fury of the assault!", "Your King has nowhere safe to hide!"],
    win: ["The attack was unstoppable! A glorious battle!", "Checkmate! Decisive and sharp."],
    lose: ["You survived the onslaught and counterattacked brilliantly!"],
  },
  defensive: {
    start: ["Patience is the ultimate weapon.", "Rock-solid prophylaxis will weather any storm."],
    active: ["Every weakness is neutralized.", "Patience... the fortress holds.", "Never overextend when defense is art.", "Slow and methodical."],
    check: ["A surgical check against your King.", "Even the shield has a sharp edge."],
    win: ["Patience and prophylaxis overcome all. Well played.", "The fortress was impenetrable."],
    lose: ["You found the crack in my armor. Well played!"],
  },
  beginner: {
    start: ["Hi! I'm learning chess, let's have fun!", "Let's see what happens!"],
    active: ["Hmm, which piece should I move now?", "Hope I didn't leave anything hanging!", "Chess is tricky, but I'm trying my best!", "Look at all these diagonal moves!"],
    check: ["Oh! Check! Watch out!", "Aha! That's a check, right?"],
    win: ["Yay! I won this one! Good game!", "Beginner's luck maybe? Fun match!"],
    lose: ["Aw, you got me! You're really good at chess!"],
  },
};

export default function BotBubble({
  botStyle = "balanced",
  aiName,
  gameStatus,
  isAiTurn,
  inCheck,
  winner,
  ply,
}: Props) {
  const quote = useMemo(() => {
    const quotes = BOT_QUOTES[botStyle] ?? BOT_QUOTES.balanced;

    if (gameStatus === "finished") {
      if (winner === "ai") return quotes.win[Math.floor(Math.random() * quotes.win.length)];
      if (winner === "human") return quotes.lose[Math.floor(Math.random() * quotes.lose.length)];
      return "An honorable draw! Well matched.";
    }

    if (inCheck) {
      return quotes.check[Math.floor(Math.random() * quotes.check.length)];
    }

    if (ply < 2) {
      return quotes.start[Math.floor(Math.random() * quotes.start.length)];
    }

    // Pick deterministic quote based on ply to avoid re-render flashing
    const activeList = quotes.active;
    return activeList[ply % activeList.length];
  }, [botStyle, gameStatus, inCheck, winner, ply]);

  return (
    <div className="relative flex items-start gap-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-container)] p-3 text-xs text-[var(--on-surface)] shadow-md">
      <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--primary)]/20 text-[var(--primary)]">
        {isAiTurn ? <Bot size={15} className="animate-spin text-[var(--primary)]" /> : <MessageSquare size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-bold text-[var(--on-surface)]">
          <span className="truncate">{aiName}</span>
          {isAiTurn && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--primary)]">
              <span className="size-1 rounded-full bg-[var(--primary)] animate-ping" />
              thinking…
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[var(--on-surface-variant)] italic">&ldquo;{quote}&rdquo;</p>
      </div>
    </div>
  );
}
