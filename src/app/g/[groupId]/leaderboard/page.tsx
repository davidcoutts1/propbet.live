import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/odds";
import type { LeaderboardRow } from "@/lib/types";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("group_id", groupId)
    .order("total_worth", { ascending: false });

  const board = (rows as LeaderboardRow[]) ?? [];
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <h1 className="mb-5 font-display text-2xl font-bold tracking-tight">
        Leaderboard
      </h1>
      <div className="space-y-2">
        {board.map((r, i) => {
          const games = r.wins + r.losses;
          const winPct = games ? Math.round((r.wins / games) * 100) : 0;
          const isMe = r.user_id === user?.id;
          return (
            <div
              key={r.user_id}
              className={`card flex items-center gap-3 ${
                isMe ? "border-primary/50" : ""
              }`}
            >
              <div className="w-8 text-center text-lg font-bold">
                {medals[i] ?? <span className="text-muted">{i + 1}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{r.username}</span>
                  {isMe && (
                    <span className="chip !py-0.5 text-[10px] text-primary">
                      you
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  {r.wins}W · {r.losses}L{games ? ` · ${winPct}%` : ""}
                  {Number(r.at_stake) > 0 && (
                    <> · {money(Number(r.at_stake))} in play</>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">
                  {money(Number(r.total_worth))}
                </div>
                <div className="text-[11px] text-muted">
                  {money(Number(r.balance))} free
                </div>
              </div>
            </div>
          );
        })}
        {board.length === 0 && (
          <div className="card text-center text-sm text-muted">
            No members yet.
          </div>
        )}
      </div>
    </div>
  );
}
