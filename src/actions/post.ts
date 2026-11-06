"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import type { Media } from "@/lib/utils";

export async function createPost(input: {
  media: Media[];
  caption?: string;
  location?: string;
  isReel?: boolean;
}) {
  const user = await requireUser();
  const t = await getT();

  if (!input.media.length) {
    return { ok: false, error: t("Kamida bitta media yuklang") };
  }

  const post = await prisma.post.create({
    data: {
      userId: user.id,
      caption: input.caption?.trim() || null,
      location: input.location?.trim() || null,
      media: JSON.stringify(input.media),
      isReel: input.isReel ?? false,
    },
  });

  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/reels");
  revalidatePath(`/p/${post.id}`);
  return { ok: true, postId: post.id };
}

export async function toggleLike(postId: string) {
  const user = await requireUser();

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    revalidatePath("/");
    return { liked: false };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { userId: true },
  });

  await prisma.like.create({
    data: { userId: user.id, postId },
  });

  if (post && post.userId !== user.id) {
    await prisma.notification.create({
      data: {
        receiverId: post.userId,
        actorId: user.id,
        type: "like",
        postId,
      },
    });
  }

  revalidatePath("/");
  return { liked: true };
}

export async function addComment(postId: string, text: string) {
  const user = await requireUser();
  const t = await getT();
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: t("Izoh bo'sh") };

  const comment = await prisma.comment.create({
    data: { userId: user.id, postId, text: trimmed },
    include: { user: true },
  });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { userId: true },
  });

  if (post && post.userId !== user.id) {
    await prisma.notification.create({
      data: {
        receiverId: post.userId,
        actorId: user.id,
        type: "comment",
        postId,
        commentId: comment.id,
      },
    });
  }

  revalidatePath("/");
  return { ok: true, comment };
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();
  const t = await getT();
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { post: { select: { userId: true } } },
  });
  if (!comment) return { ok: false, error: t("Izoh topilmadi") };

  const isOwner = comment.userId === user.id;
  const isPostOwner = comment.post.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isPostOwner && !isAdmin) {
    return { ok: false, error: t("Ruxsat yo'q") };
  }

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath("/");
  return { ok: true };
}

export async function toggleSave(postId: string) {
  const user = await requireUser();

  const existing = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });

  if (existing) {
    await prisma.savedPost.delete({ where: { id: existing.id } });
    return { saved: false };
  }

  await prisma.savedPost.create({ data: { userId: user.id, postId } });
  return { saved: true };
}

export async function deletePost(postId: string) {
  const user = await requireUser();
  const t = await getT();
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || (post.userId !== user.id && user.role !== "ADMIN")) {
    return { ok: false, error: t("Ruxsat yo'q") };
  }
  await prisma.post.delete({ where: { id: postId } });
  revalidatePath("/");
  revalidatePath(`/${user.username}`);
  return { ok: true };
}

export async function editPost(
  postId: string,
  input: { caption?: string; location?: string }
) {
  const user = await requireUser();
  const t = await getT();
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.userId !== user.id) {
    return { ok: false, error: t("Ruxsat yo'q") };
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      caption: input.caption?.trim() || null,
      location: input.location?.trim() || null,
      editedAt: new Date(),
    },
  });

  revalidatePath("/");
  revalidatePath(`/p/${postId}`);
  revalidatePath(`/${user.username}`);
  return { ok: true };
}

/** Records that the current user viewed a post (once per user). */
export async function recordView(postId: string) {
  const user = await requireUser();
  await prisma.postView
    .upsert({
      where: { postId_userId: { postId, userId: user.id } },
      create: { postId, userId: user.id },
      update: {},
    })
    .catch(() => {});
  return { ok: true };
}

export async function getPostsByTag(tag: string, viewerId: string) {
  const posts = await prisma.post.findMany({
    where: {
      caption: { contains: `#${tag}` },
      isArchived: false,
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          isVerified: true,
          isPremium: true,
        },
      },
      _count: { select: { likes: true, comments: true, views: true } },
    },
  });

  const ids = posts.map((p) => p.id);
  const [likes, saves] = await Promise.all([
    ids.length
      ? prisma.like.findMany({
          where: { userId: viewerId, postId: { in: ids } },
          select: { postId: true },
        })
      : [],
    ids.length
      ? prisma.savedPost.findMany({
          where: { userId: viewerId, postId: { in: ids } },
          select: { postId: true },
        })
      : [],
  ]);
  const likedSet = new Set(likes.map((l) => l.postId));
  const savedSet = new Set(saves.map((s) => s.postId));

  return posts.map((p) => ({
    ...p,
    likedByMe: likedSet.has(p.id),
    savedByMe: savedSet.has(p.id),
  }));
}

export async function getComments(postId: string) {
  await requireUser();
  return prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          isVerified: true,
          isPremium: true,
        },
      },
    },
  });
}

export async function getLikes(postId: string) {
  await requireUser();
  return prisma.like.findMany({
    where: { postId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          isVerified: true,
          isPremium: true,
        },
      },
    },
  });
}
