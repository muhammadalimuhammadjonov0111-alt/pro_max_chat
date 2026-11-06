"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { generateBotReply, type ChatTurn } from "@/lib/bot";
import { AI_ASSISTANTS_ENABLED } from "@/lib/features";

/**
 * A user is considered online when their last heartbeat is younger than this.
 * The client pings every 30s, so 90s gives a little slack for slow networks.
 */
const PRESENCE_WINDOW_MS = 90_000;

const chatUserSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  isVerified: true,
  isPremium: true,
  isBot: true,
  lastSeenAt: true,
} as const;

type ChatUserRecord = {
  id: string;
  username: string | null;
  name: string;
  image: string | null;
  isVerified: boolean;
  isPremium: boolean;
  isBot: boolean;
  lastSeenAt: Date | null;
};

function withPresence<T extends ChatUserRecord>(user: T) {
  return {
    ...user,
    isOnline: user.isBot
      ? AI_ASSISTANTS_ENABLED
      : !!user.lastSeenAt &&
        Date.now() - user.lastSeenAt.getTime() < PRESENCE_WINDOW_MS,
  };
}

async function loadConversations(userId: string) {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          members: {
            include: {
              user: { select: chatUserSelect },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  return Promise.all(
    memberships.map(async (m) => {
      const last = m.conversation.messages[0] ?? null;
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: m.conversationId,
          senderId: { not: userId },
          createdAt: { gt: m.lastReadAt },
        },
      });
      return {
        id: m.conversationId,
        members: m.conversation.members.map((mm) => withPresence(mm.user)),
        lastMessage: last
          ? {
              id: last.id,
              text: last.text,
              mediaType: last.mediaType,
              createdAt: last.createdAt,
              senderId: last.senderId,
            }
          : null,
        updatedAt: m.conversation.updatedAt,
        lastReadAt: m.lastReadAt,
        unreadCount,
      };
    })
  );
}

export async function getConversations() {
  const user = await requireUser();
  return loadConversations(user.id);
}

async function loadMessages(conversationId: string, userId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });
  if (!member) return [];

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: chatUserSelect },
      reactions: { select: { emoji: true, userId: true } },
      replyTo: {
        select: {
          id: true,
          text: true,
          mediaType: true,
          senderId: true,
          sender: { select: { name: true, username: true } },
        },
      },
    },
  });
}

/**
 * Polling endpoint for the chat UI. Returning the conversation list and the
 * selected thread together keeps incoming messages, unread badges and online
 * presence in sync without a full page reload.
 */
export async function getChatSnapshot(conversationId?: string | null) {
  const user = await requireUser();

  // Every poll doubles as a presence heartbeat.
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });

  const [conversations, messages] = await Promise.all([
    loadConversations(user.id),
    conversationId
      ? loadMessages(conversationId, user.id)
      : Promise.resolve([]),
  ]);

  return { conversations, messages };
}

/** Keeps the current user marked as online while they browse the site. */
export async function heartbeat() {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });
  return { ok: true as const };
}

export async function getOrCreateConversation(otherUsername: string) {
  const user = await requireUser();
  const other = await prisma.user.findFirst({
    where: { username: otherUsername },
  });
  if (!other || other.id === user.id) return { ok: false as const };

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { members: { some: { userId: user.id } } },
        { members: { some: { userId: other.id } } },
      ],
    },
  });

  if (existing) return { ok: true as const, conversationId: existing.id };

  const created = await prisma.conversation.create({
    data: {
      members: {
        create: [{ userId: user.id }, { userId: other.id }],
      },
    },
  });

  return { ok: true as const, conversationId: created.id };
}

export async function getMessages(conversationId: string) {
  const user = await requireUser();
  return loadMessages(conversationId, user.id);
}

