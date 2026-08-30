"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types/database";

interface MessageThreadProps {
  conversationId: string;
  currentUserId: string;
  otherParticipant: { username: string; avatar_url: string | null };
  initialMessages: Message[];
}

export function MessageThread({
  conversationId,
  currentUserId,
  otherParticipant,
  initialMessages,
}: MessageThreadProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function markRead() {
    supabase
      .from("conversation_reads")
      .upsert(
        { conversation_id: conversationId, user_id: currentUserId, last_read_at: new Date().toISOString() },
        { onConflict: "conversation_id,user_id" }
      )
      .then(() => {});
  }

  useEffect(() => {
    markRead();

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.sender_id === currentUserId) return;
          setMessages((prev) => [...prev, newMessage]);
          markRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, content: trimmed })
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Failed to send message.");
      setSending(false);
      return;
    }

    setMessages((prev) => [...prev, data]);
    setContent("");
    setSending(false);
  }

  return (
    <div className="flex h-full flex-col">
      <Link
        href={`/profile/${otherParticipant.username}`}
        className="flex items-center gap-3 border-b border-border p-4 hover:bg-surface"
      >
        <Avatar src={otherParticipant.avatar_url} alt={otherParticipant.username} size={36} />
        <span className="font-medium text-text">@{otherParticipant.username}</span>
      </Link>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">Say hello — start the conversation.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((message) => {
              const isMine = message.sender_id === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    isMine
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-surface text-text"
                  }`}
                >
                  {message.content}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-4">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button type="submit" className="btn-primary" disabled={sending || !content.trim()}>
          <Send className="h-4 w-4" />
        </button>
      </form>
      {error && <p className="px-4 pb-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
