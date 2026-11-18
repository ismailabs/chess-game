import React from "react";
import { Flame, Infinity as InfinityIcon, Timer, Zap } from "lucide-react";
import { TIME_CONTROLS } from "../../supabase/functions/game-action/rules.ts";

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-[#262522] p-1.5"
    >
      {options.map((o) => {
        const isSelected = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(o.value)}
            className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all ${
              isSelected
                ? "bg-[#81b64c] text-white shadow-[0_2px_0_#537a2e]"
                : "text-stone-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function TimeControlPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const kindIcons: Record<string, React.ReactNode> = {
    Bullet: <Zap size={14} className="text-amber-400" />,
    Blitz: <Flame size={14} className="text-orange-400" />,
    Rapid: <Timer size={14} className="text-emerald-400" />,
    Casual: <InfinityIcon size={14} className="text-sky-400" />,
  };

  return (
    <div role="radiogroup" aria-label="Time control" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TIME_CONTROLS.map((t) => {
        const isSelected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(t.id)}
            className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
              isSelected
                ? "border-[#81b64c] bg-[#81b64c]/15 shadow-[0_0_12px_rgba(129,182,76,0.25)] ring-1 ring-[#81b64c]"
                : "border-white/10 bg-[#383632] hover:border-white/20 hover:bg-[#44413c]"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-base font-bold text-stone-100">
                {t.id === "unlimited" ? "Unlimited" : t.id}
              </span>
              <span>{kindIcons[t.kind]}</span>
            </div>
            <div className="mt-1 text-xs font-medium text-stone-400">{t.kind}</div>
          </button>
        );
      })}
    </div>
  );
}

export const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl border border-white/10 bg-[#302e2b] p-5 text-stone-100 shadow-xl ${className}`}
  >
    {children}
  </div>
);

export const GlassCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`liquid-glass rounded-2xl p-6 text-stone-100 shadow-2xl ${className}`}
  >
    {children}
  </div>
);
