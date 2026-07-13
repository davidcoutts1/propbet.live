"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { key: "bets", label: "Bets", icon: "🎯" },
  { key: "activity", label: "Activity", icon: "🔔" },
  { key: "leaderboard", label: "Ranks", icon: "🏆" },
  { key: "chat", label: "Chat", icon: "💬" },
  { key: "mybets", label: "My Bets", icon: "🧾" },
];

export default function BottomNav({
  groupId,
  unread = 0,
}: {
  groupId: string;
  unread?: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      data-bottom-nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5">
        {tabs.map((t) => {
          const href = `/g/${groupId}/${t.key}`;
          const active = pathname === href;
          return (
            <Link
              key={t.key}
              href={href}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] transition ${
                active ? "text-primary" : "text-muted hover:text-slate-200"
              }`}
            >
              <span className="relative text-lg leading-none">
                {t.icon}
                {t.key === "activity" && unread > 0 && (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-slate-950">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
