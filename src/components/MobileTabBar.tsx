import { Bot, Home, Settings as SettingsIcon, Swords, Trophy, User } from "lucide-react";
import { Link } from "../lib/router";

interface Props {
  activePage: string;
  onOpenFriends?: () => void;
  onlineFriendsCount?: number;
  isSignedIn?: boolean;
}

export default function MobileTabBar({
  activePage,
  isSignedIn = false,
}: Props) {
  const tabs = [
    { to: "/", key: "home", label: "Home", icon: Home },
    { to: "/play", key: "play", label: "Play", icon: Swords },
    { to: "/bots", key: "bots", label: "Bots", icon: Bot },
    { to: "/leaderboard", key: "leaderboard", label: "Ranks", icon: Trophy },
    isSignedIn
      ? { to: "/profile", key: "profile", label: "Profile", icon: User }
      : { to: "/settings", key: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <nav
      aria-label="Mobile navigation bar"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-[var(--outline)] px-2 py-1 backdrop-blur-xl"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activePage === tab.key ||
            (tab.key === "play" && activePage === "online") ||
            (tab.key === "bots" && activePage === "computer");
          return (
            <Link
              key={tab.key}
              to={tab.to}
              className={`flex flex-col items-center gap-1 rounded-xl py-1 px-2.5 transition-colors ${
                isActive
                  ? "text-[var(--primary)] font-bold"
                  : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
              }`}
            >
              <Icon size={19} className={isActive ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)]"} />
              <span className="text-[10px] leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
