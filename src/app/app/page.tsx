import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Entry point after auth. Routes to onboarding (with any invite prefill) or
// into the user's most-recent group.
export default async function AppEntry({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  // An invite link always drops you on onboarding with the code prefilled.
  if (invite) redirect(`/onboarding?invite=${encodeURIComponent(invite)}`);

  if (!memberships || memberships.length === 0) redirect("/onboarding");

  redirect(`/g/${memberships[0].group_id}/bets`);
}
