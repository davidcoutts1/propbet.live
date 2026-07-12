"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGroup, joinGroup } from "@/actions/groups";

type Mode = "choose" | "join" | "create";

export default function OnboardingClient({
  initialInvite,
}: {
  initialInvite: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialInvite ? "join" : "choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // join
  const [code, setCode] = useState(initialInvite);
  // create
  const [name, setName] = useState("");
  const [balance, setBalance] = useState(1000);
  const [family, setFamily] = useState(true);

  async function doJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await joinGroup(code);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    router.push(`/g/${res.groupId}/bets`);
    router.refresh();
  }

  async function doCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Group name is required.");
    if (balance < 0) return setError("Starting balance can't be negative.");
    setLoading(true);
    const res = await createGroup({
      name,
      startingBalance: balance,
      familyFriendly: family,
    });
    setLoading(false);
    if (!res.ok) return setError(res.error);
    router.push(`/g/${res.groupId}/bets`);
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      {error && (
        <div className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {mode === "choose" && (
        <div className="grid gap-3">
          <button className="btn-primary" onClick={() => setMode("join")}>
            Join a group
          </button>
          <button className="btn-ghost" onClick={() => setMode("create")}>
            Create a group
          </button>
        </div>
      )}

      {mode === "join" && (
        <form onSubmit={doJoin} className="space-y-3">
          <div>
            <label className="label">Invite code</label>
            <input
              className="input font-mono uppercase tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
            />
          </div>
          <button disabled={loading} className="btn-primary w-full">
            {loading ? "Joining…" : "Join group"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-muted hover:text-slate-200"
            onClick={() => setMode("choose")}
          >
            ← back
          </button>
        </form>
      )}

      {mode === "create" && (
        <form onSubmit={doCreate} className="space-y-3">
          <div>
            <label className="label">Group name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunday Degens"
            />
          </div>
          <div>
            <label className="label">Starting balance per member</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                $
              </span>
              <input
                type="number"
                min={0}
                step={100}
                className="input pl-7"
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value))}
              />
            </div>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-border bg-surface2 px-3.5 py-3 text-sm">
            <span>
              Family friendly
              <span className="block text-xs text-muted">
                Keeps things PG for the group.
              </span>
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={family}
              onChange={(e) => setFamily(e.target.checked)}
            />
          </label>
          <button disabled={loading} className="btn-primary w-full">
            {loading ? "Creating…" : "Create group"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-muted hover:text-slate-200"
            onClick={() => setMode("choose")}
          >
            ← back
          </button>
        </form>
      )}
    </div>
  );
}
