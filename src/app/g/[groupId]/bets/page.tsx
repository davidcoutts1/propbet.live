import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Bet, Group, GroupMember } from "@/lib/types";
import BetsBoard from "./BetsBoard";

export default async function BetsPage({
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

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single<Group>();

  const { data: member } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single<GroupMember>();

  const { data: bets } = await supabase
    .from("bets")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <BetsBoard
      groupId={groupId}
      balance={Number(member?.balance ?? 0)}
      familyFriendly={group?.family_friendly ?? true}
      initialBets={(bets as Bet[]) ?? []}
    />
  );
}
