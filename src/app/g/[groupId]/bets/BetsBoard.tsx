"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Bet, SlipLeg } from "@/lib/types";
import { formatAmerican, money, parlayOdds, round2 } from "@/lib/odds";
import { placeWager } from "@/actions/bets";
import CreateBetModal from "./CreateBetModal";

export default function BetsBoard({
  groupId,
  balance,
  familyFriendly,
  initialBets,
  settledBets,
}: {
  groupId: string;
  balance: number;
  familyFriendly: boolean;
  initialBets: Bet[];
  settledBets: Bet[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"open" | "results">("open");
  const [slip, setSlip] = useState<SlipLeg[]>([]);
  const [stake, setStake] = useState<number>(0);
  const [showCreate, setShowCreate] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelected = (betId: string, side: "a" | "b") =>
    slip.some((l) => l.bet.id === betId && l.selection === side);

  function toggle(bet: Bet, side: "a" | "b") {
    setError(null);
    setSlip((prev) => {
      const existing = prev.find((l) => l.bet.id === bet.id);
      if (existing) {
        if (existing.selection === side)
          return prev.filter((l) => l.bet.id !== bet.id); // unselect
        return prev.map((l) =>
          l.bet.id === bet.id ? { bet, selection: side } : l
        ); // swap side
      }
      return [...prev, { bet, selection: side }];
    });
  }

  const combinedOdds = useMemo(
    () =>
      parlayOdds(
        slip.map((l) =>
          l.selection === "a" ? Number(l.bet.option_a_odds) : Number(l.bet.option_b_odds)
        )
      ),
    [slip]
  );

  const potential = round2(stake * combinedOdds);
  const isParlay = slip.length > 1;

  async function place() {
    setError(null);
    if (slip.length === 0) return;
    if (stake <= 0) return setError("Enter a stake.");
    if (stake > balance) return setError("Stake exceeds your balance.");
    setPosting(true);
    const res = await placeWager({
      groupId,
      stake,
      legs: slip.map((l) => ({ betId: l.bet.id, selection: l.selection })),
    });
    setPosting(false);
    if (!res.ok) return setError(res.error);
    setSlip([]);
    setStake(0);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Bets</h1>
          <p className="mt-0.5 text-sm text-muted lg:hidden">
            Balance{" "}
            <span className="font-semibold text-primary tabular">
              {money(balance)}
            </span>
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + Create bet
        </button>
      </div>

      {/* Open / Results toggle */}
      <div className="mb-5 inline-flex rounded-xl border border-border bg-surface2/60 p-1">
        {(["open", "results"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
              view === v ? "bg-elevated text-slate-100" : "text-muted"
            }`}
          >
            {v === "open" ? "Open" : "Results"}
            {v === "results" && settledBets.length > 0 && (
              <span className="ml-1.5 text-xs text-faint">
                {settledBets.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {view === "results" && (
        <div className="space-y-3">
          {settledBets.length === 0 ? (
            <div className="card text-center text-sm text-muted">
              No settled bets yet. Results show up here once the admin grades a
              bet.
            </div>
          ) : (
            settledBets.map((bet) => <ResultCard key={bet.id} bet={bet} />)
          )}
        </div>
      )}

      {view === "open" &&
        (initialBets.length === 0 ? (
        <div className="card text-center text-sm text-muted">
          No open bets yet. Tap <span className="text-primary">Create bet</span>{" "}
          to start the action.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {initialBets.map((bet) => (
            <div key={bet.id} className="card transition hover:border-borderLight">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="font-semibold">{bet.title}</div>
                <span className="chip capitalize text-muted">
                  {bet.category.replace("_", "/")}
                </span>
              </div>
              {bet.description && (
                <p className="mb-3 text-sm text-muted">{bet.description}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(["a", "b"] as const).map((side) => {
                  const label =
                    side === "a" ? bet.option_a_label : bet.option_b_label;
                  const odds = Number(
                    side === "a" ? bet.option_a_odds : bet.option_b_odds
                  );
                  const sel = isSelected(bet.id, side);
                  return (
                    <button
                      key={side}
                      onClick={() => toggle(bet, side)}
                      className={`flex flex-col items-center rounded-xl border px-3 py-3 text-sm transition ${
                        sel
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-surface2 hover:border-accent"
                      }`}
                    >
                      <span className="font-medium">{label}</span>
                      <span className="text-xs opacity-80">
                        {formatAmerican(odds)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        ))}

      {/* Bet slip */}
      {slip.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 px-4 lg:bottom-6 lg:pl-64">
          <div className="mx-auto max-w-2xl rounded-2xl border border-borderLight bg-elevated/95 p-4 shadow-float backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">
                {isParlay ? `Parlay · ${slip.length} legs` : "Bet slip"}
              </span>
              <button
                className="text-xs text-muted hover:text-slate-200"
                onClick={() => setSlip([])}
              >
                Clear
              </button>
            </div>

            <div className="mb-3 max-h-32 space-y-1 overflow-y-auto">
              {slip.map((l) => {
                const label =
                  l.selection === "a" ? l.bet.option_a_label : l.bet.option_b_label;
                const odds = Number(
                  l.selection === "a" ? l.bet.option_a_odds : l.bet.option_b_odds
                );
                return (
                  <div
                    key={l.bet.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-muted">{l.bet.title}:</span> {label}{" "}
                      <span className="text-xs text-accent">
                        {formatAmerican(odds)}
                      </span>
                    </span>
                    <button
                      className="text-muted hover:text-danger"
                      onClick={() => toggle(l.bet, l.selection)}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mb-2 rounded-lg bg-danger/15 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  className="input pl-7"
                  placeholder="Stake"
                  value={stake || ""}
                  onChange={(e) => setStake(Number(e.target.value))}
                />
              </div>
              <button
                className="btn-primary whitespace-nowrap"
                disabled={posting}
                onClick={place}
              >
                {posting ? "Placing…" : "Place bet"}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              <span>
                Odds{" "}
                <span className="text-accent">{formatAmerican(combinedOdds)}</span>
              </span>
              <span>
                To win{" "}
                <span className="font-semibold text-primary">
                  {money(Math.max(0, potential - stake))}
                </span>{" "}
                · Payout {money(potential)}
              </span>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateBetModal
          groupId={groupId}
          familyFriendly={familyFriendly}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// Read-only card for a settled/void bet in the Results view.
function ResultCard({ bet }: { bet: Bet }) {
  const voided = bet.status === "void";
  return (
    <div className="card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="font-semibold">{bet.title}</div>
        {voided ? (
          <span className="chip text-muted">Voided</span>
        ) : (
          <span className="chip border-primary/40 bg-primary/10 text-primary">
            Settled
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["a", "b"] as const).map((side) => {
          const label = side === "a" ? bet.option_a_label : bet.option_b_label;
          const odds = Number(
            side === "a" ? bet.option_a_odds : bet.option_b_odds
          );
          const won = !voided && bet.winning_option === side;
          return (
            <div
              key={side}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
                won
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-surface2/50 text-muted"
              }`}
            >
              <span className="font-medium">
                {won && "✓ "}
                {label}
              </span>
              <span className="text-xs opacity-80">{formatAmerican(odds)}</span>
            </div>
          );
        })}
      </div>
      {bet.settled_at && (
        <p className="mt-2 text-xs text-faint">
          {voided ? "Voided" : "Graded"}{" "}
          {new Date(bet.settled_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
