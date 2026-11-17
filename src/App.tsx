import { Cpu, History as HistoryIcon, LogOut, Swords } from "lucide-react";
import { AuthProvider, useAuth } from "./lib/auth";
import { Link, usePath } from "./lib/router";
import { configError } from "./lib/supabase";
import { Card } from "./components/ui";
import Online from "./pages/Online";
import Computer from "./pages/Computer";
import History from "./pages/History";

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>;
}

function Shell() {
  const { user, loading, signIn, signOut, authError } = useAuth();
  const path = usePath();

  if (configError) return <Center><Card><p className="text-danger">{configError}</p></Card></Center>;
  if (loading) return <Center><p>Loading…</p></Center>;
  if (!user) {
    return (
      <Center>
        <Card className="w-full max-w-sm text-center">
          <h1 className="mb-1 text-2xl font-semibold">Chess</h1>
          <p className="mb-5 text-sm text-ink-soft">Play online, play Stockfish, and replay your games.</p>
          <button className="btn btn-primary w-full" onClick={signIn}>Continue with Google</button>
          {authError && <p className="mt-3 text-sm text-danger" role="alert">{authError}</p>}
        </Card>
      </Center>
    );
  }

  const [page = "online", id] = path.split("/").filter(Boolean);
  const meta = user.user_metadata ?? {};
  const name: string = meta.full_name ?? meta.name ?? user.email ?? "Player";
  const avatar: string | undefined = meta.avatar_url ?? meta.picture;
  const nav = [
    { to: "/online", key: "online", label: "Play Online", icon: <Swords size={16} /> },
    { to: "/computer", key: "computer", label: "Play Computer", icon: <Cpu size={16} /> },
    { to: "/history", key: "history", label: "Game History", icon: <HistoryIcon size={16} /> },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <nav className="flex flex-wrap gap-1" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.key} to={n.to}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${page === n.key ? "bg-ink text-paper" : "hover:bg-line"}`}>
              {n.icon}{n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full" />
            : <span className="grid size-8 place-items-center rounded-full bg-line text-sm font-semibold">{name[0]?.toUpperCase()}</span>}
          <span className="hidden max-w-40 truncate text-sm sm:inline">{name}</span>
          <button className="btn !px-2" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
        </div>
      </header>

      <main className="flex-1">
        {page === "computer" ? <Computer userId={user.id} gameId={id} />
          : page === "history" ? <History userId={user.id} gameId={id} />
          : <Online userId={user.id} gameId={id} />}
      </main>

      <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-soft">
        Computer opponent: Stockfish (Stockfish.js WASM build by Nathan Rugg), licensed under{" "}
        <a className="underline" href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noreferrer">GPL-3.0</a>. Sources:{" "}
        <a className="underline" href="https://github.com/official-stockfish/Stockfish" target="_blank" rel="noreferrer">Stockfish</a>,{" "}
        <a className="underline" href="https://github.com/nmrugg/stockfish.js" target="_blank" rel="noreferrer">stockfish.js</a>,{" "}
        <a className="underline" href="https://github.com/ismailabs/chess-game" target="_blank" rel="noreferrer">this app</a>.
      </footer>
    </div>
  );
}

const Center = ({ children }: { children: React.ReactNode }) => (
  <div className="grid min-h-dvh place-items-center p-4">{children}</div>
);
