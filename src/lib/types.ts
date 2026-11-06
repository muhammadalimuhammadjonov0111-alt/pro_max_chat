import type { User, Post } from "@prisma/client";

export type PostUser = Pick<
  User,
  "id" | "username" | "name" | "image" | "isVerified" | "isPremium"
> & { isBot?: boolean };

export type PostWithDetails = Post & {
  user: PostUser;
  _count: { likes: number; comments: number; views: number };
  likedByMe: boolean;
  savedByMe: boolean;
};

export type CommentWithUser = {
  id: string;
  text: string;
  createdAt: Date;
  userId: string;
  user: PostUser;
};

export type Plan = "monthly" | "yearly";

export const PREMIUM_PRICES: Record<
  Plan,
  { amount: number; label: string; days: number }
> = {
  monthly: { amount: 20000, label: "Oylik", days: 30 },
  yearly: { amount: 100000, label: "Yillik", days: 365 },
};

export function formatSom(amount: number): string {
  return `${amount.toLocaleString("ru-RU").replace(/,/g, " ")} so'm`;
}

/** Whether a user's premium subscription is currently active. */
export function premiumActive(u: {
  isPremium: boolean;
  premiumUntil: Date | null;
}): boolean {
  if (!u.isPremium) return false;
  if (!u.premiumUntil) return true;
  return u.premiumUntil.getTime() > Date.now();
}

/** Map a full DB user to the lightweight public shape used across the UI. */
export function toPostUser(u: {
  id: string;
  username: string | null;
  name: string;
  image: string | null;
  isVerified: boolean;
  isPremium: boolean;
  isBot?: boolean;
}): PostUser {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    image: u.image,
    isVerified: u.isVerified,
    isPremium: u.isPremium,
    isBot: u.isBot ?? false,
  };
}
