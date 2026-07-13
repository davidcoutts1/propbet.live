"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ActivityRow = {
  id: string;
  type: string;
  actor_id: string | null;
  message: string;
  created_at: string;
};

const ICONS: Record<string, string> = {
  bet_created: "🎯",
  bet_settled: "✅",
  wager_won: "🔥",
  member_joined: "👋",
  money_granted: "💵",
  admin_transferred: "👑",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ActivityClient({
  groupId,
  initial,
}: {
  groupId: string;
  initial: ActivityRow[];
}) {
  const [rows, setRows] = useState<ActivityRow[]>(initial);
  const supabase = useRef(createClient()).current;

  // Mark seen on mount so the unread badge clears next render.
  useEffect(() => {
    supabase.rpc("mark_activity_seen", { p_group_id: groupId });
  }, [supabase, groupId]);

  // Live updates
  useEffect(() => {
    const channel = supabase
      .channel(`activity-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const a = payload.new as ActivityRow;
          setRows((prev) =>
            prev.some((x) => x.id === a.id) ? prev : [a, ...prev]
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, groupId]);

  return (
    <div>
      <h1 className="mb-5 font-display text-2xl font-bold tracking-tight">
        Activity
      </h1>

      {rows.length === 0 ? (
        <div className="card text-center text-sm text-muted">
          Nothing yet. Post a bet or make a wager to kick things off.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-3 rounded-2xl border bg-surface px-4 py-3 ${
                a.type === "wager_won"
                  ? "border-primary/40 bg-primary/[0.06]"
                  : "border-border"
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface2 text-lg">
                {ICONS[a.type] ?? "•"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{a.message}</p>
                <p className="text-xs text-faint">{timeAgo(a.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
