"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { adjustAllBalances, settleBet, transferAdmin } from "@/actions/bets";
import { money } from "@/lib/odds";
import type { Bet } from "@/lib/types";

export default function AdminPanel({
  groupId,
  members,
  currentAdmin,
}: {
  groupId: string;
  members: { userId: string; username: string }[];
  currentAdmin: string;
}) {
  const router = useRouter();
  const [openBets, setOpenBets] = useState<Bet[]>([]);
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [newAdmin, setNewAdmin] = useState("");

  async function loadOpenBets() {
    const supabase = createClient();
    const { data } = await supabase
      .from("bets")
      .select("*")
      .eq("group_id", groupId)
      .eq("status", "open")
      .order("created_at", { ascending: false });
    setOpenBets((data as Bet[]) ?? []);
  }

  useEffect(() => {
    loadOpenBets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function grant() {
    setBusy("grant");
    setMsg(null);
    const res = await adjustAllBalances({ groupId, amount });
    setBusy(null);
    if (!res.ok) return setMsg(res.error);
    setMsg(`Granted ${money(amount)} to everyone.`);
    router.refresh();
  }

  async function settle(betId: string, outcome: "a" | "b" | "void") {
    setBusy(betId + outcome);
    setMsg(null);
    const res = await settleBet({ groupId, betId, outcome });
    setBusy(null);
    if (!res.ok) return setMsg(res.error);
    setOpenBets((b) => b.filter((x) => x.id !== betId));
    router.refresh();
  }

  async function handoff() {
    if (!newAdmin) return;
    if (
      !confirm(
        "Transfer admin to this member? You will lose admin privileges immediately."
      )
    )
      return;
    setBusy("handoff");
    setMsg(null);
    const res = await transferAdmin({ groupId, newAdminUserId: newAdmin });
    setBusy(null);
    if (!res.ok) return setMsg(res.error);
    router.refresh();
  }

  return (
    <section className="card mb-4 border-accent/40">
      <div className="label text-accent">Admin controls</div>

      {msg && (
        <div className="mb-3 rounded-lg bg-surface2 px-3 py-2 text-xs">{msg}</div>
      )}

      {/* Settle bets */}
      <div className="mb-4">
        <div className="mb-2 text-sm font-semibold">Complete bets</div>
        {openBets.length === 0 ? (
          <p className="text-xs text-muted">No open bets to settle.</p>
        ) : (
          <div className="space-y-2">
            {openBets.map((b) => (
              <div key={b.id} className="rounded-lg bg-surface2 p-3">
                <div className="mb-2 text-sm font-medium">{b.title}</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-primary !px-3 !py-1.5 text-xs"
                    disabled={busy === b.id + "a"}
                    onClick={() => settle(b.id, "a")}
                  >
                    {b.option_a_label} won
                  </button>
                  <button
                    className="btn-primary !px-3 !py-1.5 text-xs"
                    disabled={busy === b.id + "b"}
                    onClick={() => settle(b.id, "b")}
                  >
                    {b.option_b_label} won
                  </button>
                  <button
                    className="btn-ghost !px-3 !py-1.5 text-xs"
                    disabled={busy === b.id + "void"}
                    onClick={() => settle(b.id, "void")}
                  >
                    Void (refund)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant money */}
      <div className="mb-4">
        <div className="mb-2 text-sm font-semibold">Give everyone money</div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              $
            </span>
            <input
              type="number"
              step={100}
              className="input pl-7"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <button className="btn-primary" disabled={busy === "grant"} onClick={grant}>
            {busy === "grant" ? "…" : "Grant"}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Use a negative amount to take money back.
        </p>
      </div>

      {/* Transfer admin */}
      <div>
        <div className="mb-2 text-sm font-semibold">Transfer admin</div>
        <div className="flex gap-2">
          <select
            className="input flex-1"
            value={newAdmin}
            onChange={(e) => setNewAdmin(e.target.value)}
          >
            <option value="">Choose a member…</option>
            {members
              .filter((m) => m.userId !== currentAdmin)
              .map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.username}
                </option>
              ))}
          </select>
          <button
            className="btn-ghost"
            disabled={!newAdmin || busy === "handoff"}
            onClick={handoff}
          >
            Transfer
          </button>
        </div>
      </div>
    </section>
  );
}
