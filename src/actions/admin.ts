"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export async function getAdminStats() {
  await requireAdmin();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    users,
    posts,
    reels,
    stories,
    comments,
    likes,
    follows,
    messages,
    premiumUsers,
    verifiedUsers,
    bannedUsers,
    admins,
    openReports,
    revenueAgg,
    newUsers7d,
    newPosts7d,
    messages24h,
    activeSubscriptions,
    activeAnnouncements,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.post.count({ where: { isReel: true } }),
    prisma.story.count(),
    prisma.comment.count(),
    prisma.like.count(),
    prisma.follow.count(),
    prisma.message.count(),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.report.count({ where: { status: "open" } }),
    prisma.subscription.aggregate({
      _sum: { amount: true },
      where: { status: "active" },
    }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.post.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.message.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.announcement.count({ where: { active: true } }),
  ]);

  return {
    users,
    posts,
    reels,
    stories,
    comments,
    likes,
    follows,
    messages,
    premiumUsers,
    verifiedUsers,
    bannedUsers,
    admins,
    openReports,
    revenue: revenueAgg._sum.amount ?? 0,
    newUsers7d,
    newPosts7d,
    messages24h,
    activeSubscriptions,
    activeAnnouncements,
  };
}

export async function adminListUsers(query?: string) {
  await requireAdmin();
  const q = query?.trim();

  return prisma.user.findMany({
    where: q
      ? {
          OR: [
            { username: { contains: q } },
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      role: true,
      isVerified: true,
      isPremium: true,
      isBanned: true,
      isPrivate: true,
      createdAt: true,
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
}

/** Updates basic identity fields of any account. */
export async function adminUpdateUser(
  userId: string,
  input: { name: string; username: string; email: string }
) {
  await requireAdmin();
  const t = await getT();
  const name = input.name.trim();
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();

  if (!name) return { ok: false, error: t("Ism bo'sh bo'lmasligi kerak") };
  if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
    return { ok: false, error: t("Username 3-30 belgi, faqat harf/raqam/._") };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: t("Email noto'g'ri") };
  }

  const [usernameTaken, emailTaken] = await Promise.all([
    prisma.user.findFirst({ where: { username, NOT: { id: userId } } }),
    prisma.user.findFirst({ where: { email, NOT: { id: userId } } }),
  ]);
  if (usernameTaken) return { ok: false, error: t("Bu username band") };
  if (emailTaken) return { ok: false, error: t("Bu email band") };

  await prisma.user.update({
    where: { id: userId },
    data: { name, username, displayUsername: username, email },
  });
  revalidatePath("/admin-panel");
  return { ok: true };
}

export async function adminSetPrivate(userId: string, value: boolean) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { isPrivate: value } });
  revalidatePath("/admin-panel");
  return { ok: true };
}

export async function adminSetVerified(userId: string, value: boolean) {
  const admin = await requireAdmin();
  const t = await getT();
  if (userId === admin.id && !value) {
    return { ok: false, error: t("O'zingizdan tasdiqni olib tashlay olmaysiz") };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: value },
  });
  revalidatePath("/admin-panel");
  return { ok: true };
}

export async function adminSetPremium(userId: string, value: boolean) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: value,
      premiumUntil: value
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : null,
    },
  });
  revalidatePath("/admin-panel");
  return { ok: true };
}

export async function adminSetRole(userId: string, role: "USER" | "ADMIN") {
  const admin = await requireAdmin();
  const t = await getT();
  if (userId === admin.id && role === "USER") {
    return {
      ok: false,
      error: t("O'zingizning admin huquqingizni olib tashlay olmaysiz"),
    };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  revalidatePath("/admin-panel");
  return { ok: true };
}

export async function adminToggleBan(userId: string) {
  const admin = await requireAdmin();
  const t = await getT();
  if (userId === admin.id) {
    return { ok: false, error: t("O'zingizni bloklay olmaysiz") };
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: t("Foydalanuvchi topilmadi") };
  await prisma.user.update({
    where: { id: userId },
    data: { isBanned: !user.isBanned },
  });
  revalidatePath("/admin-panel");
  return { ok: true, banned: !user.isBanned };
}

/** Removes every post a user has created (keeps the account). */
export async function adminDeleteUserPosts(userId: string) {
  await requireAdmin();
  const res = await prisma.post.deleteMany({ where: { userId } });
  revalidatePath("/admin-panel");
  revalidatePath("/");
  return { ok: true, deleted: res.count };
}

/** Removes every story a user has created. */
export async function adminDeleteUserStories(userId: string) {
  await requireAdmin();
  const res = await prisma.story.deleteMany({ where: { userId } });
  revalidatePath("/admin-panel");
  return { ok: true, deleted: res.count };
}

export async function adminDeletePost(postId: string) {
  await requireAdmin();
  await prisma.post.delete({ where: { id: postId } });
  revalidatePath("/admin-panel");
  revalidatePath("/");
  return { ok: true };
}

export async function adminDeleteUser(userId: string) {
  const admin = await requireAdmin();
  const t = await getT();
  if (userId === admin.id) {
    return { ok: false, error: t("O'zingizni o'chira olmaysiz") };
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin-panel");
  return { ok: true };
}

export async function adminListPosts(query?: string, filter?: "all" | "reels") {
  await requireAdmin();
  const q = query?.trim();
  return prisma.post.findMany({
    where: {
      AND: [
        q ? { caption: { contains: q } } : {},
        filter === "reels" ? { isReel: true } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      user: { select: { id: true, username: true, name: true, isVerified: true } },
      _count: { select: { likes: true, comments: true, views: true } },
    },
  });
}

export async function adminListSubscriptions() {
  await requireAdmin();
  return prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
    },
  });
}

