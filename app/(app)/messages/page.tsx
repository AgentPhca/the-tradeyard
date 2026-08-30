import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { MessageThread } from "@/components/messages/MessageThread";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/types/database";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { conversation: selectedId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-24 text-center">
        <Inbox className="h-8 w-8 text-muted" />
        <p className="mt-4 text-sm text-muted">Log in to view your messages.</p>
      </div>
    );
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .order("last_message_at", { ascending: false });

  const conversationList = conversations ?? [];
  const conversationIds = conversationList.map((c) => c.id);

  const otherIds = conversationList.map((c) =>
    c.participant_1 === user.id ? c.participant_2 : c.participant_1
  );
  const uniqueOtherIds = Array.from(new Set(otherIds));

  const profileById = new Map<string, { username: string; avatar_url: string | null }>();
  if (uniqueOtherIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", uniqueOtherIds);
    for (const profile of profiles ?? []) {
      profileById.set(profile.id, profile);
    }
  }

  const lastMessageByConversation = new Map<string, Message>();
  if (conversationIds.length > 0) {
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });
    for (const message of recentMessages ?? []) {
      if (!lastMessageByConversation.has(message.conversation_id)) {
        lastMessageByConversation.set(message.conversation_id, message);
      }
    }
  }

  let selectedMessages: Message[] = [];
  let selectedOtherParticipant: { username: string; avatar_url: string | null } | null = null;

  if (selectedId) {
    const selectedConversation = conversationList.find((c) => c.id === selectedId);
    if (!selectedConversation) {
      notFound();
    }

    const otherId =
      selectedConversation.participant_1 === user.id
        ? selectedConversation.participant_2
        : selectedConversation.participant_1;
    selectedOtherParticipant = profileById.get(otherId) ?? null;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", selectedId)
      .order("created_at", { ascending: true });
    selectedMessages = data ?? [];
  }

  return (
    <div className="flex h-[calc(100vh-10.5rem)] overflow-hidden rounded-lg border border-border bg-card sm:h-[calc(100vh-8rem)]">
      <div
        className={`${
          selectedId ? "hidden sm:block" : "block"
        } w-full overflow-y-auto sm:w-auto sm:max-w-xs sm:shrink-0 sm:border-r sm:border-border`}
      >
        {conversationList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <Inbox className="h-6 w-6 text-muted" />
            <p className="text-sm text-muted">
              No conversations yet. Tap Kontakt on a card to start one.
            </p>
          </div>
        ) : (
          conversationList.map((conversation) => {
            const otherId =
              conversation.participant_1 === user.id
                ? conversation.participant_2
                : conversation.participant_1;
            const other = profileById.get(otherId);
            const lastMessage = lastMessageByConversation.get(conversation.id);
            const isActive = conversation.id === selectedId;

            return (
              <Link
                key={conversation.id}
                href={`/messages?conversation=${conversation.id}`}
                className={`flex items-center gap-3 border-b border-border p-4 transition-colors ${
                  isActive ? "bg-surface" : "hover:bg-surface"
                }`}
              >
                <Avatar src={other?.avatar_url} alt={other?.username ?? ""} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    @{other?.username ?? "Unknown"}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {lastMessage ? lastMessage.content : "No messages yet"}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className={`${selectedId ? "block" : "hidden sm:block"} flex-1 overflow-hidden`}>
        {selectedId && selectedOtherParticipant ? (
          <MessageThread
            key={selectedId}
            conversationId={selectedId}
            currentUserId={user.id}
            otherParticipant={selectedOtherParticipant}
            initialMessages={selectedMessages}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Select a conversation to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}
