import React from "react";
import { Flame, Infinity as InfinityIcon, Timer, Zap } from "lucide-react";
import { TIME_CONTROLS } from "../../../supabase/functions/game-action/rules.ts";

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className = "",
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex flex-wrap p-1 rounded-2xl bg-[var(--surface-container)] border border-[var(--outline)] gap-1 ${className}`}
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
              isSelected
                ? "bg-[var(--surface)] text-[var(--on-surface)] shadow-sm font-bold border border-[var(--outline)]"
                : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]/50"
            }`}
          >
            {o.icon}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TimeControlPicker({
  value,
  onChange,
  columns = 2,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  columns?: 2 | 4;
  className?: string;
}) {
  const kindIcons: Record<string, React.ReactNode> = {
    Bullet: <Zap size={14} className="text-amber-500 shrink-0" />,
    Blitz: <Flame size={14} className="text-orange-500 shrink-0" />,
    Rapid: <Timer size={14} className="text-emerald-500 shrink-0" />,
    Casual: <InfinityIcon size={14} className="text-sky-500 shrink-0" />,
  };

  const gridCols = columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2";

  return (
    <div role="radiogroup" aria-label="Time control" className={`grid ${gridCols} gap-2 sm:gap-2.5 ${className}`}>
      {TIME_CONTROLS.map((t) => {
        const isSelected = t.id === value;
        const isUnlimited = t.id === "unlimited";
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(t.id)}
            className={`flex flex-col justify-between rounded-2xl p-3 sm:p-3.5 text-left transition-all duration-150 cursor-pointer border ${
              isUnlimited && columns === 2 ? "col-span-2" : ""
            } ${
              isSelected
                ? "border-[var(--primary)] bg-[var(--surface)] shadow-md ring-2 ring-[var(--primary)]/30"
                : "border-[var(--outline)] bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)]"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-sm sm:text-base font-bold text-[var(--on-surface)] truncate">
                {isUnlimited ? "Unlimited" : t.id}
              </span>
              <span>{kindIcons[t.kind]}</span>
            </div>
            <div className="mt-1 text-[11px] sm:text-xs font-medium text-[var(--on-surface-variant)]">
              {t.kind}
            </div>
          </button>
        );
      })}
    </div>
  );
}
