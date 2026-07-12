"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

export async function changeUsername(newUsername: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const name = newUsername.trim();
  if (name.length < 3) return { ok: false, error: "Username must be at least 3 characters." };
  if (/\s/.test(name)) return { ok: false, error: "Username can't contain spaces." };

  const { error } = await supabase
    .from("profiles")
    .update({ username: name })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "That username is taken." };
    return { ok: false, error: error.message };
  }
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
