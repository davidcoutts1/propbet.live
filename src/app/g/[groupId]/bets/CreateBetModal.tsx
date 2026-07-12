"use client";

import { useState } from "react";
import type { BetCategory } from "@/lib/types";
import { americanToDecimal, formatAmerican } from "@/lib/odds";
import { createBet } from "@/actions/bets";

export default function CreateBetModal({
  groupId,
  familyFriendly,
  onClose,
  onCreated,
}: {
  groupId: string;
  familyFriendly: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [category, setCategory] = useState<BetCategory>("straight");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [line, setLine] = useState<number>(0);
  const [labelA, setLabelA] = useState("Yes");
  const [labelB, setLabelB] = useState("No");
  const [oddsA, setOddsA] = useState<number>(-110);
  const [oddsB, setOddsB] = useState<number>(-110);
  const [closesAt, setClosesAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isOU = category === "over_under";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give the bet a title.");
    if (oddsA === 0 || oddsB === 0)
      return setError("American odds can't be 0. Use e.g. +100 for even.");

    const finalLabelA = isOU ? `Over ${line}` : labelA.trim() || "Option A";
    const finalLabelB = isOU ? `Under ${line}` : labelB.trim() || "Option B";

    setSaving(true);
    const res = await createBet({
      groupId,
      title,
      description,
      category,
      line: isOU ? line : null,
      optionALabel: finalLabelA,
      optionAOdds: americanToDecimal(oddsA),
      optionBLabel: finalLabelB,
      optionBOdds: americanToDecimal(oddsB),
      closesAt: closesAt ? new Date(closesAt).toISOString() : null,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    onCreated();
  }

  const cats: { key: BetCategory; label: string }[] = [
    { key: "straight", label: "Straight" },
    { key: "over_under", label: "Over/Under" },
    { key: "prop", label: "Prop" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative m-0 max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-5 shadow-float lg:m-4 lg:max-w-lg lg:rounded-3xl lg:border">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Create a bet</h2>
          <button onClick={onClose} className="text-muted hover:text-slate-200">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Category */}
          <div className="grid grid-cols-3 gap-2">
            {cats.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  category === c.key
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-surface2 text-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isOU ? "Total points in tonight's game" : "Will the Chiefs win?"
              }
            />
          </div>

          <div>
            <label className="label">Details (optional)</label>
            <textarea
              className="input min-h-[64px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                familyFriendly ? "Keep it friendly!" : "Add any context…"
              }
            />
          </div>

          {isOU ? (
            <div>
              <label className="label">Line</label>
              <input
                type="number"
                step="0.5"
                className="input"
                value={line}
                onChange={(e) => setLine(Number(e.target.value))}
                placeholder="210.5"
              />
              <p className="mt-1 text-xs text-muted">
                Options become “Over {line}” and “Under {line}”.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Option A</label>
                <input
                  className="input"
                  value={labelA}
                  onChange={(e) => setLabelA(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Option B</label>
                <input
                  className="input"
                  value={labelB}
                  onChange={(e) => setLabelB(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Odds */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                {isOU ? "Over" : "A"} odds (American)
              </label>
              <input
                type="number"
                className="input"
                value={oddsA}
                onChange={(e) => setOddsA(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-muted">
                = {formatAmerican(americanToDecimal(oddsA || 100))} ·{" "}
                {americanToDecimal(oddsA || 100).toFixed(2)}x
              </p>
            </div>
            <div>
              <label className="label">
                {isOU ? "Under" : "B"} odds (American)
              </label>
              <input
                type="number"
                className="input"
                value={oddsB}
                onChange={(e) => setOddsB(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-muted">
                = {formatAmerican(americanToDecimal(oddsB || 100))} ·{" "}
                {americanToDecimal(oddsB || 100).toFixed(2)}x
              </p>
            </div>
          </div>

          <div>
            <label className="label">Closes at (optional)</label>
            <input
              type="datetime-local"
              className="input"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>

          <button disabled={saving} className="btn-primary w-full">
            {saving ? "Creating…" : "Create bet"}
          </button>
        </form>
      </div>
    </div>
  );
}
