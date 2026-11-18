import { Cpu, History, Swords, Users } from "lucide-react";
import { Link } from "../lib/router";

interface Props {
  activePage: string;
  onOpenFriends: () => void;
  onlineFriendsCount: number;
}

export default function MobileTabBar({
  activePage,
  onOpenFriends,
  onlineFriendsCount,
}: Props) {
  const tabs = [
    { to: "/online", key: "online", label: "Online", icon: Swords },
    { to: "/computer", key: "computer", label: "Bots", icon: Cpu },
    { to: "/history", key: "history", label: "History", icon: History },
  ];

  return (
    <nav
      aria-label="Mobile navigation bar"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 liquid-glass border-t border-white/10 px-3 py-1.5 backdrop-blur-xl"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePage === tab.key;
          return (
            <Link
              key={tab.key}
              to={tab.to}
              className={`flex flex-col items-center gap-1 rounded-xl py-1.5 px-3 transition-colors ${
                isActive
                  ? "text-[#81b64c] font-bold"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Icon size={20} className={isActive ? "text-[#81b64c]" : "text-stone-400"} />
              <span className="text-[11px] leading-none">{tab.label}</span>
            </Link>
          );
        })}

        {/* Friends Tab */}
        <button
          type="button"
          onClick={onOpenFriends}
          className="relative flex flex-col items-center gap-1 rounded-xl py-1.5 px-3 text-stone-400 hover:text-stone-200 transition-colors"
        >
          <div className="relative">
            <Users size={20} />
            {onlineFriendsCount > 0 && (
              <span className="absolute -top-1 -right-2 size-2 rounded-full bg-[#81b64c] ring-2 ring-[#262522]" />
            )}
          </div>
          <span className="text-[11px] leading-none">Friends</span>
        </button>
      </div>
    </nav>
  );
}