export async function adminListPayments(status?: "pending" | "paid" | "rejected" | "all") {
  await requireAdmin();
  return prisma.payment.findMany({
    where: status && status !== "all" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
    },
  });
}

export async function adminListReports(status?: "open" | "resolved" | "dismissed") {
  await requireAdmin();
  return prisma.report.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      reporter: { select: { id: true, username: true, name: true, image: true } },
    },
  });
}

/**
 * Faqat shikoyat qilingan suhbatni ko'rish (moderatsiya).
 * Boshqa suhbatlarga admin kirishi yo'q.
 */
export async function adminGetReportedConversation(conversationId: string) {
  const admin = await requireAdmin();
  void admin;

  const exists = await prisma.report.findFirst({
    where: { targetConversationId: conversationId },
  });
  if (!exists) return null;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, name: true, image: true, isBanned: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          sender: { select: { id: true, username: true, name: true, image: true } },
        },
      },
    },
  });
  if (!conversation) return null;

  return {
    id: conversation.id,
    createdAt: conversation.createdAt,
    members: conversation.members.map((m) => m.user),
    messages: [...conversation.messages].reverse().map((m) => ({
      id: m.id,
      text: m.text,
      imageUrl: m.imageUrl,
      mediaType: m.mediaType,
      senderId: m.senderId,
      senderName: m.sender.username ?? m.sender.name,
      createdAt: m.createdAt,
    })),
  };
}

/** Shikoyat qilingan suhbatdagi xabarni o'chirish (moderatsiya). */
export async function adminDeleteMessage(messageId: string) {
  await requireAdmin();
  const res = await prisma.message.deleteMany({ where: { id: messageId } });
  revalidatePath("/admin-panel");
  return { ok: res.count > 0 };
}

export async function adminSetReportStatus(
  reportId: string,
  status: "open" | "resolved" | "dismissed"
) {
  await requireAdmin();
  await prisma.report.update({ where: { id: reportId }, data: { status } });
  revalidatePath("/admin-panel");
  return { ok: true };
}

/** Resolves or dismisses every currently open report. */
export async function adminBulkReportStatus(status: "resolved" | "dismissed") {
  await requireAdmin();
  const res = await prisma.report.updateMany({
    where: { status: "open" },
    data: { status },
  });
  revalidatePath("/admin-panel");
  return { ok: true, updated: res.count };
}

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
// ---------------------------------------------------------------------------

export async function adminListAnnouncements() {
  await requireAdmin();
  return prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
}

export async function adminCreateAnnouncement(input: {
  title: string;
  body: string;
  level?: "info" | "warning" | "success";
  expiresAt?: string | null;
  notify?: boolean;
}) {
  const admin = await requireAdmin();
  const t = await getT();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) {
    return { ok: false, error: t("Sarlavha va matnni kiriting") };
  }

  const announcement = await prisma.announcement.create({
    data: {
      title,
      body,
      level: input.level ?? "info",
      createdById: admin.id,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });

  // Optionally ping every other user in their notification feed.
  if (input.notify) {
    const recipients = await prisma.user.findMany({
      where: { id: { not: admin.id }, isBanned: false },
      select: { id: true },
      take: 10000,
    });
    if (recipients.length) {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
          receiverId: r.id,
          actorId: admin.id,
          type: "announcement",
        })),
      });
    }
  }

  revalidatePath("/admin-panel");
  revalidatePath("/");
  return { ok: true, id: announcement.id };
}

export async function adminToggleAnnouncement(id: string, active: boolean) {
  await requireAdmin();
  await prisma.announcement.update({ where: { id }, data: { active } });
  revalidatePath("/admin-panel");
  revalidatePath("/");
  return { ok: true };
}

export async function adminDeleteAnnouncement(id: string) {
  await requireAdmin();
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/admin-panel");
  revalidatePath("/");
  return { ok: true };
}
