"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { parseStoryOverlays, type StoryItem, type StoryMusic } from "@/lib/story";
import type { MediaOverlay } from "@/lib/utils";
import type { PostUser } from "@/lib/types";

const userSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  isVerified: true,
  isPremium: true,
} as const; 

export type StoryGroup = {
  user: PostUser;
  stories: StoryItem[];
  hasUnseen: boolean;
  totalViews: number;
};

export type StoryCommentItem = {
  id: string;
  text: string;
  createdAt: Date;
  user: PostUser;
  isMine: boolean;
};

export type StoryStats = {
  viewers: { user: PostUser; createdAt: Date }[];
  comments: StoryCommentItem[];
  reactions: { emoji: string; count: number; users: PostUser[] }[];
};

type StoryRow = {
  id: string;
  userId: string;
  kind: string;
  mediaUrl: string | null;
  mediaType: string;
  content: string | null;
  background: string | null;
  overlays: string | null;
  musicUrl: string | null;
  musicTitle: string | null;
  createdAt: Date;
  expiresAt: Date;
  user: PostUser;
  views: { id: string }[];
  _count: { views: number; comments: number };
  reactions: { emoji: string; userId: string }[];
};

function toStoryItem(s: StoryRow, viewerId: string): StoryItem {
  const counts = new Map<string, number>();
  let myReaction: string | null = null;
  for (const r of s.reactions) {
    if (r.userId === viewerId) myReaction = r.emoji;
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  }
  return {
    id: s.id,
    userId: s.userId,
    kind: s.kind === "text" ? "text" : "media",
    mediaUrl: s.mediaUrl,
    mediaType: s.mediaType,
    content: s.content,
    background: s.background,
    overlays: parseStoryOverlays(s.overlays),
    music: s.musicUrl ? { title: s.musicTitle ?? "Musiqa", url: s.musicUrl } : null,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    viewCount: s._count.views,
    commentCount: s._count.comments,
    reactions: Array.from(counts, ([emoji, count]) => ({ emoji, count })).sort(
      (a, b) => b.count - a.count
    ),
    myReaction,
  };
}

function buildGroup(
  rows: (StoryRow & { views: { id: string }[] })[],
  viewerId: string
): StoryGroup | null {
  if (!rows.length) return null;
  const group: StoryGroup = {
    user: rows[0].user,
    stories: [],
    hasUnseen: false,
    totalViews: 0,
  };
  for (const s of rows) {
    const item = toStoryItem(s, viewerId);
    group.stories.push(item);
    group.totalViews += item.viewCount;
    if (s.views.length === 0) group.hasUnseen = true;
  }
  return group;
}

/** Every live story, grouped by author, for the given viewer. */
export async function getStoryGroups(viewerId: string): Promise<StoryGroup[]> {
  const stories = await prisma.story.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: userSelect },
      views: { where: { viewerId }, select: { id: true } },
      _count: { select: { views: true, comments: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  });

  const map = new Map<string, StoryGroup>();
  for (const s of stories) {
    const group: StoryGroup = map.get(s.userId) ?? {
      user: s.user,
      stories: [],
      hasUnseen: false,
      totalViews: 0,
    };
    const item = toStoryItem(s, viewerId);
    group.stories.push(item);
    group.totalViews += item.viewCount;
    if (s.views.length === 0) group.hasUnseen = true;
    map.set(s.userId, group);
  }

  const groups = Array.from(map.values());
  // Put current user's story first
  groups.sort((a, b) =>
    a.user.id === viewerId ? -1 : b.user.id === viewerId ? 1 : 0
  );
  return groups;
}

