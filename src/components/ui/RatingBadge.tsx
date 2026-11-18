import React from "react";

export interface RatingBadgeProps {
  rating: number;
  gamesPlayed?: number;
  showProvisional?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  rating,
  gamesPlayed = 30,
  showProvisional = true,
  size = "md",
  className = "",
}) => {
  const isProvisional = showProvisional && gamesPlayed < 20;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-2.5 py-1 gap-1.5",
    lg: "text-base px-3.5 py-1.5 gap-2 font-bold",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-lg font-mono font-semibold tabular-nums border border-[var(--outline)] bg-[var(--surface-container)] text-[var(--tertiary)] shadow-xs ${sizeClasses} ${className}`}
      title={isProvisional ? "Provisional rating (fewer than 20 games played)" : `Rating: ${rating}`}
    >
      <span>{rating}</span>
      {isProvisional && (
        <span
          className="text-xs font-bold text-[var(--on-surface-variant)] px-1 rounded-sm bg-[var(--surface-container-high)] border border-[var(--outline)]"
          aria-label="Provisional rating"
        >
          ?
        </span>
      )}
    </span>
  );
};
