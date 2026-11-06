import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
} from "@/actions/message";
import { MessagesClient } from "@/components/messages/messages-client";
import { toPostUser } from "@/lib/types";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Xabarlar") };
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const user = await requireUser();
  const { u } = await searchParams;

  const me = toPostUser(user);

  let selectedId: string | null = null;
  if (u) {
    const res = await getOrCreateConversation(u);
    if (res.ok) selectedId = res.conversationId;
  }

  const conversations = await getConversations();
  const initialMessages = selectedId ? await getMessages(selectedId) : [];

  return (
    <div className="-mx-0 sm:-mx-4">
      <MessagesClient
        me={me}
        conversations={conversations}
        initialSelectedId={selectedId}
        initialMessages={initialMessages}
      />
    </div>
  );
}