/** Live stories of a single author (profile page highlights). */
export async function getStoryGroupOf(
  profileId: string,
  viewerId: string
): Promise<StoryGroup | null> {
  const stories = await prisma.story.findMany({
    where: { userId: profileId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: userSelect },
      views: { where: { viewerId }, select: { id: true } },
      _count: { select: { views: true, comments: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  });
  return buildGroup(stories, viewerId);
}

export type CreateStoryInput = {
  kind?: "media" | "text";
  mediaUrl?: string | null;
  mediaType?: string;
  content?: string | null;
  background?: string | null;
  overlays?: MediaOverlay[];
  music?: StoryMusic | null;
};

export async function createStory(input: CreateStoryInput) {
  const user = await requireUser();
  const t = await getT();

  const kind = input.kind ?? (input.mediaUrl ? "media" : "text");
  if (kind === "media" && !input.mediaUrl) {
    return { ok: false as const, error: t("Media tanlang") };
  }
  const content = input.content?.trim() || null;
  if (kind === "text" && !content) {
    return { ok: false as const, error: t("Matn kiriting") };
  }

  const story = await prisma.story.create({
    data: {
      userId: user.id,
      kind,
      mediaUrl: input.mediaUrl ?? null,
      mediaType: input.mediaType ?? "image",
      content,
      background: input.background ?? null,
      overlays: input.overlays?.length ? JSON.stringify(input.overlays) : null,
      musicUrl: input.music?.url || null,
      musicTitle: input.music?.title || null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath("/");
  return { ok: true as const, storyId: story.id };
}

export async function viewStory(storyId: string) {
  const user = await requireUser();
  await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId, viewerId: user.id } },
    create: { storyId, viewerId: user.id },
    update: {},
  });
  return { ok: true };
}

/** Toggle the viewer's emoji reaction on a story. */
export async function reactToStory(storyId: string, emoji: string) {
  const user = await requireUser();
  if (!emoji) return { ok: false as const, active: false, emoji: "" };

  const key = { storyId_userId: { storyId, userId: user.id } };
  const existing = await prisma.storyReaction.findUnique({ where: key });

  // Tapping the same emoji again removes the reaction.
  if (existing && existing.emoji === emoji) {
    await prisma.storyReaction.delete({ where: key });
    return { ok: true as const, active: false, emoji };
  }

  await prisma.storyReaction.upsert({
    where: key,
    create: { storyId, userId: user.id, emoji },
    update: { emoji },
  });

  if (!existing) {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true },
    });
    if (story && story.userId !== user.id) {
      await prisma.notification.create({
        data: {
          receiverId: story.userId,
          actorId: user.id,
          type: "story_reaction",
          storyId,
        },
      });
    }
  }

  return { ok: true as const, active: true, emoji };
}

/** Reply to a story. The owner is notified; only they (and the author) can read it. */
export async function addStoryComment(storyId: string, text: string) {
  const user = await requireUser();
  const t = await getT();
  const trimmed = text.trim();
  if (!trimmed) return { ok: false as const, error: t("Izoh bo'sh") };

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { userId: true, expiresAt: true },
  });
  if (!story || story.expiresAt < new Date()) {
    return { ok: false as const, error: t("Hikoya muddati tugagan") };
  }

  const comment = await prisma.storyComment.create({
    data: { storyId, userId: user.id, text: trimmed },
    include: { user: { select: userSelect } },
  });

  if (story.userId !== user.id) {
    await prisma.notification.create({
      data: {
        receiverId: story.userId,
        actorId: user.id,
        type: "story_comment",
        storyId,
      },
    });
  }

  revalidatePath("/");
  return {
    ok: true as const,
    comment: {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      user: comment.user,
      isMine: true,
    } satisfies StoryCommentItem,
  };
}

/**
 * Comments on a story. The owner sees every reply; other people only see the
 * ones they wrote themselves.
 */
export async function getStoryComments(storyId: string): Promise<StoryCommentItem[]> {
  const user = await requireUser();
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { userId: true },
  });
  if (!story) return [];

  const comments = await prisma.storyComment.findMany({
    where: { storyId, ...(story.userId === user.id ? {} : { userId: user.id }) },
    orderBy: { createdAt: "asc" },
    include: { user: { select: userSelect } },
  });

  return comments.map((c) => ({
    id: c.id,
    text: c.text,
    createdAt: c.createdAt,
    user: c.user,
    isMine: c.userId === user.id,
  }));
}

export async function deleteStoryComment(commentId: string) {
  const user = await requireUser();
  const comment = await prisma.storyComment.findUnique({
    where: { id: commentId },
    select: { userId: true, story: { select: { userId: true } } },
  });
  if (!comment) return { ok: false as const };
  if (comment.userId !== user.id && comment.story.userId !== user.id) {
    return { ok: false as const };
  }
  await prisma.storyComment.delete({ where: { id: commentId } });
  revalidatePath("/");
  return { ok: true as const };
}

/**
 * Full engagement breakdown for one story — viewers, reactions and replies.
 * Only the story's owner gets an answer here.
 */
export async function getStoryStats(storyId: string): Promise<StoryStats | null> {
  const user = await requireUser();
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { userId: true },
  });
  if (!story || story.userId !== user.id) return null;

  const [views, comments, reactions] = await Promise.all([
    prisma.storyView.findMany({
      where: { storyId },
      orderBy: { createdAt: "desc" },
      include: { viewer: { select: userSelect } },
    }),
    prisma.storyComment.findMany({
      where: { storyId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: userSelect } },
    }),
    prisma.storyReaction.findMany({
      where: { storyId },
      include: { user: { select: userSelect } },
    }),
  ]);

  const grouped = new Map<string, { emoji: string; count: number; users: PostUser[] }>();
  for (const r of reactions) {
    const g = grouped.get(r.emoji) ?? { emoji: r.emoji, count: 0, users: [] };
    g.count += 1;
    g.users.push(r.user);
    grouped.set(r.emoji, g);
  }

  return {
    viewers: views.map((v) => ({ user: v.viewer, createdAt: v.createdAt })),
    comments: comments.map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt,
      user: c.user,
      isMine: c.userId === user.id,
    })),
    reactions: Array.from(grouped.values()).sort((a, b) => b.count - a.count),
  };
}
