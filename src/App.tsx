import { useState } from "react";
import {
  Cpu,
  History as HistoryIcon,
  LogOut,
  Swords,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AuthProvider, useAuth } from "./lib/auth";
import { Link, usePath } from "./lib/router";
import { configError } from "./lib/supabase";
import { Card } from "./components/ui";
import Online from "./pages/Online";
import Computer from "./pages/Computer";
import History from "./pages/History";
import FriendsModal from "./components/FriendsModal";
import InviteModal from "./components/InviteModal";
import ChallengeToast from "./components/ChallengeToast";
import { usePresence } from "./hooks/usePresence";
import { useFriendInvites } from "./hooks/useFriendInvites";
import { isMuted, setMuted } from "./lib/sounds";
import type { Profile } from "./lib/types";

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

  function toggleMute() {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  }

  if (configError) {
    return (
      <Center>
        <Card>
          <p className="text-danger">{configError}</p>
        </Card>
      </Center>
    );
  }

  if (loading) {
    return (
      <Center>
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.svg" alt="Chess Logo" className="size-12 animate-pulse" />
          <p className="text-sm font-medium text-ink-soft">Loading Chess…</p>
        </div>
      </Center>
    );
  }

  if (!user) {
    return (
      <Center>
        <Card className="w-full max-w-sm text-center shadow-xl">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-moss-soft p-2.5">
            <img src="/logo.svg" alt="Chess Logo" className="size-full" />
          </div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight">Chess</h1>
          <p className="mb-6 text-sm text-ink-soft">
            Play online with friends, challenge Stockfish AI engines, and analyze your games.
          </p>
          <button className="btn btn-primary w-full !py-2.5 font-semibold" onClick={signIn}>
            Continue with Google
          </button>
          {authError && (
            <p className="mt-3 text-xs text-danger" role="alert">
              {authError}
            </p>
          )}
          <div className="mt-6 border-t border-line pt-3 text-[11px] text-ink-soft">
            <span>Hosted at </span>
            <a
              href="https://chess.ismailstudio.my"
              className="font-medium underline hover:text-ink"
            >
              chess.ismailstudio.my
            </a>
          </div>
        </Card>
      </Center>
    );
  }

  const meta = user.user_metadata ?? {};
  const name: string = meta.full_name ?? meta.name ?? user.email ?? "Player";
  const avatar: string | undefined = meta.avatar_url ?? meta.picture;

  const nav = [
    { to: "/online", key: "online", label: "Play Online", icon: <Swords size={16} /> },
    { to: "/computer", key: "computer", label: "Play Computer", icon: <Cpu size={16} /> },
    { to: "/history", key: "history", label: "Game History", icon: <HistoryIcon size={16} /> },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-3 sm:px-4 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 py-3 sm:py-4">
        {/* Brand & Nav */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link to="/online" className="flex items-center gap-2.5 group">
            <img src="/logo.svg" alt="" className="size-8 transition group-hover:scale-105" />
            <span className="font-bold text-base tracking-tight hidden sm:inline">Chess</span>
          </Link>

          <nav className="flex flex-wrap gap-1" aria-label="Main">
            {nav.map((n) => (
              <Link
                key={n.key}
                to={n.to}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium transition ${
                  page === n.key
                    ? "bg-ink text-paper shadow-xs"
                    : "text-ink hover:bg-line/70"
                }`}
              >
                {n.icon}
                <span className="hidden xs:inline">{n.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User, Social & Settings Tools */}
        <div className="flex items-center gap-2">
          {/* Friends Modal Button */}
          <button
            className="btn !px-2.5 !py-1.5 text-xs sm:text-sm font-medium"
            onClick={() => setShowFriends(true)}
            title="Friends & Social"
          >
            <Users size={16} className="text-moss" />
            <span className="hidden sm:inline">Friends</span>
          </button>

          {/* Mute toggle button */}
          <button
            className="btn !px-2 !py-1.5 text-ink-soft hover:text-ink"
            onClick={toggleMute}
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            title={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* User Profile avatar */}
          <div className="flex items-center gap-2 border-l border-line pl-2">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                referrerPolicy="no-referrer"
                className="size-7 sm:size-8 rounded-full border border-line"
              />
            ) : (
              <span className="grid size-7 sm:size-8 place-items-center rounded-full bg-line text-xs sm:text-sm font-semibold">
                {name[0]?.toUpperCase()}
              </span>
            )}
            <span className="hidden max-w-32 truncate text-xs sm:text-sm font-medium sm:inline">
              {name}
            </span>
            <button
              className="btn !px-2 !py-1.5 text-ink-soft hover:text-danger"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-4">
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

      <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-soft flex flex-wrap items-center justify-between gap-2">
        <div>
          Computer opponent: Stockfish (Stockfish.js WASM build by Nathan Rugg), licensed under{" "}
          <a
            className="underline"
            href="https://www.gnu.org/licenses/gpl-3.0.html"
            target="_blank"
            rel="noreferrer"
          >
            GPL-3.0
          </a>
          . Sources:{" "}
          <a
            className="underline"
            href="https://github.com/official-stockfish/Stockfish"
            target="_blank"
            rel="noreferrer"
          >
            Stockfish
          </a>
          ,{" "}
          <a
            className="underline"
            href="https://github.com/nmrugg/stockfish.js"
            target="_blank"
            rel="noreferrer"
          >
            stockfish.js
          </a>
          ,{" "}
          <a
            className="underline"
            href="https://github.com/ismailabs/chess-game"
            target="_blank"
            rel="noreferrer"
          >
            this app
          </a>
          .
        </div>
        <div className="font-medium text-ink-soft">chess.ismailstudio.my</div>
      </footer>
    </div>
  );
}

const Center = ({ children }: { children: React.ReactNode }) => (
  <div className="grid min-h-dvh place-items-center p-4">{children}</div>
);
