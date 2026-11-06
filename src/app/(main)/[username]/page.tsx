import { notFound } from "next/navigation";
import { Lock } from "lucide-react";

import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getUserPosts, getUserReels, getUserSaved } from "@/lib/queries";
import { toPostUser } from "@/lib/types";
import { getStoryGroupOf } from "@/actions/story";
import { getT } from "@/lib/i18n/server";
import { ProfileHeader } from "@/components/profile/profile-header";
import { HighlightsRow } from "@/components/profile/highlights-row";
import { ProfileTabs } from "@/components/profile/profile-tabs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return { title: username };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await requireUser();
  const t = await getT();

  const profile = await prisma.user.findFirst({
    where: { OR: [{ username }, { username: username.toLowerCase() }] },
  });

  if (!profile) notFound();

  const me = toPostUser(viewer);
  const isMe = profile.id === viewer.id;

  const [follow, request, followers, following] = await Promise.all([
    isMe
      ? Promise.resolve(null)
      : prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewer.id,
              followingId: profile.id,
            },
          },
        }),
    isMe
      ? Promise.resolve(null)
      : prisma.followRequest.findUnique({
          where: {
            requesterId_targetId: {
              requesterId: viewer.id,
              targetId: profile.id,
            },
          },
        }),
    prisma.follow.count({ where: { followingId: profile.id } }),
    prisma.follow.count({ where: { followerId: profile.id } }),
  ]);

  const isFollowing = !!follow;
  const isRequested = !!request;
  const locked = profile.isPrivate && !isMe && !isFollowing;

  const [posts, reels, saved, storyGroup] = locked
    ? [[], [], [], null]
    : await Promise.all([
        getUserPosts(profile.id, viewer.id),
        getUserReels(profile.id, viewer.id),
        isMe ? getUserSaved(viewer.id) : Promise.resolve([]),
        getStoryGroupOf(profile.id, viewer.id),
      ]);

  const counts = {
    posts: posts.length + reels.length,
    followers,
    following,
  };

  return (
    <div className="pb-24 sm:pb-10 sm:pt-4">
      <div className="overflow-hidden bg-card/40 sm:rounded-3xl sm:border sm:shadow-sm">
        <ProfileHeader
          profile={{
            id: profile.id,
            name: profile.name,
            username: profile.username,
            bio: profile.bio,
            link: profile.link,
            image: profile.image,
            phone: profile.phone,
            gender: profile.gender,
            birthday: profile.birthday
              ? profile.birthday.toISOString().slice(0, 10)
              : null,
            location: profile.location,
            isVerified: profile.isVerified,
            isPremium: profile.isPremium,
            isBot: profile.isBot,
          }}
          isAdmin={profile.role === "ADMIN"}
          counts={counts}
          isMe={isMe}
          isFollowing={isFollowing}
          isRequested={isRequested}
          username={profile.username ?? profile.name}
          joinedAt={profile.createdAt.toISOString()}
        />

        {!locked && (
          <div className="px-4 pb-5 sm:px-8">
            <HighlightsRow
              group={storyGroup}
              me={me}
              isMe={isMe}
            />
          </div>
        )}

        {locked ? (
          <div className="mx-4 mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed px-4 py-14 text-center sm:mx-8">
            <span className="story-ring flex h-16 w-16 items-center justify-center rounded-full p-[3px]">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-background">
                <Lock className="h-7 w-7" />
              </span>
            </span>
            <p className="text-base font-semibold">{t("Bu hisob yopiq")}</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {isRequested
                ? t("Kuzatish so'rovingiz yuborilgan. Tasdiqlanishini kuting.")
                : t("Postlarni ko'rish uchun bu hisobga obuna bo'ling.")}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <ProfileTabs
              posts={posts}
              reels={reels}
              saved={saved}
              me={me}
              isMe={isMe}
            />
          </div>
        )}
        <div className="pb-6" />
      </div>
    </div>
  );
}
