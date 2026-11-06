"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isReservedUsername } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { AI_ASSISTANTS_ENABLED } from "@/lib/features";
import { BOT_BASE_TOTAL, BOT_SUBSCRIBER_BASE } from "@/lib/bot-categories";

export type BotListItem = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  bio: string | null;
  botDescription: string | null;
  botCategory: string | null;
  botPublic: boolean;
  isVerified: boolean;
  isPremium: boolean;
  followerCount: number;
  replyCount: number;
  isFollowing: boolean;
  isOwner: boolean;
};

const BOT_FIELDS = {
  id: true,
  name: true,
  username: true,
  image: true,
  bio: true,
  botDescription: true,
  botCategory: true,
  botPublic: true,
  isVerified: true,
  isPremium: true,
  botOwnerId: true,
  _count: { select: { followers: true } },
} as const;

type RawBot = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  bio: string | null;
  botDescription: string | null;
  botCategory: string | null;
  botPublic: boolean;
  isVerified: boolean;
  isPremium: boolean;
  botOwnerId: string | null;
  _count: { followers: number };
};

async function replyCountMap(botIds: string[]) {
  if (!botIds.length) return new Map<string, number>();
  const rows = await prisma.botReply.groupBy({
    by: ["botId"],
    _count: { _all: true },
    where: { botId: { in: botIds } },
  });
  return new Map(rows.map((r) => [r.botId, r._count._all]));
}

function shape(
  bots: RawBot[],
  viewerId: string,
  following: Set<string>,
  replies: Map<string, number>
): BotListItem[] {
  return bots.map((b) => ({
    id: b.id,
    name: b.name,
    username: b.username,
    image: b.image,
    bio: b.bio,
    botDescription: b.botDescription,
    botCategory: b.botCategory,
    botPublic: b.botPublic,
    isVerified: b.isVerified,
    isPremium: b.isPremium,
    followerCount: b._count.followers,
    replyCount: replies.get(b.id) ?? 0,
    isFollowing: following.has(b.id),
    isOwner: b.botOwnerId === viewerId,
  }));
}

/** Public bots, optionally filtered by text and/or category. */
export async function listBots(opts?: {
  query?: string;
  category?: string;
}): Promise<BotListItem[]> {
  const me = await requireUser();
  const q = opts?.query?.trim();
  const category = opts?.category?.trim();

  const bots = await prisma.user.findMany({
    where: {
      isBot: true,
      botPublic: true,
      ...(category && category !== "all" ? { botCategory: category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { username: { contains: q } },
              { botDescription: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ isVerified: "desc" }, { name: "asc" }],
    take: 60,
    select: BOT_FIELDS,
  });

  const [myFollows, replies] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: me.id, followingId: { in: bots.map((b) => b.id) } },
      select: { followingId: true },
    }),
    replyCountMap(bots.map((b) => b.id)),
  ]);

  return shape(
    bots,
    me.id,
    new Set(myFollows.map((f) => f.followingId)),
    replies
  );
}

/** Bots created by the signed-in user (public or private). */
export async function getMyBots(): Promise<BotListItem[]> {
  const me = await requireUser();
  const bots = await prisma.user.findMany({
    where: { isBot: true, botOwnerId: me.id },
    orderBy: { createdAt: "desc" },
    select: BOT_FIELDS,
  });
  const replies = await replyCountMap(bots.map((b) => b.id));
  return shape(bots, me.id, new Set(), replies);
}

/** Big public counters shown in the directory header. */
export async function getBotDirectoryStats() {
  await requireUser();
  const [realBots, realSubs] = await Promise.all([
    prisma.user.count({ where: { isBot: true, botPublic: true } }),
    prisma.follow.count(),
  ]);
  return {
    bots: BOT_BASE_TOTAL + realBots,
    subscribers: BOT_SUBSCRIBER_BASE + realSubs,
  };
}

/** Admin: every bot including private ones. */
export async function adminListBots(): Promise<BotListItem[]> {
  const me = await requireUser();
  if (me.role !== "ADMIN") return [];
  const bots = await prisma.user.findMany({
    where: { isBot: true },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: BOT_FIELDS,
  });
  const replies = await replyCountMap(bots.map((b) => b.id));
  return shape(bots, me.id, new Set(), replies);
}

/* ------------------------------------------------------------------ */
/* Create / update / delete                                            */
/* ------------------------------------------------------------------ */

