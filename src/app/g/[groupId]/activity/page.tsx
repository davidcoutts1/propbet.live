import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ActivityClient, { type ActivityRow } from "./ActivityClient";

export default async function ActivityPage({
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

  const { data } = await supabase
    .from("activity")
    .select("id, type, actor_id, message, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <ActivityClient groupId={groupId} initial={(data as ActivityRow[]) ?? []} />
  );
}
