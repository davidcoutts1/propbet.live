import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatAmerican, money } from "@/lib/odds";

type LegRow = {
  selection: "a" | "b";
  odds: number;
  result: "pending" | "won" | "lost" | "void";
  bets: {
    title: string;
    option_a_label: string;
    option_b_label: string;
  } | null;
};

type WagerRow = {
  id: string;
  stake: number;
  combined_odds: number;
  potential_payout: number;
  is_parlay: boolean;
  status: "open" | "won" | "lost" | "void";
  created_at: string;
  wager_legs: LegRow[];
};

const statusStyle: Record<string, string> = {
  open: "bg-accent/15 text-accent",
  won: "bg-primary/15 text-primary",
  lost: "bg-danger/15 text-danger",
  void: "bg-surface2 text-muted",
};

function WagerCard({ w }: { w: WagerRow }) {
  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {w.is_parlay ? `Parlay · ${w.wager_legs.length} legs` : "Straight bet"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
            statusStyle[w.status]
          }`}
        >
          {w.status}
        </span>
      </div>

      <div className="mb-3 space-y-1.5">
        {w.wager_legs.map((leg, i) => {
          const label =
            leg.selection === "a"
              ? leg.bets?.option_a_label
              : leg.bets?.option_b_label;
          const icon =
            leg.result === "won"
              ? "✅"
              : leg.result === "lost"
              ? "❌"
              : leg.result === "void"
              ? "➖"
              : "⏳";
          return (
            <div key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="text-muted">{leg.bets?.title}:</span> {label}
              </span>
              <span className="flex items-center gap-2 whitespace-nowrap text-xs">
                <span className="text-accent">{formatAmerican(Number(leg.odds))}</span>
                {icon}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
        <span className="text-muted">
          Stake <span className="text-slate-200">{money(Number(w.stake))}</span> ·
          Odds {formatAmerican(Number(w.combined_odds))}
        </span>
        <span className="text-muted">
          {w.status === "won" ? "Paid " : w.status === "open" ? "To pay " : "Payout "}
          <span
            className={`font-semibold ${
              w.status === "won" ? "text-primary" : "text-slate-200"
            }`}
          >
            {money(Number(w.potential_payout))}
          </span>
        </span>
      </div>
    </div>
  );
}

export default async function MyBetsPage({
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

  const { data } = await supabase
    .from("wagers")
    .select(
      "id, stake, combined_odds, potential_payout, is_parlay, status, created_at, wager_legs(selection, odds, result, bets(title, option_a_label, option_b_label))"
    )
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const wagers = (data as unknown as WagerRow[]) ?? [];
  const open = wagers.filter((w) => w.status === "open");
  const done = wagers.filter((w) => w.status !== "open");

  return (
    <div className="space-y-6">
      <section>
        <h1 className="mb-3 text-lg font-bold">Active bets</h1>
        {open.length === 0 ? (
          <div className="card text-center text-sm text-muted">
            No active bets. Head to the Bets tab to place one.
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((w) => (
              <WagerCard key={w.id} w={w} />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Bet history</h2>
          <div className="space-y-3">
            {done.map((w) => (
              <WagerCard key={w.id} w={w} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
