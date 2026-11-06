import { prisma } from "@/lib/prisma";

/** Every ad runs for 30 days once an admin approves it. */
export const AD_DURATION_DAYS = 30;

/** Contact details shown on the placeholder ad and on the ads page. */
export const AD_CONTACT_PHONE = "+998 94 194 54 91";
export const AD_CONTACT_TEL = "+998941945491";
export const AD_CONTACT_TELEGRAM = "https://t.me/Admin";

export type AdStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
export type AdContactType = "PHONE" | "TELEGRAM";

export type ActiveAd = {
  id: string;
  title: string;
  description: string;
  targetUrl: string;
  buttonLabel: string;
  imageUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  audioTitle: string | null;
  endsAt: string;
  owner: string;
  contactType: AdContactType | null;
  contactValue: string | null;
};

export type MyAd = ActiveAd & {
  status: AdStatus;
  startsAt: string | null;
  adminNote: string | null;
  /** Whole days left while APPROVED (0 otherwise). */
  daysLeft: number;
};

type AdWithUser = {
  id: string;
  title: string;
  description: string;
  targetUrl: string;
  buttonLabel: string;
  imageUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  audioTitle: string | null;
  contactType: string | null;
  contactValue: string | null;
  endsAt: Date | null;
  createdAt: Date;
  user: { username: string | null; name: string };
};

function contactType(value: string | null): AdContactType | null {
  return value === "PHONE" || value === "TELEGRAM" ? value : null;
}

function toActiveAd(ad: AdWithUser): ActiveAd {
  return {
    id: ad.id,
    title: ad.title,
    description: ad.description,
    targetUrl: ad.targetUrl,
    buttonLabel: ad.buttonLabel,
    imageUrl: ad.imageUrl,
    videoUrl: ad.videoUrl,
    audioUrl: ad.audioUrl,
    audioTitle: ad.audioTitle,
    endsAt: (ad.endsAt ?? ad.createdAt).toISOString(),
    owner: ad.user.username ?? ad.user.name,
    contactType: contactType(ad.contactType),
    contactValue: ad.contactValue,
  };
}

function displayStatus(status: string, endsAt: Date | null): AdStatus {
  if (status === "APPROVED" && (!endsAt || endsAt.getTime() <= Date.now())) {
    return "EXPIRED";
  }
  if (status === "APPROVED" || status === "PENDING" || status === "REJECTED") {
    return status;
  }
  return "EXPIRED";
}

/** Every ad currently live in the feed/reels (newest first). */
export async function getActiveAds(): Promise<ActiveAd[]> {
  const ads = await prisma.ad.findMany({
    where: { status: "APPROVED", endsAt: { gt: new Date() } },
    orderBy: { startsAt: "desc" },
    include: {
      user: { select: { username: true, name: true } },
    },
  });

  return ads.filter((ad) => ad.endsAt).map(toActiveAd);
}

/** All ads belonging to one user (newest first). */
export async function getMyAds(userId: string): Promise<MyAd[]> {
  const ads = await prisma.ad.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { username: true, name: true } },
    },
  });

  return ads.map((ad) => {
    const status = displayStatus(ad.status, ad.endsAt);
    const daysLeft =
      status === "APPROVED" && ad.endsAt
        ? Math.max(
            0,
            Math.ceil((ad.endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          )
        : 0;

    return {
      ...toActiveAd(ad),
      status,
      startsAt: ad.startsAt ? ad.startsAt.toISOString() : null,
      adminNote: ad.adminNote,
      daysLeft,
    };
  });
}

export { displayStatus };

/**
 * Ads are reserved for trusted accounts: verified + at least this many
 * followers. Admins are always allowed. Each user gets one included placement;
 * extra placements are granted by an admin.
 */
export const AD_MIN_FOLLOWERS = 1000;

export type AdEligibilityReason =
  | "OK"
  | "UNVERIFIED"
  | "FOLLOWERS"
  | "NO_SLOTS";

export type AdEligibility = {
  eligible: boolean;
  isVerified: boolean;
  followerCount: number;
  isAdmin: boolean;
  slots: number;
  usedSlots: number;
  reason: AdEligibilityReason;
};

export async function getAdEligibility(userId: string): Promise<AdEligibility> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isVerified: true,
      role: true,
      adSlots: true,
      _count: { select: { followers: true } },
      // Slots are taken by live ads. A pending request is handled separately
      // (only one request may be awaiting review at a time).
      ads: {
        where: { status: "APPROVED", endsAt: { gt: now } },
        select: { id: true },
      },
    },
  });

  if (!user) {
    return {
      eligible: false,
      isVerified: false,
      followerCount: 0,
      isAdmin: false,
      slots: 1,
      usedSlots: 0,
      reason: "UNVERIFIED",
    };
  }

  const isAdmin = user.role === "ADMIN";
  const slots = Math.max(1, user.adSlots);
  const usedSlots = user.ads.length;
  const followerCount = user._count.followers;
  const reason: AdEligibilityReason = isAdmin
    ? "OK"
    : !user.isVerified
      ? "UNVERIFIED"
      : followerCount < AD_MIN_FOLLOWERS
        ? "FOLLOWERS"
        : usedSlots >= slots
          ? "NO_SLOTS"
          : "OK";

  return {
    eligible: reason === "OK",
    isVerified: user.isVerified,
    followerCount,
    isAdmin,
    slots,
    usedSlots,
    reason,
  };
}
