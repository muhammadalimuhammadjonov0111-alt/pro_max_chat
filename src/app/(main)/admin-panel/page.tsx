import { getT } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/session";
import {
  getAdminStats,
  adminListUsers,
  adminListPosts,
  adminListSubscriptions,
  adminListReports,
  adminListPayments,
} from "@/actions/admin";
import { prisma } from "@/lib/prisma";
import { adminListBots } from "@/actions/bot";
import { adminListAds } from "@/actions/ads";
import { listAdminGifs } from "@/actions/admin-gifs";
import { AdminClient } from "@/components/admin/admin-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Admin panel") };
}

export default async function AdminPage() {
  const admin = await requireAdmin();

  const [stats, users, posts, subs, payments, reports, announcements, bots, ads, gifs] =
    await Promise.all([
      getAdminStats(),
      adminListUsers(),
      adminListPosts(),
      adminListSubscriptions(),
      adminListPayments(),
      adminListReports(),
      prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      adminListBots(),
      adminListAds(),
      listAdminGifs(),
    ]);

  return (
    <AdminClient
      adminName={admin.name}
      adminUsername={admin.username}
      stats={stats}
      users={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
      posts={posts.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      }))}
      subs={subs.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
      }))}
      payments={payments.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        confirmedAt: p.confirmedAt ? p.confirmedAt.toISOString() : null,
        telegramSentAt: p.telegramSentAt ? p.telegramSentAt.toISOString() : null,
        receiptTelegramSentAt: p.receiptTelegramSentAt ? p.receiptTelegramSentAt.toISOString() : null,
      }))}
      reports={reports.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))}
      announcements={announcements.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
      }))}
      bots={bots}
      ads={ads}
      gifs={gifs}
    />
  );
}
