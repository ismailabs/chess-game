import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthCtx {
  session: Session | null; user: User | null; loading: boolean; authError: string | null;
  signIn: () => Promise<void>; signOut: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const qs = new URLSearchParams(location.search);
    const callback = qs.has("code") || location.hash.includes("access_token");
    const err = qs.get("error_description") ?? new URLSearchParams(location.hash.slice(1)).get("error_description");
    if (err) setAuthError(err);

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (!callback || data.session || err) setLoading(false);
    });
    const fallback = setTimeout(() => alive && setLoading(false), 10_000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
      if (s && (location.search.includes("code=") || location.hash.includes("access_token"))) {
        history.replaceState(null, "", location.pathname);
      }
    });
    return () => { alive = false; clearTimeout(fallback); subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    session, user: session?.user ?? null, loading, authError,
    signIn: async () => {
      setAuthError(null);
      const redirectOrigin = window.location.origin.includes("localhost")
        ? window.location.origin
        : "https://chess.ismailstudio.my";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google", options: { redirectTo: redirectOrigin },
      });
      if (error) setAuthError(error.message);
    },
    signOut: async () => { await supabase.auth.signOut(); },
  }), [session, loading, authError]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
