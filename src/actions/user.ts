"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

/**
 * Follows a user. If the target account is private, a follow request is
 * created instead and the caller must wait for approval.
 */
export async function toggleFollow(followingId: string) {
  const user = await requireUser();
  if (user.id === followingId) return { ok: false, following: false };

  const target = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true, isPrivate: true, username: true },
  });
  if (!target) return { ok: false, following: false };

  // Unfollow / cancel request
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId } },
  });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    revalidatePath(`/${target.username}`);
    revalidatePath("/");
    return { ok: true, following: false, requested: false };
  }

  const pending = await prisma.followRequest.findUnique({
    where: { requesterId_targetId: { requesterId: user.id, targetId: followingId } },
  });
  if (pending) {
    await prisma.followRequest.delete({ where: { id: pending.id } });
    revalidatePath(`/${target.username}`);
    return { ok: true, following: false, requested: false };
  }

  // Private account → send a request
  if (target.isPrivate) {
    await prisma.followRequest.create({
      data: { requesterId: user.id, targetId: followingId },
    });
    await prisma.notification.create({
      data: {
        receiverId: followingId,
        actorId: user.id,
        type: "follow_request",
      },
    });
    revalidatePath(`/${target.username}`);
    revalidatePath("/notifications");
    return { ok: true, following: false, requested: true };
  }

  await prisma.follow.create({
    data: { followerId: user.id, followingId },
  });
  await prisma.notification.create({
    data: { receiverId: followingId, actorId: user.id, type: "follow" },
  });

  revalidatePath(`/${target.username}`);
  revalidatePath("/");
  return { ok: true, following: true, requested: false };
}

export async function acceptFollowRequest(requestId: string) {
  const user = await requireUser();
  const t = await getT();
  const request = await prisma.followRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.targetId !== user.id) {
    return { ok: false, error: t("So'rov topilmadi") };
  }

  await prisma.follow.create({
    data: { followerId: request.requesterId, followingId: user.id },
  });
  await prisma.followRequest.delete({ where: { id: requestId } });
  await prisma.notification.create({
    data: {
      receiverId: request.requesterId,
      actorId: user.id,
      type: "follow_accept",
    },
  });

  revalidatePath("/notifications");
  revalidatePath(`/${user.username}`);
  return { ok: true };
}

export async function rejectFollowRequest(requestId: string) {
  const user = await requireUser();
  const t = await getT();
  const request = await prisma.followRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.targetId !== user.id) {
    return { ok: false, error: t("So'rov topilmadi") };
  }
  await prisma.followRequest.delete({ where: { id: requestId } });
  revalidatePath("/notifications");
  return { ok: true };
}

export async function getPendingRequests() {
  const user = await requireUser();
  return prisma.followRequest.findMany({
    where: { targetId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      requester: {
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

export async function updateProfile(input: {
  name: string;
  username: string;
  bio: string;
  link?: string;
  image?: string | null;
  phone?: string;
  gender?: string;
  birthday?: string;
  location?: string;
}) {
  const user = await requireUser();
  const t = await getT();

  if (input.username !== user.username) {
    const taken = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (taken) {
      return { ok: false, error: t("Bu foydalanuvchi nomi band") };
    }
  }

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: input.name,
        username: input.username,
        bio: input.bio,
        link: input.link ?? "",
        ...(input.image !== undefined ? { image: input.image } : {}),
      },
    });
  } catch (e) {
    const msg =
      e instanceof Error && e.message.includes("USERNAME")
        ? t("Bu foydalanuvchi nomi band")
        : t("Saqlashda xatolik");
    return { ok: false, error: msg };
  }

  // Extra profile fields are stored directly (not part of the auth payload).
  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone: input.phone?.trim() || null,
      gender: input.gender || null,
      location: input.location?.trim() || null,
      birthday: input.birthday ? new Date(`${input.birthday}T00:00:00.000Z`) : null,
      ...(input.image === null ? { image: null } : {}),
    },
  });

  revalidatePath(`/${input.username}`);
  revalidatePath(`/${user.username}`);
  revalidatePath("/settings");
  return { ok: true, username: input.username };
}

/** Updates the profile avatar only. Pass `null` to remove it. */
export async function updateAvatar(image: string | null) {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { image },
  });
  revalidatePath(`/${user.username}`);
  revalidatePath("/settings");
  return { ok: true };
}

/** Changes the account password (requires the current one). */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  await requireUser();
  const t = await getT();
  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      },
    });
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof Error && /password/i.test(e.message)
        ? t("Joriy parol noto'g'ri")
        : t("Parolni o'zgartirishda xatolik");
    return { ok: false, error: msg };
  }
}

