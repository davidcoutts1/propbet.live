"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BetCategory } from "@/lib/types";

type Ok = { ok: true };
type Err = { ok: false; error: string };
type Result = Ok | Err;

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createBet(input: {
  groupId: string;
  title: string;
  description?: string;
  category: BetCategory;
  line?: number | null;
  optionALabel: string;
  optionAOdds: number;
  optionBLabel: string;
  optionBOdds: number;
  closesAt?: string | null;
}): Promise<Result> {
  const { supabase, user } = await client();
  if (!user) return { ok: false, error: "Not signed in." };

  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  if (input.optionAOdds <= 1 || input.optionBOdds <= 1)
    return { ok: false, error: "Decimal odds must be greater than 1." };

  const { error } = await supabase.from("bets").insert({
    group_id: input.groupId,
    created_by: user.id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    category: input.category,
    line: input.category === "over_under" ? input.line ?? null : null,
    option_a_label: input.optionALabel.trim(),
    option_a_odds: input.optionAOdds,
    option_b_label: input.optionBLabel.trim(),
    option_b_odds: input.optionBOdds,
    closes_at: input.closesAt || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/g/${input.groupId}/bets`);
  return { ok: true };
}

export async function placeWager(input: {
  groupId: string;
  stake: number;
  legs: { betId: string; selection: "a" | "b" }[];
}): Promise<Result> {
  const { supabase, user } = await client();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.rpc("place_wager", {
    p_group_id: input.groupId,
    p_stake: input.stake,
    p_legs: input.legs.map((l) => ({ bet_id: l.betId, selection: l.selection })),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/g/${input.groupId}/bets`);
  revalidatePath(`/g/${input.groupId}/mybets`);
  revalidatePath(`/g/${input.groupId}/leaderboard`);
  return { ok: true };
}

export async function settleBet(input: {
  groupId: string;
  betId: string;
  outcome: "a" | "b" | "void";
}): Promise<Result> {
  const { supabase, user } = await client();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.rpc("settle_bet", {
    p_bet_id: input.betId,
    p_winning_option: input.outcome,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/g/${input.groupId}/bets`);
  revalidatePath(`/g/${input.groupId}/mybets`);
  revalidatePath(`/g/${input.groupId}/leaderboard`);
  return { ok: true };
}

export async function adjustAllBalances(input: {
  groupId: string;
  amount: number;
}): Promise<Result> {
  const { supabase, user } = await client();
  if (!user) return { ok: false, error: "Not signed in." };
  const { error } = await supabase.rpc("adjust_all_balances", {
    p_group_id: input.groupId,
    p_amount: input.amount,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/g/${input.groupId}/leaderboard`);
  revalidatePath(`/g/${input.groupId}/bets`);
  return { ok: true };
}

export async function transferAdmin(input: {
  groupId: string;
  newAdminUserId: string;
}): Promise<Result> {
  const { supabase, user } = await client();
  if (!user) return { ok: false, error: "Not signed in." };
  const { error } = await supabase.rpc("transfer_admin", {
    p_group_id: input.groupId,
    p_new_admin: input.newAdminUserId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/g/${input.groupId}`);
  return { ok: true };
}
