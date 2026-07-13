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
  const [line, setLine] = useState<string>("");
  const [labelA, setLabelA] = useState("Yes");
  const [labelB, setLabelB] = useState("No");
  const [oddsA, setOddsA] = useState<string>("-110");
  const [oddsB, setOddsB] = useState<string>("-110");
  const [closesAt, setClosesAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isOU = category === "over_under";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give the bet a title.");

    const oA = parseInt(oddsA, 10);
    const oB = parseInt(oddsB, 10);
    if (
      Number.isNaN(oA) ||
      Number.isNaN(oB) ||
      Math.abs(oA) < 100 ||
      Math.abs(oB) < 100
    )
      return setError(
        "Enter valid American odds — at least ±100 (e.g. +150 or -200)."
      );

    const lineNum = parseFloat(line);
    if (isOU && Number.isNaN(lineNum))
      return setError("Enter a line for the over/under.");

    const finalLabelA = isOU ? `Over ${lineNum}` : labelA.trim() || "Option A";
    const finalLabelB = isOU ? `Under ${lineNum}` : labelB.trim() || "Option B";

    setSaving(true);
    const res = await createBet({
      groupId,
      title,
      description,
      category,
      line: isOU ? lineNum : null,
      optionALabel: finalLabelA,
      optionAOdds: americanToDecimal(oA),
      optionBLabel: finalLabelB,
      optionBOdds: americanToDecimal(oB),
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
                inputMode="decimal"
                step="0.5"
                className="input"
                value={line}
                onChange={(e) => setLine(e.target.value)}
                placeholder="210.5"
              />
              <p className="mt-1 text-xs text-muted">
                Options become “Over {line || "…"}” and “Under {line || "…"}”.
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
                type="text"
                inputMode="numeric"
                className="input"
                value={oddsA}
                onChange={(e) => setOddsA(e.target.value.replace(/[^0-9-]/g, ""))}
                placeholder="-110"
              />
              <OddsHint value={oddsA} />
            </div>
            <div>
              <label className="label">
                {isOU ? "Under" : "B"} odds (American)
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="input"
                value={oddsB}
                onChange={(e) => setOddsB(e.target.value.replace(/[^0-9-]/g, ""))}
                placeholder="+150"
              />
              <OddsHint value={oddsB} />
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

// Live decimal-odds preview for an American-odds string. Shows a nudge until a
// valid value (magnitude ≥ 100) is entered.
function OddsHint({ value }: { value: string }) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || Math.abs(n) < 100)
    return <p className="mt-1 text-xs text-faint">e.g. -110 or +150</p>;
  const dec = americanToDecimal(n);
  return (
    <p className="mt-1 text-xs text-muted">
      = {formatAmerican(dec)} · {dec.toFixed(2)}x payout
    </p>
  );
}