/** Changes the account email address. */
export async function changeEmail(newEmail: string) {
  const user = await requireUser();
  const t = await getT();
  const email = newEmail.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: t("To'g'ri email kiriting") };
  }
  if (email === user.email) {
    return { ok: false, error: t("Bu allaqachon joriy email") };
  }
  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken) return { ok: false, error: t("Bu email band") };

  try {
    await auth.api.changeEmail({
      headers: await headers(),
      body: { newEmail: email },
    });
    revalidatePath("/settings");
    return { ok: true, email };
  } catch {
    return { ok: false, error: t("Emailni o'zgartirishda xatolik") };
  }
}

/** Permanently deletes the signed-in account and all of its data. */
export async function deleteMyAccount(confirmUsername?: string) {
  const user = await requireUser();
  const t = await getT();
  if (!user.username) return { ok: false, error: t("Username topilmadi") };
  if (confirmUsername?.trim().toLowerCase() !== user.username.toLowerCase()) {
    return { ok: false, error: t("Username mos kelmadi") };
  }
  await prisma.user.delete({ where: { id: user.id } });
  return { ok: true };
}

/**
 * Returns everything the user has created as a JSON payload so the client can
 * download a personal data archive.
 */
export async function exportMyData() {
  const user = await requireUser();
  const [posts, comments, stories, saved, likes] = await Promise.all([
    prisma.post.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        caption: true,
        location: true,
        media: true,
        isReel: true,
        createdAt: true,
      },
    }),
    prisma.comment.findMany({
      where: { userId: user.id },
      select: { id: true, text: true, postId: true, createdAt: true },
    }),
    prisma.story.findMany({
      where: { userId: user.id },
      select: { id: true, mediaUrl: true, createdAt: true, expiresAt: true },
    }),
    prisma.savedPost.findMany({
      where: { userId: user.id },
      select: { postId: true, createdAt: true },
    }),
    prisma.like.findMany({
      where: { userId: user.id },
      select: { postId: true, createdAt: true },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      link: user.link,
      phone: user.phone,
      gender: user.gender,
      birthday: user.birthday,
      location: user.location,
      createdAt: user.createdAt,
    },
    counts: {
      posts: posts.length,
      comments: comments.length,
      stories: stories.length,
      saved: saved.length,
      likes: likes.length,
    },
    posts,
    comments,
    stories,
    saved,
    likes,
  };
}


/** Toggles the account between public and private. */
export async function togglePrivateAccount(value: boolean) {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { isPrivate: value },
  });
  revalidatePath("/settings");
  revalidatePath(`/${user.username}`);
  return { ok: true };
}

export async function markNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { receiverId: user.id, read: false },
    data: { read: true },
  });
  return { ok: true };
}

export async function reportContent(input: {
  targetType: "post" | "user" | "comment" | "message" | "conversation";
  targetId: string;
  targetConversationId?: string;
  reason: string;
}) {
  const user = await requireUser();
  const t = await getT();
  if (!input.reason.trim()) return { ok: false, error: t("Sababni kiriting") };

  // For "message"/"conversation" the reporter must be a participant of the
  // conversation — otherwise anyone could report any chat.
  let conversationId = input.targetConversationId ?? null;
  if (input.targetType === "message" && !conversationId) {
    const msg = await prisma.message.findUnique({
      where: { id: input.targetId },
      select: { conversationId: true },
    });
    if (!msg) return { ok: false, error: t("Xabar topilmadi") };
    conversationId = msg.conversationId;
  }
  if (input.targetType === "message" || input.targetType === "conversation") {
    if (!conversationId) return { ok: false, error: t("Suhbat topilmadi") };
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: user.id },
      },
    });
    if (!member) return { ok: false, error: t("Bu suhbatda qatnashmaysiz") };
  }

  await prisma.report.create({
    data: {
      reporterId: user.id,
      targetType: input.targetType,
      targetId: input.targetId,
      targetConversationId: conversationId,
      reason: input.reason.trim(),
    },
  });
  return { ok: true };
}

export async function searchUsers(query: string) {
  await requireUser();
  const q = query.trim();
  if (!q) return [];

  return prisma.user.findMany({
    where: {
      OR: [{ username: { contains: q } }, { name: { contains: q } }],
    },
    take: 20,
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      bio: true,
      isVerified: true,
      isPremium: true,
      _count: { select: { followers: true, posts: true } },
    },
  });
}

export async function getSuggestedUsers(viewerId: string, take = 5) {
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const exclude = [viewerId, ...following.map((f) => f.followingId)];

  return prisma.user.findMany({
    where: { id: { notIn: exclude } },
    take,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      bio: true,
      isVerified: true,
      isPremium: true,
      _count: { select: { followers: true, posts: true } },
    },
  });
}
