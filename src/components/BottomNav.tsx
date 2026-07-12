"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { key: "bets", label: "Bets", icon: "🎯" },
  { key: "leaderboard", label: "Ranks", icon: "🏆" },
  { key: "chat", label: "Chat", icon: "💬" },
  { key: "mybets", label: "My Bets", icon: "🧾" },
];

export default function BottomNav({ groupId }: { groupId: string }) {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {tabs.map((t) => {
          const href = `/g/${groupId}/${t.key}`;
          const active = pathname === href;
          return (
            <Link
              key={t.key}
              href={href}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs transition ${
                active ? "text-primary" : "text-muted hover:text-slate-200"
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
