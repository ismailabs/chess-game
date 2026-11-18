import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-[var(--on-surface-variant)] select-none"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-[var(--surface)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/60 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--primary)] ${
            error
              ? "border-[var(--error)] focus-visible:outline-[var(--error)]"
              : "border-[var(--outline)] hover:border-[var(--outline)]"
          } ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs font-medium text-[var(--error)]">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span className="text-xs text-[var(--on-surface-variant)]">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
