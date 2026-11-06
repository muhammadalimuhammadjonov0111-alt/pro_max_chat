import { notFound } from "next/navigation";

import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { UserList } from "@/components/profile/user-list";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await requireUser();
  const t = await getT();

  const profile = await prisma.user.findFirst({ where: { username } });
  if (!profile) notFound();

  const [rows, following] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: profile.id },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            bio: true,
            isVerified: true,
            isPremium: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.follow.findMany({
      where: { followerId: viewer.id },
      select: { followingId: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[600px] pb-20 sm:pb-8 sm:pt-4">
      <h1 className="border-b px-4 py-4 text-base font-semibold">
        {t("Kuzatilmoqda")}
      </h1>
      <UserList
        users={rows.map((r) => r.following)}
        meId={viewer.id}
        followingIds={following.map((f) => f.followingId)}
        emptyText={t("Hozircha kuzatilayotgan hisob yo'q")}
      />
    </div>
  );
}