export async function sendMessage(
  conversationId: string,
  text: string,
  mediaUrl?: string,
  mediaType?: "image" | "video" | "gif" | "audio" | "sticker" | "file",
  replyToId?: string
) {
  const user = await requireUser();
  const t = await getT();
  const trimmed = text.trim();
  if (!trimmed && !mediaUrl) return { ok: false as const };

  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  });
  if (!member) return { ok: false as const };

  if (!AI_ASSISTANTS_ENABLED) {
    const botMember = await prisma.conversationMember.findFirst({
      where: { conversationId, user: { isBot: true } },
      select: { userId: true },
    });
    if (botMember) {
      return {
        ok: false as const,
        error: t("AI yordamchilar vaqtinchalik ishlamayapti"),
      };
    }
  }

  // Validate the quoted message actually belongs to this conversation.
  let validReplyToId: string | undefined;
  if (replyToId) {
    const quoted = await prisma.message.findUnique({
      where: { id: replyToId },
      select: { conversationId: true },
    });
    if (quoted?.conversationId === conversationId) {
      validReplyToId = replyToId;
    }
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: user.id,
      text: trimmed || null,
      replyToId: validReplyToId,
      ...(mediaUrl
        ? {
            imageUrl: mediaUrl,
            mediaType: mediaType ?? "image",
          }
        : {}),
    },
  });

  await Promise.all([
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    }),
  ]);

  const others = await prisma.conversationMember.findMany({
    where: { conversationId, userId: { not: user.id } },
    select: {
      userId: true,
      user: {
        select: {
          isBot: true,
          name: true,
          botPrompt: true,
          botCategory: true,
          botDescription: true,
        },
      },
    },
  });

  // Only real people get a "new message" notification.
  const humans = others.filter((o) => !o.user.isBot);
  if (humans.length) {
    await prisma.notification.createMany({
      data: humans.map((o) => ({
        receiverId: o.userId,
        actorId: user.id,
        type: "message",
      })),
    });
  }

  // AI bots reply instantly, in the same conversation thread.
  const botMembers = others.filter((o) => o.user.isBot);
  const botMessages: Awaited<ReturnType<typeof prisma.message.create>>[] = [];
  for (const botMember of botMembers) {
    const recent = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { text: true, senderId: true },
    });
    const history: ChatTurn[] = recent
      .reverse()
      .filter((h) => !!h.text)
      .map((h) => ({
        role: h.senderId === botMember.userId ? "assistant" : "user",
        content: h.text as string,
      }));

    const answer = await generateBotReply(botMember.user, history, t);
    const botMessage = await prisma.message.create({
      data: {
        conversationId,
        senderId: botMember.userId,
        text: answer,
      },
    });
    await prisma.botReply.create({
      data: {
        botId: botMember.userId,
        userId: user.id,
        question: trimmed || "(media)",
        answer,
      },
    });
    botMessages.push(botMessage);
  }

  if (botMembers.length) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  revalidatePath("/messages");
  return { ok: true as const, message, botMessages };
}

/** Edits the text of a message the viewer sent. */
export async function editMessage(messageId: string, text: string) {
  const user = await requireUser();
  const t = await getT();

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { senderId: true },
  });
  if (!message || message.senderId !== user.id) {
    return { ok: false as const, error: t("Xabarni tahrirlab bo'lmadi") };
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { text: text.trim() || null },
  });
  revalidatePath("/messages");
  return { ok: true as const };
}

/** Deletes a message the viewer sent. */
export async function deleteMessage(messageId: string) {
  const user = await requireUser();
  const t = await getT();

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { senderId: true },
  });
  if (!message || message.senderId !== user.id) {
    return { ok: false as const, error: t("Xabarni o'chirib bo'lmadi") };
  }

  await prisma.message.delete({ where: { id: messageId } });
  revalidatePath("/messages");
  return { ok: true as const };
}

/** Toggles an emoji reaction on a message (Instagram quick reactions). */
export async function toggleMessageReaction(messageId: string, emoji: string) {
  const user = await requireUser();
  const clean = (emoji ?? "").trim();
  if (!clean || clean.length > 16) return { ok: false as const };

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      conversation: { select: { members: { select: { userId: true } } } },
    },
  });
  if (!message) return { ok: false as const };
  const isMember = message.conversation.members.some((m) => m.userId === user.id);
  if (!isMember) return { ok: false as const };

  const existing = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: { messageId, userId: user.id, emoji: clean },
    },
  });
  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
    return { ok: true as const, added: false as const };
  }
  await prisma.messageReaction.create({
    data: { messageId, userId: user.id, emoji: clean },
  });
  return { ok: true as const, added: true as const };
}

export async function markConversationRead(conversationId: string) {
  const user = await requireUser();
  await prisma.conversationMember.updateMany({
    where: { conversationId, userId: user.id },
    data: { lastReadAt: new Date() },
  });
  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: user.id }, seen: false },
    data: { seen: true },
  });
  return { ok: true };
}

/**
 * Full-text style search across every conversation the viewer takes part in.
 * Used by the chat search bar to find messages and jump to them.
 */
export async function searchMessages(query: string) {
  const user = await requireUser();
  const q = query.trim();
  if (q.length < 2) return [];

  const messages = await prisma.message.findMany({
    where: {
      text: { contains: q },
      conversation: { members: { some: { userId: user.id } } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          isVerified: true,
          isPremium: true,
          isBot: true,
        },
      },
      conversation: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  image: true,
                  isVerified: true,
                  isPremium: true,
                  isBot: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return messages.map((m) => {
    const other =
      m.conversation.members.find((mm) => mm.user.id !== user.id)?.user ?? null;
    return {
      id: m.id,
      text: m.text ?? "",
      createdAt: m.createdAt,
      conversationId: m.conversationId,
      senderName: m.sender.username ?? m.sender.name,
      other,
    };
  });
}
