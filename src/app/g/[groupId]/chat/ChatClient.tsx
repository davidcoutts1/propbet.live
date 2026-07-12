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
  const listRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient()).current;

  // Scroll ONLY the message list — never the page (which would push the header
  // off the top of the screen).
  const scrollToBottom = useCallback((smooth = true) => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Realtime: messages (insert + delete) and reactions (insert + delete)
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
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const old = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== old.id));
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

  async function deleteMessage(id: string) {
    setPicker(null);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setReactions((prev) => prev.filter((r) => r.message_id !== id));
    await supabase.from("messages").delete().eq("id", id);
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

  const myEmojisFor = (messageId: string) =>
    new Set(
      reactions
        .filter((r) => r.message_id === messageId && r.user_id === userId)
        .map((r) => r.emoji)
    );

  return (
    <div className="-mt-5 -mb-28 flex h-[calc(100dvh-7.25rem-env(safe-area-inset-bottom))] flex-col lg:-mb-12 lg:h-[calc(100dvh-7rem)]">
      {/* Tap-anywhere backdrop to dismiss the reaction picker */}
      {picker && (
        <div className="fixed inset-0 z-10" onClick={() => setPicker(null)} />
      )}

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-0.5 py-4"
      >
        {messages.length === 0 && (
          <div className="card text-center text-sm text-muted">
            No messages yet. Say hello 👋
          </div>
        )}
        {messages.map((m) => {
          const mine = m.user_id === userId;
          const rs = reactionsFor(m.id);
          const myEmojis = myEmojisFor(m.id);
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
              {!mine && (
                <span className="mb-0.5 px-1 text-xs text-muted">{m.username}</span>
              )}
              <div className="relative max-w-[80%]">
                <button
                  onClick={() => setPicker(picker === m.id ? null : m.id)}
                  className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-[15px] ${
                    mine
                      ? "rounded-br-md bg-brand-gradient text-slate-950"
                      : "rounded-bl-md bg-surface2 text-slate-100"
                  }`}
                >
                  {m.content}
                </button>

                {picker === m.id && (
                  <div
                    className={`absolute z-20 mt-1 flex items-center gap-1 rounded-full border border-borderLight bg-elevated p-1 shadow-float ${
                      mine ? "right-0" : "left-0"
                    }`}
                  >
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => toggleReaction(m.id, e)}
                        className={`rounded-full px-1.5 py-0.5 text-lg transition ${
                          myEmojis.has(e)
                            ? "bg-primary/25 ring-1 ring-primary/50"
                            : "hover:bg-surface2"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                    {mine && (
                      <>
                        <span className="mx-0.5 h-5 w-px bg-borderLight" />
                        <button
                          onClick={() => deleteMessage(m.id)}
                          className="rounded-full px-2 py-0.5 text-base text-red-400 hover:bg-red-500/15"
                          aria-label="Delete message"
                          title="Delete message"
                        >
                          🗑
                        </button>
                      </>
                    )}
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
                          ? "border-primary/60 bg-primary/15"
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
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-border pt-3">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the group…"
          maxLength={2000}
        />
        <button className="btn-primary shrink-0" type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
