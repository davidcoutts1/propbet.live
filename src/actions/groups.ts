"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; groupId: string } | { ok: false; error: string };

export async function createGroup(formData: {
  name: string;
  startingBalance: number;
  familyFriendly: boolean;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase.rpc("create_group", {
    p_name: formData.name,
    p_starting_balance: formData.startingBalance,
    p_family_friendly: formData.familyFriendly,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app");
  return { ok: true, groupId: data.id };
}

export async function joinGroup(inviteCode: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase.rpc("join_group", {
    p_invite_code: inviteCode.trim().toUpperCase(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app");
  return { ok: true, groupId: data.id };
}
