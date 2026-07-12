import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatClient, { type ChatMessage, type ReactionRow } from "./ChatClient";

export default async function ChatPage({
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

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, user_id, content, created_at, profiles(username)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(100);

  const messages: ChatMessage[] =
    (msgs ?? []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      content: m.content,
      created_at: m.created_at,
      username: (m.profiles as unknown as { username: string })?.username ?? "player",
    })) ?? [];

  const { data: reacts } = await supabase
    .from("message_reactions")
    .select("id, message_id, user_id, emoji, messages!inner(group_id)")
    .eq("messages.group_id", groupId);

  const reactions: ReactionRow[] = (reacts ?? []).map((r) => ({
    id: r.id,
    message_id: r.message_id,
    user_id: r.user_id,
    emoji: r.emoji,
  }));

  // usernames for realtime-arriving messages
  const { data: membersRaw } = await supabase
    .from("group_members")
    .select("user_id, profiles(username)")
    .eq("group_id", groupId);

  const usernames: Record<string, string> = {};
  for (const m of membersRaw ?? []) {
    usernames[m.user_id] =
      (m.profiles as unknown as { username: string })?.username ?? "player";
  }

  return (
    <ChatClient
      groupId={groupId}
      userId={user.id}
      initialMessages={messages}
      initialReactions={reactions}
      usernames={usernames}
    />
  );
}
