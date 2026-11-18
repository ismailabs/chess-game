import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "surface" | "container" | "high";
}

export const Card = ({
  children,
  className = "",
  variant = "container",
  ...props
}: CardProps) => {
  const bg = {
    surface: "bg-[var(--surface)]",
    container: "bg-[var(--surface-container)]",
    high: "bg-[var(--surface-container-high)]",
  }[variant];

  return (
    <div
      className={`rounded-2xl border border-[var(--outline)] ${bg} text-[var(--on-surface)] p-5 shadow-sm transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const GlassCard = ({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`glass rounded-2xl p-6 text-[var(--on-surface)] ${className}`}
    {...props}
  >
    {children}
  </div>
);
