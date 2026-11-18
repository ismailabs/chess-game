import { useEffect, useState } from "react";
import {
  LogOut,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AuthProvider, useAuth } from "./lib/auth";
import { usePath } from "./lib/router";
import { configError, supabase } from "./lib/supabase";
import { Card } from "./components/ui";
import Online from "./pages/Online";
import Computer from "./pages/Computer";
import History from "./pages/History";
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

  const [page = "online", id] = path.split("/").filter(Boolean);
  const inGameId = (page === "online" || page === "computer") && id ? id : null;

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
      online: "Play Online | Chess | Ismail Studio",
      computer: "Play Stockfish Bots | Chess | Ismail Studio",
      history: "Game History | Chess | Ismail Studio",
    };
    document.title = titles[page] ?? "Chess | Ismail Studio";
  }, [page]);

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

  if (configError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#262522] p-4 text-stone-100">
        <Card className="liquid-glass max-w-md text-center p-6">
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
        activePage={page}
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
          {page === "computer" ? (
            <Computer userId={user.id} gameId={id} />
          ) : page === "history" ? (
            <History userId={user.id} gameId={id} />
          ) : (
            <Online
              userId={user.id}
              gameId={id}
              onOpenFriends={() => setShowFriends(true)}
              getStatus={getStatus}
            />
          )}
        </main>

        {/* Global Footer (Desktop) */}
        <footer className="hidden md:flex items-center justify-between border-t border-white/10 px-8 py-4 text-xs text-stone-400">
          <div>
            Computer opponent powered by Stockfish WASM. Hosted on{" "}
            <a
              href="https://chess.ismailstudio.my"
              className="font-medium text-[#81b64c] hover:underline"
            >
              chess.ismailstudio.my
            </a>
          </div>
          <div className="font-mono text-stone-400">© Ismail Studio</div>
        </footer>
      </div>

      {/* Mobile Frosted Bottom Tab Bar */}
      <MobileTabBar
        activePage={page}
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
