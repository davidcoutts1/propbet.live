import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/odds";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import ProfileMenu from "@/components/ProfileMenu";
import type { Group, GroupMember, Profile } from "@/lib/types";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  // Not a member (or group gone) -> bounce out
  if (!group || !member) redirect("/app");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Every group this user belongs to, for the switcher
  const { data: myGroupsRaw } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name)")
    .eq("user_id", user.id);

  const myGroups =
    (myGroupsRaw
      ?.map((r) => r.groups as unknown as { id: string; name: string })
      .filter(Boolean) as { id: string; name: string }[]) ?? [];

  // Members list for admin transfer
  const { data: membersRaw } = await supabase
    .from("group_members")
    .select("user_id, profiles(username)")
    .eq("group_id", groupId);

  const members =
    membersRaw?.map((m) => ({
      userId: m.user_id,
      username: (m.profiles as unknown as { username: string })?.username ?? "player",
    })) ?? [];

  const isAdmin = group.admin_id === user.id;

  // Unread activity = events since this member last opened the Activity tab,
  // excluding their own actions.
  const { count: unread } = await supabase
    .from("activity")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .gt("created_at", member.activity_seen_at)
    .neq("actor_id", user.id);

  return (
    <div className="min-h-dvh">
      <SideNav
        groupId={groupId}
        groupName={group.name}
        balance={Number(member.balance)}
        unread={unread ?? 0}
      />

      <div className="lg:pl-64">
        <header className="safe-top sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 lg:px-8">
            <div className="min-w-0 lg:hidden">
              <div className="truncate text-sm font-semibold">{group.name}</div>
              <div className="text-xs text-muted">
                Balance{" "}
                <span className="font-semibold text-primary tabular">
                  {money(Number(member.balance))}
                </span>
              </div>
            </div>
            <div className="hidden items-center gap-2 text-sm text-muted lg:flex">
              <span className="chip">
                Invite code{" "}
                <span className="ml-1 font-mono font-semibold tracking-widest text-slate-100">
                  {group.invite_code}
                </span>
              </span>
            </div>
            <ProfileMenu
              group={group}
              profile={profile!}
              isAdmin={isAdmin}
              myGroups={myGroups}
              members={members}
            />
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 pb-28 pt-5 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      <BottomNav groupId={groupId} unread={unread ?? 0} />
    </div>
  );
}
