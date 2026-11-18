import React, { Suspense, useEffect, useState } from "react";
import {
  LogIn,
  LogOut,
  Settings as SettingsIcon,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AuthProvider, useAuth } from "./lib/auth";
import { Link, matchRoute, navigate, usePath } from "./lib/router";
import { configError, supabase } from "./lib/supabase";
import { Card, ThemeToggle } from "./components/ui";
import FriendsModal from "./components/FriendsModal";
import InviteModal from "./components/InviteModal";
import ChallengeToast from "./components/ChallengeToast";
import LoginShowcase from "./components/LoginShowcase";
import NavRail from "./components/NavRail";
import MobileTabBar from "./components/MobileTabBar";
import { usePresence } from "./hooks/usePresence";
import { useFriendInvites } from "./hooks/useFriendInvites";
import { isMuted, setMuted } from "./lib/sounds";
import type { Friendship, Profile } from "./lib/types";

// Lazy-loaded routes for optimal initial bundle size (< 180 KB gz)
const Home = React.lazy(() => import("./pages/Home"));
const Online = React.lazy(() => import("./pages/Online"));
const Bots = React.lazy(() => import("./pages/Bots"));
const Leaderboard = React.lazy(() => import("./pages/Leaderboard"));
const ProfilePage = React.lazy(() => import("./pages/Profile"));
const History = React.lazy(() => import("./pages/History"));
const Settings = React.lazy(() => import("./pages/Settings"));
const DevKit = React.lazy(() => import("./pages/DevKit"));
const GameView = React.lazy(() => import("./components/GameView"));

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 py-8 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-[var(--surface-container-high)]" />
      <div className="h-4 w-72 rounded-lg bg-[var(--surface-container-high)]/70" />
      <div className="mt-8 h-64 w-full rounded-2xl bg-[var(--surface-container-high)]/50" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { user, loading, signIn, signOut, authError } = useAuth();
  const path = usePath();
  const [showFriends, setShowFriends] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState<Profile | null>(null);
  const [muted, setMutedState] = useState(() => isMuted());
  const [friendsList, setFriendsList] = useState<Friendship[]>([]);

  const route = matchRoute(path);

  // Derive in-game ID for presence if playing a live game
  const inGameId =
    route.name === "play" ||
    route.name === "online" ||
    route.name === "bots" ||
    route.name === "computer" ||
    route.name === "game"
      ? route.params.id ?? null
      : null;

  // Realtime Presence & Friend Invites (only active when signed in)
  const { getStatus } = usePresence(user?.id, inGameId);
  const {
    incomingInvite,
    setOutgoingInvite,
    acceptInvite,
    declineInvite,
    busy: inviteBusy,
  } = useFriendInvites(user?.id);

  // Set document title according to current route
  useEffect(() => {
    const titles: Record<string, string> = {
      home: "Chess | Ismail Studio",
      play: "Play Online | Chess | Ismail Studio",
      online: "Play Online | Chess | Ismail Studio",
      bots: "Play Bots | Chess | Ismail Studio",
      computer: "Play Bots | Chess | Ismail Studio",
      history: "Game History | Chess | Ismail Studio",
      leaderboard: "Leaderboard | Chess | Ismail Studio",
      profile: "Player Profile | Chess | Ismail Studio",
      user: "Player Profile | Chess | Ismail Studio",
      settings: "Settings | Chess | Ismail Studio",
    };
    document.title = titles[route.name] ?? "Chess | Ismail Studio";
  }, [route.name]);

  // Load friends to compute online count badge
  useEffect(() => {
    if (!user) return;
    supabase
      .from("friendships")
      .select("id, user_id, friend_id, status")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .then(({ data }) => {
        if (data) setFriendsList(data as Friendship[]);
      });
  }, [user]);

  const onlineFriendsCount = friendsList.filter((f) => {
    const otherId = f.user_id === user?.id ? f.friend_id : f.user_id;
    return getStatus(otherId) === "online" || getStatus(otherId) === "in-game";
  }).length;

  function toggleMute() {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  }

  if (path === "/dev/kit") {
    return <DevKit />;
  }

  if (configError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--bg)] p-4 text-[var(--on-surface)]">
        <Card className="max-w-md text-center p-6 bg-[var(--surface-container)] border border-red-500/30">
          <p className="text-red-400 font-semibold">{configError}</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--bg)] p-4 text-[var(--on-surface)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative size-16">
            <img
              src="/logo.svg"
              alt="Chess Logo"
              className="size-full animate-pulse drop-shadow-[0_0_16px_rgba(129,182,76,0.5)]"
            />
          </div>
          <p className="text-sm font-bold font-heading text-[var(--on-surface)] tracking-wide">
            Chess | Ismail Studio
          </p>
        </div>
      </div>
    );
  }

  const meta = user?.user_metadata ?? {};
  const name: string = meta.full_name ?? meta.name ?? user?.email?.split("@")[0] ?? "Player";
  const avatar: string | undefined = meta.avatar_url ?? meta.picture;

  return (
    <div className="flex min-h-dvh bg-[var(--bg)] text-[var(--on-surface)] antialiased overflow-x-hidden transition-colors">
      {/* Desktop Navigation Rail */}
      <NavRail
        activePage={route.name}
        onOpenFriends={() => setShowFriends(true)}
        onlineFriendsCount={onlineFriendsCount}
        muted={muted}
        onToggleMute={toggleMute}
        user={user ? { name, avatar } : null}
        onSignOut={signOut}
        onSignIn={signIn}
      />

      {/* Main App Workspace Canvas */}
      <div className="flex flex-1 flex-col min-w-0 bg-[var(--surface-container)] pb-20 md:pb-6 transition-colors">
        {/* Mobile Top Header (Hidden on md and up where NavRail is visible) */}
        <header className="md:hidden flex items-center justify-between border-b border-[var(--outline)] bg-[var(--surface)] px-4 py-3 sticky top-0 z-30 backdrop-blur-md transition-colors">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Chess Logo" className="size-8" />
            <span className="font-extrabold text-sm tracking-tight text-[var(--on-surface)] font-heading">
              Chess | Ismail Studio
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              type="button"
              className="rounded-lg p-2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors cursor-pointer"
              onClick={toggleMute}
              title={muted ? "Unmute sounds" : "Mute sounds"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {user && (
              <button
                type="button"
                className="relative rounded-lg p-2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors cursor-pointer"
                onClick={() => setShowFriends(true)}
                title="Friends & Social"
              >
                <Users size={18} />
                {onlineFriendsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[var(--primary)]" />
                )}
              </button>
            )}

            <button
              type="button"
              className="rounded-lg p-2 text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors cursor-pointer"
              onClick={() => navigate("/settings")}
              title="Settings"
            >
              <SettingsIcon size={18} />
            </button>

            {user ? (
              <button
                type="button"
                className="rounded-lg p-2 text-[var(--on-surface-variant)] hover:text-red-400 transition-colors cursor-pointer"
                onClick={signOut}
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold bg-[var(--primary)] text-[var(--on-primary)] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                onClick={signIn}
                title="Sign in with Google"
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <Suspense fallback={<PageSkeleton />}>
            {route.name === "home" ? (
              user ? (
                <Home
                  userId={user.id}
                  onOpenFriends={() => setShowFriends(true)}
                  onlineFriendsCount={onlineFriendsCount}
                />
              ) : (
                <LoginShowcase onSignIn={signIn} authError={authError} />
              )
            ) : route.name === "bots" || route.name === "computer" ? (
              <Bots userId={user?.id ?? "guest"} gameId={route.params.id} />
            ) : route.name === "leaderboard" ? (
              <Leaderboard currentUserId={user?.id} />
            ) : route.name === "history" ? (
              user ? (
                <History userId={user.id} gameId={route.params.id} />
              ) : (
                <LoginShowcase onSignIn={signIn} authError={authError} />
              )
            ) : route.name === "profile" ? (
              user ? (
                <ProfilePage currentUserId={user.id} />
              ) : (
                <LoginShowcase onSignIn={signIn} authError={authError} />
              )
            ) : route.name === "user" ? (
              <ProfilePage currentUserId={user?.id ?? ""} targetUsername={route.params.username} />
            ) : route.name === "settings" ? (
              <Settings />
            ) : route.name === "game" ? (
              user ? (
                <GameView gameId={route.params.id} userId={user.id} backTo="/play" />
              ) : (
                <LoginShowcase onSignIn={signIn} authError={authError} />
              )
            ) : user ? (
              <Online
                userId={user.id}
                gameId={route.params.id}
                onOpenFriends={() => setShowFriends(true)}
                getStatus={getStatus}
              />
            ) : (
              <LoginShowcase onSignIn={signIn} authError={authError} />
            )}
          </Suspense>
        </main>

        {/* Global Footer (Desktop) */}
        <footer className="hidden md:flex items-center justify-between border-t border-[var(--outline)] px-8 py-4 text-xs text-[var(--on-surface-variant)] transition-colors">
          <div>
            Chess by Ismail Studio · Stockfish WASM · Free and open source under GPL-3.0
          </div>
          <div className="font-mono text-[var(--on-surface-variant)]">© Ismail Studio</div>
        </footer>
      </div>

      {/* Mobile Frosted Bottom Tab Bar */}
      <MobileTabBar
        activePage={route.name}
        onOpenFriends={() => setShowFriends(true)}
        onlineFriendsCount={onlineFriendsCount}
        isSignedIn={Boolean(user)}
      />

      {/* Floating Incoming Challenge Toast */}
      {incomingInvite && (
        <ChallengeToast
          invite={incomingInvite}
          onAccept={acceptInvite}
          onDecline={declineInvite}
          busy={inviteBusy}
        />
      )}

      {/* Friends & Social Dialog */}
      {showFriends && user && (
        <FriendsModal
          currentUserId={user.id}
          getStatus={getStatus}
          onChallenge={(friend) => setChallengeTarget(friend)}
          onClose={() => setShowFriends(false)}
        />
      )}

      {/* Challenge Match Dialog */}
      {challengeTarget && (
        <InviteModal
          friend={challengeTarget}
          status={getStatus(challengeTarget.id)}
          onClose={() => setChallengeTarget(null)}
          onInviteSent={(inv) => {
            setOutgoingInvite(inv);
            setChallengeTarget(null);
          }}
        />
      )}
    </div>
  );
}
