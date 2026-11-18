import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../lib/theme";

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const { resolved, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center p-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-container)] text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] cursor-pointer transition-all duration-300 ease-[var(--ease-spring-default)] active:scale-90 ${className}`}
      aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${resolved === "dark" ? "light" : "dark"} theme`}
    >
      <div className="relative size-5 flex items-center justify-center overflow-hidden">
        <Sun
          size={18}
          className={`absolute transition-all duration-300 ease-[var(--ease-spring-default)] ${
            resolved === "light"
              ? "opacity-100 rotate-0 scale-100 text-amber-500"
              : "opacity-0 rotate-90 scale-50 text-stone-400"
          }`}
        />
        <Moon
          size={18}
          className={`absolute transition-all duration-300 ease-[var(--ease-spring-default)] ${
            resolved === "dark"
              ? "opacity-100 rotate-0 scale-100 text-sky-400"
              : "opacity-0 -rotate-90 scale-50 text-stone-400"
          }`}
        />
      </div>
    </button>
  );
};
