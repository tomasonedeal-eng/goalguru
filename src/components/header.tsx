"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/app-context";

const links = [
  { href: "/", label: "Pradžia" },
  { href: "/fixtures", label: "Rungtynės" },
  { href: "/leaderboard", label: "Reitingas" },
];

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useApp();

  const handleLogout = () => {
    void logout();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070d1a]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg font-bold text-slate-950">
            G
          </span>
          <div>
            <p className="text-sm font-bold tracking-wide text-white">GoalGuru</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
              WC 2026 · Tik taškai
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-xs text-slate-400">{user.displayName}</p>
                <p className="text-sm font-semibold text-amber-300">
                  {user.coinBalance} monetų · {user.totalPoints} tšk.
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
              >
                Atsijungti
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Prisijungti
            </Link>
          )}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-4 pb-3 sm:hidden">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                active ? "bg-white/10 text-white" : "text-slate-400"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
