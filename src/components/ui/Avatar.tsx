import React, { useState } from "react";

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = "Player",
  size = "md",
  className = "",
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: "size-6 text-[10px]",
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-14 text-lg",
    xl: "size-20 text-2xl",
  }[size];

  // Hash name for deterministic brand gradient
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isGreen = hash % 2 === 0;

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shrink-0 border border-[var(--outline)] shadow-xs ${sizeClasses} ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name}
      className={`rounded-full flex items-center justify-center font-bold tracking-tight shrink-0 border border-[var(--outline)] select-none shadow-xs ${
        isGreen
          ? "bg-[var(--primary)] text-[var(--on-primary)]"
          : "bg-[var(--tertiary)] text-[var(--on-tertiary)]"
      } ${sizeClasses} ${className}`}
    >
      {initials || "P"}
    </div>
  );
};
