import { Bot, Home, Swords, Trophy, User } from "lucide-react";
import { Link } from "../lib/router";

interface Props {
  activePage: string;
  onOpenFriends: () => void;
  onlineFriendsCount: number;
}

export default function MobileTabBar({
  activePage,
}: Props) {
  const tabs = [
    { to: "/", key: "home", label: "Home", icon: Home },
    { to: "/play", key: "play", label: "Play", icon: Swords },
    { to: "/bots", key: "bots", label: "Bots", icon: Bot },
    { to: "/leaderboard", key: "leaderboard", label: "Ranks", icon: Trophy },
    { to: "/profile", key: "profile", label: "Profile", icon: User },
  ];

  return (
    <nav
      aria-label="Mobile navigation bar"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 liquid-glass border-t border-white/10 px-2 py-1 backdrop-blur-xl"
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
                  ? "text-[#81b64c] font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Icon size={19} className={isActive ? "text-[#81b64c]" : "text-stone-400"} />
              <span className="text-[10px] leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
