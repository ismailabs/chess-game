import {
  Bot,
  Home as HomeIcon,
  History as HistoryIcon,
  LogOut,
  Settings as SettingsIcon,
  Swords,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Link, navigate } from "../lib/router";
import { ThemeToggle } from "./ui";

interface Props {
  activePage: string;
  onOpenFriends: () => void;
  onlineFriendsCount: number;
  muted: boolean;
  onToggleMute: () => void;
  user: {
    name: string;
    avatar?: string;
  } | null;
  onSignOut: () => void;
  onSignIn?: () => void;
}

export default function NavRail({
  activePage,
  onOpenFriends,
  onlineFriendsCount,
  muted,
  onToggleMute,
  user,
  onSignOut,
  onSignIn,
}: Props) {
  const navItems = [
    { to: "/", key: "home", label: "Home", icon: HomeIcon },
    { to: "/play", key: "play", label: "Play Online", icon: Swords },
    { to: "/bots", key: "bots", label: "Play Bots", icon: Bot },
    { to: "/leaderboard", key: "leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/history", key: "history", label: "Game History", icon: HistoryIcon },
    ...(user ? [{ to: "/profile", key: "profile", label: "Profile", icon: User }] : []),
    { to: "/settings", key: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <aside
      aria-label="Sidebar navigation"
      className="hidden md:flex w-56 lg:w-64 shrink-0 flex-col justify-between border-r border-[var(--outline)] bg-[var(--surface)] p-4 text-[var(--on-surface)] select-none z-30 transition-colors sticky top-0 h-dvh overflow-y-auto scrollbar-thin"
    >
      {/* Top: Logo & Main Navigation */}
      <div className="space-y-6">
        {/* Brand Header */}
        <Link to="/" className="flex items-center gap-3 px-2 group">
          <div className="size-10 shrink-0 transition-transform duration-200 group-hover:scale-105">
            <img src="/logo.svg" alt="Chess Logo" className="size-full" />
          </div>
          <div className="min-w-0">
            <span className="block font-extrabold text-base tracking-tight text-[var(--on-surface)] font-heading">
              Chess
            </span>
            <span className="block text-[11px] font-medium text-[var(--primary)] tracking-wide uppercase">
              Ismail Studio
            </span>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activePage === item.key ||
              (item.key === "play" && activePage === "online") ||
              (item.key === "bots" && activePage === "computer");
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_3px_0_#537a2e]"
                    : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                }`}
              >
                <Icon
                  size={19}
                  className={`shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? "text-[var(--on-primary)]" : "text-[var(--on-surface-variant)] group-hover:text-[var(--on-surface)]"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* Friends & Social Button with live online count (when signed in) */}
          {user && (
            <button
              type="button"
              onClick={onOpenFriends}
              className="group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] transition-all duration-150 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Users
                  size={19}
                  className="shrink-0 text-[var(--on-surface-variant)] group-hover:text-[var(--primary)] transition-colors"
                />
                <span className="truncate">Friends</span>
              </div>
              {onlineFriendsCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-[var(--primary)]/20 px-2 py-0.5 text-xs font-bold text-[var(--primary)]">
                  <span className="size-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                  {onlineFriendsCount}
                </span>
              )}
            </button>
          )}
        </nav>
      </div>

      {/* Bottom: Sound Toggle & User Profile Card / Sign In CTA */}
      <div className="space-y-3 pt-4 border-t border-[var(--outline)]">
        {/* Theme toggle control */}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-[var(--on-surface-variant)]">Theme</span>
          <ThemeToggle />
        </div>

        {/* Sound toggle button */}
        <button
          type="button"
          onClick={onToggleMute}
          className="flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] transition-colors cursor-pointer"
          title={muted ? "Unmute game sounds" : "Mute game sounds"}
        >
          <span className="flex items-center gap-2">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>Sound Effects</span>
          </span>
          <span className="font-mono text-[11px] text-[var(--on-surface-variant)]">{muted ? "OFF" : "ON"}</span>
        </button>

        {/* User Profile Capsule or Sign In button */}
        {user ? (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--outline)] bg-[var(--surface-container)] p-2.5 shadow-md">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-85 transition-opacity cursor-pointer"
              title="View Profile"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-9 rounded-full ring-2 ring-[var(--outline)] shrink-0 object-cover"
                />
              ) : (
                <span className="grid size-9 place-items-center rounded-full bg-[var(--surface-container-high)] text-sm font-bold text-[var(--on-surface)] shrink-0">
                  {user.name[0]?.toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-[var(--on-surface)]">{user.name}</div>
                <div className="truncate text-[10px] text-[var(--primary)] font-semibold">View Profile</div>
              </div>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="rounded-lg p-2 text-[var(--on-surface-variant)] hover:bg-red-500/10 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-xs font-bold text-[var(--on-primary)] shadow-md hover:bg-[var(--primary-hover)] transition-all cursor-pointer"
          >
            <img src="/google-logo.svg" alt="" className="size-4 shrink-0" />
            <span>Sign in with Google</span>
          </button>
        )}
      </div>
    </aside>
  );
}
