import {
  Cpu,
  History as HistoryIcon,
  LogOut,
  Swords,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Link } from "../lib/router";
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
  };
  onSignOut: () => void;
}

export default function NavRail({
  activePage,
  onOpenFriends,
  onlineFriendsCount,
  muted,
  onToggleMute,
  user,
  onSignOut,
}: Props) {
  const navItems = [
    { to: "/online", key: "online", label: "Play Online", icon: Swords },
    { to: "/computer", key: "computer", label: "Play Bots", icon: Cpu },
    { to: "/history", key: "history", label: "Game History", icon: HistoryIcon },
  ];

  return (
    <aside
      aria-label="Sidebar navigation"
      className="hidden md:flex w-56 lg:w-64 shrink-0 flex-col justify-between border-r border-white/10 bg-[#262522] p-4 text-stone-100 select-none z-30"
    >
      {/* Top: Logo & Main Navigation */}
      <div className="space-y-6">
        {/* Brand Header */}
        <Link to="/online" className="flex items-center gap-3 px-2 group">
          <div className="size-10 shrink-0 transition-transform duration-200 group-hover:scale-105">
            <img src="/logo.svg" alt="Chess Logo" className="size-full" />
          </div>
          <div className="min-w-0">
            <span className="block font-extrabold text-base tracking-tight text-stone-100 font-heading">
              Chess
            </span>
            <span className="block text-[11px] font-medium text-[#81b64c] tracking-wide uppercase">
              Ismail Studio
            </span>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.key;
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-[#81b64c] text-white shadow-[0_3px_0_#537a2e]"
                    : "text-stone-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  size={19}
                  className={`shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : "text-stone-400 group-hover:text-stone-200"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* Friends & Social Button with live online count */}
          <button
            type="button"
            onClick={onOpenFriends}
            className="group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-300 hover:bg-white/5 hover:text-white transition-all duration-150"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Users
                size={19}
                className="shrink-0 text-stone-400 group-hover:text-[#81b64c] transition-colors"
              />
              <span className="truncate">Friends</span>
            </div>
            {onlineFriendsCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-[#81b64c]/20 px-2 py-0.5 text-xs font-bold text-[#81b64c]">
                <span className="size-1.5 rounded-full bg-[#81b64c] animate-pulse" />
                {onlineFriendsCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Bottom: Sound Toggle & User Profile Card */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        {/* Sound toggle button */}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-stone-400">Theme</span>
          <ThemeToggle />
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium text-stone-400 hover:bg-white/5 hover:text-stone-200 transition-colors"
          title={muted ? "Unmute game sounds" : "Mute game sounds"}
        >
          <span className="flex items-center gap-2">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>Sound Effects</span>
          </span>
          <span className="font-mono text-[11px] text-stone-400">{muted ? "OFF" : "ON"}</span>
        </button>

        {/* User Profile Capsule */}
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#302e2b] p-2.5 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt=""
                referrerPolicy="no-referrer"
                className="size-9 rounded-full ring-2 ring-white/10 shrink-0"
              />
            ) : (
              <span className="grid size-9 place-items-center rounded-full bg-[#383632] text-sm font-bold text-stone-200 shrink-0">
                {user.name[0]?.toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-stone-100">{user.name}</div>
              <div className="truncate text-[10px] text-stone-400">Online</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="rounded-lg p-2 text-stone-400 hover:bg-red-500/10 hover:text-red-400 transition-colors shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
