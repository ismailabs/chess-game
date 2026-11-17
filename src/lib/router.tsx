import { useEffect, useState, type ReactNode } from "react";

export function navigate(path: string) {
  history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
export function usePath() {
  const [p, setP] = useState(location.pathname);
  useEffect(() => {
    const f = () => setP(location.pathname);
    addEventListener("popstate", f);
    return () => removeEventListener("popstate", f);
  }, []);
  return p;
}
export function Link({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <a href={to} className={className}
      onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); navigate(to); }}>
      {children}
    </a>
  );
}
