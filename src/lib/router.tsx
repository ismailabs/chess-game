import { useEffect, useState, type ReactNode } from "react";

export function navigate(path: string) {
  if (location.pathname === path) return;
  history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function usePath(): string {
  const [p, setP] = useState(() => (typeof location !== "undefined" ? location.pathname : "/"));
  useEffect(() => {
    const f = () => setP(location.pathname);
    window.addEventListener("popstate", f);
    return () => window.removeEventListener("popstate", f);
  }, []);
  return p;
}

export interface RouteMatch {
  name: string;
  params: Record<string, string>;
}

export function matchRoute(path: string): RouteMatch {
  const clean = path.replace(/\/+$/, "") || "/";

  if (clean === "/" || clean === "/play") {
    return { name: "play", params: {} };
  }
  if (clean === "/bots" || clean === "/computer") {
    return { name: "bots", params: {} };
  }
  if (clean === "/history") {
    return { name: "history", params: {} };
  }
  if (clean === "/leaderboard") {
    return { name: "leaderboard", params: {} };
  }
  if (clean === "/profile") {
    return { name: "profile", params: {} };
  }
  if (clean === "/settings") {
    return { name: "settings", params: {} };
  }
  if (clean === "/dev/kit") {
    return { name: "devkit", params: {} };
  }

  // Parameterized routes
  const gameMatch = clean.match(/^\/game\/([a-zA-Z0-9_-]+)/);
  if (gameMatch) {
    return { name: "game", params: { id: gameMatch[1] } };
  }

  const userMatch = clean.match(/^\/u\/([a-zA-Z0-9_]+)/);
  if (userMatch) {
    return { name: "user", params: { username: userMatch[1] } };
  }

  // Legacy fallback: /online/:id or /computer/:id
  const legacyMatch = clean.match(/^\/(online|computer|history)\/([a-zA-Z0-9_-]+)/);
  if (legacyMatch) {
    return { name: legacyMatch[1], params: { id: legacyMatch[2] } };
  }

  return { name: clean.slice(1) || "play", params: {} };
}

export function Link({
  to,
  className = "",
  children,
  onClick,
  ...props
}: {
  to: string;
  className?: string;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