export async function createBot(input: {
  name: string;
  username: string;
  botDescription?: string;
  botPrompt?: string;
  botCategory?: string;
  botPublic?: boolean;
  image?: string | null;
}) {
  const me = await requireUser();
  const t = await getT();

  if (!AI_ASSISTANTS_ENABLED) {
    return {
      ok: false as const,
      error: t("AI yordamchilar vaqtinchalik ishlamayapti"),
    };
  }

  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();
  const description = input.botDescription?.trim() || null;

  if (!name || name.length > 50) {
    return { ok: false as const, error: t("Bot nomini kiriting (1-50 belgi)") };
  }
  if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
    return {
      ok: false as const,
      error: t("Username 3-30 belgi, faqat harf/raqam/._"),
    };
  }
  if (isReservedUsername(username)) {
    return { ok: false as const, error: t("Bu username band") };
  }

  const taken = await prisma.user.findUnique({ where: { username } });
  if (taken) {
    return { ok: false as const, error: t("Bu username allaqachon band") };
  }

  const id = randomUUID();
  const email = `${username}.${Date.now()}@bots.gidgogram.uz`;

  await prisma.user.create({
    data: {
      id,
      name,
      email,
      emailVerified: true,
      username,
      displayUsername: username,
      image: input.image || null,
      bio: description,
      isBot: true,
      botPrompt: input.botPrompt?.trim() || null,
      botDescription: description,
      botCategory: input.botCategory || "assistant",
      botPublic: input.botPublic ?? true,
      botOwnerId: me.id,
      isVerified: true,
    },
  });

  revalidatePath("/bots");
  revalidatePath("/create-bot");
  return { ok: true as const, id, username };
}

export async function updateBot(
  botId: string,
  input: {
    name?: string;
    botDescription?: string;
    botPrompt?: string;
    botCategory?: string;
    botPublic?: boolean;
    image?: string | null;
  }
) {
  const me = await requireUser();
  const t = await getT();
  const bot = await prisma.user.findUnique({ where: { id: botId } });
  if (!bot || !bot.isBot) return { ok: false as const, error: t("Bot topilmadi") };
  if (bot.botOwnerId !== me.id && me.role !== "ADMIN") {
    return { ok: false as const, error: t("Ruxsat yo'q") };
  }

  const description =
    input.botDescription !== undefined
      ? input.botDescription.trim() || null
      : undefined;

  await prisma.user.update({
    where: { id: botId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(description !== undefined
        ? { botDescription: description, bio: description }
        : {}),
      ...(input.botPrompt !== undefined
        ? { botPrompt: input.botPrompt.trim() || null }
        : {}),
      ...(input.botCategory !== undefined
        ? { botCategory: input.botCategory }
        : {}),
      ...(input.botPublic !== undefined ? { botPublic: input.botPublic } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
    },
  });

  revalidatePath("/bots");
  revalidatePath("/create-bot");
  if (bot.username) revalidatePath(`/${bot.username}`);
  return { ok: true as const };
}

export async function toggleBotPublic(botId: string, value: boolean) {
  const me = await requireUser();
  const t = await getT();
  const bot = await prisma.user.findUnique({ where: { id: botId } });
  if (!bot || !bot.isBot) return { ok: false, error: t("Bot topilmadi") };
  if (bot.botOwnerId !== me.id && me.role !== "ADMIN") {
    return { ok: false, error: t("Ruxsat yo'q") };
  }
  await prisma.user.update({
    where: { id: botId },
    data: { botPublic: value },
  });
  revalidatePath("/bots");
  revalidatePath("/create-bot");
  return { ok: true };
}

export async function deleteBot(botId: string) {
  const me = await requireUser();
  const t = await getT();
  const bot = await prisma.user.findUnique({ where: { id: botId } });
  if (!bot || !bot.isBot) return { ok: false, error: t("Bot topilmadi") };
  if (bot.botOwnerId !== me.id && me.role !== "ADMIN") {
    return { ok: false, error: t("Ruxsat yo'q") };
  }
  await prisma.user.delete({ where: { id: botId } });
  revalidatePath("/bots");
  revalidatePath("/create-bot");
  revalidatePath("/admin-panel");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Admin helpers                                                       */
/* ------------------------------------------------------------------ */

export async function adminCreateBot(input: {
  name: string;
  username: string;
  botDescription?: string;
  botPrompt?: string;
  botCategory?: string;
  botPublic?: boolean;
}) {
  const me = await requireUser();
  const t = await getT();
  if (me.role !== "ADMIN") return { ok: false as const, error: t("Ruxsat yo'q") };
  return createBot(input);
}

export async function adminDeleteBot(botId: string) {
  const me = await requireUser();
  const t = await getT();
  if (me.role !== "ADMIN") return { ok: false, error: t("Ruxsat yo'q") };
  const bot = await prisma.user.findUnique({ where: { id: botId } });
  if (!bot || !bot.isBot) return { ok: false, error: t("Bot topilmadi") };
  await prisma.user.delete({ where: { id: botId } });
  revalidatePath("/admin-panel");
  revalidatePath("/bots");
  return { ok: true };
}
