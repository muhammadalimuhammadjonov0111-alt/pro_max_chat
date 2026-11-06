import Link from "next/link";
import { Fragment } from "react";
import { Users } from "lucide-react";

import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getFeedPosts } from "@/lib/queries";
import { getActiveAds } from "@/lib/ads";
import { getStoryGroups } from "@/actions/story";
import { getT } from "@/lib/i18n/server";
import { PostCard } from "@/components/feed/post-card";
import { AdCard } from "@/components/ads/ad-card";
import { StoryBar } from "@/components/stories/story-bar";
import { AnnouncementBanner } from "@/components/shared/announcement-banner";
import { InviteCard } from "@/components/shared/invite-card";
import { toPostUser } from "@/lib/types";

export default async function HomePage() {
  const user = await requireUser();
  const me = toPostUser(user);

  const now = new Date();
  const [posts, storyGroups, announcements, ads] = await Promise.all([
    getFeedPosts(user.id),
    getStoryGroups(user.id),
    prisma.announcement.findMany({
      where: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, body: true, level: true, createdAt: true },
    }),
    getActiveAds(),
  ]);

  // Spread live ads through the feed: one ad after every third post, and any
  // leftovers after the last post.
  const adsPerPost = (index: number) =>
    index % 3 === 0 ? ads[Math.floor(index / 3)] : undefined;
  const usedAds = posts.length > 0 ? Math.ceil(posts.length / 3) : ads.length;
  const leftoverAds = posts.length > 0 ? ads.slice(usedAds) : [];

  return (
    <div className="mx-auto w-full max-w-[630px] px-0 pb-20 pt-0 sm:px-0 sm:pb-8 sm:pt-4">
      <div className="px-4 pt-4 sm:px-0 sm:pt-0">
        <AnnouncementBanner
          announcements={announcements.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </div>

      <div className="sm:rounded-2xl sm:border sm:overflow-hidden">
        <StoryBar me={me} groups={storyGroups} />
      </div>

      <InviteCard className="mx-4 mt-4 sm:mx-0" />

      <div className="mt-4 flex flex-col gap-0 sm:gap-4">
        {posts.length === 0 ? (
          <>
            <EmptyFeed />
            {ads.length > 0 ? (
              ads.map((ad) => <AdCard key={ad.id} ad={ad} />)
            ) : (
              <AdCard ad={null} />
            )}
          </>
        ) : (
          <>
            {posts.map((post, i) => {
              const slot = adsPerPost(i);
              const placeholder = ads.length === 0 && i === 0;
              return (
                <Fragment key={post.id}>
                  <PostCard post={post} me={me} eager={i === 0} />
                  {slot ? <AdCard ad={slot} /> : null}
                  {placeholder ? <AdCard ad={null} /> : null}
                </Fragment>
              );
            })}
            {leftoverAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

async function EmptyFeed() {
  const t = await getT();
  return (
    <div className="relative mx-4 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border py-20 text-center sm:mx-0">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <span className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 text-white shadow-[0_18px_50px_-18px_rgba(124,58,237,0.9)]">
        <Users className="h-7 w-7" />
      </span>
      <div className="relative space-y-1">
        <p className="text-lg font-bold">{t("Xush kelibsiz!")}</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {t(
            "Bu yerda hali post yo'q. Odamlarni kuzatib boshlang yoki o'z birinchi postingizni joylang."
          )}
        </p>
      </div>
      <Link
        href="/explore"
        className="relative inline-flex h-10 items-center gap-2 rounded-full bg-[#0095f6] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0077d4]"
      >
        {t("Odamlarni kashf etish")}
      </Link>
    </div>
  );
}
