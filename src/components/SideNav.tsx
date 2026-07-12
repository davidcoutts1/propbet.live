"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { money } from "@/lib/odds";

const tabs = [
  { key: "bets", label: "Bets", icon: "🎯" },
  { key: "leaderboard", label: "Leaderboard", icon: "🏆" },
  { key: "chat", label: "Chat", icon: "💬" },
  { key: "mybets", label: "My Bets", icon: "🧾" },
];

export default function SideNav({
  groupId,
  groupName,
  balance,
}: {
  groupId: string;
  groupName: string;
  balance: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface/60 backdrop-blur lg:flex">
      <div className="flex items-center gap-2 px-5 py-5 font-display text-lg font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-slate-950">
          P
        </span>
        prop<span className="text-gradient -ml-1.5">bet</span>
      </div>

      <div className="mx-3 mb-4 rounded-2xl border border-border bg-surface2/70 p-4">
        <div className="truncate text-sm font-semibold">{groupName}</div>
        <div className="mt-1 text-xs uppercase tracking-wider text-faint">
          Balance
        </div>
        <div className="font-display text-2xl font-bold text-primary tabular">
          {money(balance)}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {tabs.map((t) => {
          const href = `/g/${groupId}/${t.key}`;
          const active = pathname === href;
          return (
            <Link
              key={t.key}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "border border-primary/30 bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface2 hover:text-slate-100"
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 text-[11px] text-faint">
        Simulated bets · no real money
      </div>
    </aside>
  );
}
