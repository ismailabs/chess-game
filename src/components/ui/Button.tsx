import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "filled" | "tonal" | "outlined" | "text" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "filled", size = "md", className = "", children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 touch-manipulation";

    const variantStyles = {
      filled:
        "bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)] shadow-md shadow-[var(--primary)]/20 active:shadow-sm",
      tonal:
        "bg-[var(--surface-container-high)] text-[var(--on-surface)] hover:bg-[var(--surface-container)] border border-[var(--outline)]",
      outlined:
        "bg-transparent text-[var(--on-surface)] border border-[var(--outline)] hover:bg-[var(--surface-container)]/50",
      text:
        "bg-transparent text-[var(--on-surface)] hover:bg-[var(--surface-container)]",
      danger:
        "bg-[var(--error)] text-[var(--on-error)] hover:opacity-90 shadow-md shadow-[var(--error)]/20",
      ghost:
        "bg-transparent text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container)]",
    };

    const sizeStyles = {
      sm: "min-h-[36px] px-3 py-1.5 text-xs gap-1.5",
      md: "min-h-[44px] px-4 py-2.5 text-sm gap-2",
      lg: "min-h-[52px] px-6 py-3 text-base gap-2.5 font-bold",
      icon: "min-h-[44px] min-w-[44px] p-2 rounded-full",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
