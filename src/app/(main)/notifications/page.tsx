import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  UserPlus,
  Send,
  UserCheck,
  AtSign,
  Megaphone,
  Crown,
} from "lucide-react";

import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { parseMedia, cn } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/time-ago";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/shared/badges";
import { MarkNotificationsRead } from "@/components/notifications/mark-read";
import { FollowRequests } from "@/components/notifications/follow-requests";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Bildirishnomalar") };
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const t = await getT();

  const [notifications, requests] = await Promise.all([
    prisma.notification.findMany({
      where: { receiverId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            isVerified: true,
          },
        },
      },
    }),
    prisma.followRequest.findMany({
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
    }),
  ]);

  const postIds = notifications
    .map((n) => n.postId)
    .filter((id): id is string => !!id);
  const posts = postIds.length
    ? await prisma.post.findMany({
        where: { id: { in: postIds } },
        select: { id: true, media: true },
      })
    : [];
  const postMap = new Map(posts.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-[600px] pb-20 sm:pb-8 sm:pt-4">
      <MarkNotificationsRead />
      <h1 className="border-b px-4 py-4 text-base font-semibold">
        {t("Bildirishnomalar")}
      </h1>

      <FollowRequests
        requests={requests.map((r) => ({
          id: r.id,
          requester: r.requester,
        }))}
      />

      {notifications.length === 0 && requests.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          {t("Hozircha bildirishnoma yo'q")}
        </p>
      ) : (
        <div className="divide-y">
          {notifications.map((n) => {
            const actor = n.actor.username ?? n.actor.name;
            const post = n.postId ? postMap.get(n.postId) : null;
            const thumb = post ? parseMedia(post.media)[0] : null;
            const Icon =
              n.type === "like"
                ? Heart
                : n.type === "comment"
                  ? MessageCircle
                  : n.type === "follow"
                    ? UserPlus
                    : n.type === "follow_accept"
                      ? UserCheck
                      : n.type === "follow_request"
                        ? AtSign
                        : n.type === "announcement"
                          ? Megaphone
                          : n.type === "story_comment"
                            ? MessageCircle
                            : n.type === "story_reaction"
                              ? Heart
                              : n.type === "premium"
                                ? Crown
                                : Send;
            const verb =
              n.type === "like"
                ? "postingizni yoqtirdi"
                : n.type === "comment"
                  ? "izoh qoldirdi"
                  : n.type === "follow"
                    ? "sizni kuzatmoqda"
                    : n.type === "follow_accept"
                      ? "kuzatish so'rovingizni qabul qildi"
                      : n.type === "follow_request"
                        ? "kuzatish so'rovini yubordi"
                        : n.type === "announcement"
                          ? "yangi e'lon joylashtirdi"
                          : n.type === "story_comment"
                            ? "hikoyangizga izoh yozdi"
                            : n.type === "story_reaction"
                              ? "hikoyangizga reaksiya yubordi"
                              : n.type === "premium"
                                ? "sizga premium sovg'a qildi 🎉"
                                : "xabar yubordi";

            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  !n.read && "bg-primary/5"
                )}
              >
                <div className="relative">
                  <Link href={`/${actor}`}>
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={n.actor.image ?? undefined} alt={actor} />
                      <AvatarFallback>
                        {actor.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        n.type === "like" ? "fill-like text-like" : ""
                      )}
                    />
                  </span>
                </div>

                <p className="flex-1 text-sm">
                  <Link
                    href={`/${actor}`}
                    className="inline-flex items-center gap-1 font-semibold"
                  >
                    {actor}
                    {n.actor.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
                  </Link>{" "}
                  {verb}{" "}
                  <span className="text-muted-foreground">
                    <TimeAgo date={n.createdAt} />
                  </span>
                </p>

                {thumb && n.postId && (
                  <Link href={`/p/${n.postId}`} className="shrink-0">
                    <Image
                      src={thumb.url}
                      alt="post"
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded object-cover"
                      unoptimized
                    />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
