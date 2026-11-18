import { useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";

export function getStoredTheme(): ThemePreference {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "light" || val === "dark" || val === "system") {
      return val;
    }
  } catch {
    // LocalStorage unavailable
  }
  return "system";
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }
  return pref;
}

export function applyTheme(pref: ThemePreference) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(pref);
  const root = document.documentElement;

  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;

  // Update meta theme-color for browser chrome
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", resolved === "dark" ? "#1d1c1a" : "#f3f5f0");
  }

  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Ignore storage errors
  }
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredTheme);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(getStoredTheme()));

  useEffect(() => {
    applyTheme(preference);
    setResolved(resolveTheme(preference));

    if (preference !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme("system");
      setResolved(resolveTheme("system"));
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [preference]);

  const setTheme = (next: ThemePreference) => {
    setPreferenceState(next);
    applyTheme(next);
  };

  const toggleTheme = () => {
    // Cycles: dark -> light -> system (or if dark -> light, if light -> dark)
    const next: ThemePreference = resolved === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return { preference, resolved, setTheme, toggleTheme };
}
