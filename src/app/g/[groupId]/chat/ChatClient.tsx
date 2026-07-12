"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type ChatMessage = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
};

export type ReactionRow = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

const EMOJIS = ["👍", "😂", "🔥", "😮", "😢", "💰"];

export default function ChatClient({
  groupId,
  userId,
  initialMessages,
  initialReactions,
  usernames,
}: {
  groupId: string;
  userId: string;
  initialMessages: ChatMessage[];
  initialReactions: ReactionRow[];
  usernames: Record<string, string>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [reactions, setReactions] = useState<ReactionRow[]>(initialReactions);
  const [text, setText] = useState("");
  const [picker, setPicker] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient()).current;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Realtime: new messages + reaction changes for this group
  useEffect(() => {
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const m = payload.new as Omit<ChatMessage, "username">;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, { ...m, username: usernames[m.user_id] ?? "player" }]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => {
          const r = payload.new as ReactionRow;
          setReactions((prev) =>
            prev.some((x) => x.id === r.id) ? prev : [...prev, r]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const old = payload.old as { id: string };
          setReactions((prev) => prev.filter((x) => x.id !== old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase, usernames]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const { data } = await supabase
      .from("messages")
      .insert({ group_id: groupId, user_id: userId, content: body })
      .select("id, user_id, content, created_at")
      .single();
    if (data) {
      setMessages((prev) =>
        prev.some((x) => x.id === data.id)
          ? prev
          : [...prev, { ...data, username: usernames[userId] ?? "you" }]
      );
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    setPicker(null);
    const mine = reactions.find(
      (r) => r.message_id === messageId && r.user_id === userId && r.emoji === emoji
    );
    if (mine) {
      setReactions((prev) => prev.filter((r) => r.id !== mine.id));
      await supabase.from("message_reactions").delete().eq("id", mine.id);
    } else {
      const { data } = await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: userId, emoji })
        .select("id, message_id, user_id, emoji")
        .single();
      if (data)
        setReactions((prev) =>
          prev.some((x) => x.id === data.id) ? prev : [...prev, data]
        );
    }
  }

  function reactionsFor(messageId: string) {
    const rows = reactions.filter((r) => r.message_id === messageId);
    const byEmoji = new Map<string, { count: number; mine: boolean }>();
    for (const r of rows) {
      const cur = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
      cur.count += 1;
      if (r.user_id === userId) cur.mine = true;
      byEmoji.set(r.emoji, cur);
    }
    return [...byEmoji.entries()];
  }

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 && (
          <div className="card text-center text-sm text-muted">
            No messages yet. Say hello 👋
          </div>
        )}
        {messages.map((m) => {
          const mine = m.user_id === userId;
          const rs = reactionsFor(m.id);
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
              {!mine && (
                <span className="mb-0.5 px-1 text-xs text-muted">{m.username}</span>
              )}
              <div className="group relative max-w-[80%]">
                <button
                  onClick={() => setPicker(picker === m.id ? null : m.id)}
                  className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm ${
                    mine
                      ? "rounded-br-md bg-primary text-slate-950"
                      : "rounded-bl-md bg-surface2 text-slate-100"
                  }`}
                >
                  {m.content}
                </button>

                {picker === m.id && (
                  <div
                    className={`absolute z-20 mt-1 flex gap-1 rounded-full border border-border bg-surface p-1 shadow-xl ${
                      mine ? "right-0" : "left-0"
                    }`}
                  >
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => toggleReaction(m.id, e)}
                        className="rounded-full px-1.5 py-0.5 text-lg hover:bg-surface2"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {rs.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {rs.map(([emoji, info]) => (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(m.id, emoji)}
                      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                        info.mine
                          ? "border-primary bg-primary/15"
                          : "border-border bg-surface2"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="text-muted">{info.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 pt-2">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the group…"
          maxLength={2000}
        />
        <button className="btn-primary" type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
