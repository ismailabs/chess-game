import React from "react";

export interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  variant?: "filter" | "assist" | "status";
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  selected = false,
  onClick,
  variant = "filter",
  className = "",
}) => {
  const isClickable = Boolean(onClick);

  return (
    <button
      type={isClickable ? "button" : undefined}
      onClick={onClick}
      disabled={!isClickable}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 select-none ${
        selected
          ? "bg-[var(--primary)] text-[var(--on-primary)] shadow-sm"
          : "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] border border-[var(--outline)] hover:text-[var(--on-surface)]"
      } ${isClickable ? "cursor-pointer active:scale-95" : "cursor-default"} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
