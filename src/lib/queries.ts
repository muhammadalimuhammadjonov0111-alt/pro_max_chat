import { prisma } from "@/lib/prisma";
import type { PostWithDetails } from "@/lib/types";

const userSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  isVerified: true,
  isPremium: true,
} as const;

const postInclude = {
  user: { select: userSelect },
  _count: { select: { likes: true, comments: true, views: true } },
} as const;

async function decorate(
  posts: (Omit<PostWithDetails, "likedByMe" | "savedByMe">)[],
  userId: string
): Promise<PostWithDetails[]> {
  if (!posts.length) return [];
  const ids = posts.map((p) => p.id);

  const [likes, saves] = await Promise.all([
    prisma.like.findMany({
      where: { userId, postId: { in: ids } },
      select: { postId: true },
    }),
    prisma.savedPost.findMany({
      where: { userId, postId: { in: ids } },
      select: { postId: true },
    }),
  ]);

  const likedSet = new Set(likes.map((l) => l.postId));
  const savedSet = new Set(saves.map((s) => s.postId));

  return posts.map((p) => ({
    ...p,
    likedByMe: likedSet.has(p.id),
    savedByMe: savedSet.has(p.id),
  }));
}

export async function getFeedPosts(userId: string, take = 30) {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const ids = [userId, ...following.map((f) => f.followingId)];

  const posts = await prisma.post.findMany({
    where: { userId: { in: ids } },
    orderBy: { createdAt: "desc" },
    take,
    include: postInclude,
  });

  return decorate(posts, userId);
}

export async function getExplorePosts(userId: string, take = 45) {
  const posts = await prisma.post.findMany({
    where: { isReel: false },
    orderBy: { createdAt: "desc" },
    take,
    include: postInclude,
  });
  return decorate(posts, userId);
}

export async function getReels(userId: string, take = 20) {
  const posts = await prisma.post.findMany({
    where: { isReel: true },
    orderBy: { createdAt: "desc" },
    take,
    include: postInclude,
  });
  return decorate(posts, userId);
}

export async function getUserPosts(userId: string, viewerId: string) {
  const posts = await prisma.post.findMany({
    where: { userId, isReel: false },
    orderBy: { createdAt: "desc" },
    include: postInclude,
  });
  return decorate(posts, viewerId);
}

export async function getUserReels(userId: string, viewerId: string) {
  const posts = await prisma.post.findMany({
    where: { userId, isReel: true },
    orderBy: { createdAt: "desc" },
    include: postInclude,
  });
  return decorate(posts, viewerId);
}

export async function getUserSaved(viewerId: string) {
  const saved = await prisma.savedPost.findMany({
    where: { userId: viewerId },
    orderBy: { createdAt: "desc" },
    include: { post: { include: postInclude } },
  });
  const posts = saved.map((s) => s.post);
  return decorate(posts, viewerId);
}

export async function getPostById(postId: string, viewerId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: postInclude,
  });
  if (!post) return null;
  const [decorated] = await decorate([post], viewerId);
  return decorated;
}

export { userSelect };
