import { useEffect, useState } from "react";
import {
  LogOut,
  Settings as SettingsIcon,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AuthProvider, useAuth } from "./lib/auth";
import { matchRoute, navigate, usePath } from "./lib/router";
import { configError, supabase } from "./lib/supabase";
import { Card, ThemeToggle } from "./components/ui";
import Home from "./pages/Home";
import Online from "./pages/Online";
import Bots from "./pages/Bots";
import Leaderboard from "./pages/Leaderboard";
import ProfilePage from "./pages/Profile";
import History from "./pages/History";
import Settings from "./pages/Settings";
import DevKit from "./pages/DevKit";
import GameView from "./components/GameView";
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

  // Realtime Presence & Friend Invites
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
      <div className="grid min-h-dvh place-items-center bg-[#262522] p-4 text-stone-100">
        <Card className="max-w-md text-center p-6 bg-[#302e2b] border border-red-500/30">
          <p className="text-red-400 font-semibold">{configError}</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#262522] p-4 text-stone-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative size-16">
            <img
              src="/logo.svg"
              alt="Chess Logo"
              className="size-full animate-pulse drop-shadow-[0_0_16px_rgba(129,182,76,0.5)]"
            />
          </div>
          <p className="text-sm font-bold font-heading text-stone-300 tracking-wide">
            Chess | Ismail Studio
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginShowcase onSignIn={signIn} authError={authError} />;
  }

  const meta = user.user_metadata ?? {};
  const name: string = meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "Player";
  const avatar: string | undefined = meta.avatar_url ?? meta.picture;

  return (
    <div className="flex min-h-dvh bg-[#262522] text-stone-100 antialiased overflow-x-hidden">
      {/* Desktop Sleek Left Navigation Rail */}
      <NavRail
        activePage={route.name}
        onOpenFriends={() => setShowFriends(true)}
        onlineFriendsCount={onlineFriendsCount}
        muted={muted}
        onToggleMute={toggleMute}
        user={{ name, avatar }}
        onSignOut={signOut}
      />

      {/* Main App Workspace Canvas */}
      <div className="flex flex-1 flex-col min-w-0 bg-[#302e2b] pb-20 md:pb-6">
        {/* Mobile Top Header (Hidden on md and up where NavRail is visible) */}
        <header className="md:hidden flex items-center justify-between border-b border-white/10 bg-[#262522] px-4 py-3 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Chess Logo" className="size-8" />
            <span className="font-extrabold text-sm tracking-tight text-stone-100 font-heading">
              Chess | Ismail Studio
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              type="button"
              className="rounded-lg p-2 text-stone-400 hover:text-stone-200 transition-colors"
              onClick={toggleMute}
              title={muted ? "Unmute sounds" : "Mute sounds"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <button
              type="button"
              className="relative rounded-lg p-2 text-stone-400 hover:text-stone-200 transition-colors"
              onClick={() => setShowFriends(true)}
              title="Friends & Social"
            >
              <Users size={18} />
              {onlineFriendsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#81b64c]" />
              )}
            </button>

            <button
              type="button"
              className="rounded-lg p-2 text-stone-400 hover:text-stone-200 transition-colors"
              onClick={() => navigate("/settings")}
              title="Settings"
            >
              <SettingsIcon size={18} />
            </button>

            <button
              type="button"
              className="rounded-lg p-2 text-stone-400 hover:text-red-400 transition-colors"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {route.name === "home" ? (
            <Home
              userId={user.id}
              onOpenFriends={() => setShowFriends(true)}
              onlineFriendsCount={onlineFriendsCount}
            />
          ) : route.name === "bots" || route.name === "computer" ? (
            <Bots userId={user.id} gameId={route.params.id} />
          ) : route.name === "leaderboard" ? (
            <Leaderboard currentUserId={user.id} />
          ) : route.name === "history" ? (
            <History userId={user.id} gameId={route.params.id} />
          ) : route.name === "profile" ? (
            <ProfilePage currentUserId={user.id} />
          ) : route.name === "user" ? (
            <ProfilePage currentUserId={user.id} targetUsername={route.params.username} />
          ) : route.name === "settings" ? (
            <Settings />
          ) : route.name === "game" ? (
            <GameView gameId={route.params.id} userId={user.id} backTo="/play" />
          ) : (
            <Online
              userId={user.id}
              gameId={route.params.id}
              onOpenFriends={() => setShowFriends(true)}
              getStatus={getStatus}
            />
          )}
        </main>

        {/* Global Footer (Desktop) */}
        <footer className="hidden md:flex items-center justify-between border-t border-white/10 px-8 py-4 text-xs text-stone-400">
          <div>
            Chess by Ismail Studio · Stockfish WASM · Free and open source under GPL-3.0
          </div>
          <div className="font-mono text-stone-400">© Ismail Studio</div>
        </footer>
      </div>

      {/* Mobile Frosted Bottom Tab Bar */}
      <MobileTabBar
        activePage={route.name}
        onOpenFriends={() => setShowFriends(true)}
        onlineFriendsCount={onlineFriendsCount}
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
      {showFriends && (
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
